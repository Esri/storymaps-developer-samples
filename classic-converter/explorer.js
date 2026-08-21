const CONFIG = window.CLASSIC_TOOLKIT_CONFIG || {};
const ARCGIS_PORTAL_URL = String(CONFIG.arcgisPortalUrl || "https://www.arcgis.com").replace(/\/$/, "");
const ARCGIS_SEARCH_URL = `${ARCGIS_PORTAL_URL}/sharing/rest/search`;
const OAUTH_CLIENT_ID = String(CONFIG.oauthClientId || "");
const OAUTH_REDIRECT_URI = String(CONFIG.oauthRedirectUri || "../arcgis-oauth-callback.html");
const OAUTH_EXPIRATION_MINUTES = Number(CONFIG.oauthExpirationMinutes || 120);
const ARCHIVE_VIEWER_URL = String(CONFIG.archiveViewerUrl || "https://classic-story-archive.netlify.app/");
const AUTH_STORAGE_KEY = "story-explorer:arcgis-auth";
// Intentionally prefer localStorage so a successful sign-in can be reused across tabs for now.
// If localStorage is unavailable, fall back to sessionStorage rather than dropping auth entirely.
const CONVERTER_HANDOFF_KEY = "classic-storymaps:converter-handoff";
const SCOPE_SUMMARY_COLLAPSED_KEY = "classic-storymaps:scope-summary-collapsed";
const ITEMS_PER_PAGE = 24;
const MAX_SELECTION = 10;

const TEMPLATE_OPTIONS = [
  { key: "maptour", label: "Map Tour" },
  { key: "shortlist", label: "Shortlist" },
  { key: "swipespyglass", label: "Swipe" },
  { key: "mapseries", label: "Map Series" },
  { key: "mapjournal", label: "Map Journal" },
  { key: "cascade", label: "Cascade" },
];

const state = {
  page: 1,
  total: 0,
  nextStart: -1,
  items: [],
  selected: new Map(),
  requestId: 0,
  auth: null,
  authPopup: null,
  pendingConverterItems: null,
  detailItem: null,
  detailReturnFocus: null,
  scopeSummaryRequestId: 0,
};

const elements = {
  form: document.querySelector("#classicSearchForm"),
  searchLabel: document.querySelector("#classicSearchLabel"),
  query: document.querySelector("#classicSearchInput"),
  scope: document.querySelector("#scopeFilter"),
  template: document.querySelector("#templateFilter"),
  replacement: document.querySelector("#replacementFilter"),
  sort: document.querySelector("#sortFilter"),
  searchButton: document.querySelector("#classicSearchButton"),
  results: document.querySelector("#classicResults"),
  summary: document.querySelector("#searchSummary"),
  error: document.querySelector("#searchError"),
  selectedCount: document.querySelector("#selectedCount"),
  selectionBar: document.querySelector("#selectionBar"),
  clearSelection: document.querySelector("#clearExplorerSelection"),
  convertLink: document.querySelector("#convertSelectionLink"),
  previous: document.querySelector("#previousPageButton"),
  next: document.querySelector("#nextPageButton"),
  pageLabel: document.querySelector("#pageLabel"),
  authStatus: document.querySelector("#authStatus"),
  authTitle: document.querySelector("#authStatusTitle"),
  authDescription: document.querySelector("#authStatusDescription"),
  signIn: document.querySelector("#arcgisSignInButton"),
  signOut: document.querySelector("#arcgisSignOutButton"),
  scopeSummary: document.querySelector("#classicScopeSummary"),
  scopeSummaryToggle: document.querySelector("#classicScopeSummaryToggle"),
  scopeSummaryContent: document.querySelector("#classicScopeSummaryContent"),
  myContentClassicCount: document.querySelector("#myContentClassicCount"),
  myContentClassicDescription: document.querySelector("#myContentClassicDescription"),
  myContentNeedsReplacementCount: document.querySelector("#myContentNeedsReplacementCount"),
  myContentReplacementSetCount: document.querySelector("#myContentReplacementSetCount"),
  organizationClassicCountCard: document.querySelector("#organizationClassicCountCard"),
  organizationClassicCount: document.querySelector("#organizationClassicCount"),
  organizationClassicDescription: document.querySelector("#organizationClassicDescription"),
  organizationNeedsReplacementCount: document.querySelector("#organizationNeedsReplacementCount"),
  organizationReplacementSetCount: document.querySelector("#organizationReplacementSetCount"),
  organizationSharingMixCard: document.querySelector("#organizationSharingMixCard"),
  organizationPublicClassicCount: document.querySelector("#organizationPublicClassicCount"),
  organizationOrgClassicCount: document.querySelector("#organizationOrgClassicCount"),
  organizationSharedClassicCount: document.querySelector("#organizationSharedClassicCount"),
  organizationPrivateClassicCount: document.querySelector("#organizationPrivateClassicCount"),
  scopeSummaryError: document.querySelector("#classicScopeSummaryError"),
  detailBackdrop: document.querySelector("#detailBackdrop"),
  detailPanel: document.querySelector("#itemDetailPanel"),
  detailTitle: document.querySelector("#detailTitle"),
  detailBody: document.querySelector("#detailPanelBody"),
  closeDetail: document.querySelector("#closeDetailButton"),
};

elements.form.addEventListener("submit", event => {
  event.preventDefault();
  state.page = 1;
  searchClassicItems();
});
elements.template.addEventListener("change", resetAndSearch);
elements.scope.addEventListener("change", resetAndSearch);
elements.replacement.addEventListener("change", resetAndSearch);
elements.sort.addEventListener("change", resetAndSearch);
elements.previous.addEventListener("click", () => {
  if (state.page <= 1) return;
  state.page -= 1;
  searchClassicItems();
});
elements.next.addEventListener("click", () => {
  if (state.nextStart <= 0) return;
  state.page += 1;
  searchClassicItems();
});
elements.clearSelection.addEventListener("click", () => {
  state.selected.clear();
  renderResults();
  updateSelection();
});
elements.signIn.addEventListener("click", beginArcGISSignIn);
elements.signOut.addEventListener("click", signOutOfArcGIS);
elements.scopeSummaryToggle.addEventListener("click", toggleClassicScopeSummary);
elements.scopeSummary.addEventListener("click", applyClassicScopeFilter);
elements.convertLink.addEventListener("click", event => handleConverterNavigation(event, [...state.selected.keys()]));
elements.closeDetail.addEventListener("click", closeDetailPanel);
elements.detailBackdrop.addEventListener("click", closeDetailPanel);
window.addEventListener("message", handleArcGISAuthMessage);
window.addEventListener("keydown", event => {
  if (event.key === "Escape" && !elements.detailPanel.hidden) closeDetailPanel();
});
elements.results.addEventListener("change", event => {
  const checkbox = event.target.closest("input[data-item-id]");
  if (!checkbox) return;
  const item = state.items.find(candidate => candidate.id === checkbox.dataset.itemId);
  if (!item) return;

  if (checkbox.checked && state.selected.size >= MAX_SELECTION) {
    checkbox.checked = false;
    setError(`You can send up to ${MAX_SELECTION} items to the converter at once.`);
    return;
  }

  setError("");
  if (checkbox.checked) state.selected.set(item.id, item);
  else state.selected.delete(item.id);
  renderResults();
  updateSelection();
});
elements.results.addEventListener("click", event => {
  if (event.target.closest("a, button, input, label")) return;
  const card = event.target.closest("[data-detail-item-id]");
  if (!card) return;
  openDetailPanel(card.dataset.detailItemId, card);
});
elements.results.addEventListener("keydown", event => {
  if (!['Enter', ' '].includes(event.key) || event.target.closest("a, button, input, label")) return;
  const card = event.target.closest("[data-detail-item-id]");
  if (!card) return;
  event.preventDefault();
  openDetailPanel(card.dataset.detailItemId, card);
});

state.auth = loadStoredAuth();
renderAuthState();
initializeFromUrl();
searchClassicItems();

function resetAndSearch() {
  state.page = 1;
  searchClassicItems();
}

async function searchClassicItems() {
  const requestId = state.requestId + 1;
  state.requestId = requestId;
  setBusy(true);
  setError("");
  elements.summary.textContent = `Searching ${getScopeLabel().toLowerCase()}…`;
  elements.results.innerHTML = renderSkeletons(6);

  try {
    const url = buildSearchUrl();
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const json = await response.json();
    if (requestId !== state.requestId) return;
    if (!response.ok || json.error) throw new Error(json.error?.message || `ArcGIS returned HTTP ${response.status}.`);

    state.items = Array.isArray(json.results) ? json.results : [];
    state.total = Number(json.total || 0);
    state.nextStart = Number(json.nextStart || -1);
    renderResults();
    updatePagination();
    updateUrl();
    const start = state.items.length ? (state.page - 1) * ITEMS_PER_PAGE + 1 : 0;
    const end = start ? start + state.items.length - 1 : 0;
    const scopeLabel = getScopeLabel();
    const publicScope = elements.scope.value === "public";
    elements.summary.textContent = state.items.length
      ? publicScope
        ? `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(state.total)} public Classic stories.`
        : `Showing ${formatNumber(start)}–${formatNumber(end)} of ${formatNumber(state.total)} Classic stories in ${scopeLabel}.`
      : publicScope
        ? "No public Classic stories matched these filters."
        : `No Classic stories matched these filters in ${scopeLabel}.`;
  } catch (error) {
    if (requestId !== state.requestId) return;
    state.items = [];
    state.total = 0;
    state.nextStart = -1;
    renderResults();
    updatePagination();
    elements.summary.textContent = "Classic items could not be loaded.";
    setError(error instanceof Error ? error.message : "ArcGIS search failed.");
  } finally {
    if (requestId === state.requestId) setBusy(false);
  }
}

function buildSearchUrl() {
  const template = elements.template.value;
  const templateQuery = template === "all"
    ? getClassicTemplateQuery()
    : `typekeywords:\"${template === "swipespyglass" ? "SwipeSpyglass" : template}\"`;
  const replacementQuery = elements.replacement.value === "with"
    ? 'typekeywords:"hasReplacementItem"'
    : elements.replacement.value === "without"
      ? '-typekeywords:"hasReplacementItem"'
      : "";
  const query = elements.query.value.trim();
  const textQuery = query ? buildTextQuery(query) : "";
  const sort = getSortParameters(elements.sort.value);
  const scopeQuery = buildScopeQuery();
  const params = new URLSearchParams({
    q: [`type:\"Web Mapping Application\"`, templateQuery, replacementQuery, textQuery, scopeQuery].filter(Boolean).join(" "),
    f: "json",
    num: String(ITEMS_PER_PAGE),
    start: String((state.page - 1) * ITEMS_PER_PAGE + 1),
    sortField: sort.field,
    sortOrder: sort.order,
  });
  if (elements.scope.value !== "public" && state.auth?.token) params.set("token", state.auth.token);
  return `${ARCGIS_SEARCH_URL}?${params.toString()}`;
}

function getClassicTemplateQuery() {
  return `(${TEMPLATE_OPTIONS.map(option => `typekeywords:\"${option.key === "swipespyglass" ? "SwipeSpyglass" : option.key}\"`).join(" OR ")})`;
}

function buildClassicScopeCountUrl(query, token) {
  const params = new URLSearchParams({
    q: [`type:\"Web Mapping Application\"`, getClassicTemplateQuery(), query].join(" "),
    f: "json",
    num: "1",
    start: "1",
    token,
  });
  return `${ARCGIS_SEARCH_URL}?${params.toString()}`;
}

function buildScopeQuery() {
  if (elements.scope.value === "my-content" && state.auth?.username) {
    return `owner:\"${escapeArcGisQueryValue(state.auth.username)}\"`;
  }
  if (elements.scope.value === "my-organization" && state.auth?.orgId) {
    return `orgid:${escapeArcGisQueryValue(state.auth.orgId)}`;
  }
  return "access:public";
}

function buildTextQuery(query) {
  if (/^[a-f0-9]{32}$/i.test(query)) return `id:\"${query.toLowerCase()}\"`;
  if (/^(owner|tags?|title|orgid|typekeywords):/i.test(query)) return query;
  const escaped = query.replaceAll('"', '\\"');
  return `(${escaped} OR title:\"${escaped}\" OR tags:\"${escaped}\" OR snippet:\"${escaped}\")`;
}

function getSortParameters(value) {
  if (value === "views") return { field: "numViews", order: "desc" };
  if (value === "title") return { field: "title", order: "asc" };
  if (value === "created") return { field: "created", order: "desc" };
  return { field: "modified", order: "desc" };
}

function renderResults() {
  if (!state.items.length) {
    elements.results.innerHTML = `
      <div class="empty-state">
        <h3>No Classic stories here</h3>
        <p>Try a broader search, choose all templates, or change the replacement filter.</p>
      </div>
    `;
    return;
  }

  const selectionModeActive = state.selected.size > 0;
  elements.results.innerHTML = state.items.map(item => {
    const template = detectTemplate(item.typeKeywords || []);
    const hasReplacement = (item.typeKeywords || []).some(keyword => String(keyword).toLowerCase() === "hasreplacementitem");
    const selected = state.selected.has(item.id);
    const itemUrl = `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(item.id)}`;
    const thumbnail = item.thumbnail
      ? `https://www.arcgis.com/sharing/rest/content/items/${encodeURIComponent(item.id)}/info/${encodeURIComponent(item.thumbnail)}`
      : "";
    return `
      <article class="result-card${selected ? " is-selected" : ""}" data-detail-item-id="${escapeHtml(item.id)}" tabindex="0" aria-label="View details for ${escapeHtml(item.title || item.id)}">
        <div class="result-thumbnail">
          ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="" loading="lazy" />` : `<span aria-hidden="true">Classic</span>`}
          <span class="result-access-badge">${escapeHtml(formatAccessBadge(item.access))}</span>
          ${selectionModeActive ? `<label class="result-select">
            <input type="checkbox" data-item-id="${escapeHtml(item.id)}" aria-label="Select ${escapeHtml(item.title || item.id)} for conversion"${selected ? " checked" : ""} />
            <span>Select</span>
          </label>` : ""}
        </div>
        <div class="result-card-body">
          <div class="result-pills">
            <span class="template-pill">${escapeHtml(template?.label || "Classic")}</span>
            <span class="template-pill ${hasReplacement ? "prior" : "muted"}">${hasReplacement ? "Replacement configured" : "Needs replacement"}</span>
          </div>
          <h3>${escapeHtml(item.title || item.id)}</h3>
          <p class="result-owner">By ${escapeHtml(item.owner || "Unknown owner")} · ${formatDate(item.modified)}</p>
          <p class="result-description">${escapeHtml(toPlainText(item.snippet) || "No description provided.")}</p>
          <div class="result-card-footer">
            <span>${formatNumber(item.numViews || 0)} views</span>
            <button type="button" class="detail-link-button" data-open-detail="${escapeHtml(item.id)}">View details</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
  elements.results.querySelectorAll("button[data-open-detail]").forEach(button => {
    button.addEventListener("click", () => openDetailPanel(button.dataset.openDetail, button));
  });
}

function renderSkeletons(count) {
  return Array.from({ length: count }, () => `
    <div class="result-card skeleton-card" aria-hidden="true">
      <div class="result-thumbnail skeleton"></div>
      <div class="result-card-body"><div class="skeleton line short"></div><div class="skeleton line"></div><div class="skeleton line"></div></div>
    </div>
  `).join("");
}

function detectTemplate(keywords) {
  const normalized = keywords.map(keyword => String(keyword).toLowerCase());
  return TEMPLATE_OPTIONS.find(option => normalized.includes(option.key)) || null;
}

function updateSelection() {
  const count = state.selected.size;
  const auth = getUsableAuth();
  elements.selectionBar.hidden = count === 0;
  elements.selectedCount.textContent = String(count);
  elements.clearSelection.disabled = count === 0;
  elements.convertLink.classList.toggle("disabled", count === 0);
  elements.convertLink.setAttribute("aria-disabled", String(count === 0));
  elements.convertLink.textContent = count > 0 && !auth ? "Sign in to open Converter" : "Open in Converter";
  elements.convertLink.href = count && auth
    ? `./converter.html?items=${encodeURIComponent([...state.selected.keys()].join(","))}`
    : count
      ? "#arcgis-auth"
      : "#";
}

function handleConverterNavigation(event, itemIds) {
  if (!itemIds.length) {
    event.preventDefault();
    return;
  }
  if (!getUsableAuth()) {
    event.preventDefault();
    state.pendingConverterItems = [...itemIds];
    beginArcGISSignIn();
    return;
  }
  saveConverterHandoff(itemIds);
}

function saveConverterHandoff(itemIds) {
  const auth = getUsableAuth();
  if (!auth) return false;
  const payload = {
    itemIds,
    token: auth.token,
    username: auth.username,
    expiresAt: auth.expiresAt,
    createdAt: Date.now(),
  };
  window.sessionStorage.setItem(CONVERTER_HANDOFF_KEY, JSON.stringify(payload));
  return true;
}

function updatePagination() {
  elements.previous.disabled = state.page <= 1;
  elements.next.disabled = state.nextStart <= 0;
  elements.pageLabel.textContent = `Page ${state.page}`;
}

function setBusy(busy) {
  elements.results.setAttribute("aria-busy", String(busy));
  elements.searchButton.disabled = busy;
  elements.searchButton.textContent = busy ? "Searching…" : "Search";
}

function setError(message) {
  elements.error.textContent = message;
  elements.error.hidden = !message;
}

function initializeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  elements.query.value = params.get("q") || "";
  const scope = params.get("scope");
  if (["public", "my-content", "my-organization"].includes(scope) && (scope === "public" || state.auth)) {
    elements.scope.value = scope;
  }
  if (["all", ...TEMPLATE_OPTIONS.map(option => option.key)].includes(params.get("template"))) {
    elements.template.value = params.get("template");
  }
  if (["all", "with", "without"].includes(params.get("replacement"))) {
    elements.replacement.value = params.get("replacement");
  }
  if (["modified", "views", "title", "created"].includes(params.get("sort"))) {
    elements.sort.value = params.get("sort");
  }
  const page = Number(params.get("page"));
  state.page = Number.isInteger(page) && page > 0 ? page : 1;
}

function updateUrl() {
  const params = new URLSearchParams();
  if (elements.query.value.trim()) params.set("q", elements.query.value.trim());
  if (elements.scope.value !== "public") params.set("scope", elements.scope.value);
  if (elements.template.value !== "all") params.set("template", elements.template.value);
  if (elements.replacement.value !== "all") params.set("replacement", elements.replacement.value);
  if (elements.sort.value !== "modified") params.set("sort", elements.sort.value);
  if (state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ""}`);
}

function getScopeLabel() {
  return elements.scope.options[elements.scope.selectedIndex]?.text.replace(/ — sign in$/, "") || "Public Classic stories";
}

function beginArcGISSignIn() {
  setError("");
  if (!OAUTH_CLIENT_ID) {
    state.pendingConverterItems = null;
    setError("ArcGIS sign-in is not configured for this deployment. Add an OAuth client ID in config.js.");
    return;
  }
  let redirectUri;
  try {
    redirectUri = resolveOAuthRedirectUri();
  } catch (error) {
    state.pendingConverterItems = null;
    setError(error instanceof Error ? error.message : "The ArcGIS OAuth callback URL is invalid.");
    return;
  }
  const popup = window.open("about:blank", "classic-storymaps-arcgis-oauth", "width=480,height=680");
  if (!popup) {
    state.pendingConverterItems = null;
    setError("The sign-in window was blocked. Allow pop-ups for this site and try again.");
    return;
  }
  state.authPopup = popup;
  const authUrl = new URL(`${ARCGIS_PORTAL_URL}/sharing/rest/oauth2/authorize`);
  authUrl.searchParams.set("client_id", OAUTH_CLIENT_ID);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("expiration", String(OAUTH_EXPIRATION_MINUTES));
  popup.location.href = authUrl.toString();
  popup.focus();
  elements.signIn.disabled = true;
  elements.signIn.textContent = "Signing in…";
}

function resolveOAuthRedirectUri() {
  let redirectUri;
  try {
    redirectUri = new URL(OAUTH_REDIRECT_URI, window.location.href);
  } catch {
    throw new Error("The oauthRedirectUri value in config.js is not a valid URL or path.");
  }
  if (redirectUri.origin !== window.location.origin) {
    throw new Error("The oauthRedirectUri value in config.js must use the same origin as Classic Story Explorer.");
  }
  return redirectUri.toString();
}

async function handleArcGISAuthMessage(event) {
  if (event.origin !== window.location.origin || event.source !== state.authPopup) return;
  const message = event.data || {};
  if (message.type === "arcgis-oauth-error") {
    state.authPopup = null;
    state.pendingConverterItems = null;
    renderAuthState();
    setError(message.error || "ArcGIS sign-in failed.");
    return;
  }
  if (message.type !== "arcgis-oauth-token" || !message.token) return;

  try {
    const expiresIn = Math.max(60, Number(message.expiresIn || OAUTH_EXPIRATION_MINUTES * 60));
    state.auth = await fetchArcGISAuth(message.token, expiresIn);
    persistAuth(state.auth);
    state.authPopup = null;
    const pendingConverterItems = state.pendingConverterItems;
    state.pendingConverterItems = null;
    renderAuthState();
    setError("");
    if (pendingConverterItems?.length && saveConverterHandoff(pendingConverterItems)) {
      window.location.assign(`./converter.html?items=${encodeURIComponent(pendingConverterItems.join(","))}`);
    }
  } catch (error) {
    state.auth = null;
    state.authPopup = null;
    state.pendingConverterItems = null;
    clearPersistedAuth();
    renderAuthState();
    setError(error instanceof Error ? error.message : "ArcGIS sign-in failed.");
  }
}

async function fetchArcGISAuth(token, expiresInSeconds) {
  const selfUrl = new URL(`${ARCGIS_PORTAL_URL}/sharing/rest/community/self`);
  selfUrl.searchParams.set("f", "json");
  selfUrl.searchParams.set("token", token);
  selfUrl.searchParams.set("appInfoToken", token);
  const portalUrl = new URL(`${ARCGIS_PORTAL_URL}/sharing/rest/portals/self`);
  portalUrl.searchParams.set("f", "json");
  portalUrl.searchParams.set("token", token);
  portalUrl.searchParams.set("appInfoToken", token);
  const [selfResponse, portalResponse] = await Promise.all([fetch(selfUrl), fetch(portalUrl)]);
  const [self, portal] = await Promise.all([selfResponse.json(), portalResponse.json()]);
  if (!selfResponse.ok || self.error || !self.username) throw new Error(self.error?.message || "ArcGIS token validation failed.");
  return {
    token,
    username: self.username,
    fullName: self.fullName || self.username,
    orgId: self.orgId || portal?.user?.orgId || portal?.id || null,
    orgName: portal?.name || portal?.portalName || null,
    role: self.role || portal?.user?.role || null,
    thumbnail: self.thumbnail || null,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    portalUrl: ARCGIS_PORTAL_URL,
  };
}

function loadStoredAuth() {
  try {
    const persistentAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const serializedAuth = persistentAuth || window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    const auth = JSON.parse(serializedAuth || "null");
    if (!auth?.token || !auth?.username || Number(auth.expiresAt) <= Date.now()) {
      clearPersistedAuth();
      return null;
    }
    if (!persistentAuth) persistAuth(auth);
    return auth;
  } catch {
    clearPersistedAuth();
    return null;
  }
}

function persistAuth(auth) {
  const serializedAuth = JSON.stringify(auth);
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, serializedAuth);
  }
}

function clearPersistedAuth() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Continue clearing the tab-scoped fallback if local storage is unavailable.
  }
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function getUsableAuth() {
  if (!state.auth || Number(state.auth.expiresAt) <= Date.now()) return null;
  return state.auth;
}

function renderAuthState() {
  const auth = getUsableAuth();
  elements.signIn.hidden = Boolean(auth);
  elements.signIn.disabled = false;
  elements.signIn.textContent = "Sign in to ArcGIS";
  elements.signOut.hidden = !auth;
  elements.signOut.textContent = "Sign Out";
  [...elements.scope.options].forEach(option => {
    if (option.value === "public") return;
    option.disabled = !auth;
    option.textContent = option.value === "my-content"
      ? (auth ? "My content" : "My content — sign in")
      : (auth ? "My organization" : "My organization — sign in");
  });
  if (!auth && elements.scope.value !== "public") elements.scope.value = "public";
  elements.authStatus.classList.toggle("is-signed-in", Boolean(auth));
  elements.authTitle.textContent = auth
    ? `Signed in as ${auth.fullName || auth.username}`
    : "Sign in to unlock private stories";
  const identityParts = auth
    ? [
        `Username: ${auth.username}`,
        auth.orgName ? `Organization: ${auth.orgName}` : "",
        auth.orgId ? `Org ID: ${auth.orgId}` : "",
      ].filter(Boolean)
    : [];
  elements.authDescription.textContent = auth
    ? identityParts.join(" · ")
    : "Search content you own or can access through your organization, then open selected items in Converter.";
  elements.searchLabel.textContent = auth
    ? "Search Classic Story Maps"
    : "Search public Classic Story Maps";
  renderClassicScopeSummary(auth);
  updateSelection();
  if (state.detailItem) renderDetailPanel(state.detailItem);
}

function renderClassicScopeSummary(auth) {
  state.scopeSummaryRequestId += 1;
  elements.scopeSummary.hidden = !auth;
  elements.scopeSummary.setAttribute("aria-busy", auth ? "true" : "false");
  elements.scopeSummaryError.hidden = true;
  elements.scopeSummaryError.textContent = "";
  elements.myContentClassicCount.textContent = "—";
  elements.myContentNeedsReplacementCount.textContent = "—";
  elements.myContentReplacementSetCount.textContent = "—";
  elements.organizationClassicCount.textContent = "—";
  elements.organizationNeedsReplacementCount.textContent = "—";
  elements.organizationReplacementSetCount.textContent = "—";
  elements.organizationPublicClassicCount.textContent = "—";
  elements.organizationOrgClassicCount.textContent = "—";
  elements.organizationSharedClassicCount.textContent = "—";
  elements.organizationPrivateClassicCount.textContent = "—";
  if (!auth) return;

  setClassicScopeSummaryExpanded(!isClassicScopeSummaryCollapsed());
  elements.myContentClassicDescription.textContent = `Owned by ${auth.username}`;
  elements.organizationClassicCountCard.hidden = !auth.orgId;
  elements.organizationSharingMixCard.hidden = !auth.orgId;
  elements.organizationClassicDescription.textContent = auth.orgName
    ? `All owners in ${auth.orgName}`
    : "All owners in your organization";
  loadClassicScopeSummary(auth, state.scopeSummaryRequestId);
}

async function loadClassicScopeSummary(auth, requestId) {
  const scopes = [
    {
      totalElement: elements.myContentClassicCount,
      needsReplacementElement: elements.myContentNeedsReplacementCount,
      replacementSetElement: elements.myContentReplacementSetCount,
      query: `owner:\"${escapeArcGisQueryValue(auth.username)}\"`,
    },
    ...(auth.orgId
      ? [{
          totalElement: elements.organizationClassicCount,
          needsReplacementElement: elements.organizationNeedsReplacementCount,
          replacementSetElement: elements.organizationReplacementSetCount,
          query: `orgid:${escapeArcGisQueryValue(auth.orgId)}`,
        }]
      : []),
  ];
  const requests = scopes.flatMap(scope => [
    {
      element: scope.needsReplacementElement,
      query: `${scope.query} -typekeywords:\"hasReplacementItem\"`,
      scope,
    },
    {
      element: scope.replacementSetElement,
      query: `${scope.query} typekeywords:\"hasReplacementItem\"`,
      scope,
    },
  ]);
  if (auth.orgId) {
    const organizationQuery = `orgid:${escapeArcGisQueryValue(auth.orgId)}`;
    requests.push(
      { element: elements.organizationPublicClassicCount, query: `${organizationQuery} access:public` },
      { element: elements.organizationOrgClassicCount, query: `${organizationQuery} access:org` },
      { element: elements.organizationSharedClassicCount, query: `${organizationQuery} access:shared` },
      { element: elements.organizationPrivateClassicCount, query: `${organizationQuery} access:private` },
    );
  }

  try {
    const responses = await Promise.all(requests.map(request => fetch(buildClassicScopeCountUrl(request.query, auth.token), {
      headers: { Accept: "application/json" },
    })));
    const data = await Promise.all(responses.map(response => response.json()));
    if (requestId !== state.scopeSummaryRequestId || getUsableAuth()?.token !== auth.token) return;
    const failedIndex = responses.findIndex((response, index) => !response.ok || data[index]?.error);
    if (failedIndex >= 0) {
      throw new Error(data[failedIndex]?.error?.message || `ArcGIS returned HTTP ${responses[failedIndex].status}.`);
    }
    const totals = new Map(scopes.map(scope => [scope, 0]));
    requests.forEach((request, index) => {
      const count = Number(data[index]?.total || 0);
      request.element.textContent = formatNumber(count);
      if (request.scope) totals.set(request.scope, (totals.get(request.scope) || 0) + count);
    });
    scopes.forEach(scope => {
      scope.totalElement.textContent = formatNumber(totals.get(scope) || 0);
    });
  } catch {
    if (requestId !== state.scopeSummaryRequestId || getUsableAuth()?.token !== auth.token) return;
    elements.scopeSummaryError.textContent = "Classic content counts could not be loaded.";
    elements.scopeSummaryError.hidden = false;
  } finally {
    if (requestId === state.scopeSummaryRequestId) elements.scopeSummary.setAttribute("aria-busy", "false");
  }
}

function toggleClassicScopeSummary() {
  const expanded = elements.scopeSummaryToggle.getAttribute("aria-expanded") === "true";
  setClassicScopeSummaryExpanded(!expanded);
  try {
    window.sessionStorage.setItem(SCOPE_SUMMARY_COLLAPSED_KEY, String(expanded));
  } catch {
    // The disclosure still works when session storage is unavailable.
  }
}

function setClassicScopeSummaryExpanded(expanded) {
  elements.scopeSummaryContent.hidden = !expanded;
  elements.scopeSummaryToggle.setAttribute("aria-expanded", String(expanded));
  elements.scopeSummaryToggle.textContent = expanded ? "Hide stats" : "Show stats";
}

function isClassicScopeSummaryCollapsed() {
  try {
    return window.sessionStorage.getItem(SCOPE_SUMMARY_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function applyClassicScopeFilter(event) {
  const button = event.target.closest("button[data-scope][data-replacement]");
  if (!button || !getUsableAuth()) return;
  elements.query.value = "";
  elements.template.value = "all";
  elements.scope.value = button.dataset.scope;
  elements.replacement.value = button.dataset.replacement;
  state.page = 1;
  searchClassicItems();
}

function signOutOfArcGIS() {
  state.auth = null;
  state.pendingConverterItems = null;
  clearPersistedAuth();
  window.sessionStorage.removeItem(CONVERTER_HANDOFF_KEY);
  elements.scope.value = "public";
  renderAuthState();
  state.page = 1;
  searchClassicItems();
}

function openDetailPanel(itemId, trigger) {
  const item = state.items.find(candidate => candidate.id === itemId) || state.selected.get(itemId);
  if (!item) return;
  state.detailItem = item;
  state.detailReturnFocus = trigger || document.activeElement;
  renderDetailPanel(item);
  elements.detailBackdrop.hidden = false;
  elements.detailPanel.hidden = false;
  document.body.classList.add("detail-open");
  elements.closeDetail.focus();
}

function closeDetailPanel() {
  elements.detailBackdrop.hidden = true;
  elements.detailPanel.hidden = true;
  document.body.classList.remove("detail-open");
  state.detailReturnFocus?.focus?.();
  state.detailItem = null;
}

function renderDetailPanel(item) {
  const template = detectTemplate(item.typeKeywords || []);
  const hasReplacement = (item.typeKeywords || []).some(keyword => String(keyword).toLowerCase() === "hasreplacementitem");
  const selected = state.selected.has(item.id);
  const itemUrl = `${ARCGIS_PORTAL_URL}/home/item.html?id=${encodeURIComponent(item.id)}`;
  const archiveUrl = new URL(ARCHIVE_VIEWER_URL);
  archiveUrl.searchParams.set("appid", item.id);
  const auth = getUsableAuth();
  const converterUrl = auth ? `./converter.html?items=${encodeURIComponent(item.id)}` : "#arcgis-auth";
  const tags = (item.tags || []).map(tag => String(tag).trim()).filter(Boolean).slice(0, 8);
  elements.detailTitle.textContent = item.title || item.id;
  elements.detailBody.innerHTML = `
    <div class="detail-pills">
      <span class="template-pill">Classic ${escapeHtml(template?.label || "Story Map")}</span>
      <span class="template-pill ${hasReplacement ? "prior" : "muted"}">${hasReplacement ? "Replacement configured" : "Needs replacement"}</span>
      <span class="template-pill muted">${escapeHtml(formatAccess(item.access))}</span>
    </div>
    <p class="detail-summary">${escapeHtml(toPlainText(item.description || item.snippet) || "No description provided.")}</p>
    <div class="detail-quick-actions">
      <a class="button-link" href="${escapeHtml(archiveUrl.toString())}" target="_blank" rel="noreferrer">View in Classic Archive</a>
      <a class="button-link secondary-link" href="${itemUrl}" target="_blank" rel="noreferrer">Open item details</a>
    </div>
    <dl class="detail-metadata">
      <div><dt>Owner</dt><dd>${escapeHtml(item.owner || "Unknown")}</dd></div>
      <div><dt>Views</dt><dd>${formatNumber(item.numViews || 0)}</dd></div>
      <div><dt>Created</dt><dd>${formatDate(item.created)}</dd></div>
      <div><dt>Updated</dt><dd>${formatDate(item.modified)}</dd></div>
      <div><dt>Access</dt><dd>${escapeHtml(formatAccess(item.access))}</dd></div>
      <div><dt>Item ID</dt><dd class="detail-item-id">${escapeHtml(item.id)}</dd></div>
    </dl>
    ${tags.length ? `<section class="detail-tags" aria-labelledby="detailTagsTitle"><h3 id="detailTagsTitle">Tags</h3><div>${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join("")}</div></section>` : ""}
    <div class="detail-actions">
      <a id="detailConvertLink" class="button-link secondary-link" href="${converterUrl}">${auth ? "Open in Converter" : "Sign in to open Converter"}</a>
      <button id="detailSelectButton" type="button" class="secondary">${selected ? "Remove from selection" : "Add to selection"}</button>
    </div>
  `;
  elements.detailBody.querySelector("#detailConvertLink").addEventListener("click", event => handleConverterNavigation(event, [item.id]));
  elements.detailBody.querySelector("#detailSelectButton").addEventListener("click", () => {
    if (!state.selected.has(item.id) && state.selected.size >= MAX_SELECTION) {
      setError(`You can send up to ${MAX_SELECTION} items to the converter at once.`);
      return;
    }
    if (state.selected.has(item.id)) state.selected.delete(item.id);
    else state.selected.set(item.id, item);
    renderResults();
    updateSelection();
    renderDetailPanel(item);
  });
}

function formatAccess(access) {
  if (access === "private") return "Private";
  if (access === "org") return "Organization";
  if (access === "shared") return "Shared groups";
  return "Public";
}

function formatAccessBadge(access) {
  return access === "shared" ? "Shared" : formatAccess(access);
}

function escapeArcGisQueryValue(value) {
  return String(value || "").replaceAll('"', '\\"');
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatDate(timestamp) {
  if (!Number(timestamp)) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(Number(timestamp)));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toPlainText(value) {
  if (!value) return "";
  const parsed = new DOMParser().parseFromString(String(value), "text/html");
  return parsed.body.textContent?.trim() || "";
}
