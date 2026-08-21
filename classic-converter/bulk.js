const ARCGIS_ROOT = "https://www.arcgis.com/sharing/rest";
const CONVERTER_HANDOFF_KEY = "classic-storymaps:converter-handoff";
const CONCURRENCY = 2;
const HOSTED_FEATURE_PRIVILEGES = [
  "portal:user:createItem",
  "portal:publisher:publishFeatures",
];

const CLASSIC_TEMPLATES = [
  { key: "maptour", label: "Classic Map Tour", recipe: "Guided map tour block", target: "Story", preserves: "Tour stops, coordinates, titles, descriptions, images, and the source web map when available.", review: "Check the guided-tour layout, media framing, map extent, and any places with missing media.", keywords: ["maptour"], supported: true },
  { key: "shortlist", label: "Classic Shortlist", recipe: "Explorer grid or categorized map tour", target: "Story", preserves: "Every place and populated category. With publishing privileges, all data is stored in one hosted point feature layer.", review: "Builder displays up to eight categories. For more, duplicate the tour and split the visible categories between two tours; the backing layer retains all data.", keywords: ["shortlist"], supported: true },
  { key: "swipe", label: "Classic Swipe", recipe: "Swipe block", target: "Story", preserves: "The left and right web maps—or layer visibility from a single web map—plus available captions and orientation.", review: "Check map position, layer visibility, labels, and whether a Classic Spyglass layout needs manual adjustment.", keywords: ["swipespyglass"], supported: true },
  { key: "mapseries", label: "Classic Map Series", recipe: "StoryMaps collection", target: "Collection", preserves: "Each tab or entry as a Collection item, including its order and hidden state where available.", review: "Open each Collection entry and check sharing, titles, thumbnails, and links to maps or apps.", keywords: ["mapseries"], supported: true },
  { key: "mapjournal", label: "Classic Map Journal", recipe: "Sidecar block", target: "Story", preserves: "Journal sections as Sidecar slides, narrative text, maps, media, galleries, buttons, and supported media actions.", review: "Check slide layouts, map actions, image groups, button destinations, and any unsupported custom behavior.", keywords: ["mapjournal"], supported: true },
  { key: "cascade", label: "Classic Cascade", recipe: "Long-form story", target: "Story", preserves: "Sequential narrative sections, immersive panels, maps, images, videos, iframe webpages as embeds, and credits.", review: "Check immersive layouts, media sizing, embed behavior, map choreography, and theme/background choices.", keywords: ["cascade"], supported: true },
];

const state = {
  items: [],
  queue: [],
  running: new Map(),
  batch: null,
  activeCount: 0,
  token: "",
  tokenValid: false,
  tokenUser: null,
  hostedFeatureCapability: createUnavailableHostedFeatureCapability("Hosted feature publishing has not been checked."),
  tokenValidationRun: 0,
  tokenFromHandoff: false,
};

const elements = {
  tokenInput: document.querySelector("#bulkTokenInput"),
  tokenField: document.querySelector("#tokenField"),
  sourceFormGrid: document.querySelector("#sourceFormGrid"),
  explorerStartCallout: document.querySelector("#explorerStartCallout"),
  connectedAccount: document.querySelector("#connectedAccount"),
  connectedAccountName: document.querySelector("#connectedAccountName"),
  useAnotherTokenButton: document.querySelector("#useAnotherTokenButton"),
  toggleTokenButton: document.querySelector("#toggleBulkTokenButton"),
  clearTokenButton: document.querySelector("#clearBulkTokenButton"),
  groupInput: document.querySelector("#groupInput"),
  clearGroupButton: document.querySelector("#clearGroupButton"),
  loadGroupButton: document.querySelector("#loadGroupButton"),
  createSelectedButton: document.querySelector("#createSelectedButton"),
  startAnotherButton: document.querySelector("#startAnotherButton"),
  status: document.querySelector("#bulkStatus"),
  stepSource: document.querySelector("#bulkStepSource"),
  stepSourceBody: document.querySelector("#bulkStepSourceBody"),
  stepSourceSummary: document.querySelector("#bulkStepSourceSummary"),
  stepItems: document.querySelector("#bulkStepItems"),
  stepItemsBody: document.querySelector("#bulkStepItemsBody"),
  stepItemsSummary: document.querySelector("#bulkStepItemsSummary"),
  stepResults: document.querySelector("#bulkStepResults"),
  rows: document.querySelector("#bulkRows"),
  selectionToolbar: document.querySelector("#selectionToolbar"),
  selectionSummary: document.querySelector("#selectionSummary"),
  selectAllButton: document.querySelector("#selectAllButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  shortlistCapabilityNotice: document.querySelector("#shortlistCapabilityNotice"),
  resultRows: document.querySelector("#bulkResultRows"),
  workerHost: document.querySelector("#workerHost"),
};

let tokenValidationTimer = 0;

elements.loadGroupButton.addEventListener("click", loadGroupItems);
elements.createSelectedButton.addEventListener("click", () => enqueueSelected(true));
elements.startAnotherButton.addEventListener("click", resetForNextConversion);
elements.tokenInput.addEventListener("input", scheduleTokenValidation);
elements.toggleTokenButton.addEventListener("click", toggleTokenVisibility);
elements.clearTokenButton.addEventListener("click", clearTokenInput);
elements.useAnotherTokenButton.addEventListener("click", useAnotherToken);
elements.groupInput.addEventListener("input", () => {
  resetLoadedItems();
  updateActionButtons();
});
elements.clearGroupButton.addEventListener("click", clearGroupInput);
elements.selectAllButton.addEventListener("click", () => setSupportedSelection(true));
elements.clearSelectionButton.addEventListener("click", () => setSupportedSelection(false));
elements.stepSource.addEventListener("click", () => {
  if (state.activeCount === 0 && elements.stepSource.classList.contains("is-collapsed")) {
    expandStep(elements.stepSource, elements.stepSourceBody, elements.stepSourceSummary);
  }
});
elements.stepItems.addEventListener("click", () => {
  if (state.activeCount === 0 && elements.stepItems.classList.contains("is-collapsed")) {
    expandStep(elements.stepItems, elements.stepItemsBody, elements.stepItemsSummary);
  }
});
elements.resultRows.addEventListener("click", handleResultLinkCopy);
window.addEventListener("message", handleWorkerStatus);
initializeSourceFromUrl();

function setStatus(message, tone = "neutral") {
  elements.status.className = `status ${tone}`;
  elements.status.innerHTML = message;
  elements.status.setAttribute("role", tone === "bad" ? "alert" : "status");
  elements.status.hidden = !message;
}

function setTokenStatus(message, tone = "neutral") {
  setStatus(message, tone);
}

function scheduleTokenValidation() {
  window.clearTimeout(tokenValidationTimer);
  state.token = "";
  state.tokenValid = false;
  state.tokenUser = null;
  state.hostedFeatureCapability = createUnavailableHostedFeatureCapability("Hosted feature publishing has not been checked.");
  state.tokenFromHandoff = false;
  resetLoadedItems();
  updateActionButtons();

  const token = elements.tokenInput.value.trim();
  if (!token) {
    setTokenStatus("");
    return;
  }

  setTokenStatus("Checking token...");
  tokenValidationTimer = window.setTimeout(() => {
    validateToken(token);
  }, 500);
}

function resetLoadedItems() {
  if (state.activeCount > 0) return;
  state.items = [];
  state.queue = [];
  state.batch = null;
  state.running.clear();
  elements.workerHost.innerHTML = "";
  renderRows();
  renderResultRows();
  expandStep(elements.stepSource, elements.stepSourceBody, elements.stepSourceSummary);
  expandStep(elements.stepItems, elements.stepItemsBody, elements.stepItemsSummary);
  elements.stepItems.hidden = true;
  elements.stepResults.hidden = true;
}

function clearTokenInput() {
  window.clearTimeout(tokenValidationTimer);
  elements.tokenInput.value = "";
  state.token = "";
  state.tokenValid = false;
  state.tokenUser = null;
  state.hostedFeatureCapability = createUnavailableHostedFeatureCapability("Hosted feature publishing has not been checked.");
  state.tokenFromHandoff = false;
  window.sessionStorage.removeItem(CONVERTER_HANDOFF_KEY);
  showManualTokenField();
  resetLoadedItems();
  setStatus("");
  updateActionButtons();
  elements.tokenInput.focus();
}

function useAnotherToken() {
  state.tokenFromHandoff = false;
  window.sessionStorage.removeItem(CONVERTER_HANDOFF_KEY);
  showManualTokenField();
  clearTokenInput();
}

function showManualTokenField() {
  elements.tokenField.hidden = false;
  elements.connectedAccount.hidden = true;
  elements.explorerStartCallout.hidden = false;
  elements.sourceFormGrid.classList.remove("has-connected-account");
}

function showPassedToken(username = "") {
  state.tokenFromHandoff = true;
  elements.tokenField.hidden = true;
  elements.connectedAccount.hidden = false;
  elements.explorerStartCallout.hidden = true;
  elements.sourceFormGrid.classList.add("has-connected-account");
  elements.connectedAccountName.textContent = username
    ? `Connected to ArcGIS as ${username}`
    : "Connected to ArcGIS";
}

function toggleTokenVisibility() {
  const showToken = elements.tokenInput.type === "password";
  elements.tokenInput.type = showToken ? "text" : "password";
  elements.toggleTokenButton.textContent = showToken ? "Hide" : "Show";
  elements.toggleTokenButton.setAttribute("aria-pressed", String(showToken));
  elements.toggleTokenButton.setAttribute("aria-label", `${showToken ? "Hide" : "Show"} ArcGIS token`);
  elements.tokenInput.focus();
}

function clearGroupInput() {
  elements.groupInput.value = "";
  resetLoadedItems();
  updateActionButtons();
  elements.groupInput.focus();
}

function resetForNextConversion() {
  if (state.activeCount > 0) {
    setStatus("Wait for the current conversion tasks to finish before starting another source.", "warn");
    return;
  }

  elements.groupInput.value = "";
  resetLoadedItems();
  if (state.tokenValid) {
    setStatus(
      `Ready for another source. Token is still validated for <strong>${escapeHtml(state.tokenUser?.username || "ArcGIS user")}</strong>.`,
      "good"
    );
  } else {
    setStatus("Ready for another source. Paste or validate a token before getting started.", "neutral");
  }
  updateActionButtons();
  elements.groupInput.focus();
}

async function validateToken(token) {
  const validationRun = state.tokenValidationRun + 1;
  state.tokenValidationRun = validationRun;

  try {
    const url = new URL(`${ARCGIS_ROOT}/community/self`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    url.searchParams.set("appInfoToken", token);
    const response = await fetch(url);
    const json = await response.json();
    if (validationRun !== state.tokenValidationRun) return false;
    assertArcGisSuccess(json, "Token validation failed.");

    const hostedFeatureCapability = await inspectHostedFeatureCapability(token, json.username);
    if (validationRun !== state.tokenValidationRun) return false;
    state.token = token;
    state.tokenValid = true;
    state.tokenUser = json;
    state.hostedFeatureCapability = hostedFeatureCapability;
    if (state.tokenFromHandoff) {
      showPassedToken(json.username || "ArcGIS user");
      setTokenStatus("");
    } else {
      const expires = getTokenExpiryText(json.appInfo);
      setTokenStatus(`Token validated for <strong>${escapeHtml(json.username || "ArcGIS user")}</strong>. ${expires}`, "good");
    }
    updateActionButtons();
    return true;
  } catch (error) {
    if (validationRun !== state.tokenValidationRun) return false;
    state.token = "";
    state.tokenValid = false;
    state.tokenUser = null;
    state.hostedFeatureCapability = createUnavailableHostedFeatureCapability("Token validation failed.");
    if (state.tokenFromHandoff) showManualTokenField();
    setTokenStatus(escapeHtml(error.message), "bad");
    updateActionButtons();
    return false;
  }
}

async function inspectHostedFeatureCapability(token, expectedUsername = "") {
  try {
    const url = new URL(`${ARCGIS_ROOT}/portals/self`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    url.searchParams.set("appInfoToken", token);
    const response = await fetch(url);
    const json = await response.json();
    assertArcGisSuccess(json, "Could not inspect ArcGIS publishing privileges.");

    const portalUser = json?.user || {};
    if (expectedUsername && portalUser.username && portalUser.username !== expectedUsername) {
      return createUnavailableHostedFeatureCapability("The portal privilege response did not match the validated user.");
    }

    const privileges = Array.isArray(portalUser.privileges) ? portalUser.privileges.map(String) : [];
    const missingPrivileges = HOSTED_FEATURE_PRIVILEGES.filter(privilege => !privileges.includes(privilege));
    return {
      checked: true,
      allowed: missingPrivileges.length === 0 && portalUser.disabled !== true,
      privileges,
      missingPrivileges,
      reason: portalUser.disabled === true
        ? "The ArcGIS member is disabled."
        : missingPrivileges.length
          ? `Missing ${missingPrivileges.join(" and ")}.`
          : "",
    };
  } catch (error) {
    return createUnavailableHostedFeatureCapability(error.message || "ArcGIS publishing privileges could not be verified.");
  }
}

function createUnavailableHostedFeatureCapability(reason) {
  return {
    checked: false,
    allowed: false,
    privileges: [],
    missingPrivileges: [...HOSTED_FEATURE_PRIVILEGES],
    reason,
  };
}

async function loadGroupItems() {
  const source = parseSourceInput(elements.groupInput.value);
  if (!hasParsedSource(source)) {
    setStatus("Paste Classic item URLs, item ids, a group URL, or a group id.", "warn");
    return;
  }
  if (!state.tokenValid) {
    setStatus("Paste a valid ArcGIS token before loading your source.", "warn");
    return;
  }

  setBusy(elements.loadGroupButton, true, "Analyzing...");
  setStatus(`Reading source <strong>${escapeHtml(getSourceLabel(source))}</strong>...`);

  try {
    const { items, mode } = await fetchSourceItems(source, state.token);
    state.items = items.map(createConversionItem);
    await Promise.all([
      attachPriorConversionSignals(state.items, state.tokenUser?.username, state.token),
      attachExistingReplacementSignals(state.items, state.token),
    ]);

    renderRows();
    renderResultRows();
    collapseStep(
      elements.stepSource,
      elements.stepSourceBody,
      elements.stepSourceSummary,
      `Token validated as ${state.tokenUser?.username || "ArcGIS user"} · ${getLoadedSourceSummary(mode, items.length, source)}`
    );
    elements.stepItems.hidden = false;
    expandStep(elements.stepItems, elements.stepItemsBody, elements.stepItemsSummary);
    elements.stepResults.hidden = true;
    updateActionButtons();
    const supportedCount = state.items.filter(item => item.template?.supported).length;
    setStatus(`Found ${items.length} ${items.length === 1 ? "item" : "items"}. ${supportedCount} can be converted now and ${supportedCount === 1 ? "is" : "are"} selected.`, supportedCount ? "good" : "warn");
  } catch (error) {
    state.items = [];
    renderRows();
    renderResultRows();
    elements.stepItems.hidden = true;
    elements.stepResults.hidden = true;
    setStatus(escapeHtml(error.message), "bad");
  } finally {
    setBusy(elements.loadGroupButton, false, "Analyze");
    updateActionButtons();
  }
}

async function fetchGroupItems(groupId, token) {
  const allItems = [];
  let start = 1;
  while (start > 0 && allItems.length < 500) {
    const url = new URL(`${ARCGIS_ROOT}/content/groups/${encodeURIComponent(groupId)}/search`);
    url.searchParams.set("f", "json");
    url.searchParams.set("q", "");
    url.searchParams.set("num", "100");
    url.searchParams.set("start", String(start));
    url.searchParams.set("sortField", "modified");
    url.searchParams.set("sortOrder", "desc");
    if (token) url.searchParams.set("token", token);
    const response = await fetch(url);
    const json = await response.json();
    assertArcGisSuccess(json, "Could not read group content.");
    allItems.push(...(json.results || []));
    start = json.nextStart && json.nextStart > 0 ? json.nextStart : -1;
  }
  return allItems;
}

function renderRows() {
  if (!state.items.length) {
    elements.rows.innerHTML = `<tr><td colspan="3" class="empty">Add a source to see Classic items.</td></tr>`;
    updateSelectionSummary();
    return;
  }

  elements.rows.innerHTML = state.items.map(item => `
    <tr data-item-id="${escapeHtml(item.id)}" class="${item.template?.supported ? "" : "unsupported-row"}">
      <td>
        <input type="checkbox" ${item.selected ? "checked" : ""} ${item.template?.supported ? "" : "disabled"} aria-label="Select ${escapeHtml(item.title)}" />
      </td>
      <td>
        <div class="bulk-row-title">${escapeHtml(item.title)}</div>
        <div class="bulk-row-meta">${escapeHtml(item.owner)} · ${escapeHtml(item.id)}</div>
        ${renderExistingReplacementSignal(item)}
        ${renderPriorConversionSignal(item)}
      </td>
      <td>${renderTemplate(item)}</td>
    </tr>
  `).join("");

  elements.rows.querySelectorAll("input[type='checkbox']").forEach(input => {
    input.addEventListener("change", event => {
      const row = event.target.closest("tr");
      const item = state.items.find(candidate => candidate.id === row.dataset.itemId);
      if (item) item.selected = event.target.checked;
      updateActionButtons();
      renderResultRows();
      updateSelectionSummary();
    });
  });
  updateSelectionSummary();
}

function setSupportedSelection(selected) {
  if (state.activeCount > 0) return;
  state.items.forEach(item => {
    if (item.template?.supported) item.selected = selected;
  });
  renderRows();
  renderResultRows();
  updateActionButtons();
}

function updateSelectionSummary() {
  const supportedCount = state.items.filter(item => item.template?.supported).length;
  const selectedCount = state.items.filter(item => item.selected && item.template?.supported).length;
  elements.selectionToolbar.hidden = supportedCount <= 1;
  if (!state.items.length) {
    elements.selectionSummary.textContent = "No items loaded.";
  } else {
    elements.selectionSummary.textContent = `${selectedCount} of ${supportedCount} supported ${supportedCount === 1 ? "item" : "items"} selected.`;
  }
  elements.selectAllButton.disabled = !supportedCount || selectedCount === supportedCount || state.activeCount > 0;
  elements.clearSelectionButton.disabled = !selectedCount || state.activeCount > 0;
  updateShortlistCapabilityNotice();
}

function updateShortlistCapabilityNotice() {
  const selectedShortlists = state.items.filter(item => item.selected && item.template?.key === "shortlist");
  if (!selectedShortlists.length || state.hostedFeatureCapability.allowed) {
    elements.shortlistCapabilityNotice.hidden = true;
    elements.shortlistCapabilityNotice.innerHTML = "";
    return;
  }

  const subject = selectedShortlists.length === 1 ? "This Shortlist" : "These Shortlists";
  elements.shortlistCapabilityNotice.innerHTML = `${subject} will use embedded Explorer grids. ${escapeHtml(state.hostedFeatureCapability.reason)}`;
  elements.shortlistCapabilityNotice.hidden = false;
}

function renderResultRows() {
  const resultItems = state.items.filter(item => item.selected && item.template?.supported);
  if (!resultItems.length) {
    elements.resultRows.innerHTML = `<tr><td colspan="5" class="empty">Select items to see conversion results here.</td></tr>`;
    return;
  }

  elements.resultRows.innerHTML = resultItems.map(item => `
    <tr data-item-id="${escapeHtml(item.id)}">
      <td>
        <div class="bulk-row-title">${escapeHtml(item.title)}</div>
        <div class="bulk-row-meta">${escapeHtml(item.id)}</div>
      </td>
      <td>${escapeHtml(item.template.label)}</td>
      <td>${renderTaskStatus(item.status)}</td>
      <td>${escapeHtml(formatDuration(item))}</td>
      <td>${renderResult(item)}</td>
    </tr>
  `).join("");
}

function renderTaskStatus(status) {
  const label = String(status || "Waiting");
  const activeStatuses = new Set([
    "Queued",
    "Starting",
    "Validating token",
    "Analyzing",
    "Analyzed, creating",
    "Creating",
  ]);

  if (!activeStatuses.has(label)) {
    return `<span class="bulk-task-status">${escapeHtml(label)}</span>`;
  }

  return `
    <span class="bulk-task-status is-active" role="status" aria-label="${escapeHtml(label)}">
      <span class="bulk-task-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function renderRecipeDisclosure(item) {
  const template = item.template;
  if (!template) return "";
  const shortlistCreates = state.hostedFeatureCapability.allowed
    ? "One categorized Explorer tour backed by a hosted point feature layer."
    : "Embedded Explorer grid blocks, one per category, because this account cannot publish the required hosted feature layer.";
  const creates = template.key === "shortlist" ? shortlistCreates : template.recipe;
  return `
      <details class="recipe-details">
        <summary>Conversion details</summary>
        <div class="recipe-panel">
          <dl>
            <div><dt>Creates</dt><dd>${escapeHtml(template.target)} · ${escapeHtml(creates)}</dd></div>
            <div><dt>Preserves</dt><dd>${escapeHtml(template.preserves)}</dd></div>
            <div><dt>Review</dt><dd>${escapeHtml(template.review)}</dd></div>
          </dl>
        </div>
      </details>
  `;
}

function renderTemplate(item) {
  if (!item.template) return `<span class="template-pill muted">Not Classic</span>`;
  if (!item.template.supported) return `<span class="template-pill coming-soon">${escapeHtml(item.template.label)} · Unavailable</span>`;
  return `
    <div class="template-mapping">
      <span class="template-pill">${escapeHtml(item.template.label)}</span>
      <span class="template-recipe"><span aria-hidden="true">→</span> ${escapeHtml(item.template.recipe)}</span>
      ${renderRecipeDisclosure(item)}
    </div>
  `;
}

function renderPriorConversionSignal(item) {
  if (item.priorConversionStatus === "checking") {
    return `<div class="bulk-row-meta">Checking for prior converted drafts...</div>`;
  }
  if (item.priorConversionStatus === "error") {
    return `<div class="bulk-row-warning">Could not check for prior converted drafts.</div>`;
  }
  if (!item.priorConversions?.length) return "";

  const first = item.priorConversions[0];
  const countLabel = item.priorConversions.length === 1 ? "Existing converted draft" : `${item.priorConversions.length} existing converted drafts`;
  return `
    <div class="prior-conversion-signal">
      <span class="template-pill prior">${escapeHtml(countLabel)}</span>
      <a class="bulk-row-link" href="${escapeHtml(first.url)}" target="_blank" rel="noreferrer">Open latest</a>
    </div>
  `;
}

function renderExistingReplacementSignal(item) {
  if (hasReplacementKeyword(item) && !item.existingReplacement) {
    return `<div class="bulk-row-warning">Replacement is already configured for this Classic item.</div>`;
  }
  if (!item.existingReplacement) return "";

  return `
    <div class="prior-conversion-signal">
      <span class="template-pill prior">Replacement already configured</span>
      <a class="bulk-row-link" href="https://www.arcgis.com/home/item.html?id=${encodeURIComponent(item.existingReplacement.id)}" target="_blank" rel="noreferrer">Open replacement</a>
    </div>
  `;
}

function hasReplacementKeyword(item) {
  return (item.typeKeywords || []).some(keyword => String(keyword).toLowerCase() === "hasreplacementitem");
}

function renderResult(item) {
  const parts = [];
  if (item.result) parts.push(`<div>${escapeHtml(item.result)}</div>`);
  if (item.theme?.label) {
    const matchLabel = item.theme.matchType === "featured" ? "featured match" : "built-in match";
    parts.push(`<div class="bulk-row-meta">Theme: ${escapeHtml(item.theme.label)} · ${matchLabel}</div>`);
  }
  if (item.warnings?.length) parts.push(`<div class="bulk-row-warning">${item.warnings.map(escapeHtml).join("<br>")}</div>`);
  const links = [];
  if (item.createdItemUrl) links.push(renderResultLink("Open converted draft", item.createdItemUrl, "converted draft"));
  if (item.hostedFeatureLayerUrl) links.push(renderResultLink("Open hosted Feature Layer", item.hostedFeatureLayerUrl, "hosted Feature Layer"));
  if (links.length) parts.push(`<div class="bulk-result-links">${links.join("")}<span class="copy-link-status" aria-live="polite"></span></div>`);
  if (item.createdItemId) parts.push(`<div class="bulk-row-meta">After publishing, open the Classic item in ArcGIS and choose <strong>Select replacement</strong>.</div>`);
  return parts.join("") || "Waiting";
}

function renderResultLink(label, url, copyLabel) {
  return `
    <div class="bulk-result-link-row">
      <a class="bulk-row-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>
      <button class="copy-link-button" type="button" data-copy-url="${escapeHtml(url)}" data-copy-label="${escapeHtml(copyLabel)}" aria-label="Copy ${escapeHtml(copyLabel)} URL" title="Copy URL">
        ${getCopyLinkIcon(false)}
      </button>
    </div>
  `;
}

async function handleResultLinkCopy(event) {
  const button = event.target.closest("button[data-copy-url]");
  if (!button || !elements.resultRows.contains(button)) return;

  const label = button.dataset.copyLabel || "link";
  const status = button.closest(".bulk-result-links")?.querySelector(".copy-link-status");
  try {
    await navigator.clipboard.writeText(button.dataset.copyUrl || "");
    button.innerHTML = getCopyLinkIcon(true);
    button.setAttribute("aria-label", `${label} URL copied`);
    button.title = "Copied";
    button.classList.add("is-copied");
    if (status) status.textContent = `${label} URL copied.`;
    window.clearTimeout(button.copyResetTimer);
    button.copyResetTimer = window.setTimeout(() => {
      button.innerHTML = getCopyLinkIcon(false);
      button.setAttribute("aria-label", `Copy ${label} URL`);
      button.title = "Copy URL";
      button.classList.remove("is-copied");
      if (status) status.textContent = "";
    }, 1800);
  } catch {
    if (status) status.textContent = `Could not copy the ${label} URL.`;
  }
}

function getCopyLinkIcon(copied) {
  return copied
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="2"></rect><path d="M15 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path></svg>`;
}

function updateActionButtons() {
  const selectedItems = state.items.filter(item => item.selected && item.template?.supported);
  const hasSelected = selectedItems.length > 0;
  const hasSource = hasParsedSource(parseSourceInput(elements.groupInput.value));
  elements.loadGroupButton.disabled = !state.tokenValid || !hasSource || state.activeCount > 0;
  elements.createSelectedButton.disabled = !hasSelected || !state.tokenValid || state.activeCount > 0;
  elements.startAnotherButton.disabled = state.activeCount > 0;
  updateSelectionSummary();
}

function enqueueSelected(create) {
  if (!state.tokenValid) {
    setStatus("Paste a valid ArcGIS token before running bulk tasks.", "warn");
    return;
  }

  state.queue = state.items
    .filter(item => item.selected && item.template?.supported)
    .map(item => ({
      itemId: item.id,
      token: state.token,
      create,
    }));
  state.batch = {
    create,
    itemIds: state.queue.map(task => task.itemId),
  };

  collapseStep(
    elements.stepItems,
    elements.stepItemsBody,
    elements.stepItemsSummary,
    `${state.queue.length} selected ${state.queue.length === 1 ? "item" : "items"} queued for conversion`
  );
  elements.stepResults.hidden = false;
  const queuedAt = Date.now();
  state.queue.forEach(task => updateItem(task.itemId, {
    status: "Queued",
    result: "",
    warnings: [],
    createdItemUrl: "",
    hostedFeatureLayerUrl: "",
    startedAt: queuedAt,
    finishedAt: 0,
  }));
  setStatus(`Queued ${state.queue.length} ${create ? "create" : "analyze"} tasks.`, "good");
  updateActionButtons();
  pumpQueue();
}

function pumpQueue() {
  while (state.activeCount < CONCURRENCY && state.queue.length) {
    const task = state.queue.shift();
    startWorker(task);
  }
  if (!state.activeCount && !state.queue.length) {
    if (state.batch) completeBatch();
    updateActionButtons();
  }
}

function completeBatch() {
  const batch = state.batch;
  state.batch = null;
  const items = batch.itemIds
    .map(itemId => state.items.find(item => item.id === itemId))
    .filter(Boolean);
  const failures = items.filter(item => item.status === "Error").length;
  const warnings = items.filter(item => item.warnings?.length).length;
  const completed = items.length - failures;
  const total = items.length;

  if (batch.create) {
    const draftLabel = completed === 1 ? "draft" : "drafts";
    const completion = failures
      ? `${completed} of ${total} ${draftLabel} created; ${failures} failed.`
      : `${completed} ${draftLabel} created${warnings ? " with warnings" : ""}.`;
    setStatus(`Conversion complete: ${completion}`, failures ? (completed ? "warn" : "bad") : warnings ? "warn" : "good");
    return;
  }

  const itemLabel = completed === 1 ? "item" : "items";
  const completion = failures
    ? `${completed} of ${total} ${itemLabel} analyzed; ${failures} failed.`
    : `${completed} ${itemLabel} analyzed${warnings ? " with warnings" : ""}.`;
  setStatus(`Analysis complete: ${completion}`, failures ? (completed ? "warn" : "bad") : warnings ? "warn" : "good");
}

function startWorker(task) {
  state.activeCount += 1;
  updateItem(task.itemId, { status: "Starting", startedAt: Date.now(), finishedAt: 0 });

  const iframe = document.createElement("iframe");
  iframe.className = "worker-frame";
  iframe.dataset.itemId = task.itemId;
  iframe.dataset.create = String(task.create);
  iframe.src = `./worker.html?embedded=1&item=${encodeURIComponent(task.itemId)}`;
  elements.workerHost.appendChild(iframe);
  state.running.set(task.itemId, { iframe, task });
}

function handleWorkerStatus(event) {
  if (event.origin !== window.location.origin) return;
  const message = event.data || {};
  if (message.type !== "classic-converter:status") return;

  const iframe = [...state.running.values()].find(worker => worker.iframe.contentWindow === event.source)?.iframe;
  const itemId = message.itemId || iframe?.dataset.itemId || "";
  if (!itemId) return;

  if (message.event === "ready") {
    const worker = state.running.get(itemId);
    if (!worker) return;
    worker.iframe.contentWindow.postMessage({
      type: "classic-converter:run",
      itemId,
      token: worker.task.token,
      create: worker.task.create,
    }, window.location.origin);
    return;
  }

  if (message.event === "validating-token") updateItem(itemId, { status: "Validating token" });
  if (message.event === "analyzing") updateItem(itemId, { status: "Analyzing" });
  if (message.event === "creating") updateItem(itemId, { status: "Creating" });
  if (message.event === "analyzed") {
    const worker = state.running.get(itemId);
    updateItem(itemId, {
      status: worker?.task.create ? "Analyzed, creating" : "Analyzed",
      result: `${message.template} → ${message.outputKind}`,
      outputKind: message.outputKind || "",
      theme: message.theme || null,
      warnings: message.warnings || [],
      finishedAt: worker?.task.create ? 0 : Date.now(),
    });
    if (!worker?.task.create) {
      finishWorker(itemId);
    }
  }
  if (message.event === "created") {
    updateItem(itemId, {
      status: "Created",
      result: `${message.template} → ${message.outputKind}`,
      outputKind: message.outputKind || "",
      theme: message.theme || null,
      warnings: message.warnings || [],
      createdItemUrl: message.builderUrl || message.itemUrl,
      hostedFeatureLayerUrl: message.hostedFeatureLayerUrl || "",
      finishedAt: Date.now(),
    });
    finishWorker(itemId);
  }
  if (message.event === "error") {
    updateItem(itemId, {
      status: "Error",
      result: message.message || "Task failed.",
      finishedAt: Date.now(),
    });
    finishWorker(itemId);
  }
}

function finishWorker(itemId) {
  const worker = state.running.get(itemId);
  if (worker) {
    worker.iframe.remove();
    state.running.delete(itemId);
    state.activeCount = Math.max(0, state.activeCount - 1);
  }
  pumpQueue();
}

function updateItem(itemId, patch) {
  const item = state.items.find(candidate => candidate.id === itemId);
  if (!item) return;
  Object.assign(item, patch);
  renderRows();
  renderResultRows();
}

function setBusy(button, isBusy, label) {
  button.disabled = isBusy;
  button.setAttribute("aria-busy", String(isBusy));
  if (label) button.textContent = label;
}

function collapseStep(panel, body, summary, text) {
  panel.classList.add("is-collapsed");
  body.hidden = true;
  summary.textContent = text;
  summary.hidden = false;
  const editButton = panel.querySelector(".step-edit");
  if (editButton) editButton.hidden = false;
}

function expandStep(panel, body, summary) {
  panel.classList.remove("is-collapsed");
  body.hidden = false;
  summary.textContent = "";
  summary.hidden = true;
  const editButton = panel.querySelector(".step-edit");
  if (editButton) editButton.hidden = true;
}

function detectClassicTemplate(item) {
  const keywords = (item.typeKeywords || []).map(keyword => String(keyword).toLowerCase());
  if (item.type !== "Web Mapping Application") return null;
  return CLASSIC_TEMPLATES.find(template =>
    template.keywords.some(keyword => keywords.includes(keyword.toLowerCase()))
  ) || null;
}

async function fetchSourceItems(source, token) {
  if (source.kind === "items") {
    const items = await Promise.all(source.ids.map(itemId => fetchItemInfo(itemId, token)));
    return { mode: "items", items };
  }

  if (source.kind === "item") {
    return { mode: "item", items: [await fetchItemInfo(source.id, token)] };
  }

  if (source.kind === "group") {
    return { mode: "group", items: await fetchGroupItems(source.id, token) };
  }

  try {
    return { mode: "item", items: [await fetchItemInfo(source.id, token)] };
  } catch {
    return { mode: "group", items: await fetchGroupItems(source.id, token) };
  }
}

async function fetchItemInfo(itemId, token) {
  const url = new URL(`${ARCGIS_ROOT}/content/items/${encodeURIComponent(itemId)}`);
  url.searchParams.set("f", "json");
  if (token) url.searchParams.set("token", token);
  const response = await fetch(url);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not read item.");
  return json;
}

function createConversionItem(item) {
  const template = detectClassicTemplate(item);
  return {
    id: item.id,
    title: item.title || item.id,
    owner: item.owner || "",
    orgId: item.orgId || "",
    ownerOrgId: item.ownerOrgId || "",
    itemControl: item.itemControl || "",
    url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
    template,
    selected: Boolean(template?.supported),
    status: template ? "Ready" : "Not Classic",
    result: "",
    outputKind: "",
    theme: null,
    warnings: [],
    createdItemUrl: "",
    typeKeywords: item.typeKeywords || [],
    existingReplacement: null,
    existingReplacementStatus: template?.supported ? "unchecked" : "skipped",
    priorConversions: [],
    priorConversionStatus: template?.supported ? "unchecked" : "skipped",
    startedAt: 0,
    finishedAt: 0,
  };
}

async function attachExistingReplacementSignals(items, token) {
  const supportedItems = items.filter(item => item.template?.supported);
  if (!supportedItems.length || !token) return;

  await Promise.all(supportedItems.map(async item => {
    item.existingReplacementStatus = "checking";
    try {
      item.existingReplacement = await fetchExistingReplacement(item.id, token);
      item.existingReplacementStatus = "checked";
    } catch {
      item.existingReplacement = null;
      item.existingReplacementStatus = "error";
    }
  }));
}

async function fetchExistingReplacement(sourceItemId, token) {
  const url = new URL(`${ARCGIS_ROOT}/content/items/${encodeURIComponent(sourceItemId)}/relatedItems`);
  url.searchParams.set("f", "json");
  url.searchParams.set("relationshipTypes", "ReplacementItem2Item");
  url.searchParams.set("direction", "reverse");
  url.searchParams.set("num", "10");
  url.searchParams.set("start", "1");
  url.searchParams.set("token", token);

  const response = await fetch(url);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not check for an existing replacement item.");
  return (json.relatedItems || []).find(item => item?.id) || null;
}

async function attachPriorConversionSignals(items, username, token) {
  const supportedItems = items.filter(item => item.template?.supported);
  if (!supportedItems.length || !username || !token) return;

  await Promise.all(supportedItems.map(async item => {
    item.priorConversionStatus = "checking";
    try {
      item.priorConversions = await fetchPriorConversions(item.id, username, token);
      item.priorConversionStatus = "checked";
    } catch {
      item.priorConversions = [];
      item.priorConversionStatus = "error";
    }
  }));
}

async function fetchPriorConversions(sourceItemId, username, token) {
  const keyword = `classic-source-${sourceItemId}`;
  const url = new URL(`${ARCGIS_ROOT}/search`);
  url.searchParams.set("f", "json");
  url.searchParams.set("q", `owner:${username} typekeywords:"${keyword}"`);
  url.searchParams.set("num", "10");
  url.searchParams.set("sortField", "modified");
  url.searchParams.set("sortOrder", "desc");
  url.searchParams.set("token", token);

  const response = await fetch(url);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not check for prior converted drafts.");
  return (json.results || [])
    .filter(candidate => candidate.id !== sourceItemId && (candidate.typeKeywords || []).some(typeKeyword => String(typeKeyword).toLowerCase() === keyword.toLowerCase()))
    .map(candidate => ({
      id: candidate.id,
      title: candidate.title || candidate.id,
      modified: candidate.modified || 0,
      url: `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(candidate.id)}`,
    }));
}

function parseSourceInput(input) {
  const value = input.trim();
  if (!value) return { kind: "", id: "", ids: [] };

  try {
    const url = new URL(value);
    const items = parseItemIds(url.searchParams.get("items") || "");
    const id = url.searchParams.get("id");
    const appId = url.searchParams.get("appid");
    const group = url.searchParams.get("group");
    const pathname = url.pathname.toLowerCase();

    if (items.length) return { kind: "items", id: items[0], ids: items };
    if (group && isArcGisId(group)) return { kind: "group", id: group };
    if (pathname.includes("/group") && id && isArcGisId(id)) return { kind: "group", id };
    if (appId && isArcGisId(appId)) return { kind: "item", id: appId };
    if (id && isArcGisId(id)) return { kind: "item", id };
  } catch {
    // Fall through to plain id extraction.
  }

  const ids = parseItemIds(value);
  if (ids.length > 1) return { kind: "items", id: ids[0], ids };
  return ids.length === 1 ? { kind: "unknown", id: ids[0], ids } : { kind: "", id: "", ids: [] };
}

function parseItemIds(value) {
  return [...new Set((String(value || "").match(/[a-f0-9]{32}/gi) || []).map(id => id.toLowerCase()))].slice(0, 50);
}

function hasParsedSource(source) {
  return Boolean(source.id || source.ids?.length);
}

function getSourceLabel(source) {
  if (source.kind === "items") return `${source.ids.length} selected item ids`;
  return source.id;
}

function getLoadedSourceSummary(mode, itemCount, source) {
  if (mode === "item") return "One item";
  if (mode === "items") return `${itemCount} selected ${itemCount === 1 ? "item" : "items"}`;
  return `Group ${source.id}`;
}

function initializeSourceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const handoff = readConverterHandoff();
  const items = parseItemIds(params.get("items") || handoff?.itemIds?.join(",") || "");
  const token = params.get("token") || handoff?.token || "";
  const allowManualEntry = params.get("manual") === "1";

  if (!items.length && !allowManualEntry) {
    window.location.replace("./index.html");
    return;
  }

  params.delete("manual");

  if (items.length) {
    elements.groupInput.value = items.join(", ");
    params.delete("items");
  }

  if (token) {
    elements.tokenInput.value = token;
    params.delete("token");
    showPassedToken(handoff?.username || "");
    validateToken(token);
  }

  if (items.length || token || allowManualEntry) {
    const nextQuery = params.toString();
    window.history.replaceState({}, document.title, `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`);
  }

  updateActionButtons();
}

function readConverterHandoff() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(CONVERTER_HANDOFF_KEY) || "null");
    if (!value || !Array.isArray(value.itemIds)) return null;
    const isExpired = value.token && Number(value.expiresAt || 0) <= Date.now();
    if (isExpired || Date.now() - Number(value.createdAt || 0) > 12 * 60 * 60 * 1000) {
      window.sessionStorage.removeItem(CONVERTER_HANDOFF_KEY);
      return null;
    }
    return {
      itemIds: parseItemIds(value.itemIds.join(",")),
      token: typeof value.token === "string" ? value.token : "",
      username: typeof value.username === "string" ? value.username : "",
    };
  } catch {
    window.sessionStorage.removeItem(CONVERTER_HANDOFF_KEY);
    return null;
  }
}

function isArcGisId(value) {
  return /^[a-f0-9]{32}$/i.test(String(value || ""));
}

function assertArcGisSuccess(json, fallback) {
  if (!json) throw new Error(fallback);
  if (json.error) {
    const message = json.error.message || fallback;
    const details = Array.isArray(json.error.details) && json.error.details.length ? ` ${json.error.details.join(" ")}` : "";
    throw new Error(`${message}${details}`);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDuration(item) {
  if (!item.startedAt) return "Not started";
  const end = item.finishedAt || Date.now();
  const seconds = Math.max(0, Math.round((end - item.startedAt) / 1000));
  if (seconds < 1) return item.finishedAt ? "<1s" : "Running";
  if (seconds < 60) return item.finishedAt ? `${seconds}s` : `${seconds}s so far`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return item.finishedAt ? `${minutes}m ${remainder}s` : `${minutes}m ${remainder}s so far`;
}

function getTokenExpiryText(appInfo) {
  const expires = Number(appInfo?.expires);
  if (!Number.isFinite(expires)) return "Expiration not reported.";
  const remainingMs = expires - Date.now();
  if (remainingMs <= 0) return "Token appears expired.";
  const minutes = Math.round(remainingMs / 60000);
  if (minutes < 120) return `About ${minutes} minutes remaining.`;
  return `About ${Math.round(minutes / 60)} hours remaining.`;
}

updateActionButtons();
