// packages/storytoolkit/src/classic-converter/template-registry.js
function createClassicConverters({
  fetchRelatedMapTourContext: fetchRelatedMapTourContext2,
  fetchRelatedShortlistContext: fetchRelatedShortlistContext2,
  fetchRelatedSwipeContext: fetchRelatedSwipeContext2,
  fetchRelatedMapJournalContext: fetchRelatedMapJournalContext2,
  fetchRelatedMapSeriesContext: fetchRelatedMapSeriesContext2,
  fetchNoRelatedContext: fetchNoRelatedContext2,
  buildMapTourMigrationRecipe: buildMapTourMigrationRecipe2,
  buildShortlistMigrationRecipe: buildShortlistMigrationRecipe2,
  buildSwipeMigrationRecipe: buildSwipeMigrationRecipe2,
  buildMapSeriesMigrationRecipe: buildMapSeriesMigrationRecipe2,
  buildMapJournalMigrationRecipe: buildMapJournalMigrationRecipe2,
  buildCascadeMigrationRecipe: buildCascadeMigrationRecipe2,
  buildMapTourAgsmJson: buildMapTourAgsmJson2,
  buildShortlistAgsmJson: buildShortlistAgsmJson2,
  buildSwipeAgsmJson: buildSwipeAgsmJson2,
  buildMapSeriesAgsmJson: buildMapSeriesAgsmJson2,
  buildMapJournalAgsmJson: buildMapJournalAgsmJson2,
  buildCascadeAgsmJson: buildCascadeAgsmJson2
}) {
  return [
    {
      key: "maptour",
      label: "Classic Map Tour",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["maptour"],
      target: "Story with guided map tour",
      description: "Converts tour stops into one guided map tour block.",
      getRelatedContext: fetchRelatedMapTourContext2,
      analyze: buildMapTourMigrationRecipe2,
      buildDraft: buildMapTourAgsmJson2
    },
    {
      key: "shortlist",
      label: "Classic Shortlist",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["shortlist"],
      target: "Story with an Explorer grid tour",
      description: "Creates a data-driven categorized Explorer grid when hosted publishing is allowed, with embedded Explorer grids as the fallback.",
      getRelatedContext: fetchRelatedShortlistContext2,
      analyze: buildShortlistMigrationRecipe2,
      buildDraft: buildShortlistAgsmJson2
    },
    {
      key: "mapjournal",
      label: "Classic Map Journal",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["mapjournal"],
      target: "Story with sidecar slides",
      description: "Converts published journal sections into sidecar slides.",
      getRelatedContext: fetchRelatedMapJournalContext2,
      analyze: buildMapJournalMigrationRecipe2,
      buildDraft: buildMapJournalAgsmJson2
    },
    {
      key: "cascade",
      label: "Classic Cascade",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["cascade"],
      target: "Long-form immersive story",
      description: "Converts sequences and immersive views into a long-form story.",
      getRelatedContext: fetchNoRelatedContext2,
      analyze: buildCascadeMigrationRecipe2,
      buildDraft: buildCascadeAgsmJson2
    },
    {
      key: "swipe",
      label: "Classic Swipe",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["swipespyglass"],
      target: "Story or briefing with swipe block",
      description: "Converts two-web-map Swipe apps into a Story with one swipe block.",
      getRelatedContext: fetchRelatedSwipeContext2,
      analyze: buildSwipeMigrationRecipe2,
      buildDraft: buildSwipeAgsmJson2
    },
    {
      key: "mapseries",
      label: "Classic Map Series",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["mapseries"],
      target: "Collection or story with sidecar",
      description: "Creates native Collection maps or a single sidecar with narrative panels and navigation.",
      getRelatedContext: fetchRelatedMapSeriesContext2,
      analyze: buildMapSeriesMigrationRecipe2,
      buildDraft: buildMapSeriesAgsmJson2
    }
  ];
}

// packages/storytoolkit/src/classic-converter/agsm-validator.js
var BLOCK_SCHEMA_PATHS = {
  "action-button": "action-button/schema.json",
  audio: "audio/schema.json",
  button: "button/schema.json",
  chart: "chart/schema.json",
  embed: "embed/schema.json",
  gallery: "gallery/schema.json",
  grid: "grid/schema.json",
  image: "image/schema.json",
  image360: "image360/schema.json",
  "large-number": "large-number/schema.json",
  pictograph: "pictograph/schema.json",
  quiz: "quiz/schema.json",
  "quiz-question": "quiz-question/schema.json",
  swipe: "swipe/schema.json",
  tour: "maptour/schema.json",
  "tour-map": "tourmap/schema.json",
  webmap: "webmap/schema.json",
  "word-cloud": "word-cloud/schema.json"
};
async function createAgsmDraftValidator(options = {}) {
  const schemaRoot = options.schemaRoot || "./schemas";
  const schemas = {};
  await Promise.all(
    Object.entries(BLOCK_SCHEMA_PATHS).map(async ([nodeType, path]) => {
      const response = await fetch(`${schemaRoot.replace(/\/$/, "")}/${path}`);
      if (!response.ok) {
        throw new Error(`Could not load AGSM validation schema for ${nodeType}.`);
      }
      schemas[nodeType] = await response.json();
    })
  );
  return {
    validateDraft(draftJson) {
      return validateAgsmDraft(draftJson, schemas);
    }
  };
}
function validateAgsmDraft(draftJson, schemas) {
  const errors = [];
  const warnings = [];
  const checkedNodeTypes = /* @__PURE__ */ new Set();
  const skippedNodeTypes = /* @__PURE__ */ new Set();
  if (!isPlainObject(draftJson)) {
    return {
      valid: false,
      errors: ["Draft JSON must be an object."],
      warnings,
      checkedNodeTypes: [],
      skippedNodeTypes: []
    };
  }
  const nodes = isPlainObject(draftJson.nodes) ? draftJson.nodes : {};
  const resources = isPlainObject(draftJson.resources) ? draftJson.resources : {};
  const rootNode = nodes[draftJson.root];
  if (!draftJson.root) errors.push("Draft JSON is missing root.");
  if (draftJson.root && !rootNode) errors.push(`Root node ${draftJson.root} does not exist in nodes.`);
  if (rootNode && !isAgsmRootNodeType(rootNode.type)) {
    errors.push(`Root node ${draftJson.root} must be a story, briefing, frame, or collection node.`);
  }
  if (Array.isArray(draftJson.actions)) {
    validateActions(draftJson.actions, nodes, errors);
  }
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!isPlainObject(node)) {
      errors.push(`${nodeId} must be an object.`);
      continue;
    }
    const schema = schemas[node.type];
    if (schema) {
      checkedNodeTypes.add(node.type);
      const schemaErrors = validateValue(node, schema, schema, nodeId);
      errors.push(...schemaErrors);
    } else {
      skippedNodeTypes.add(node.type || "unknown");
    }
    validateCommonNodeReferences(nodeId, node, nodes, resources, errors);
  }
  if (skippedNodeTypes.size) {
    warnings.push(`No supplied schema for node types: ${Array.from(skippedNodeTypes).sort().join(", ")}.`);
  }
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    checkedNodeTypes: Array.from(checkedNodeTypes).sort(),
    skippedNodeTypes: Array.from(skippedNodeTypes).sort()
  };
}
function validateCommonNodeReferences(nodeId, node, nodes, resources, errors) {
  if (Array.isArray(node.children)) {
    for (const childId of node.children) {
      if (!nodes[childId]) errors.push(`${nodeId}.children references missing node ${childId}.`);
    }
  }
  if (isAgsmRootNodeType(node.type) && node.data?.storyTheme && !resources[node.data.storyTheme]) {
    errors.push(`${nodeId}.data.storyTheme references missing resource ${node.data.storyTheme}.`);
  }
  if (isAgsmRootNodeType(node.type) && node.data?.storyLogoResource) {
    const resource = resources[node.data.storyLogoResource];
    if (!resource) {
      errors.push(`${nodeId}.data.storyLogoResource references missing resource ${node.data.storyLogoResource}.`);
    } else if (resource.type !== "image") {
      errors.push(`${nodeId}.data.storyLogoResource must reference an image resource.`);
    }
  }
  if (node.type === "navigation" && Array.isArray(node.data?.links)) {
    for (const link of node.data.links) {
      if (link?.nodeId && !nodes[link.nodeId]) {
        errors.push(`${nodeId}.data.links references missing node ${link.nodeId}.`);
      }
    }
  }
  if (node.type === "collection-ui" && Array.isArray(node.data?.items)) {
    for (const item of node.data.items) {
      if (item?.nodeId && !nodes[item.nodeId]) {
        errors.push(`${nodeId}.data.items references missing node ${item.nodeId}.`);
      }
    }
  }
  if (node.type === "quiz-question" && Array.isArray(node.data?.answers) && node.data?.correctAnswer) {
    const answerIds = new Set(node.data.answers.map((answer) => answer?.id).filter(Boolean));
    if (!answerIds.has(node.data.correctAnswer)) {
      errors.push(`${nodeId}.data.correctAnswer does not match an answer id.`);
    }
  }
  if (node.type === "image" && node.data?.image && !resources[node.data.image]) {
    errors.push(`${nodeId}.data.image references missing resource ${node.data.image}.`);
  }
  if (node.type === "webmap" && node.data?.map && !resources[node.data.map]) {
    errors.push(`${nodeId}.data.map references missing resource ${node.data.map}.`);
  }
  if (node.type === "image360" && node.data?.image360) {
    const resource = resources[node.data.image360];
    if (!resource) {
      errors.push(`${nodeId}.data.image360 references missing resource ${node.data.image360}.`);
    } else if (resource.type !== "image360") {
      errors.push(`${nodeId}.data.image360 must reference an image360 resource.`);
    }
  }
  if (node.type === "chart" && node.data?.chart) {
    const resource = resources[node.data.chart];
    if (!resource) {
      errors.push(`${nodeId}.data.chart references missing resource ${node.data.chart}.`);
    } else if (resource.type !== "json") {
      errors.push(`${nodeId}.data.chart must reference a json resource.`);
    }
  }
  if (node.type === "word-cloud" && node.data?.wordResource) {
    const resource = resources[node.data.wordResource];
    if (!resource) {
      errors.push(`${nodeId}.data.wordResource references missing resource ${node.data.wordResource}.`);
    } else if (resource.type !== "json") {
      errors.push(`${nodeId}.data.wordResource must reference a json resource.`);
    }
  }
  if (node.type === "action-button" && node.dependents?.actionMedia && !nodes[node.dependents.actionMedia]) {
    errors.push(`${nodeId}.dependents.actionMedia references missing node ${node.dependents.actionMedia}.`);
  }
  if (node.type === "swipe") {
    for (const contentNodeId of Object.values(node.data?.contents || {})) {
      if (contentNodeId && !nodes[contentNodeId]) {
        errors.push(`${nodeId}.data.contents references missing node ${contentNodeId}.`);
      }
    }
    for (const legendNodeId of node.data?.legend || []) {
      if (legendNodeId && !nodes[legendNodeId]) {
        errors.push(`${nodeId}.data.legend references missing node ${legendNodeId}.`);
      }
    }
  }
  if (node.type === "tour") {
    const tourMapNode = node.data?.map ? nodes[node.data.map] : null;
    const geometries = tourMapNode?.data?.geometries || {};
    if (node.data?.map && !tourMapNode) errors.push(`${nodeId}.data.map references missing node ${node.data.map}.`);
    for (const place of node.data?.places || []) {
      if (place?.featureId && !geometries[place.featureId]) {
        errors.push(`${nodeId}.data.places references missing tour geometry ${place.featureId}.`);
      }
      if (place?.title && !nodes[place.title]) errors.push(`${nodeId}.data.places references missing title node ${place.title}.`);
      if (place?.media && !nodes[place.media]) errors.push(`${nodeId}.data.places references missing media node ${place.media}.`);
      for (const contentNodeId of place?.contents || []) {
        if (!nodes[contentNodeId]) errors.push(`${nodeId}.data.places references missing content node ${contentNodeId}.`);
      }
    }
  }
}
function validateActions(actions, nodes, errors) {
  actions.forEach((action, index) => {
    const path = `actions[${index}]`;
    if (!isPlainObject(action)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (action.origin && !nodes[action.origin]) errors.push(`${path}.origin references missing node ${action.origin}.`);
    if (action.target && !nodes[action.target]) errors.push(`${path}.target references missing node ${action.target}.`);
    if (action.data?.media && !nodes[action.data.media]) errors.push(`${path}.data.media references missing node ${action.data.media}.`);
  });
}
function isAgsmRootNodeType(type) {
  return type === "story" || type === "briefing" || type === "frame" || type === "collection";
}
function validateValue(value, schema, rootSchema, path) {
  const errors = [];
  validateValueInto(value, schema, rootSchema, path, errors);
  return errors;
}
function validateValueInto(value, schema, rootSchema, path, errors) {
  if (!schema) return;
  if (schema.$ref) {
    validateValueInto(value, resolveRef(schema.$ref, rootSchema), rootSchema, path, errors);
    return;
  }
  if (Array.isArray(schema.allOf)) {
    for (const part of schema.allOf) validateValueInto(value, part, rootSchema, path, errors);
  }
  if (Array.isArray(schema.oneOf)) {
    const branchResults = schema.oneOf.map((part) => validateValue(value, part, rootSchema, path));
    const validBranches = branchResults.filter((branchErrors) => branchErrors.length === 0);
    if (validBranches.length !== 1) {
      errors.push(`${path} must match exactly one valid schema option.`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(schema, "const") && value !== schema.const) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}.`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}.`);
  }
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${path} must be ${Array.isArray(schema.type) ? schema.type.join(" or ") : schema.type}.`);
    return;
  }
  if (typeof schema.minimum === "number" && typeof value === "number" && value < schema.minimum) {
    errors.push(`${path} must be at least ${schema.minimum}.`);
  }
  if (schema.type === "object" || isPlainObject(value)) {
    validateObject(value, schema, rootSchema, path, errors);
  }
  if (schema.type === "array" || Array.isArray(value)) {
    validateArray(value, schema, rootSchema, path, errors);
  }
}
function validateObject(value, schema, rootSchema, path, errors) {
  if (!isPlainObject(value)) return;
  const properties = schema.properties || {};
  for (const requiredKey of schema.required || []) {
    if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
      errors.push(`${path}.${requiredKey} is required.`);
    }
  }
  for (const [key, propertySchema] of Object.entries(properties)) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      validateValueInto(value[key], propertySchema, rootSchema, `${path}.${key}`, errors);
    }
  }
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(value)) {
      if (!Object.prototype.hasOwnProperty.call(properties, key)) {
        errors.push(`${path}.${key} is not allowed by the schema.`);
      }
    }
  }
}
function validateArray(value, schema, rootSchema, path, errors) {
  if (!Array.isArray(value)) return;
  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
    errors.push(`${path} must contain no more than ${schema.maxItems} items.`);
  }
  if (schema.items) {
    value.forEach((item, index) => validateValueInto(item, schema.items, rootSchema, `${path}[${index}]`, errors));
  }
}
function resolveRef(ref, rootSchema) {
  if (!ref.startsWith("#/")) throw new Error(`Unsupported external schema ref ${ref}.`);
  return ref.slice(2).split("/").reduce((current, segment) => current?.[segment], rootSchema);
}
function matchesType(value, type) {
  if (Array.isArray(type)) return type.some((candidate) => matchesType(value, candidate));
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isPlainObject(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return true;
}
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// packages/storytoolkit/src/classic-converter/conversion-access.js
var CLASSIC_CONVERSION_RESTRICTION = "You can view this story, but conversion is limited to stories you own or can access within your ArcGIS organization. Public access alone does not allow conversion.";
function canConvertClassicItem(item, user) {
  if (!user?.username || !item?.owner) return false;
  if (item.owner.toLowerCase() === user.username.toLowerCase()) return true;
  const sourceOrgId = item.orgId || item.ownerOrgId;
  return Boolean(user.orgId && sourceOrgId && user.orgId === sourceOrgId);
}
async function checkClassicConversionAccess(item, user, token) {
  if (!token || !user?.username || !item?.owner) return false;
  if (canConvertClassicItem(item, user)) return true;
  const read = async (path) => {
    const url = new URL(`https://www.arcgis.com/sharing/rest/${path}`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || json.error) throw new Error("Could not verify conversion access.");
    return json;
  };
  try {
    let orgId = user.orgId;
    if (!orgId) {
      const portal = await read("portals/self");
      if (portal.user?.username?.toLowerCase() !== user.username.toLowerCase()) return false;
      orgId = portal.user.orgId || portal.id;
    }
    if (!orgId) return false;
    let ownerOrgId = item.orgId || item.ownerOrgId;
    if (!ownerOrgId) {
      const owner = await read(`community/users/${encodeURIComponent(item.owner)}`);
      if (owner.username?.toLowerCase() !== item.owner.toLowerCase()) return false;
      ownerOrgId = owner.orgId;
    }
    return canConvertClassicItem({ ...item, ownerOrgId }, { ...user, orgId });
  } catch {
    return false;
  }
}

// packages/storytoolkit/src/classic-converter/app.js
var ARCGIS_ROOT = "https://www.arcgis.com/sharing/rest";
var IMAGE_RESOURCE_FOLDER = "classic-converter-images";
var MISSING_IMAGE_PLACEHOLDER_URL = "https://storymaps.arcgis.com/static/images/story-themes/media-panel/placeholder-images/topo.png";
var IMAGE_LOAD_TIMEOUT_MS = 3500;
var HOSTED_FEATURE_PRIVILEGES = [
  "portal:user:createItem",
  "portal:publisher:publishFeatures"
];
var HOSTED_SHORTLIST_LAYER_ID = 0;
var HOSTED_SHORTLIST_BATCH_SIZE = 200;
var HOSTED_SHORTLIST_FIELDS = [
  { name: "OBJECTID", alias: "OBJECTID", type: "esriFieldTypeOID", nullable: false, editable: false },
  { name: "NAME", alias: "Name", type: "esriFieldTypeString", length: 255, nullable: false, editable: true },
  { name: "DESCRIPTION", alias: "Description", type: "esriFieldTypeString", length: 4e3, nullable: true, editable: true },
  { name: "TAB_NAME", alias: "Category", type: "esriFieldTypeString", length: 255, nullable: true, editable: true },
  { name: "PIC_URL", alias: "Image URL", type: "esriFieldTypeString", length: 2048, nullable: true, editable: true },
  { name: "THUMB_URL", alias: "Thumbnail URL", type: "esriFieldTypeString", length: 2048, nullable: true, editable: true },
  { name: "WEBSITE", alias: "Website", type: "esriFieldTypeString", length: 2048, nullable: true, editable: true },
  { name: "SORT_ORDER", alias: "Sort order", type: "esriFieldTypeInteger", nullable: true, editable: true }
];
var AGSM_TYPE_KEYWORDS = [
  "StoryMap",
  "Web Application",
  "arcgis-storymaps",
  "storytoolkit-app",
  "classic-migration-prototype",
  "smstatusdraft",
  "smdraftresourceid:draft.json"
];
var CLASSIC_CONVERTERS = createClassicConverters({
  fetchRelatedMapTourContext,
  fetchRelatedShortlistContext,
  fetchRelatedSwipeContext,
  fetchRelatedMapJournalContext,
  fetchRelatedMapSeriesContext,
  fetchNoRelatedContext,
  buildMapTourMigrationRecipe,
  buildShortlistMigrationRecipe,
  buildSwipeMigrationRecipe,
  buildMapSeriesMigrationRecipe,
  buildMapJournalMigrationRecipe,
  buildCascadeMigrationRecipe,
  buildMapTourAgsmJson,
  buildShortlistAgsmJson,
  buildSwipeAgsmJson,
  buildMapSeriesAgsmJson,
  buildMapJournalAgsmJson,
  buildCascadeAgsmJson
});
var state = {
  mapSeriesOutput: "collection",
  token: "",
  user: null,
  tokenInfo: null,
  hostedFeatureCapability: createUnavailableHostedFeatureCapability("Hosted feature publishing has not been checked."),
  sourceItem: null,
  sourceData: null,
  recipe: null,
  outputJson: null,
  validation: null,
  priorConversions: []
};
var agsmDraftValidatorPromise = null;
var classicConverterDocument = typeof document === "undefined" ? null : document;
var elements = {
  tokenInput: classicConverterDocument?.querySelector("#tokenInput"),
  validateTokenButton: classicConverterDocument?.querySelector("#validateTokenButton"),
  clearTokenButton: classicConverterDocument?.querySelector("#clearTokenButton"),
  tokenStatus: classicConverterDocument?.querySelector("#tokenStatus"),
  sourceInput: classicConverterDocument?.querySelector("#sourceInput"),
  clearSourceButton: classicConverterDocument?.querySelector("#clearSourceButton"),
  analyzeButton: classicConverterDocument?.querySelector("#analyzeButton"),
  sourceStatus: classicConverterDocument?.querySelector("#sourceStatus"),
  recipeSummary: classicConverterDocument?.querySelector("#recipeSummary"),
  converterSupport: classicConverterDocument?.querySelector("#converterSupport"),
  createButton: classicConverterDocument?.querySelector("#createButton"),
  createStatus: classicConverterDocument?.querySelector("#createStatus"),
  createdItemLink: classicConverterDocument?.querySelector("#createdItemLink"),
  jsonPreview: classicConverterDocument?.querySelector("#jsonPreview")
};
var hasClassicConverterUi = Boolean(
  elements.tokenInput && elements.sourceInput && elements.converterSupport && elements.jsonPreview
);
if (hasClassicConverterUi) {
  elements.validateTokenButton?.addEventListener("click", validateToken);
  elements.clearTokenButton?.addEventListener("click", clearToken);
  elements.clearSourceButton?.addEventListener("click", clearSource);
  elements.analyzeButton?.addEventListener("click", analyzeSource);
  elements.createButton?.addEventListener("click", createPrototypeItem);
  renderConverterSupport();
  updateCreateButton();
  initializeUrlAndMessaging();
}
function setStatus(element, message, tone = "neutral") {
  element.className = `status ${tone}`;
  element.innerHTML = message;
}
function renderJson(value) {
  elements.jsonPreview.textContent = JSON.stringify(value ?? {}, null, 2);
}
function setBusy(button, isBusy, label) {
  button.disabled = isBusy;
  if (label) button.textContent = label;
}
function updateCreateButton() {
  elements.createButton.disabled = !(state.token && state.user?.username && state.outputJson);
}
function clearCreatedItemLink() {
  elements.createdItemLink.hidden = true;
  elements.createdItemLink.innerHTML = "";
}
function initializeUrlAndMessaging() {
  const params = new URLSearchParams(window.location.search);
  const item = params.get("item") || params.get("itemid") || params.get("appid") || "";
  const token = params.get("token") || "";
  const embedded = params.get("embedded") === "1";
  state.mapSeriesOutput = params.get("mapSeriesOutput") === "sidecar" ? "sidecar" : "collection";
  if (item) elements.sourceInput.value = item;
  if (token) {
    elements.tokenInput.value = token;
    scrubTokenFromUrl(params);
  }
  window.addEventListener("message", handleWorkerMessage);
  if (embedded && window.parent !== window) {
    document.body.classList.add("embedded");
    postWorkerMessage({ event: "ready" });
  }
  if (!embedded && (token || item)) {
    queueMicrotask(async () => {
      if (token) await validateToken();
      if (item) await analyzeSource();
    });
  }
}
function scrubTokenFromUrl(params) {
  params.delete("token");
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, document.title, nextUrl);
}
async function handleWorkerMessage(event) {
  if (event.origin !== window.location.origin) return;
  const message = event.data || {};
  if (message.type !== "classic-converter:run") return;
  const item = message.itemId || message.item || "";
  const token = message.token || "";
  const shouldCreate = message.create === true;
  try {
    if (token) elements.tokenInput.value = token;
    if (item) elements.sourceInput.value = item;
    if (message.mapSeriesOutput && !["collection", "sidecar"].includes(message.mapSeriesOutput)) {
      throw new Error("Choose Collection or Story with sidecar for Map Series conversion.");
    }
    state.mapSeriesOutput = message.mapSeriesOutput || "collection";
    postWorkerMessage({ event: "validating-token" });
    const tokenOk = token ? await validateToken() : Boolean(state.token);
    if (!tokenOk) throw new Error("Token validation failed.");
    postWorkerMessage({ event: "analyzing" });
    const analyzed = await analyzeSource();
    if (!analyzed || !state.recipe || !state.outputJson) throw new Error(elements.sourceStatus.textContent || "Source analysis did not produce a draft.");
    postWorkerMessage({
      event: "analyzed",
      itemId: state.recipe.source.id,
      title: state.recipe.source.title,
      template: state.recipe.template.label,
      outputKind: getRecipeOutputKind(state.recipe),
      warnings: state.recipe.warnings
    });
    if (!shouldCreate) return;
    postWorkerMessage({ event: "creating" });
    const created = await createPrototypeItem();
    if (!created) throw new Error(elements.createStatus.textContent || "Create failed.");
    postWorkerMessage({
      event: "created",
      itemId: state.recipe.source.id,
      createdItemId: created.itemId,
      itemUrl: created.itemUrl,
      builderUrl: created.builderUrl,
      draftUrl: created.draftUrl,
      uploadedImageResources: created.uploadedImageResources,
      imageResourceError: created.imageResourceError,
      thumbnailUpdated: created.thumbnailUpdated,
      thumbnailError: created.thumbnailError,
      hostedFeatureLayerItemId: created.hostedFeatureLayerItemId,
      hostedFeatureLayerUrl: created.hostedFeatureLayerUrl,
      title: state.recipe.source.title,
      template: state.recipe.template.label,
      outputKind: getRecipeOutputKind(state.recipe),
      warnings: state.recipe.warnings
    });
  } catch (error) {
    postWorkerMessage({
      event: "error",
      itemId: extractItemId(item),
      message: error.message || "Worker failed."
    });
  }
}
function postWorkerMessage(payload) {
  if (window.parent === window) return;
  window.parent.postMessage({
    type: "classic-converter:status",
    ...payload
  }, window.location.origin);
}
function clearToken() {
  state.token = "";
  state.user = null;
  state.tokenInfo = null;
  state.hostedFeatureCapability = createUnavailableHostedFeatureCapability("Hosted feature publishing has not been checked.");
  elements.tokenInput.value = "";
  setStatus(elements.tokenStatus, "No token validated.");
  updateCreateButton();
}
function clearSource() {
  elements.sourceInput.value = "";
  state.sourceItem = null;
  state.sourceData = null;
  state.recipe = null;
  state.outputJson = null;
  state.validation = null;
  clearCreatedItemLink();
  renderJson({});
  elements.recipeSummary.innerHTML = `<div class="empty">Analyze a Classic item to build a recipe.</div>`;
  setStatus(elements.sourceStatus, "No source analyzed.");
  setStatus(elements.createStatus, "Waiting for a valid token and migration recipe.");
  updateCreateButton();
}
function renderConverterSupport() {
  elements.converterSupport.innerHTML = CLASSIC_CONVERTERS.map((converter) => `
    <article class="support-card">
      <span>${escapeHtml(converter.target)}</span>
      <strong>${escapeHtml(converter.label)}</strong>
      <p>${escapeHtml(converter.description)}</p>
      <div class="support-status ${escapeHtml(converter.status)}">${escapeHtml(converter.statusLabel)}</div>
    </article>
  `).join("");
}
async function validateToken() {
  const token = elements.tokenInput.value.trim();
  if (!token) {
    setStatus(elements.tokenStatus, "Paste a token before validating.", "warn");
    return false;
  }
  setBusy(elements.validateTokenButton, true, "Validating...");
  try {
    const url = new URL(`${ARCGIS_ROOT}/community/self`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    url.searchParams.set("appInfoToken", token);
    const response = await fetch(url);
    const json = await response.json();
    assertArcGisSuccess(json, "Token validation failed.");
    const hostedFeatureCapability = await inspectHostedFeatureCapability(token, json.username);
    if (elements.tokenInput.value.trim() !== token) return false;
    state.token = token;
    state.user = json;
    state.tokenInfo = json.appInfo || null;
    state.hostedFeatureCapability = hostedFeatureCapability;
    const org = json.orgId ? `Organization: <strong>${escapeHtml(json.orgId)}</strong>` : "Organization: not reported";
    const expires = getTokenExpiryText(json.appInfo);
    const hostedFeatures = state.hostedFeatureCapability.allowed ? "Hosted feature-layer publishing is available." : `Hosted feature-layer publishing is unavailable; Shortlists will use embedded Explorer grids. ${escapeHtml(state.hostedFeatureCapability.reason)}`;
    setStatus(
      elements.tokenStatus,
      `Validated as <strong>${escapeHtml(json.username)}</strong>. ${org}. ${expires} ${hostedFeatures}`,
      "good"
    );
    return true;
  } catch (error) {
    state.token = "";
    state.user = null;
    state.tokenInfo = null;
    state.hostedFeatureCapability = createUnavailableHostedFeatureCapability("Token validation failed.");
    setStatus(elements.tokenStatus, escapeHtml(error.message), "bad");
    return false;
  } finally {
    setBusy(elements.validateTokenButton, false, "Validate token");
    updateCreateButton();
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
    const missingPrivileges = HOSTED_FEATURE_PRIVILEGES.filter((privilege) => !privileges.includes(privilege));
    return {
      checked: true,
      allowed: missingPrivileges.length === 0 && portalUser.disabled !== true,
      privileges,
      missingPrivileges,
      reason: portalUser.disabled === true ? "The ArcGIS member is disabled." : missingPrivileges.length ? `Missing ${missingPrivileges.join(" and ")}.` : ""
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
    reason
  };
}
async function analyzeSource() {
  if (!state.token || !state.user?.username) {
    setStatus(elements.sourceStatus, "Sign in through Classic Story Explorer or validate a token before converting a story.", "warn");
    return false;
  }
  const itemId = extractItemId(elements.sourceInput.value);
  if (!itemId) {
    setStatus(elements.sourceStatus, "Could not find a 32-character ArcGIS item id in that input.", "warn");
    return;
  }
  setBusy(elements.analyzeButton, true, "Analyzing...");
  clearCreatedItemLink();
  setStatus(elements.sourceStatus, `Reading item <strong>${escapeHtml(itemId)}</strong>...`);
  try {
    const item = await fetchItemInfo(itemId, state.token);
    if (!await checkClassicConversionAccess(item, state.user, state.token)) {
      throw new Error(CLASSIC_CONVERSION_RESTRICTION);
    }
    const data = await fetchItemData(itemId, state.token);
    const template = detectClassicTemplate(item, data);
    if (!template) {
      state.sourceItem = item;
      state.sourceData = data;
      state.recipe = null;
      state.outputJson = null;
      state.validation = null;
      state.priorConversions = [];
      renderJson({});
      elements.recipeSummary.innerHTML = `<div class="empty">This item is not recognized as a supported Classic Story Map.</div>`;
      setStatus(elements.sourceStatus, `Loaded <strong>${escapeHtml(item.title || item.id)}</strong>, but no supported Classic template was detected.`, "warn");
      updateCreateButton();
      return false;
    }
    const relatedContext = await template.getRelatedContext(data, state.token);
    const recipe = template.analyze({ item, data, template, relatedContext, mapSeriesOutput: state.mapSeriesOutput });
    const outputJson = template.buildDraft ? template.buildDraft(recipe) : null;
    const validation = outputJson ? await validateGeneratedDraft(outputJson) : null;
    if (validation?.errors?.length) {
      recipe.warnings = uniqueStrings([
        ...recipe.warnings || [],
        `AGSM draft validation found ${validation.errors.length} issue${validation.errors.length === 1 ? "" : "s"} in the generated JSON. First issue: ${validation.errors[0]}`
      ]);
    }
    const priorConversions = outputJson ? await fetchPriorConversions(item.id, state.user?.username, state.token) : [];
    if (priorConversions.length) {
      recipe.warnings = uniqueStrings([
        ...recipe.warnings || [],
        `${priorConversions.length} prior converted ${priorConversions.length === 1 ? "draft was" : "drafts were"} found for this Classic item. This run will create another draft item.`
      ]);
    }
    state.sourceItem = item;
    state.sourceData = data;
    state.recipe = recipe;
    state.outputJson = outputJson;
    state.validation = validation;
    state.priorConversions = priorConversions;
    renderRecipe(recipe);
    renderJson(outputJson);
    setStatus(
      elements.sourceStatus,
      outputJson ? `Detected <strong>${escapeHtml(template.label)}</strong> from <strong>${escapeHtml(item.title || item.id)}</strong>.${renderPriorConversionNotice(priorConversions)}` : `Detected <strong>${escapeHtml(template.label)}</strong>, but draft conversion for this template is not implemented yet.`,
      outputJson ? "good" : "warn"
    );
    return Boolean(outputJson);
  } catch (error) {
    state.sourceItem = null;
    state.sourceData = null;
    state.recipe = null;
    state.outputJson = null;
    state.validation = null;
    state.priorConversions = [];
    renderJson({});
    elements.recipeSummary.innerHTML = `<div class="empty">Analyze a Classic item to build a recipe.</div>`;
    setStatus(elements.sourceStatus, escapeHtml(error.message), "bad");
    return false;
  } finally {
    setBusy(elements.analyzeButton, false, "Analyze source");
    updateCreateButton();
  }
}
async function validateGeneratedDraft(outputJson) {
  try {
    agsmDraftValidatorPromise || (agsmDraftValidatorPromise = createAgsmDraftValidator());
    const validator = await agsmDraftValidatorPromise;
    return validator.validateDraft(outputJson);
  } catch (error) {
    return {
      valid: false,
      errors: [`Could not run AGSM draft validation: ${error.message}`],
      warnings: [],
      checkedNodeTypes: [],
      skippedNodeTypes: []
    };
  }
}
async function createPrototypeItem() {
  if (!state.token || !state.user?.username || !state.recipe || !state.outputJson) {
    setStatus(elements.createStatus, "Validate a token and analyze a source item first.", "warn");
    return null;
  }
  setBusy(elements.createButton, true, "Creating...");
  clearCreatedItemLink();
  setStatus(
    elements.createStatus,
    state.priorConversions.length ? "Creating another private draft item. Existing converted drafts will not be changed." : "Creating private prototype item..."
  );
  let hostedFeatureLayer = null;
  let hostedFeatureFallbackWarning = "";
  try {
    const source = await fetchItemInfo(state.recipe.source.id, state.token);
    if (!await checkClassicConversionAccess(source, state.user, state.token)) {
      throw new Error(CLASSIC_CONVERSION_RESTRICTION);
    }
    const outputKind = getRecipeOutputKind(state.recipe);
    const title = `(Converted) ${state.recipe.source.title || "Untitled Classic StoryMap"} - AGSM ${outputKind} migration draft`;
    const tags = uniqueStrings([
      ...state.sourceItem.tags || [],
      "classic-storymaps-migration",
      "migration-prototype",
      `classic-template-${state.recipe.template.key}`,
      `source-${state.recipe.source.id}`
    ]).slice(0, 20);
    let outputJson = state.outputJson;
    const hostedShortlistPlan = getHostedShortlistPlan(state.recipe, state.hostedFeatureCapability);
    if (state.recipe.template?.key === "shortlist") {
      if (hostedShortlistPlan.eligible) {
        setStatus(elements.createStatus, "Creating a private hosted feature layer for the Shortlist places...");
        try {
          hostedFeatureLayer = await createShortlistHostedFeatureLayer({
            recipe: state.recipe,
            username: state.user.username,
            token: state.token
          });
          const hostedDraft = buildShortlistDataDrivenAgsmJson(state.recipe, hostedFeatureLayer);
          const hostedValidation = await validateGeneratedDraft(hostedDraft);
          if (hostedValidation.errors?.length) {
            throw new Error(`The data-driven Shortlist draft did not validate: ${hostedValidation.errors[0]}`);
          }
          outputJson = hostedDraft;
          state.outputJson = hostedDraft;
          state.validation = hostedValidation;
          renderJson(hostedDraft);
          if (hostedFeatureLayer.featureCount > 200) {
            state.recipe.warnings = uniqueStrings([
              ...state.recipe.warnings || [],
              `The hosted feature layer contains ${hostedFeatureLayer.featureCount} places; the generated tour displays the first 200 in sort order.`
            ]);
          }
        } catch (error) {
          if (hostedFeatureLayer?.itemId) {
            try {
              await deleteHostedFeatureLayerItem({
                itemId: hostedFeatureLayer.itemId,
                username: state.user.username,
                token: state.token
              });
            } catch (cleanupError) {
              error.message = `${error.message} Cleanup also failed for hosted feature layer item ${hostedFeatureLayer.itemId}: ${cleanupError.message}`;
            }
          }
          hostedFeatureLayer = null;
          hostedFeatureFallbackWarning = `Hosted feature-layer creation was unavailable, so this draft uses embedded Explorer grids. ${error.message}`;
          state.recipe.warnings = uniqueStrings([
            ...state.recipe.warnings || [],
            hostedFeatureFallbackWarning
          ]);
          outputJson = state.outputJson;
        }
      } else if (hostedShortlistPlan.reason) {
        hostedFeatureFallbackWarning = hostedShortlistPlan.reason;
        state.recipe.warnings = uniqueStrings([...state.recipe.warnings || [], hostedShortlistPlan.reason]);
      }
    }
    outputJson = await replaceBrokenDraftImageResources(outputJson, { sourceItemId: state.recipe.source.id });
    const addResult = await postArcGis(`${ARCGIS_ROOT}/content/users/${encodeURIComponent(state.user.username)}/addItem`, {
      token: state.token,
      f: "json",
      title,
      type: "StoryMap",
      typeKeywords: getRecipeTypeKeywords(state.recipe).join(","),
      tags: tags.join(","),
      snippet: state.recipe.source.snippet || `Prototype migration from ${state.recipe.template.label}.`,
      description: `Prototype migration generated from Classic Story Map item ${state.recipe.source.id}. Requires author review.`,
      text: stringifyDraftJson(outputJson),
      accessInformation: state.sourceItem.accessInformation || "",
      licenseInfo: state.sourceItem.licenseInfo || ""
    });
    assertArcGisSuccess(addResult, "ArcGIS addItem failed.");
    const newItemId = addResult.id;
    if (!newItemId) throw new Error("ArcGIS did not return a new item id.");
    const updateResult = await updateItemData(newItemId, outputJson, state.recipe, state.token);
    assertArcGisSuccess(updateResult, "ArcGIS update failed.");
    let uploadedImageResources = 0;
    let imageResourceError = "";
    try {
      const imageResourceResult = await uploadDraftImageResources(newItemId, outputJson, state.recipe, state.token);
      outputJson = imageResourceResult.draftJson;
      uploadedImageResources = imageResourceResult.uploaded;
      if (uploadedImageResources > 0) {
        const rewriteResult = await updateItemData(newItemId, outputJson, state.recipe, state.token);
        assertArcGisSuccess(rewriteResult, "ArcGIS update failed after image resource upload.");
      }
    } catch (error) {
      imageResourceError = error.message || "Could not copy draft image resources.";
    }
    const resourceResult = await addDraftResource(newItemId, outputJson, state.token);
    assertArcGisSuccess(resourceResult, "ArcGIS addResources failed for draft.json.");
    let thumbnailUpdated = false;
    let thumbnailError = "";
    try {
      const thumbnailResult = await updateConvertedItemThumbnail(newItemId, state.recipe, state.token);
      thumbnailUpdated = thumbnailResult?.updated === true;
    } catch (error) {
      thumbnailError = error.message || "ArcGIS rejected the converted item thumbnail update.";
    }
    const itemUrl = `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(newItemId)}`;
    const builderUrl = getStoryMapsBuilderUrl(newItemId, outputKind);
    const draftUrl = `https://www.arcgis.com/sharing/rest/content/items/${encodeURIComponent(newItemId)}/resources/draft.json`;
    const sourceItemUrl = `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(state.recipe.source.id)}`;
    setStatus(
      elements.createStatus,
      `Created private draft item <strong>${escapeHtml(newItemId)}</strong> and added <strong>draft.json</strong>.${hostedFeatureLayer ? ` Created hosted feature layer <strong>${escapeHtml(hostedFeatureLayer.itemId)}</strong> for a data-driven Explorer tour.` : ""}${hostedFeatureFallbackWarning ? ` ${escapeHtml(hostedFeatureFallbackWarning)}` : ""}${uploadedImageResources ? ` Copied ${uploadedImageResources} image resource${uploadedImageResources === 1 ? "" : "s"} into the converted item.` : ""}${imageResourceError ? ` Image resource copy needs review: ${escapeHtml(imageResourceError)}` : ""}${thumbnailUpdated ? " Thumbnail was copied from the Classic item." : ""}${thumbnailError ? ` Thumbnail update needs review: ${escapeHtml(thumbnailError)}` : ""}`,
      thumbnailError || imageResourceError || hostedFeatureFallbackWarning ? "warn" : "good"
    );
    elements.createdItemLink.hidden = false;
    elements.createdItemLink.innerHTML = `
      <span>New item URL</span>
      <a href="${itemUrl}" target="_blank" rel="noreferrer">${itemUrl}</a>
      <span>Open converted draft</span>
      <a href="${builderUrl}" target="_blank" rel="noreferrer">${builderUrl}</a>
      <span>Draft JSON resource</span>
      <a href="${draftUrl}" target="_blank" rel="noreferrer">${draftUrl}</a>
      ${hostedFeatureLayer ? `<span>Hosted Shortlist places</span><a href="https://www.arcgis.com/home/item.html?id=${escapeHtml(hostedFeatureLayer.itemId)}" target="_blank" rel="noreferrer">https://www.arcgis.com/home/item.html?id=${escapeHtml(hostedFeatureLayer.itemId)}</a>` : ""}
      <span>After publishing</span>
      <strong>Open the Classic item in ArcGIS and choose <em>Select replacement</em>, then select this converted item.</strong>
      <span>Set replacement in ArcGIS</span>
      <a href="${sourceItemUrl}" target="_blank" rel="noreferrer">Open Classic item details</a>
      ${renderPriorConversionLinks(state.priorConversions)}
    `;
    return {
      itemId: newItemId,
      itemUrl,
      builderUrl,
      draftUrl,
      uploadedImageResources,
      imageResourceError,
      thumbnailUpdated,
      thumbnailError,
      hostedFeatureLayerItemId: hostedFeatureLayer?.itemId || "",
      hostedFeatureLayerUrl: hostedFeatureLayer ? `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(hostedFeatureLayer.itemId)}` : ""
    };
  } catch (error) {
    if (hostedFeatureLayer?.itemId) {
      try {
        await deleteHostedFeatureLayerItem({
          itemId: hostedFeatureLayer.itemId,
          username: state.user.username,
          token: state.token
        });
      } catch (cleanupError) {
        error.message = `${error.message} Cleanup also failed for hosted feature layer item ${hostedFeatureLayer.itemId}: ${cleanupError.message}`;
      }
      hostedFeatureLayer = null;
    }
    clearCreatedItemLink();
    setStatus(elements.createStatus, escapeHtml(error.message), "bad");
    return null;
  } finally {
    setBusy(elements.createButton, false, "Create prototype AGSM item");
    updateCreateButton();
  }
}
async function fetchPriorConversions(sourceItemId, username, token) {
  if (!sourceItemId || !username || !token) return [];
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
  return (json.results || []).filter((item) => item.id !== sourceItemId && (item.typeKeywords || []).some((typeKeyword) => String(typeKeyword).toLowerCase() === keyword.toLowerCase())).map((item) => ({
    id: item.id,
    title: item.title || item.id,
    modified: item.modified || 0,
    url: `https://www.arcgis.com/home/item.html?id=${encodeURIComponent(item.id)}`
  }));
}
function renderPriorConversionNotice(priorConversions) {
  if (!priorConversions.length) return "";
  const links = priorConversions.slice(0, 3).map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`).join(", ");
  const extra = priorConversions.length > 3 ? ` and ${priorConversions.length - 3} more` : "";
  return ` Found prior converted ${priorConversions.length === 1 ? "draft" : "drafts"}: ${links}${extra}.`;
}
function renderPriorConversionLinks(priorConversions) {
  if (!priorConversions.length) return "";
  return `
      <span>Prior converted drafts</span>
      ${priorConversions.slice(0, 5).map((item) => `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a>`).join("")}
  `;
}
async function fetchItemInfo(itemId, token) {
  const url = new URL(`${ARCGIS_ROOT}/content/items/${encodeURIComponent(itemId)}`);
  url.searchParams.set("f", "json");
  if (token) url.searchParams.set("token", token);
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json();
  assertArcGisSuccess(json, "Could not read item info.");
  return json;
}
async function fetchItemData(itemId, token) {
  const url = new URL(`${ARCGIS_ROOT}/content/items/${encodeURIComponent(itemId)}/data`);
  url.searchParams.set("f", "json");
  if (token) url.searchParams.set("token", token);
  const response = await fetch(url);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not read item JSON.");
  return json;
}
async function fetchRelatedWebMaps(data, token) {
  const webMapIds = uniqueStrings([
    ...getClassicWebMapIds(data),
    ...collectItemIds(data)
  ]).slice(0, 8);
  const webMaps = await Promise.all(
    webMapIds.map(async (itemId) => {
      try {
        const [info, mapData] = await Promise.all([
          fetchItemInfo(itemId, token),
          fetchItemData(itemId, token)
        ]);
        if (info.type !== "Web Map") return null;
        const featureSets = await fetchMapTourFeatureSets(mapData, token);
        return { itemId, title: info.title, data: mapData, featureSets };
      } catch {
        return null;
      }
    })
  );
  return webMaps.filter(Boolean);
}
async function fetchMapTourFeatureSets(mapData, token) {
  const operationalLayers = Array.isArray(mapData?.operationalLayers) ? mapData.operationalLayers : [];
  const candidateLayers = operationalLayers.filter((layer) => {
    const fields = layer?.popupInfo?.fieldInfos?.map((field) => String(field.fieldName || "").toLowerCase()) || [];
    return layer?.url && fields.includes("pic_url") && fields.includes("thumb_url");
  });
  const featureSets = await Promise.all(
    candidateLayers.slice(0, 5).map(async (layer) => {
      try {
        const queryUrl = new URL(`${normalizeUrl(layer.url).replace(/^http:/i, "https:").replace(/\/$/, "")}/query`);
        queryUrl.searchParams.set("f", "json");
        queryUrl.searchParams.set("where", "1=1");
        queryUrl.searchParams.set("outFields", "*");
        queryUrl.searchParams.set("returnGeometry", "true");
        queryUrl.searchParams.set("resultRecordCount", "500");
        if (token) queryUrl.searchParams.set("token", token);
        const response = await fetch(queryUrl);
        const json = await response.json();
        assertArcGisSuccess(json, "Could not read a Map Tour feature layer.");
        return {
          layerId: layer.id || "",
          layerTitle: layer.title || layer.id,
          objectIdFieldName: getObjectIdFieldName(json, layer),
          features: json.features || []
        };
      } catch {
        return null;
      }
    })
  );
  return featureSets.filter(Boolean);
}
async function fetchMapTourSourceLayerFeatureSet(data, relatedWebMaps, token) {
  const webMapId = data?.values?.webmap;
  const sourceLayerId = data?.values?.sourceLayer || data?.values?.sourceLayerId;
  const order = getMapTourOrder(data);
  if (!isArcGisItemId(webMapId) || !sourceLayerId) return null;
  const relatedWebMap = relatedWebMaps.find((webMap) => webMap.itemId === webMapId);
  const layer = findOperationalLayer(relatedWebMap?.data, sourceLayerId);
  if (!layer) return null;
  const featureSet = await getLayerFeatures(layer, token, order.map((entry) => entry.id));
  if (!featureSet.features.length) return null;
  return {
    ...featureSet,
    layerId: layer.id || sourceLayerId,
    layerTitle: layer.title || sourceLayerId,
    features: orderMapTourFeatures(featureSet.features, featureSet.objectIdFieldName, order)
  };
}
async function getLayerFeatures(layer, token, orderedObjectIds = []) {
  const localFeatures = getLocalLayerFeatures(layer);
  if (localFeatures.length) {
    return {
      objectIdFieldName: getObjectIdFieldName({}, layer),
      features: localFeatures
    };
  }
  if (!layer?.url) return { objectIdFieldName: getObjectIdFieldName({}, layer), features: [] };
  const queryUrl = new URL(`${normalizeUrl(layer.url).replace(/^http:/i, "https:").replace(/\/$/, "")}/query`);
  queryUrl.searchParams.set("f", "json");
  queryUrl.searchParams.set("where", "1=1");
  queryUrl.searchParams.set("outFields", "*");
  queryUrl.searchParams.set("returnGeometry", "true");
  queryUrl.searchParams.set("resultRecordCount", "500");
  queryUrl.searchParams.set("outSR", "4326");
  if (orderedObjectIds.length) queryUrl.searchParams.set("objectIds", orderedObjectIds.join(","));
  if (token) queryUrl.searchParams.set("token", token);
  const response = await fetch(queryUrl);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not read the Map Tour source layer.");
  return {
    objectIdFieldName: getObjectIdFieldName(json, layer),
    features: json.features || []
  };
}
function getLocalLayerFeatures(layer) {
  const layers = Array.isArray(layer?.featureCollection?.layers) ? layer.featureCollection.layers : [];
  return layers.flatMap((collectionLayer) => collectionLayer?.featureSet?.features || []);
}
async function createShortlistHostedFeatureLayer({ recipe, username, token, fetcher = fetch, now = Date.now() }) {
  if (!recipe || recipe.template?.key !== "shortlist") throw new Error("A Classic Shortlist recipe is required.");
  if (!username || !token) throw new Error("ArcGIS username and token are required to create a hosted feature layer.");
  const features = createHostedShortlistFeatures(recipe);
  if (!features.length) throw new Error("No valid Shortlist point features are available for hosted publishing.");
  const serviceName = createHostedShortlistServiceName(recipe.source?.id, now);
  let itemId = "";
  let serviceUrl = "";
  try {
    const createResult = await postArcGis(`${ARCGIS_ROOT}/content/users/${encodeURIComponent(username)}/createService`, {
      token,
      f: "json",
      outputType: "featureService",
      createParameters: JSON.stringify(createHostedShortlistServiceParameters(serviceName)),
      description: `Hosted point data created while converting Classic Shortlist ${recipe.source?.id || ""}.`,
      snippet: `Places migrated from ${recipe.source?.title || "a Classic Shortlist"}.`,
      tags: "classic-storymaps-migration,classic-shortlist,storytoolkit-app"
    }, fetcher);
    assertArcGisSuccess(createResult, "ArcGIS createService failed for the Shortlist places layer.");
    itemId = firstString(createResult.serviceItemId, createResult.itemId, createResult.id);
    serviceUrl = normalizeUrl(firstString(createResult.serviceurl, createResult.serviceUrl, createResult.encodedServiceURL));
    if (!itemId || !serviceUrl) throw new Error("ArcGIS did not return the hosted feature layer item id and service URL.");
    const adminServiceUrl = getHostedFeatureAdminUrl(serviceUrl);
    const definitionResult = await postArcGis(`${adminServiceUrl}/addToDefinition`, {
      token,
      f: "json",
      addToDefinition: JSON.stringify({ layers: [createHostedShortlistLayerDefinition()] })
    }, fetcher);
    assertArcGisSuccess(definitionResult, "ArcGIS could not add the Shortlist point layer definition.");
    for (let index = 0; index < features.length; index += HOSTED_SHORTLIST_BATCH_SIZE) {
      const batch = features.slice(index, index + HOSTED_SHORTLIST_BATCH_SIZE);
      const editResult = await postArcGis(`${serviceUrl}/${HOSTED_SHORTLIST_LAYER_ID}/applyEdits`, {
        token,
        f: "json",
        adds: JSON.stringify(batch),
        rollbackOnFailure: true
      }, fetcher);
      assertArcGisSuccess(editResult, "ArcGIS applyEdits failed for the Shortlist places layer.");
      const addResults = Array.isArray(editResult.addResults) ? editResult.addResults : [];
      if (addResults.length !== batch.length || addResults.some((result) => result?.success !== true)) {
        const failed = addResults.find((result) => result?.success !== true);
        throw new Error(failed?.error?.description || failed?.error?.message || "ArcGIS did not add every Shortlist place.");
      }
    }
    return {
      itemId,
      serviceUrl,
      layerId: HOSTED_SHORTLIST_LAYER_ID,
      featureCount: features.length
    };
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error(String(cause || "Hosted feature publishing failed."));
    error.hostedFeatureItemId = itemId;
    error.hostedFeatureCleanupSucceeded = false;
    if (itemId) {
      try {
        await deleteHostedFeatureLayerItem({ itemId, username, token, fetcher });
        error.hostedFeatureCleanupSucceeded = true;
      } catch (cleanupError) {
        error.message = `${error.message} Cleanup also failed for hosted feature layer item ${itemId}: ${cleanupError.message}`;
      }
    }
    throw error;
  }
}
async function deleteHostedFeatureLayerItem({ itemId, username, token, fetcher = fetch }) {
  if (!itemId || !username || !token) throw new Error("Hosted feature layer cleanup requires an item id, username, and token.");
  const result = await postArcGis(
    `${ARCGIS_ROOT}/content/users/${encodeURIComponent(username)}/items/${encodeURIComponent(itemId)}/delete`,
    { token, f: "json" },
    fetcher
  );
  assertArcGisSuccess(result, `ArcGIS could not delete hosted feature layer item ${itemId}.`);
  return result;
}
function createHostedShortlistFeatures(recipe) {
  const categories = Array.isArray(recipe.categories) ? recipe.categories : [];
  return categories.flatMap((category) => (category.stops || []).map((stop) => ({ category, stop }))).filter(({ stop }) => isValidHostedShortlistStop(stop)).map(({ category, stop }, index) => {
    const point = getTourPoint(stop);
    if (!Number.isFinite(point.long) || !Number.isFinite(point.lat) || Math.abs(point.long) > 180 || Math.abs(point.lat) > 90) return null;
    return {
      geometry: { x: point.long, y: point.lat, spatialReference: { wkid: 4326 } },
      attributes: {
        NAME: truncateHostedField(stop.title || `Place ${index + 1}`, 255),
        DESCRIPTION: truncateHostedField(stop.description, 4e3),
        TAB_NAME: truncateHostedField(category.title || "Other places", 255),
        PIC_URL: truncateHostedField(stop.imageUrl, 2048),
        THUMB_URL: truncateHostedField(stop.thumbnailUrl, 2048),
        WEBSITE: truncateHostedField(stop.website, 2048),
        SORT_ORDER: Number.isFinite(stop.sortOrder) ? Math.trunc(stop.sortOrder) : index
      }
    };
  }).filter(Boolean);
}
function createHostedShortlistServiceName(sourceItemId, now) {
  const source = String(sourceItemId || "shortlist").replace(/[^a-z0-9]/gi, "").slice(0, 12) || "shortlist";
  return `classic_shortlist_${source}_${Number(now).toString(36)}`.slice(0, 120);
}
function createHostedShortlistServiceParameters(name) {
  return {
    name,
    serviceDescription: "Places migrated from a Classic Story Maps Shortlist.",
    hasStaticData: false,
    maxRecordCount: 2e3,
    supportedQueryFormats: "JSON",
    capabilities: "Create,Delete,Query,Update,Editing",
    spatialReference: { wkid: 4326 },
    initialExtent: {
      xmin: -180,
      ymin: -90,
      xmax: 180,
      ymax: 90,
      spatialReference: { wkid: 4326 }
    },
    allowGeometryUpdates: true
  };
}
function createHostedShortlistLayerDefinition() {
  return {
    id: HOSTED_SHORTLIST_LAYER_ID,
    name: "Shortlist places",
    type: "Feature Layer",
    displayField: "NAME",
    objectIdField: "OBJECTID",
    geometryType: "esriGeometryPoint",
    spatialReference: { wkid: 4326 },
    extent: {
      xmin: -180,
      ymin: -90,
      xmax: 180,
      ymax: 90,
      spatialReference: { wkid: 4326 }
    },
    fields: HOSTED_SHORTLIST_FIELDS,
    capabilities: "Create,Delete,Query,Update,Editing",
    allowGeometryUpdates: true,
    hasAttachments: false,
    types: [],
    templates: [{
      name: "Shortlist place",
      description: "",
      drawingTool: "esriFeatureEditToolPoint",
      prototype: { attributes: {} }
    }],
    drawingInfo: {
      renderer: {
        type: "simple",
        symbol: {
          type: "esriSMS",
          style: "esriSMSCircle",
          color: [0, 122, 194, 255],
          size: 8,
          outline: { color: [255, 255, 255, 255], width: 1 }
        }
      }
    }
  };
}
function getHostedFeatureAdminUrl(serviceUrl) {
  const parsed = new URL(serviceUrl);
  if (!/\/rest\/services\//i.test(parsed.pathname) || !/\/FeatureServer\/?$/i.test(parsed.pathname)) {
    throw new Error("ArcGIS returned an unexpected hosted feature service URL.");
  }
  parsed.pathname = parsed.pathname.replace(/\/rest\/services\//i, "/rest/admin/services/").replace(/\/$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
function truncateHostedField(value, maximumLength) {
  return String(value || "").slice(0, maximumLength);
}
async function postArcGis(url, params, fetcher = fetch) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) body.set(key, String(value));
  });
  const response = await fetcher(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  return response.json();
}
async function updateItemData(itemId, draftJson, recipe, token) {
  return postArcGis(
    `${ARCGIS_ROOT}/content/users/${encodeURIComponent(state.user.username)}/items/${encodeURIComponent(itemId)}/update`,
    {
      token,
      f: "json",
      text: stringifyDraftJson(draftJson),
      typeKeywords: getRecipeTypeKeywords(recipe).join(",")
    }
  );
}
async function addDraftResource(itemId, draftJson, token) {
  const body = new FormData();
  body.set("token", token);
  body.set("f", "json");
  body.set("fileName", "draft.json");
  body.set("text", stringifyDraftJson(draftJson));
  body.set("access", "private");
  const response = await fetch(
    `${ARCGIS_ROOT}/content/users/${encodeURIComponent(state.user.username)}/items/${encodeURIComponent(itemId)}/addResources`,
    {
      method: "POST",
      body
    }
  );
  return response.json();
}
async function uploadDraftImageResources(itemId, draftJson, recipe, token) {
  const nextDraft = cloneJson(draftJson);
  const sourceItemId = recipe?.source?.id || "";
  const candidates = getDraftImageResourceUploadCandidates(nextDraft, sourceItemId);
  let uploaded = 0;
  for (const candidate of candidates) {
    const blob = await fetchThumbnailBlob(candidate.src, token);
    if (!blob) throw new Error(`Could not fetch image resource bytes for ${candidate.src}.`);
    const fileName = getImageResourceFileName(candidate.resourceId, candidate.src, blob.type);
    const result = await addItemImageResource(itemId, fileName, blob, token);
    assertArcGisSuccess(result, `ArcGIS addResources failed for ${fileName}.`);
    candidate.resource.data = {
      ...candidate.resource.data,
      resourceId: `${IMAGE_RESOURCE_FOLDER}/${fileName}`,
      provider: "item-resource"
    };
    delete candidate.resource.data.src;
    uploaded += 1;
  }
  return { draftJson: nextDraft, uploaded };
}
function getDraftImageResourceUploadCandidates(draftJson, sourceItemId) {
  const resources = draftJson?.resources || {};
  return Object.entries(resources).filter(([, resource]) => resource?.type === "image" && resource.data?.provider === "uri" && shouldCopyImageResourceUrl(resource.data?.src, sourceItemId)).map(([resourceId, resource]) => ({
    resourceId,
    resource,
    src: resource.data.src
  }));
}
function shouldCopyImageResourceUrl(url, sourceItemId) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (sourceItemId && host.includes("arcgis.com") && path.includes(`/content/items/${sourceItemId.toLowerCase()}/info/`)) return true;
    if (sourceItemId && host.includes("arcgis.com") && path.includes(`/content/items/${sourceItemId.toLowerCase()}/resources/`)) return true;
    return false;
  } catch {
    return false;
  }
}
async function replaceBrokenDraftImageResources(draftJson, options = {}) {
  const nextDraft = cloneJson(draftJson);
  const sourceItemId = options.sourceItemId || "";
  const candidates = getDraftUriImageResources(nextDraft).filter((candidate) => !isArcGisItemResourceUrl(candidate.src)).filter((candidate) => !shouldCopyImageResourceUrl(candidate.src, sourceItemId)).filter((candidate) => candidate.src !== MISSING_IMAGE_PLACEHOLDER_URL);
  const probeImage = options.probeImage || probeImageLoad;
  const placeholderUrl = options.placeholderUrl || MISSING_IMAGE_PLACEHOLDER_URL;
  const brokenResourceIds = /* @__PURE__ */ new Set();
  await asyncPool(candidates, 6, async (candidate) => {
    const isReachable = await probeImage(candidate.src);
    if (isReachable) return;
    candidate.resource.data = {
      ...candidate.resource.data,
      src: placeholderUrl,
      provider: "uri"
    };
    brokenResourceIds.add(candidate.resourceId);
  });
  if (brokenResourceIds.size) {
    annotateMissingImageNodes(nextDraft, brokenResourceIds);
  }
  return nextDraft;
}
function getDraftUriImageResources(draftJson) {
  const resources = draftJson?.resources || {};
  return Object.entries(resources).filter(([, resource]) => resource?.type === "image" && resource.data?.provider === "uri" && resource.data?.src).map(([resourceId, resource]) => ({
    resourceId,
    resource,
    src: resource.data.src
  }));
}
function isArcGisItemResourceUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().includes("arcgis.com") && /\/sharing\/rest\/content\/items\/[a-f0-9]{32}\/resources\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}
function annotateMissingImageNodes(draftJson, missingResourceIds) {
  const nodes = draftJson?.nodes || {};
  Object.values(nodes).forEach((node) => {
    if (node?.type !== "image" || !missingResourceIds.has(node.data?.image)) return;
    node.data = {
      ...node.data,
      alt: node.data.alt || "Missing image placeholder",
      caption: getMissingImageCaption(node.data.caption)
    };
  });
}
function getMissingImageCaption(existingCaption) {
  const note = "Original image was not found during Classic conversion.";
  return existingCaption ? `${existingCaption} ${note}` : note;
}
function probeImageLoad(src) {
  if (!src) return Promise.resolve(false);
  if (typeof Image !== "function") return Promise.resolve(true);
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };
    const timeoutId = setTimeout(() => finish(false), IMAGE_LOAD_TIMEOUT_MS);
    image.onload = () => finish(Boolean(image.naturalWidth || image.width));
    image.onerror = () => finish(false);
    image.src = src;
  });
}
async function asyncPool(items, limit, worker) {
  const queue = Array.isArray(items) ? [...items] : [];
  const workers = Array.from({ length: Math.min(Math.max(limit, 1), queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(workers);
}
async function addItemImageResource(itemId, fileName, blob, token) {
  const body = new FormData();
  body.set("token", token);
  body.set("f", "json");
  body.set("fileName", fileName);
  body.set("resourcesPrefix", IMAGE_RESOURCE_FOLDER);
  body.set("access", "private");
  body.set("file", blob, fileName);
  const response = await fetch(
    `${ARCGIS_ROOT}/content/users/${encodeURIComponent(state.user.username)}/items/${encodeURIComponent(itemId)}/addResources`,
    {
      method: "POST",
      body
    }
  );
  return response.json();
}
function getImageResourceFileName(resourceId, url, contentType = "") {
  const baseName = getThumbnailFilename(url, contentType);
  const extension = baseName.includes(".") ? baseName.split(".").pop() : "png";
  return `${String(resourceId || "image").replace(/[^a-z0-9-]/gi, "-")}.${extension}`;
}
function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
function stringifyDraftJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003C").replace(/>/g, "\\u003E");
}
async function updateConvertedItemThumbnail(itemId, recipe, token) {
  const thumbnailUrl = getConvertedItemThumbnailUrl(recipe);
  if (!thumbnailUrl) return { skipped: true };
  const body = new FormData();
  body.set("token", token);
  body.set("f", "json");
  body.set("filename", getThumbnailFilename(thumbnailUrl));
  const thumbnailBlob = await fetchThumbnailBlob(thumbnailUrl, token);
  if (!thumbnailBlob) throw new Error("Could not fetch thumbnail bytes for upload.");
  body.set("file", thumbnailBlob, getThumbnailFilename(thumbnailUrl, thumbnailBlob.type));
  const response = await fetch(
    `${ARCGIS_ROOT}/content/users/${encodeURIComponent(state.user.username)}/items/${encodeURIComponent(itemId)}/updateThumbnail`,
    {
      method: "POST",
      body
    }
  );
  const json = await response.json();
  assertArcGisSuccess(json, "ArcGIS updateThumbnail failed.");
  return { updated: true, id: json.id || itemId };
}
function getConvertedItemThumbnailUrl(recipe) {
  if (recipe?.source?.thumbnail) return getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail);
  return firstUrl(...recipe?.imageUrls || []);
}
async function fetchThumbnailBlob(url, token) {
  try {
    const response = await fetch(getTokenizedThumbnailUrl(url, token));
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size || blob.size > 10 * 1024 * 1024) return null;
    return blob;
  } catch {
    return null;
  }
}
function getTokenizedThumbnailUrl(url, token) {
  if (!token) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("arcgis.com")) return url;
    parsed.searchParams.set("token", token);
    return parsed.toString();
  } catch {
    return url;
  }
}
function getThumbnailFilename(url, contentType = "") {
  try {
    const filename = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    if (/\.(png|jpe?g|gif)$/i.test(filename)) return filename;
  } catch {
  }
  if (/jpe?g/i.test(contentType)) return "thumbnail.jpg";
  if (/gif/i.test(contentType)) return "thumbnail.gif";
  return "thumbnail.png";
}
function assertArcGisSuccess(json, fallback) {
  if (!json) throw new Error(fallback);
  if (json.error) {
    const message = json.error.message || fallback;
    const details = Array.isArray(json.error.details) && json.error.details.length ? ` ${json.error.details.join(" ")}` : "";
    throw new Error(`${message}${details}`);
  }
  if (json.success === false) throw new Error(fallback);
  if ("success" in json && json.success !== true) throw new Error(fallback);
}
function extractItemId(input) {
  const value = input.trim();
  if (/^[a-f0-9]{32}$/i.test(value)) return value;
  try {
    const url = new URL(value);
    const appId = url.searchParams.get("appid") || url.searchParams.get("id");
    if (appId && /^[a-f0-9]{32}$/i.test(appId)) return appId;
  } catch {
  }
  return value.match(/[a-f0-9]{32}/i)?.[0] || "";
}
function convertClassicStoryMap({ item, data, relatedContext = {} }) {
  try {
    const template = detectClassicTemplate(item, data);
    if (!template) {
      return {
        ok: false,
        draft: null,
        review: null,
        errors: [{
          code: "unsupported-classic-template",
          message: "The item is not a supported Classic Story Map template."
        }]
      };
    }
    const recipe = template.analyze({ item, data, template, relatedContext });
    const draft = template.buildDraft(recipe);
    return {
      ok: true,
      outputKind: getRecipeOutputKind(recipe),
      template: {
        key: template.key,
        label: template.label,
        target: template.target
      },
      draft,
      review: {
        supported: recipe.supported !== false,
        counts: recipe.counts || {},
        warnings: recipe.warnings || [],
        relatedWebMaps: recipe.relatedWebMaps || []
      },
      errors: []
    };
  } catch (error) {
    return {
      ok: false,
      draft: null,
      review: null,
      errors: [{
        code: "classic-conversion-failed",
        message: error instanceof Error ? error.message : "Classic Story Map conversion failed."
      }]
    };
  }
}
async function convertClassicStoryMapItem(options) {
  const { toolkit, storyMaps: legacyToolkit, itemId } = options;
  const client = toolkit || legacyToolkit;
  if (!client?.items?.get || !client?.items?.getData) {
    throw new TypeError("convertClassicStoryMapItem requires a Story Toolkit client.");
  }
  const [item, data] = await Promise.all([
    client.items.get(itemId),
    client.items.getData(itemId)
  ]);
  const template = detectClassicTemplate(item, data);
  if (!template) {
    return convertClassicStoryMap({ item, data });
  }
  const accessToken = await client.config?.auth?.getAccessToken?.() || "";
  const relatedContext = await template.getRelatedContext(data, accessToken);
  return convertClassicStoryMap({ item, data, relatedContext });
}
function detectClassicTemplate(item, data = null) {
  const keywords = (item.typeKeywords || []).map((keyword) => String(keyword).toLowerCase());
  if (item.type !== "Web Mapping Application") return null;
  const dataTemplate = detectClassicTemplateFromData(data);
  if (dataTemplate) return dataTemplate;
  return CLASSIC_CONVERTERS.find(
    (converter) => converter.keywords.some((keyword) => keywords.includes(keyword.toLowerCase()))
  ) || null;
}
function detectClassicTemplateFromData(data) {
  const templateName = String(data?.values?.template?.name || data?.template?.name || "").toLowerCase();
  const hasJournalSections = Array.isArray(data?.values?.story?.sections);
  const hasSeriesEntries = Array.isArray(data?.values?.story?.entries);
  if (templateName.includes("map journal") || templateName.includes("mapjournal") || hasJournalSections) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "mapjournal") || null;
  }
  if (templateName.includes("map series") || templateName.includes("mapseries") || hasSeriesEntries) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "mapseries") || null;
  }
  if (templateName.includes("map tour") || templateName.includes("maptour")) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "maptour") || null;
  }
  if (templateName.includes("shortlist")) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "shortlist") || null;
  }
  if (templateName.includes("cascade")) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "cascade") || null;
  }
  if (templateName.includes("swipe") || templateName.includes("spyglass")) {
    return CLASSIC_CONVERTERS.find((converter) => converter.key === "swipe") || null;
  }
  return null;
}
async function fetchRelatedMapTourContext(data, token) {
  const relatedWebMaps = await fetchRelatedWebMaps(data, token);
  return {
    relatedWebMaps,
    sourceLayerFeatureSet: await fetchMapTourSourceLayerFeatureSet(data, relatedWebMaps, token)
  };
}
async function fetchRelatedShortlistContext(data, token) {
  const webMapId = data?.values?.webmap;
  const shortlistLayerId = data?.values?.shortlistLayerId;
  if (!isArcGisItemId(webMapId)) {
    return { webMapId: null, shortlistLayer: null, features: [] };
  }
  const webMapData = await fetchItemData(webMapId, token);
  const shortlistLayer = findShortlistLayer(webMapData, shortlistLayerId);
  const features = await fetchShortlistFeatures(shortlistLayer, token);
  return {
    webMapId,
    webMapData,
    shortlistLayer,
    features
  };
}
async function fetchRelatedSwipeContext(data, token) {
  const webMapIds = getSwipeWebMapIds(data);
  const webMaps = await Promise.all(
    webMapIds.map(async (itemId) => {
      try {
        const [info, mapData] = await Promise.all([
          fetchItemInfo(itemId, token),
          fetchItemData(itemId, token)
        ]);
        if (info.type !== "Web Map") return { itemId, title: info.title || "", data: mapData, readable: false };
        return { itemId, title: info.title || "", data: mapData, readable: true };
      } catch {
        return { itemId, title: "", data: null, readable: false };
      }
    })
  );
  return {
    webMaps,
    requestedWebMapIds: webMapIds
  };
}
async function fetchRelatedMapJournalContext(data, token) {
  return {
    relatedWebMaps: await fetchRelatedWebMapItems(data, token)
  };
}
async function fetchRelatedMapSeriesContext(data, token) {
  const entries = Array.isArray(data?.values?.story?.entries) ? data.values.story.entries : [];
  const ids = uniqueStrings(entries.map((entry) => entry?.media?.webmap?.id || entry?.media?.webmap?.itemId).filter(isArcGisItemId));
  const relatedWebMaps = [];
  for (let start = 0; start < ids.length; start += 6) {
    const batch = await Promise.all(ids.slice(start, start + 6).map(async (itemId) => {
      try {
        return { itemId, data: await fetchItemData(itemId, token) };
      } catch {
        return { itemId, data: null };
      }
    }));
    relatedWebMaps.push(...batch);
  }
  return { relatedWebMaps };
}
async function fetchRelatedWebMapItems(data, token) {
  const webMapIds = uniqueStrings([
    ...getClassicWebMapIds(data),
    ...collectItemIds(data)
  ]).slice(0, 8);
  const webMaps = await Promise.all(
    webMapIds.map(async (itemId) => {
      try {
        const [info, mapData] = await Promise.all([
          fetchItemInfo(itemId, token),
          fetchItemData(itemId, token)
        ]);
        if (info.type !== "Web Map") return null;
        return { itemId, title: info.title || "", data: mapData };
      } catch {
        return null;
      }
    })
  );
  return webMaps.filter(Boolean);
}
async function fetchNoRelatedContext() {
  return {};
}
function getClassicThemeHints(data) {
  const colors = [];
  const tokens = [];
  visitThemeHint(data);
  return {
    colors: uniqueStrings(colors.map(normalizeHexColor).filter(Boolean)),
    tokens: uniqueStrings(tokens).slice(0, 80)
  };
  function visitThemeHint(value, path = []) {
    if (typeof value === "string") {
      const normalizedPath = path.join(".").toLowerCase();
      if (!/(color|theme|background|header|style|layout|bgmain)/.test(normalizedPath)) return;
      if (/(contrast|textmain|textcolor|foregroundcolor|font)/.test(normalizedPath)) return;
      const normalizedValue = value.trim();
      if (!normalizedValue) return;
      tokens.push(normalizedValue.toLowerCase());
      const hexMatches = normalizedValue.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) || [];
      hexMatches.forEach((color) => colors.push(color));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visitThemeHint(item, path.concat(String(index))));
      return;
    }
    if (isPlainObject2(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => visitThemeHint(childValue, path.concat(childKey)));
    }
  }
}
function pickAgsmTheme(recipe) {
  const hints = recipe?.themeHints || {};
  const scores = {
    summit: 1,
    obsidian: 0,
    ridgeline: 0,
    mesa: 0,
    tidal: 0,
    slate: 0
  };
  (hints.tokens || []).forEach((token) => scoreThemeToken(token, scores));
  (hints.colors || []).forEach((color) => scoreThemeColor(color, scores));
  return Object.entries(scores).sort((first, second) => second[1] - first[1])[0][0];
}
var FEATURED_STORYMAP_THEME_CANDIDATES = [
  { label: "Airport", themeId: "summit", themeItemId: "0e77bee99f4048b4a5a45b6ab3c0e372", tokens: ["airport", "fly", "travel", "globe", "blue", "green"], colors: ["#f6f8f9", "#001ac6", "#20384f", "#0564ca", "#0f6137"] },
  { label: "Art Deco", themeId: "summit", themeItemId: "d67a35e93b99424399add6b873c0fb95", tokens: ["art deco", "elegant", "dark", "gold", "teal", "orange"], colors: ["#0a1217", "#d7aa37", "#fff9ed", "#5cb0a7", "#c86624"] },
  { label: "Back to School", themeId: "summit", themeItemId: "2a6c521361bf44beb9f4c9984b2052eb", tokens: ["back to school", "school", "classes", "education"], colors: ["#ffffff", "#f6f8f9", "#0564ca"] },
  { label: "Blog", themeId: "summit", themeItemId: "94f8baced331497c9825890a6b91734c", tokens: ["blog", "document", "experiences", "editorial"], colors: ["#ffffff", "#f6f8f9", "#304e4e"] },
  { label: "Bloom", themeId: "summit", themeItemId: "8ebec462bc824d50af837bd48dbc79f9", tokens: ["bloom", "spring", "flower", "adventures", "green"], colors: ["#ffffff", "#f6f8f9", "#4a7c2f", "#d9a441"] },
  { label: "Bulletin", themeId: "summit", themeItemId: "c036e9107e7441e59ed1ecc30dd08a70", tokens: ["bulletin", "updates", "essential", "news"], colors: ["#ffffff", "#f6f8f9", "#304e4e"] },
  { label: "Digital", themeId: "summit", themeItemId: "7a2b347f1dce47419818506ad16013f5", tokens: ["digital", "program", "technology", "code", "electric"], colors: ["#0a1217", "#23a6d5", "#3b03c1"] },
  { label: "Esri DevTech26", themeId: "summit", themeItemId: "03128121118c4c23ad16f54c67478bfb", tokens: ["esri", "developer", "technology", "summit", "conference", "presentation"], colors: ["#ffffff", "#000000", "#23a6d5"] },
  { label: "Fossil", themeId: "summit", themeItemId: "32c6b680b84f4f5b8b4f1c3258316952", tokens: ["fossil", "discoveries", "earth", "brown", "stone"], colors: ["#d9a441", "#8c4a24", "#546a6a"] },
  { label: "High Contrast Dark", themeId: "summit", themeItemId: "355aa74cae3f43e6b3fefc0156717d95", tokens: ["high contrast dark", "clear visuals", "accessibility", "contrast"], colors: ["#202020", "#ffffff", "#ffff05", "#57e9ff", "#fb82da"] },
  { label: "High Contrast Light", themeId: "summit", themeItemId: "3cbfd245322b4cb482df41a89ca4b044", tokens: ["high contrast light", "clear visuals", "accessibility", "contrast"], colors: ["#ffffff", "#002625", "#304e4e", "#620028", "#61662e", "#3b03c1"] },
  { label: "Historical", themeId: "summit", themeItemId: "a4480142ee604a6585188ca48a104a74", tokens: ["historical", "history", "time", "vintage", "sepia"], colors: ["#d9a441", "#8c4a24", "#f6f0e6"] },
  { label: "Invitation", themeId: "summit", themeItemId: "daa7e132125847f29b0dccca82f4645f", tokens: ["invitation", "event", "warmth", "style"], colors: ["#ffffff", "#d9a441", "#c45a1d"] },
  { label: "Obsidian (original)", themeId: "summit", themeItemId: "cb82243ba74949089fd674de36042f41", tokens: ["obsidian", "original", "sharp", "dark"], colors: ["#111111", "#222222", "#ffffff"] },
  { label: "Presentation", themeId: "summit", themeItemId: "01f831fadca745f1b2e4c54a21a24cf9", tokens: ["presentation", "ideas", "slides", "briefing"], colors: ["#ffffff", "#f6f8f9", "#0564ca"] },
  { label: "Rainforest", themeId: "summit", themeItemId: "abfdaf3e9394497797dbbf358fa3df01", tokens: ["rainforest", "jungle", "green", "nature"], colors: ["#0f6137", "#4a7c2f", "#9acd32"] },
  { label: "Science Report", themeId: "summit", themeItemId: "0094a4534f234e85bffc401ecdae42d9", tokens: ["science report", "science", "report", "curiosity"], colors: ["#ffffff", "#0564ca", "#304e4e"] },
  { label: "Supercharge", themeId: "summit", themeItemId: "1510726cff7f4b08ac92545098218af0", tokens: ["supercharge", "electric", "energy", "bright"], colors: ["#0a1217", "#23a6d5", "#d7aa37"] },
  { label: "Tokyo", themeId: "summit", themeItemId: "426ff279eb9e4f6fa5477119f6f99948", tokens: ["tokyo", "neon", "city", "travel"], colors: ["#0a1217", "#3b03c1", "#23a6d5", "#c45a1d"] },
  { label: "Transit", themeId: "summit", themeItemId: "54d7224f56774cfb82396286057f250d", tokens: ["transit", "road", "trip", "travel"], colors: ["#ffffff", "#0564ca", "#d9a441"] },
  { label: "Wilderness", themeId: "summit", themeItemId: "f9e4928ae6614e36baf48f2cb1448682", tokens: ["wilderness", "backcountry", "nature", "green", "outdoor"], colors: ["#0f6137", "#4a7c2f", "#8c4a24"] }
];
function createAgsmThemeData(recipe) {
  const builtInThemeId = pickAgsmTheme(recipe);
  const featuredTheme = pickFeaturedStoryMapTheme(recipe);
  return {
    themeId: featuredTheme?.themeId || builtInThemeId,
    themeBaseVariableOverrides: {},
    ...featuredTheme ? { themeItemId: featuredTheme.themeItemId } : {}
  };
}
function pickFeaturedStoryMapTheme(recipe) {
  const hints = recipe?.themeHints || {};
  const tokens = hints.tokens || [];
  const colors = hints.colors || [];
  const best = FEATURED_STORYMAP_THEME_CANDIDATES.map((candidate) => ({
    candidate,
    semanticMatch: hasFeaturedThemeTokenMatch(candidate, tokens),
    score: scoreFeaturedThemeCandidate(candidate, tokens, colors)
  })).sort((first, second) => second.score - first.score)[0];
  return best && best.semanticMatch && best.score >= 5 ? best.candidate : null;
}
function hasFeaturedThemeTokenMatch(candidate, tokens) {
  const normalizedTokens = tokens.map((token) => String(token || "").toLowerCase()).filter(Boolean);
  return candidate.tokens.some((candidateToken) => {
    const normalizedCandidateToken = candidateToken.toLowerCase();
    return normalizedTokens.some((token) => token.includes(normalizedCandidateToken) || normalizedCandidateToken.includes(token));
  });
}
function scoreFeaturedThemeCandidate(candidate, tokens, colors) {
  const normalizedTokens = tokens.map((token) => String(token || "").toLowerCase()).filter(Boolean);
  const tokenScore = candidate.tokens.reduce((score, candidateToken) => {
    const normalizedCandidateToken = candidateToken.toLowerCase();
    return score + (normalizedTokens.some((token) => token.includes(normalizedCandidateToken) || normalizedCandidateToken.includes(token)) ? 3 : 0);
  }, 0);
  const colorScore = colors.reduce((score, color) => {
    const source = hexToRgb(color);
    if (!source) return score;
    const nearest = Math.min(...candidate.colors.map((candidateColor) => {
      const target = hexToRgb(candidateColor);
      return target ? getRgbDistance(source, target) : Number.POSITIVE_INFINITY;
    }));
    if (nearest < 0.16) return score + 4;
    if (nearest < 0.28) return score + 2;
    return score;
  }, 0);
  return tokenScore + colorScore;
}
function scoreThemeToken(token, scores) {
  const normalizedToken = String(token || "").toLowerCase();
  if (!normalizedToken) return;
  if (/\b(white|light|black-over-white|black-on-white)\b/.test(normalizedToken)) scores.summit += 2;
  if (/\b(white-over-black|black-background|dark-background|night|shadow)\b/.test(normalizedToken)) scores.obsidian += 4;
  if (/^(black|dark)$/.test(normalizedToken)) scores.obsidian += 3;
  if (/\b(green|forest|park|nature|outdoor|land|terrain)\b/.test(normalizedToken)) scores.ridgeline += 3;
  if (/\b(blue|water|ocean|sea|river|tidal)\b/.test(normalizedToken)) scores.tidal += 3;
  if (/\b(brown|orange|tan|sand|warm|red|mesa)\b/.test(normalizedToken)) scores.mesa += 3;
  if (/\b(gray|grey|slate|neutral)\b/.test(normalizedToken)) scores.slate += 2;
}
function scoreThemeColor(color, scores) {
  const rgb = hexToRgb(color);
  if (!rgb) return;
  const { hue, saturation, luminance } = rgbToHsl(rgb);
  if (luminance < 0.18 && saturation < 0.24) scores.obsidian += 3;
  if (saturation < 0.12 && luminance > 0.82) scores.summit += 1;
  if (saturation < 0.16 && luminance > 0.55 && luminance <= 0.9) scores.slate += 2;
  if (hue >= 75 && hue <= 165 && saturation > 0.18) scores.ridgeline += 3;
  if (hue > 165 && hue <= 245 && saturation > 0.18) scores.tidal += 3;
  if ((hue >= 20 && hue <= 70 || hue >= 345 || hue <= 12) && saturation > 0.18) scores.mesa += 3;
}
function normalizeHexColor(value) {
  const color = String(value || "").trim().toLowerCase();
  const match = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return "";
  const hex = match[1];
  if (hex.length === 6) return `#${hex}`;
  return `#${hex.split("").map((character) => `${character}${character}`).join("")}`;
}
function hexToRgb(color) {
  const normalized = normalizeHexColor(color).replace("#", "");
  if (normalized.length !== 6) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}
function getRgbDistance(first, second) {
  return Math.sqrt((first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2);
}
function rgbToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const luminance = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * luminance - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * ((g - b) / delta % 6);
    if (max === g) hue = 60 * ((b - r) / delta + 2);
    if (max === b) hue = 60 * ((r - g) / delta + 4);
  }
  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation,
    luminance
  };
}
function buildMapTourMigrationRecipe({ item, data, template, relatedContext }) {
  const relatedWebMaps = relatedContext.relatedWebMaps || [];
  const relatedWebMapData = relatedWebMaps.map((webMap) => webMap.data);
  const relatedFeatureSets = relatedContext.sourceLayerFeatureSet ? [relatedContext.sourceLayerFeatureSet] : relatedWebMaps.flatMap((webMap) => webMap.featureSets || []);
  const conversionData = { classicApp: data, relatedWebMaps: relatedWebMapData, relatedFeatureSets };
  const textBlocks = collectTextBlocks(conversionData).slice(0, 80);
  const imageUrls = collectImageUrls(conversionData).slice(0, 60);
  const webMapIds = uniqueStrings([
    ...getClassicWebMapIds(data),
    ...collectItemIds(data),
    ...relatedWebMaps.map((webMap) => webMap.itemId)
  ]).filter((id) => id !== item.id).slice(0, 30);
  const links = collectLinks(conversionData).slice(0, 80);
  const tourStopData = relatedFeatureSets.length ? { relatedFeatureSets } : conversionData;
  const tourStops = template.key === "maptour" ? collectMapTourStops(tourStopData).slice(0, 200) : [];
  const mapTourLayout = getClassicMapTourLayout(data);
  const warnings = [];
  if (!tourStops.length && template.key === "maptour") warnings.push("No obvious tour stops were found. The generated output will preserve generic text, images, links, and web maps only.");
  if (!webMapIds.length) warnings.push("No web map item ids were detected.");
  return {
    template,
    supported: template.status === "ready",
    themeHints: getClassicThemeHints(data),
    source: {
      id: item.id,
      owner: item.owner,
      title: item.title,
      snippet: stripHtml(item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    relatedWebMaps: relatedWebMaps.map((webMap) => ({
      itemId: webMap.itemId,
      title: webMap.title,
      featureSets: (webMap.featureSets || []).map((featureSet) => ({
        layerTitle: featureSet.layerTitle,
        featureCount: featureSet.features?.length || 0
      }))
    })),
    mapTourLayout,
    counts: {
      textBlocks: textBlocks.length,
      imageUrls: imageUrls.length,
      webMapIds: webMapIds.length,
      links: links.length,
      tourStops: tourStops.length
    },
    textBlocks,
    imageUrls,
    webMapIds,
    links,
    tourStops,
    warnings
  };
}
function buildShortlistMigrationRecipe({ item, data, template, relatedContext }) {
  const sourceTabs = getShortlistTabs(data);
  const features = relatedContext.features || [];
  const stops = features.map((feature, index) => getShortlistStop(feature, index, item));
  const tabs = sourceTabs.length ? sourceTabs : getShortlistTabsFromStops(stops);
  const categories = tabs.map((tab) => ({
    ...tab,
    stops: []
  }));
  const categoriesById = new Map(categories.flatMap((category) => [
    [String(category.id), category],
    [normalizeCategoryKey(category.title), category]
  ]));
  const uncategorized = {
    id: "uncategorized",
    title: "Other places",
    color: "",
    stops: []
  };
  stops.forEach((stop) => {
    const category = categoriesById.get(stop.categoryId) || categoriesById.get(normalizeCategoryKey(stop.categoryId)) || uncategorized;
    category.stops.push(stop);
  });
  if (uncategorized.stops.length) {
    categories.push(uncategorized);
  }
  categories.forEach((category) => {
    category.stops.sort((first, second) => first.sortOrder - second.sortOrder || first.title.localeCompare(second.title));
  });
  const activeCategories = categories.filter((category) => category.stops.length);
  const warnings = [];
  if (!sourceTabs.length && tabs.length) warnings.push("No Shortlist tabs were found in the Classic app JSON; categories were inferred from feature attributes.");
  if (!tabs.length) warnings.push("No Shortlist tabs were found in the Classic app JSON.");
  if (!features.length) warnings.push("No Shortlist places were found in the referenced web map layer.");
  if (!activeCategories.length) warnings.push("No categorized places were available for conversion.");
  if (activeCategories.length > 8) {
    warnings.push("Only 8 categories are supported in the StoryMaps Builder tour interface. The backing feature layer contains all converted data. Tip: duplicate the tour and split the categories into two map tours.");
  }
  return {
    template,
    supported: true,
    themeHints: getClassicThemeHints(data),
    source: {
      id: item.id,
      owner: item.owner,
      title: data?.values?.title || item.title,
      snippet: stripHtml(data?.values?.subtitle || item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    relatedWebMaps: relatedContext.webMapId ? [{ itemId: relatedContext.webMapId, title: "Shortlist source web map", featureSets: [] }] : [],
    counts: {
      categories: activeCategories.length,
      textBlocks: features.length,
      imageUrls: activeCategories.reduce((total, category) => total + category.stops.filter((stop) => stop.imageUrl).length, 0),
      webMapIds: relatedContext.webMapId ? 1 : 0,
      links: activeCategories.reduce((total, category) => total + category.stops.filter((stop) => stop.website).length, 0),
      tourStops: activeCategories.reduce((total, category) => total + category.stops.length, 0)
    },
    textBlocks: activeCategories.flatMap((category) => category.stops.map((stop) => stripHtml(stop.description))).filter(Boolean),
    imageUrls: uniqueStrings(activeCategories.flatMap((category) => category.stops.flatMap((stop) => [stop.imageUrl, stop.thumbnailUrl]))),
    webMapIds: relatedContext.webMapId ? [relatedContext.webMapId] : [],
    links: uniqueStrings(activeCategories.flatMap((category) => category.stops.map((stop) => stop.website)).filter(Boolean)),
    tourStops: activeCategories.flatMap((category) => category.stops),
    categories: activeCategories,
    warnings
  };
}
function buildSwipeMigrationRecipe({ item, data, template, relatedContext }) {
  const values = data?.values || {};
  const webMaps = (relatedContext.webMaps || []).slice(0, 2);
  const requestedWebMapIds = relatedContext.requestedWebMapIds || getSwipeWebMapIds(data);
  const layerSwipeViews = webMaps.length === 1 ? getSwipeLayerViews(values, webMaps[0]?.data) : [];
  const layout = String(values.layout || "").toLowerCase() || "swipe";
  const dataModel = String(values.dataModel || "").toUpperCase();
  const captions = Array.isArray(values.popupTitles) ? values.popupTitles : [];
  const warnings = [];
  if (layout === "spyglass") {
    warnings.push("Classic Spyglass layout is not supported by AGSM. The output uses a standard swipe block.");
  }
  if (dataModel && dataModel !== "TWO_WEBMAPS" && !layerSwipeViews.length) {
    warnings.push(`This first Swipe converter is optimized for TWO_WEBMAPS. Source data model is ${dataModel}.`);
  }
  if (requestedWebMapIds.length < 2 && !layerSwipeViews.length) warnings.push("The Classic Swipe configuration does not list two web map ids.");
  if ((layerSwipeViews.length ? webMaps.length < 1 : webMaps.length < 2) || webMaps.some((webMap) => !webMap?.readable)) warnings.push("One or more referenced web maps could not be read; the converter preserved the original map id so the swipe slot can still be repaired in StoryMaps Builder.");
  return {
    template,
    supported: true,
    themeHints: getClassicThemeHints(data),
    source: {
      id: item.id,
      owner: item.owner,
      title: values.title || item.title,
      snippet: stripHtml(values.subtitle || item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    swipe: {
      layout,
      dataModel,
      sidePanelDescription: stripHtml(values.sidePanelDescription || ""),
      bookmark: Array.isArray(values.bookmarks) ? values.bookmarks[0] || null : null,
      legend: values.legend === true,
      captions: [
        firstString(captions[0], webMaps[0]?.title, "Before"),
        firstString(captions[1], webMaps[1]?.title, webMaps[0]?.title, "After")
      ],
      layerSwipeViews
    },
    relatedWebMaps: webMaps.map((webMap) => ({
      itemId: webMap.itemId,
      title: webMap.title,
      layerCount: Array.isArray(webMap.data?.operationalLayers) ? webMap.data.operationalLayers.length : 0
    })),
    counts: {
      textBlocks: values.subtitle || values.sidePanelDescription ? 1 : 0,
      imageUrls: 0,
      webMapIds: requestedWebMapIds.length,
      links: values.headerLinkURL ? 1 : 0,
      tourStops: 0,
      swipeMaps: layerSwipeViews.length ? 2 : webMaps.length
    },
    textBlocks: uniqueStrings([values.subtitle, values.sidePanelDescription].filter(Boolean).map(stripHtml)),
    imageUrls: [],
    webMapIds: requestedWebMapIds,
    links: uniqueStrings([values.headerLinkURL].filter(Boolean)),
    tourStops: [],
    webMaps,
    warnings
  };
}
function buildMapJournalMigrationRecipe({ item, data, template, relatedContext }) {
  const rawSections = Array.isArray(data?.values?.story?.sections) ? data.values.story.sections : [];
  const publishedSections = rawSections.filter((section) => String(section.status || "PUBLISHED").toUpperCase() === "PUBLISHED");
  const journalSections = publishedSections.map((section, index) => getMapJournalSection(section, index, item, relatedContext));
  const skippedCount = rawSections.length - publishedSections.length;
  const actionCount = publishedSections.reduce((total, section) => total + (Array.isArray(section.contentActions) ? section.contentActions.length : 0), 0);
  const preservedActionCount = journalSections.reduce((total, section) => total + section.actionLinks.length, 0);
  const mediaActionButtonCount = journalSections.reduce((total, section) => total + section.contentBlocks.filter((block) => block.kind === "action-button").length, 0);
  const regularActionLinkCount = Math.max(0, preservedActionCount - mediaActionButtonCount);
  const contentImageCount = journalSections.reduce((total, section) => total + section.contentBlocks.filter((block) => block.kind === "image").length, 0);
  const contentEmbedCount = journalSections.reduce((total, section) => total + section.contentBlocks.filter((block) => block.kind === "embed").length, 0);
  const insecureAssetCount = journalSections.reduce((total, section) => {
    const urls = [
      section.media.url,
      ...section.contentBlocks.filter((block) => block.kind === "image").map((image) => image.url),
      ...section.contentBlocks.filter((block) => block.kind === "embed").map((embed) => embed.url),
      ...section.actionLinks.map((link) => link.url)
    ].filter(Boolean);
    return total + urls.filter((url) => /^http:\/\//i.test(url)).length;
  }, 0);
  const warnings = [];
  if (!rawSections.length) warnings.push("No Map Journal sections were found in values.story.sections[].");
  if (skippedCount > 0) warnings.push(`${skippedCount} hidden Map Journal sections were skipped.`);
  if (mediaActionButtonCount > 0) warnings.push(`${mediaActionButtonCount} Classic media action${mediaActionButtonCount === 1 ? "" : "s"} will be preserved as sidecar action buttons.`);
  if (regularActionLinkCount > 0) warnings.push(`${regularActionLinkCount} Classic story action${regularActionLinkCount === 1 ? " was" : "s were"} preserved as regular or internal links.`);
  if (actionCount > preservedActionCount) warnings.push(`${actionCount - preservedActionCount} Classic actions were not directly convertible.`);
  if (contentImageCount > 0) warnings.push(`${contentImageCount} images embedded in Journal narrative panels were preserved.`);
  if (contentEmbedCount > 0) warnings.push(`${contentEmbedCount} embedded media blocks in Journal narrative panels were preserved as embeds.`);
  if (insecureAssetCount > 0) warnings.push(`${insecureAssetCount} source URLs still use http. Review those assets after conversion because browsers may block mixed content.`);
  if (!journalSections.length) warnings.push("No published Map Journal sections were available for conversion.");
  return {
    template,
    supported: true,
    themeHints: getClassicThemeHints(data),
    source: {
      id: item.id,
      owner: item.owner,
      title: data?.values?.title || item.title,
      snippet: stripHtml(item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    counts: {
      sections: journalSections.length,
      textBlocks: journalSections.reduce((total, section) => total + section.contentBlocks.filter((block) => block.kind === "text").length, 0),
      imageUrls: journalSections.filter((section) => section.media.type === "image").length + contentImageCount,
      webMapIds: journalSections.filter((section) => section.media.type === "webmap").length,
      mediaActions: mediaActionButtonCount,
      links: uniqueStrings(journalSections.flatMap((section) => [
        section.media.url,
        ...section.actionLinks.map((link) => link.url),
        ...section.contentBlocks.filter((block) => block.kind === "embed").map((block) => block.url),
        ...section.contentBlocks.flatMap((block) => extractUrls(block.text || ""))
      ])).length,
      tourStops: 0
    },
    textBlocks: journalSections.flatMap((section) => section.contentBlocks.filter((block) => block.kind === "text").map((block) => stripHtml(block.text))).filter(Boolean),
    imageUrls: uniqueStrings([
      ...journalSections.filter((section) => section.media.type === "image").map((section) => section.media.url),
      ...journalSections.flatMap((section) => section.contentBlocks.filter((block) => block.kind === "image").map((image) => image.url))
    ]),
    webMapIds: uniqueStrings(journalSections.filter((section) => section.media.type === "webmap").map((section) => section.media.itemId)),
    links: uniqueStrings(journalSections.flatMap((section) => [
      section.media.url,
      ...section.actionLinks.map((link) => link.url),
      ...section.contentBlocks.filter((block) => block.kind === "embed").map((block) => block.url),
      ...section.contentBlocks.flatMap((block) => extractUrls(block.text || ""))
    ]).filter(Boolean)),
    tourStops: [],
    journalSections,
    warnings
  };
}
function buildCascadeMigrationRecipe({ item, data, template }) {
  const rawSections = Array.isArray(data?.values?.sections) ? data.values.sections : [];
  const cascadeSections = rawSections.map((section, index) => getCascadeSection(section, index, item)).filter(Boolean);
  const mediaItems = cascadeSections.flatMap(getCascadeSectionMediaItems);
  const unsupportedBlocks = cascadeSections.reduce((total, section) => total + (section.unsupportedBlocks || 0), 0);
  const sequenceSections = cascadeSections.filter((section) => section.type === "sequence");
  const immersiveSections = cascadeSections.filter((section) => section.type === "immersive");
  const warnings = [];
  if (!rawSections.length) warnings.push("No Cascade sections were found in values.sections[].");
  if (!cascadeSections.length) warnings.push("No convertible Cascade sections were found.");
  if (unsupportedBlocks > 0) warnings.push(`${unsupportedBlocks} Cascade foreground blocks need author review because they do not map directly to AGSM text, image, or embed blocks.`);
  return {
    template,
    supported: template.status === "ready",
    themeHints: getClassicThemeHints(data),
    source: {
      id: item.id,
      owner: item.owner,
      title: item.title,
      snippet: stripHtml(item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    relatedWebMaps: [],
    counts: {
      sections: cascadeSections.length,
      textBlocks: cascadeSections.reduce((total, section) => total + section.blocks.filter((block) => block.kind === "text").length, 0),
      imageUrls: cascadeSections.reduce((total, section) => total + section.blocks.filter((block) => block.kind === "image").length, 0) + mediaItems.filter((media) => media.type === "image").length,
      webMapIds: uniqueStrings(mediaItems.map((media) => media.itemId).filter(Boolean)).length,
      links: uniqueStrings(cascadeSections.flatMap((section) => [
        ...getCascadeSectionMediaItems(section).map((media) => media.url),
        ...section.blocks.filter((block) => block.kind === "embed").map((block) => block.url),
        ...section.blocks.flatMap((block) => extractUrls(block.text || ""))
      ]).filter(Boolean)).length,
      tourStops: 0
    },
    textBlocks: cascadeSections.flatMap((section) => section.blocks.filter((block) => block.kind === "text").map((block) => stripHtml(block.text))).filter(Boolean),
    imageUrls: uniqueStrings(cascadeSections.flatMap((section) => [
      ...getCascadeSectionMediaItems(section).filter((media) => media.type === "image").map((media) => media.url),
      ...section.blocks.filter((block) => block.kind === "image").map((block) => block.url)
    ]).filter(Boolean)),
    webMapIds: uniqueStrings(mediaItems.map((media) => media.itemId).filter(Boolean)),
    links: uniqueStrings(cascadeSections.flatMap((section) => [
      ...getCascadeSectionMediaItems(section).map((media) => media.url),
      ...section.blocks.filter((block) => block.kind === "embed").map((block) => block.url),
      ...section.blocks.flatMap((block) => extractUrls(block.text || ""))
    ]).filter(Boolean)),
    tourStops: [],
    cascadeSections,
    sequenceSections: sequenceSections.length,
    immersiveSections: immersiveSections.length,
    warnings
  };
}
function buildMapSeriesMigrationRecipe({ item, data, template, relatedContext = {}, mapSeriesOutput = "collection" }) {
  if (!["collection", "sidecar"].includes(mapSeriesOutput)) throw new Error("Unsupported Map Series output.");
  const entries = Array.isArray(data?.values?.story?.entries) ? data.values.story.entries : [];
  const themeHints = getClassicThemeHints(data);
  const mapViewerTheme = getMapSeriesViewerTheme(themeHints);
  const collectionEntries = entries.map((entry, index) => getMapSeriesCollectionEntry(entry, index, { mapViewerTheme, item, relatedContext })).filter(Boolean);
  const hiddenCount = collectionEntries.filter((entry) => entry.isHidden).length;
  const warnings = [];
  if (!entries.length) warnings.push("No Map Series entries were found in values.story.entries[].");
  if (relatedContext.relatedWebMaps?.some((map) => !map.data)) warnings.push("Some referenced web maps could not be read. Their item references and explicit Classic overrides are retained; review map visibility and sharing before publishing.");
  if (hiddenCount > 0) warnings.push(mapSeriesOutput === "sidecar" ? `${hiddenCount} hidden Map Series entries were omitted from the sidecar. Choose Collection to retain hidden entries for later review.` : `${hiddenCount} hidden Map Series entries were preserved as hidden Collection items.`);
  if (!collectionEntries.length) warnings.push("No Map Series entries with convertible media were found.");
  if (mapSeriesOutput === "collection" && collectionEntries.some((entry) => entry.description)) {
    warnings.push("Collection summaries do not replace the Classic information panel. Choose Story with sidecar to preserve its rich narrative content beside each map.");
  }
  return {
    template,
    supported: true,
    outputKind: mapSeriesOutput === "sidecar" ? "story" : "collection",
    mapSeriesOutput,
    themeHints,
    source: {
      id: item.id,
      owner: item.owner,
      title: data?.values?.title || item.title,
      snippet: stripHtml(item.snippet || item.description || ""),
      byline: stripHtml(item.accessInformation || item.owner || ""),
      url: item.url || `https://www.arcgis.com/home/item.html?id=${item.id}`,
      thumbnail: item.thumbnail || "",
      typeKeywords: item.typeKeywords || [],
      logo: getClassicLogo(data, item)
    },
    counts: {
      textBlocks: collectionEntries.filter((entry) => entry.description).length,
      imageUrls: collectionEntries.filter((entry) => entry.thumbnailUrl).length,
      webMapIds: collectionEntries.filter((entry) => isArcGisItemId(entry.itemId)).length,
      links: collectionEntries.filter((entry) => entry.url).length,
      tourStops: 0,
      collectionEntries: collectionEntries.length
    },
    textBlocks: collectionEntries.map((entry) => entry.description).filter(Boolean),
    imageUrls: uniqueStrings(collectionEntries.map((entry) => entry.thumbnailUrl).filter(Boolean)),
    webMapIds: collectionEntries.filter((entry) => isArcGisItemId(entry.itemId)).map((entry) => entry.itemId),
    links: collectionEntries.map((entry) => entry.url).filter(Boolean),
    tourStops: [],
    collectionEntries,
    warnings
  };
}
function buildMapTourAgsmJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const tourId = id("n");
  const tourMapId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const nodes = {};
  const resources = {};
  const sourceTitle = recipe.source.title || "Untitled migrated Classic StoryMap";
  const sourceSummary = recipe.source.snippet || `Migrated from ${recipe.template.label}.`;
  const stops = recipe.tourStops.length ? recipe.tourStops : [getPlaceholderTourStop(recipe)];
  const places = [];
  const geometries = {};
  const tourSubtype = getAgsmTourSubtype(recipe.mapTourLayout);
  const basemap = createTourBasemapResource(recipe, id, resources);
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "minimal",
      title: `(Converted) ${sourceTitle}`,
      summary: sourceSummary,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "top",
      titlePanelHorizontalPosition: "start",
      titlePanelStyle: "gradient"
    }
  };
  nodes[navId] = { type: "navigation", data: { links: [] }, config: { isHidden: true } };
  stops.slice(0, 100).forEach((stop, index) => {
    const placeId = id("n");
    const titleId = id("n");
    const textId = id("n");
    const imageId = id("n");
    const carouselId = id("n");
    const imageResourceId = id("r");
    const featureId = createFeatureId(index);
    const point = getTourPoint(stop);
    resources[imageResourceId] = {
      type: "image",
      data: {
        src: stop.imageUrl || stop.thumbnailUrl || getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
        provider: "uri",
        height: 800,
        width: 1200
      }
    };
    nodes[imageId] = createTourImageNode(imageResourceId);
    nodes[carouselId] = { type: "carousel", children: [imageId] };
    nodes[titleId] = {
      type: "text",
      data: { text: stop.title || "", type: "h3" }
    };
    nodes[textId] = {
      type: "text",
      data: { text: stop.description || "", type: "paragraph" }
    };
    geometries[featureId] = {
      id: featureId,
      type: "POINT_NUMBERED_TOUR",
      nodes: [{ long: point.long, lat: point.lat }]
    };
    places.push({
      id: placeId,
      featureId,
      contents: [textId],
      media: carouselId,
      title: titleId
    });
  });
  nodes[tourMapId] = { type: "tour-map", data: { geometries, ...basemap.tourMapData } };
  nodes[tourId] = {
    type: "tour",
    data: {
      type: "guided-tour",
      subtype: tourSubtype,
      narrativePanelPosition: getAgsmTourNarrativePanelPosition(recipe.mapTourLayout),
      places,
      narrativePanelSize: "small",
      map: tourMapId
    }
  };
  createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children: [coverId, navId, tourId, creditsId]
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return { root: rootId, nodes, resources };
}
function buildShortlistAgsmJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const nodes = {};
  const resources = {};
  const children = [coverId, navId];
  const navigationLinks = [];
  const basemap = createTourBasemapResource(recipe, id, resources);
  const categories = recipe.categories?.length ? recipe.categories : [{
    id: "shortlist",
    title: "Shortlist places",
    stops: recipe.tourStops.length ? recipe.tourStops : [getPlaceholderTourStop(recipe)]
  }];
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "minimal",
      title: `(Converted) ${recipe.source.title || "Untitled migrated Classic Shortlist"}`,
      summary: recipe.source.snippet || `Migrated from ${recipe.template.label}.`,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "top",
      titlePanelHorizontalPosition: "start",
      titlePanelStyle: "gradient"
    }
  };
  categories.forEach((category, categoryIndex) => {
    const headingId = id("n");
    const tourId = id("n");
    const tourMapId = id("n");
    const places = [];
    const geometries = {};
    nodes[headingId] = {
      type: "text",
      data: { type: "h2", text: category.title || `Category ${categoryIndex + 1}` }
    };
    navigationLinks.push({ nodeId: headingId });
    children.push(headingId, tourId);
    category.stops.slice(0, 100).forEach((stop, stopIndex) => {
      const placeId = id("n");
      const titleId = id("n");
      const textId = id("n");
      const imageId = id("n");
      const carouselId = id("n");
      const imageResourceId = id("r");
      const featureId = createFeatureId(`${category.id}-${stopIndex + 1}`);
      const point = getTourPoint(stop);
      resources[imageResourceId] = {
        type: "image",
        data: {
          src: stop.imageUrl || stop.thumbnailUrl || getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
          provider: "uri",
          height: 800,
          width: 1200
        }
      };
      nodes[imageId] = createTourImageNode(imageResourceId);
      nodes[carouselId] = { type: "carousel", children: [imageId] };
      nodes[titleId] = {
        type: "text",
        data: { text: stop.title || `Place ${stopIndex + 1}`, type: "h3" }
      };
      nodes[textId] = {
        type: "text",
        data: { text: getShortlistDescriptionText(stop), type: "paragraph" }
      };
      geometries[featureId] = {
        id: featureId,
        type: "POINT_NUMBERED_TOUR",
        nodes: [{ long: point.long, lat: point.lat }]
      };
      places.push({
        id: placeId,
        featureId,
        contents: [textId],
        media: carouselId,
        title: titleId
      });
    });
    nodes[tourMapId] = { type: "tour-map", data: { geometries, ...basemap.tourMapData } };
    nodes[tourId] = {
      type: "tour",
      data: {
        type: "explorer",
        subtype: "grid",
        places,
        map: tourMapId
      }
    };
  });
  nodes[navId] = { type: "navigation", data: { links: navigationLinks }, config: { isHidden: false } };
  createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  children.push(creditsId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return { root: rootId, nodes, resources };
}
function buildShortlistDataDrivenAgsmJson(recipe, hostedLayer) {
  if (!hostedLayer?.itemId) throw new Error("A hosted feature layer item id is required for a data-driven Shortlist tour.");
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const tourId = id("n");
  const tourMapId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const featureLayerResourceId = id("r");
  const nodes = {};
  const resources = {};
  const categories = getHostedShortlistCategorySummaries(recipe);
  const categorized = categories.length > 1;
  const hasWebsite = (recipe.categories || []).some((category) => (category.stops || []).some((stop) => stop.website));
  const storyTitle = `(Converted) ${recipe.source.title || "Untitled migrated Classic Shortlist"}`;
  const storyDescription = recipe.source.snippet || `Migrated from ${recipe.template.label}.`;
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "minimal",
      title: storyTitle,
      summary: storyDescription,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "top",
      titlePanelHorizontalPosition: "start",
      titlePanelStyle: "gradient"
    }
  };
  nodes[navId] = { type: "navigation", data: { links: [] }, config: { isHidden: true } };
  nodes[tourMapId] = {
    type: "tour-map",
    data: {
      geometries: {},
      mode: "2d",
      basemap: { type: "name", value: "navigation" }
    }
  };
  nodes[tourId] = {
    type: "tour",
    data: {
      type: "explorer",
      subtype: categorized ? "categorized-grid" : "grid",
      narrativePanelPosition: "start",
      narrativePanelSize: "small",
      map: tourMapId,
      title: storyTitle,
      description: storyDescription,
      dataDriven: {
        placesLayerIdentifiers: { sublayerId: hostedLayer.layerId ?? HOSTED_SHORTLIST_LAYER_ID },
        titleFieldName: "NAME",
        descriptionFieldName: "DESCRIPTION",
        ...categorized ? { categoryFieldName: "TAB_NAME" } : {},
        sortFieldName: "SORT_ORDER",
        sortDirection: "ascending",
        maximumPlaceCount: Math.min(Math.max(hostedLayer.featureCount || 1, 1), 200),
        maximumMediaPerPlace: 1,
        showPlacesWithoutMedia: true,
        supportedMediaTypes: ["image"],
        mediaPlacement: {
          type: "fit",
          fill: { x: 0.5, y: 0.5 },
          fit: { color: "backgroundColor" }
        },
        dataSource: featureLayerResourceId,
        imgUrlFieldName: "PIC_URL",
        thumbnailUrlFieldName: "THUMB_URL",
        ...hasWebsite ? { buttons: [{ buttonLinkFieldName: "WEBSITE", buttonText: "More information" }] } : {}
      },
      ...categorized ? { categories } : {},
      accentColor: "accentColor1"
    }
  };
  createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children: [coverId, navId, tourId, creditsId]
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  resources[featureLayerResourceId] = {
    type: "feature-layer",
    data: {
      itemId: hostedLayer.itemId,
      source: "feature-service"
    }
  };
  return { root: rootId, nodes, resources };
}
function getHostedShortlistCategorySummaries(recipe) {
  const palette = ["#d92b30", "#0095ba", "#3cccb4", "#f260a1", "#ffdf3c", "#8f4ec6", "#f57c00", "#4d7c0f"];
  return (recipe.categories || []).map((category, index) => ({
    name: category.title || `Category ${index + 1}`,
    color: /^#[a-f0-9]{6}$/i.test(String(category.color || "")) ? category.color : palette[index % palette.length],
    featureCount: (category.stops || []).filter(isValidHostedShortlistStop).length
  })).filter((category) => category.featureCount > 0);
}
function isValidHostedShortlistStop(stop) {
  if (typeof stop?.location?.x !== "number" || typeof stop?.location?.y !== "number") return false;
  const point = getTourPoint(stop);
  return Number.isFinite(point.long) && Number.isFinite(point.lat) && Math.abs(point.long) <= 180 && Math.abs(point.lat) <= 90;
}
function getHostedShortlistPlan(recipe, capability) {
  if (recipe?.template?.key !== "shortlist") return { eligible: false, reason: "" };
  if (!capability?.allowed) {
    return {
      eligible: false,
      reason: `A hosted feature layer was not created. ${capability?.reason || "The token does not have verified hosted feature publishing privileges."}`
    };
  }
  const categories = getHostedShortlistCategorySummaries(recipe);
  if (!categories.length) return { eligible: false, reason: "A hosted feature layer was not created because no valid Shortlist point locations were found." };
  return { eligible: true, reason: "" };
}
function buildSwipeAgsmJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const introId = id("n");
  const swipeId = id("n");
  const firstMapNodeId = id("n");
  const secondMapNodeId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const firstMapResourceId = id("r");
  const secondMapResourceId = id("r");
  const nodes = {};
  const resources = {};
  const [firstWebMap, secondWebMap] = recipe.webMaps || [];
  const layerSwipeViews = Array.isArray(recipe.swipe?.layerSwipeViews) ? recipe.swipe.layerSwipeViews : [];
  const isLayerSwipe = layerSwipeViews.length === 2 && firstWebMap;
  const resolvedSecondWebMap = isLayerSwipe ? firstWebMap : secondWebMap;
  const extent = recipe.swipe?.bookmark?.extent || firstWebMap?.data?.initialState?.viewpoint?.targetGeometry || null;
  const firstCaption = recipe.swipe?.captions?.[0] || firstWebMap?.title || "First map";
  const secondCaption = recipe.swipe?.captions?.[1] || resolvedSecondWebMap?.title || "Second map";
  const introText = recipe.swipe?.sidePanelDescription || recipe.source.snippet || "";
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "minimal",
      title: `(Converted) ${recipe.source.title || "Untitled migrated Classic Swipe"}`,
      summary: recipe.source.snippet || `Migrated from ${recipe.template.label}.`,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "top",
      titlePanelHorizontalPosition: "start",
      titlePanelStyle: "gradient"
    }
  };
  nodes[navId] = { type: "navigation", data: { links: [] }, config: { isHidden: true } };
  nodes[introId] = { type: "text", data: { type: "paragraph", text: introText } };
  resources[firstMapResourceId] = {
    type: "webmap",
    data: createSwipeWebMapResourceData(firstWebMap, extent)
  };
  if (!isLayerSwipe) {
    resources[secondMapResourceId] = {
      type: "webmap",
      data: createSwipeWebMapResourceData(secondWebMap, extent)
    };
  }
  nodes[firstMapNodeId] = {
    type: "webmap",
    data: {
      map: firstMapResourceId,
      caption: firstCaption,
      timeSlider: false,
      ...layerSwipeViews[0]?.mapLayers?.length ? { mapLayers: layerSwipeViews[0].mapLayers } : {},
      ...compactExtentData(extent)
    }
  };
  nodes[secondMapNodeId] = {
    type: "webmap",
    data: {
      map: isLayerSwipe ? firstMapResourceId : secondMapResourceId,
      caption: secondCaption,
      timeSlider: false,
      ...layerSwipeViews[1]?.mapLayers?.length ? { mapLayers: layerSwipeViews[1].mapLayers } : {},
      ...compactExtentData(extent)
    }
  };
  nodes[swipeId] = {
    type: "swipe",
    data: {
      contents: {
        "0": firstMapNodeId,
        "1": secondMapNodeId
      },
      viewPlacement: "extent",
      caption: recipe.source.snippet || recipe.swipe?.sidePanelDescription || "",
      ...recipe.swipe?.legend ? { legend: [firstMapNodeId, secondMapNodeId] } : {}
    }
  };
  createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children: [coverId, navId, introId, swipeId, creditsId]
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return { root: rootId, nodes, resources };
}
function createEmptyCreditsNode(nodes, creditsId, headingId, paragraphId, attributionId) {
  nodes[headingId] = { type: "text", data: { text: "", type: "h2" } };
  nodes[paragraphId] = { type: "text", data: { text: "", type: "paragraph" } };
  nodes[attributionId] = { type: "attribution", data: { content: "", attribution: "" } };
  nodes[creditsId] = {
    type: "credits",
    config: { isHidden: true },
    children: [headingId, paragraphId, attributionId]
  };
}
function buildMapJournalAgsmJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const sidecarId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const nodes = {};
  const resources = {};
  const children = [coverId, navId];
  const slides = [];
  const actions = [];
  const sections = recipe.journalSections?.length ? recipe.journalSections : [getPlaceholderJournalSection(recipe)];
  const sectionTitleIds = sections.slice(0, 80).map(() => id("n"));
  const sectionAnchorMap = new Map(sectionTitleIds.map((nodeId, index) => [`#classic-journal-section-${index}`, `#ref-${nodeId}`]));
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "minimal",
      title: `(Converted) ${recipe.source.title || "Untitled migrated Classic Map Journal"}`,
      summary: recipe.source.snippet || `Migrated from ${recipe.template.label}.`,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "top",
      titlePanelHorizontalPosition: "start",
      titlePanelStyle: "gradient"
    }
  };
  nodes[navId] = { type: "navigation", data: { links: [] }, config: { isHidden: true } };
  sections.slice(0, 80).forEach((section, index) => {
    const slideId = id("n");
    const panelId = id("n");
    const titleId = sectionTitleIds[index];
    const mediaNodeId = createJournalMediaNode(section, recipe, id, nodes, resources);
    const panelChildren = [titleId];
    nodes[titleId] = {
      type: "text",
      data: { type: "h3", text: section.title || `Journal section ${index + 1}` }
    };
    panelChildren.push(...createJournalNarrativeBlockNodes(section.contentBlocks.slice(0, 80), id, nodes, resources, sectionAnchorMap, {
      buttonLayout: "rows",
      actionList: actions,
      actionMap: section.actionMap,
      recipe,
      slideId,
      actionMediaTitle: section.title || `Journal section ${index + 1}`
    }));
    nodes[panelId] = {
      type: "immersive-narrative-panel",
      data: { panelStyle: "themed" },
      children: panelChildren
    };
    nodes[slideId] = {
      type: "immersive-slide",
      data: { transition: "fade" },
      children: [panelId, mediaNodeId]
    };
    slides.push(slideId);
  });
  nodes[sidecarId] = {
    type: "immersive",
    data: {
      type: "sidecar",
      subtype: "docked-panel",
      narrativePanelPosition: "start",
      narrativePanelSize: "small"
    },
    children: slides
  };
  children.push(sidecarId);
  createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  children.push(creditsId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return {
    root: rootId,
    nodes,
    resources,
    ...actions.length ? { actions } : {}
  };
}
function buildCascadeAgsmJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const creditsId = id("n");
  const creditsHeadingId = id("n");
  const creditsParagraphId = id("n");
  const attributionId = id("n");
  const themeResourceId = id("r");
  const nodes = {};
  const resources = {};
  const children = [coverId, navId];
  const sections = recipe.cascadeSections?.length ? recipe.cascadeSections : [getPlaceholderCascadeSection(recipe)];
  const coverSection = sections.find((section) => section.type === "cover");
  const creditsSection = sections.find((section) => section.type === "credits");
  const coverImageNodeId = coverSection?.media?.type === "image" ? createCascadeMediaNode(coverSection.media, coverSection.title, recipe, id, nodes, resources) : null;
  nodes[coverId] = {
    type: "storycover",
    data: {
      type: "full",
      title: `(Converted) ${coverSection?.title || recipe.source.title || "Untitled migrated Classic Cascade"}`,
      summary: coverSection?.subtitle || recipe.source.snippet || `Migrated from ${recipe.template.label}.`,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      titlePanelVerticalPosition: "middle",
      titlePanelHorizontalPosition: "center",
      titlePanelStyle: "gradient"
    },
    ...coverImageNodeId ? { children: [coverImageNodeId] } : {}
  };
  nodes[navId] = { type: "navigation", data: { links: [] }, config: { isHidden: true } };
  sections.slice(0, 80).forEach((section, index) => {
    if (section.type === "cover") {
      return;
    }
    if (section.type === "credits") return;
    if (section.type === "immersive") {
      children.push(createCascadeImmersiveNode(section, recipe, id, nodes, resources, index));
      return;
    }
    children.push(...createJournalNarrativeBlockNodes(section.blocks.slice(0, 80), id, nodes, resources));
  });
  if (creditsSection) {
    const creditsChildren = createCascadeCreditNodes(creditsSection, id, nodes, resources);
    nodes[creditsId] = {
      type: "credits",
      config: { isHidden: false },
      children: creditsChildren
    };
  } else {
    createEmptyCreditsNode(nodes, creditsId, creditsHeadingId, creditsParagraphId, attributionId);
  }
  children.push(creditsId);
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return { root: rootId, nodes, resources };
}
function buildMapSeriesCollectionJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const collectionUiId = id("n");
  const themeResourceId = id("r");
  const nodes = {};
  const resources = {};
  const items = [];
  const coverSummary = recipe.source.snippet || `Migrated from ${recipe.template.label}.`;
  const coverChildren = [];
  if (coverSummary) {
    const descriptionId = id("n");
    nodes[descriptionId] = {
      type: "text",
      data: { text: escapeHtml(coverSummary), type: "paragraph" },
      config: { size: "full" }
    };
    coverChildren.push(descriptionId);
  }
  nodes[coverId] = {
    type: "collection-cover",
    data: {
      title: `(Converted) ${recipe.source.title || "Untitled migrated Classic Map Series"}`,
      summary: coverSummary,
      byline: recipe.source.byline || recipe.source.owner || "Migrated author",
      type: "tiles"
    },
    ...coverChildren.length ? { children: coverChildren } : {}
  };
  nodes[navId] = { type: "collection-nav", data: { type: "tab" } };
  (recipe.collectionEntries || []).forEach((entry) => {
    if (entry.thumbnailUrl) {
      const thumbnailResourceId = id("r");
      resources[thumbnailResourceId] = createUriImageResource(entry.thumbnailUrl);
      entry.thumbnailResourceId = thumbnailResourceId;
    }
    const itemConfig = getCollectionItemConfig(entry);
    if (entry.sourceType === "webmap") {
      const nodeId = createJournalMediaNodeFromMedia(entry.media, entry.title, recipe, id, nodes, resources);
      const resourceId = id("r");
      resources[resourceId] = { type: "portal-item", data: { itemId: entry.itemId, itemType: "Web Map" } };
      items.push({ nodeId, resourceId, customTitle: entry.title, ...itemConfig });
      return;
    }
    if (entry.sourceType === "portal-item" && isArcGisItemId(entry.itemId)) {
      const resourceId = id("r");
      resources[resourceId] = {
        type: "portal-item",
        data: {
          itemId: entry.itemId
        }
      };
      items.push({
        resourceId,
        customTitle: entry.title,
        ...itemConfig
      });
      return;
    }
    const embedNodeId = id("n");
    nodes[embedNodeId] = {
      type: "embed",
      data: createCollectionEmbedData(entry)
    };
    items.push({
      nodeId: embedNodeId,
      customTitle: entry.title,
      ...itemConfig
    });
  });
  nodes[collectionUiId] = {
    type: "collection-ui",
    data: { items },
    children: [coverId, navId]
  };
  nodes[rootId] = {
    type: "collection",
    data: withRootLogo({ storyTheme: themeResourceId }, recipe.source.logo, id, resources),
    children: [collectionUiId]
  };
  resources[themeResourceId] = {
    type: "story-theme",
    data: createAgsmThemeData(recipe)
  };
  return { root: rootId, nodes, resources };
}
function buildMapSeriesAgsmJson(recipe) {
  return recipe.mapSeriesOutput === "sidecar" ? buildMapSeriesSidecarJson(recipe) : buildMapSeriesCollectionJson(recipe);
}
function buildMapSeriesSidecarJson(recipe) {
  const id = createIdFactory();
  const rootId = id("n");
  const coverId = id("n");
  const navId = id("n");
  const sidecarId = id("n");
  const themeId = id("r");
  const nodes = {};
  const resources = {};
  const links = [];
  const slides = [];
  const entries = (recipe.collectionEntries || []).filter((entry) => !entry.isHidden);
  if (!entries.length) throw new Error("No visible Map Series entries are available for a sidecar.");
  nodes[coverId] = { type: "storycover", data: {
    type: "minimal",
    title: `(Converted) ${recipe.source.title || "Classic Map Series"}`,
    summary: recipe.source.snippet || "",
    byline: recipe.source.byline || recipe.source.owner || ""
  } };
  const titleIds = entries.map(() => id("n"));
  const anchors = new Map(entries.map((entry, index) => [`#classic-journal-section-${entry.sourceIndex}`, `#ref-${titleIds[index]}`]));
  const actions = [];
  entries.forEach((entry, index) => {
    const slideId = id("n");
    const panelId = id("n");
    const titleId = titleIds[index];
    nodes[titleId] = { type: "text", data: { type: "h2", text: escapeHtml(entry.title) } };
    const panelChildren = [titleId, ...createJournalNarrativeBlockNodes(
      getNarrativeBlocks(entry.narrativeHtml, entry.actionMap),
      id,
      nodes,
      resources,
      anchors,
      { buttonLayout: "rows", actionList: actions, actionMap: entry.actionMap, recipe, slideId, actionMediaTitle: entry.title }
    )];
    nodes[panelId] = { type: "immersive-narrative-panel", data: { panelStyle: "themed" }, children: panelChildren };
    const mediaId = createJournalMediaNodeFromMedia(entry.media, entry.title, recipe, id, nodes, resources);
    nodes[slideId] = { type: "immersive-slide", data: { transition: "fade" }, children: [panelId, mediaId] };
    slides.push(slideId);
    links.push({ nodeId: titleId });
  });
  nodes[navId] = { type: "navigation", data: { links }, config: { isHidden: false } };
  nodes[sidecarId] = { type: "immersive", data: {
    type: "sidecar",
    subtype: "docked-panel",
    narrativePanelPosition: "start",
    narrativePanelSize: "medium"
  }, children: slides };
  nodes[rootId] = {
    type: "story",
    data: withRootLogo({ storyTheme: themeId }, recipe.source.logo, id, resources),
    config: { coverDate: "first-published" },
    children: [coverId, navId, sidecarId]
  };
  resources[themeId] = { type: "story-theme", data: createAgsmThemeData(recipe) };
  return { root: rootId, nodes, resources, ...actions.length ? { actions } : {} };
}
function createUriImageResource(src, height = 800, width = 1200) {
  return {
    type: "image",
    data: {
      src,
      provider: "uri",
      height,
      width
    }
  };
}
function renderRecipe(recipe) {
  const status = recipe.supported ? "Draft conversion is enabled." : "Analysis only for this template.";
  const categoryMetric = typeof recipe.counts.categories === "number" ? `<div class="metric"><span>Categories</span><strong>${recipe.counts.categories}</strong></div>` : "";
  const mapTourLayoutMetric = recipe.mapTourLayout ? `<div class="metric"><span>Classic layout</span><strong>${escapeHtml(recipe.mapTourLayout)}</strong></div>` : "";
  const swipeMetric = typeof recipe.counts.swipeMaps === "number" ? `<div class="metric"><span>Swipe maps</span><strong>${recipe.counts.swipeMaps}</strong></div>` : "";
  const collectionMetric = typeof recipe.counts.collectionEntries === "number" ? `<div class="metric"><span>Collection entries</span><strong>${recipe.counts.collectionEntries}</strong></div>` : "";
  const sectionMetric = typeof recipe.counts.sections === "number" ? `<div class="metric"><span>Sections</span><strong>${recipe.counts.sections}</strong></div>` : "";
  const mediaActionMetric = typeof recipe.counts.mediaActions === "number" ? `<div class="metric"><span>Media actions</span><strong>${recipe.counts.mediaActions}</strong></div>` : "";
  const logoMetric = recipe.source.logo ? `<div class="metric"><span>Logo</span><strong>Preserved</strong></div>` : "";
  const generalWarnings = recipe.warnings.filter((warning) => !warning.startsWith("Only 8 categories are supported in the StoryMaps Builder tour interface."));
  const warnings = generalWarnings.length ? `<ul class="recipe-list">${generalWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : "";
  const shortlistCategoryNote = recipe.template?.key === "shortlist" && recipe.counts.categories > 8 ? `<div class="shortlist-category-note" role="note">
        <span class="shortlist-category-note-icon" aria-hidden="true">!</span>
        <div><strong>Only 8 categories are supported in Builder.</strong> The backing feature layer contains all converted data.<br><span><strong>Tip:</strong> Duplicate the tour and split the categories into two map tours.</span></div>
      </div>` : "";
  elements.recipeSummary.innerHTML = `
    <div class="metric-grid">
      <div class="metric"><span>Template</span><strong>${escapeHtml(recipe.template.label)}</strong></div>
      <div class="metric"><span>Status</span><strong>${escapeHtml(status)}</strong></div>
      ${categoryMetric}
      ${mapTourLayoutMetric}
      ${swipeMetric}
      ${collectionMetric}
      ${sectionMetric}
      ${mediaActionMetric}
      ${logoMetric}
      <div class="metric"><span>Tour stops</span><strong>${recipe.counts.tourStops}</strong></div>
      <div class="metric"><span>Web maps</span><strong>${recipe.counts.webMapIds}</strong></div>
      <div class="metric"><span>Images</span><strong>${recipe.counts.imageUrls}</strong></div>
      <div class="metric"><span>Text blocks</span><strong>${recipe.counts.textBlocks}</strong></div>
    </div>
    ${shortlistCategoryNote}
    ${warnings}
  `;
}
function collectMapTourStops(data) {
  const stops = [];
  walk(data, (value, key) => {
    if (!isPlainObject2(value)) return;
    if (key === "attributes") return;
    const attrs = isPlainObject2(value.attributes) ? value.attributes : value;
    const title = firstString(
      getAttributeValue(attrs, "name"),
      getAttributeValue(attrs, "title")
    );
    const description = firstString(
      getAttributeValue(attrs, "description"),
      getAttributeValue(attrs, "text_for_description"),
      getAttributeValue(attrs, "caption")
    );
    const imageUrl = firstUrl(
      getAttributeValue(attrs, "pic_url"),
      getAttributeValue(attrs, "picUrl"),
      getAttributeValue(attrs, "image_url"),
      getAttributeValue(attrs, "imageUrl"),
      getAttributeValue(attrs, "picture"),
      getAttributeValue(attrs, "photo_url")
    );
    const thumbnailUrl = firstUrl(
      getAttributeValue(attrs, "thumb_url"),
      getAttributeValue(attrs, "thumbUrl"),
      getAttributeValue(attrs, "thumbnail"),
      getAttributeValue(attrs, "thumbnail_url")
    );
    const geometry = value.geometry || attrs.geometry;
    const long = Number(getAttributeValue(attrs, "long") ?? getAttributeValue(attrs, "longitude"));
    const lat = Number(getAttributeValue(attrs, "lat") ?? getAttributeValue(attrs, "latitude"));
    const attributeLocation = Number.isFinite(long) && Number.isFinite(lat) ? { x: long, y: lat, spatialReference: { wkid: 4326 } } : null;
    const location = geometry && typeof geometry.x === "number" && typeof geometry.y === "number" ? { x: geometry.x, y: geometry.y, spatialReference: geometry.spatialReference || null } : attributeLocation;
    if ((title || description || imageUrl) && (location || imageUrl || thumbnailUrl)) {
      stops.push({
        title: stripHtml(title || ""),
        description: stripHtml(description || ""),
        imageUrl,
        thumbnailUrl,
        location,
        sourceAttributes: compactObject(attrs)
      });
    }
  });
  return dedupeBy(stops, (stop) => `${stop.title}|${stop.imageUrl}|${stop.location?.x || ""}|${stop.location?.y || ""}`);
}
function getMapTourOrder(data) {
  const order = data?.values?.order;
  if (!Array.isArray(order)) return [];
  return order.map((entry, index) => ({
    id: Number(entry?.id),
    visible: entry?.visible !== false,
    index
  })).filter((entry) => Number.isFinite(entry.id) && entry.visible);
}
function findOperationalLayer(mapData, layerId) {
  const layers = Array.isArray(mapData?.operationalLayers) ? mapData.operationalLayers : [];
  const normalizedLayerId = normalizeMapTourLayerId(layerId);
  return layers.find((layer) => {
    const layerIds = uniqueStrings([layer?.id, layer?.itemId]);
    return layerIds.includes(layerId) || normalizedLayerId && layerIds.includes(normalizedLayerId);
  }) || null;
}
function normalizeMapTourLayerId(layerId) {
  const value = String(layerId || "").trim();
  if (!value) return "";
  return value.replace(/_\d+$/, "");
}
function getAttributeValue(attrs, fieldName) {
  if (!isPlainObject2(attrs)) return void 0;
  const normalizedFieldName = String(fieldName || "").replace(/_/g, "").toLowerCase();
  const entry = Object.entries(attrs).find(
    ([key]) => String(key).replace(/_/g, "").toLowerCase() === normalizedFieldName
  );
  return entry ? entry[1] : void 0;
}
function getObjectIdFieldName(json, layer) {
  return json?.objectIdFieldName || layer?.layerDefinition?.objectIdField || layer?.itemProperties?.layerDefinition?.objectIdField || layer?.featureCollection?.layers?.[0]?.layerDefinition?.objectIdField || "OBJECTID";
}
function orderMapTourFeatures(features, objectIdFieldName, order) {
  if (!order.length) return features;
  const featuresById = new Map(features.map((feature) => [Number(getFeatureObjectId(feature, objectIdFieldName)), feature]));
  return order.map((entry) => featuresById.get(entry.id)).filter(Boolean);
}
function getFeatureObjectId(feature, objectIdFieldName) {
  const attrs = feature?.attributes || {};
  return attrs[objectIdFieldName] ?? attrs.OBJECTID ?? attrs.ObjectID ?? attrs.FID ?? attrs.objectid;
}
function getClassicMapTourLayout(data) {
  const layout = String(data?.values?.layout || data?.layout || "").toLowerCase();
  if (layout === "side-panel") return "side-panel";
  if (layout === "three-panel") return "three-panel";
  if (layout === "integrated") return "integrated";
  return "integrated";
}
function getAgsmTourSubtype(classicLayout) {
  return classicLayout === "side-panel" || classicLayout === "three-panel" ? "media-focused" : "map-focused";
}
function getAgsmTourNarrativePanelPosition(classicLayout) {
  return classicLayout === "three-panel" ? "end" : "start";
}
function createTourBasemapResource(recipe, id, resources) {
  const webMapId = recipe.webMapIds?.[0];
  if (!isArcGisItemId(webMapId)) return { tourMapData: {} };
  const resourceId = id("r");
  resources[resourceId] = {
    type: "webmap",
    data: {
      type: "minimal",
      itemType: "Web Map",
      itemId: webMapId
    }
  };
  return {
    resourceId,
    tourMapData: {
      basemap: {
        type: "resource",
        value: resourceId
      },
      legend: true,
      mode: "2d"
    }
  };
}
function createTourImageNode(imageResourceId) {
  return {
    type: "image",
    data: { image: imageResourceId },
    config: {
      placement: {
        type: "fit",
        fill: { x: 0.5, y: 0.5 },
        fit: { color: "backgroundColor" }
      }
    }
  };
}
function createJournalMediaNode(section, recipe, id, nodes, resources) {
  return createJournalMediaNodeFromMedia(section.media || {}, section.title || "Journal media", recipe, id, nodes, resources);
}
function createJournalMediaNodeFromMedia(media, title, recipe, id, nodes, resources) {
  if (media.type === "webmap" && isArcGisItemId(media.itemId)) {
    const resourceId2 = id("r");
    const nodeId2 = id("n");
    const extentData = { ...compactExtentData(media.extent), ...media.viewData || {} };
    const choreographyData = getClassicWebMapChoreographyData(media);
    resources[resourceId2] = {
      type: "webmap",
      data: {
        ...extentData,
        ...choreographyData.mapLayers ? { mapLayers: choreographyData.mapLayers } : {},
        itemId: media.itemId,
        itemType: "Web Map",
        type: "default"
      }
    };
    nodes[nodeId2] = {
      type: "webmap",
      data: {
        map: resourceId2,
        caption: media.caption || title,
        search: true,
        timeSlider: false,
        ...extentData,
        ...choreographyData
      }
    };
    return nodeId2;
  }
  if (media.type === "image" && media.url) {
    const resourceId2 = id("r");
    const nodeId2 = id("n");
    resources[resourceId2] = {
      type: "image",
      data: {
        src: media.url,
        provider: "uri",
        height: 900,
        width: 1600
      }
    };
    nodes[nodeId2] = {
      type: "image",
      data: {
        image: resourceId2,
        alt: media.altText || "",
        caption: media.caption || "",
        isExpandable: true
      }
    };
    return nodeId2;
  }
  if (media.url) {
    const nodeId2 = id("n");
    nodes[nodeId2] = {
      type: "embed",
      data: createJournalEmbedData(media, { title })
    };
    return nodeId2;
  }
  const resourceId = id("r");
  const nodeId = id("n");
  resources[resourceId] = {
    type: "image",
    data: {
      src: getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
      provider: "uri",
      height: 800,
      width: 1200
    }
  };
  nodes[nodeId] = { type: "image", data: { image: resourceId, isExpandable: true } };
  return nodeId;
}
function createCascadeImmersiveNode(section, recipe, id, nodes, resources, sectionIndex) {
  const immersiveId = id("n");
  const slides = section.views.slice(0, 40).map((view, viewIndex) => {
    const slideId = id("n");
    const panelId = id("n");
    const mediaNodeId = createCascadeMediaNode(view.media, view.title || section.title, recipe, id, nodes, resources);
    const panelChildren = [];
    if (view.title || viewIndex === 0 && section.title) {
      const titleId = id("n");
      nodes[titleId] = {
        type: "text",
        data: { type: "h3", text: view.title || section.title || `Cascade section ${sectionIndex + 1}` }
      };
      panelChildren.push(titleId);
    }
    panelChildren.push(...createJournalNarrativeBlockNodes(view.blocks.slice(0, 40), id, nodes, resources, /* @__PURE__ */ new Map(), { buttonLayout: "rows" }));
    if (!panelChildren.length) {
      const emptyTextId = id("n");
      nodes[emptyTextId] = { type: "text", data: { type: "paragraph", text: "" } };
      panelChildren.push(emptyTextId);
    }
    nodes[panelId] = {
      type: "immersive-narrative-panel",
      data: { panelStyle: "themed" },
      children: panelChildren
    };
    nodes[slideId] = {
      type: "immersive-slide",
      data: { transition: "fade" },
      children: [panelId, mediaNodeId]
    };
    return slideId;
  });
  nodes[immersiveId] = {
    type: "immersive",
    data: {
      type: "sidecar",
      subtype: "floating-panel",
      narrativePanelPosition: "start",
      narrativePanelSize: "large"
    },
    children: slides
  };
  return immersiveId;
}
function createCascadeMediaNode(media, title, recipe, id, nodes, resources) {
  const normalizedMedia = media || {
    type: "image",
    url: getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
    altText: "",
    caption: title || ""
  };
  return createJournalMediaNode({
    title,
    media: normalizedMedia
  }, recipe, id, nodes, resources);
}
function createJournalNarrativeBlockNode(block, id, nodes, resources, sectionAnchorMap = /* @__PURE__ */ new Map(), options = {}) {
  if (block.kind === "image") return createJournalNarrativeImageNode(block, id, nodes, resources);
  if (block.kind === "embed") return createJournalNarrativeEmbedNode(block, id, nodes);
  if (block.kind === "button") return createButtonNode(block, id, nodes, sectionAnchorMap);
  if (block.kind === "action-button") return createJournalActionButtonNode(block, id, nodes, resources, options);
  const nodeId = id("n");
  nodes[nodeId] = {
    type: "text",
    data: compactObject({
      type: block.type || "paragraph",
      text: rewriteClassicJournalAnchors(block.text || "", sectionAnchorMap),
      textSize: block.textSize || ""
    })
  };
  return nodeId;
}
function createJournalNarrativeBlockNodes(blocks, id, nodes, resources, sectionAnchorMap = /* @__PURE__ */ new Map(), options = {}) {
  const nodeIds = [];
  const blockList = Array.isArray(blocks) ? blocks : [];
  for (let index = 0; index < blockList.length; index += 1) {
    const block = blockList[index];
    if (block?.kind === "image") {
      const imageRun = [block];
      while (blockList[index + 1]?.kind === "image") {
        imageRun.push(blockList[index + 1]);
        index += 1;
      }
      nodeIds.push(imageRun.length > 1 ? createImageGalleryNode(imageRun, id, nodes, resources) : createJournalNarrativeImageNode(block, id, nodes, resources));
      continue;
    }
    if (block?.kind === "button") {
      const buttonRun = [block];
      while (blockList[index + 1]?.kind === "button") {
        buttonRun.push(blockList[index + 1]);
        index += 1;
      }
      nodeIds.push(buttonRun.length > 1 ? createButtonGridNode(buttonRun, id, nodes, sectionAnchorMap, options) : createButtonNode(block, id, nodes, sectionAnchorMap));
      continue;
    }
    nodeIds.push(createJournalNarrativeBlockNode(block, id, nodes, resources, sectionAnchorMap, options));
  }
  return nodeIds;
}
function createImageGalleryNode(images, id, nodes, resources) {
  const galleryId = id("n");
  const imageNodeIds = images.map((image) => createJournalNarrativeImageNode(image, id, nodes, resources));
  nodes[galleryId] = {
    type: "gallery",
    data: { galleryLayout: "jigsaw" },
    children: imageNodeIds
  };
  return galleryId;
}
function createButtonGridNode(buttons, id, nodes, sectionAnchorMap = /* @__PURE__ */ new Map(), options = {}) {
  const gridId = id("n");
  const buttonNodeIds = buttons.map((button) => createButtonNode(button, id, nodes, sectionAnchorMap));
  const useRows = options.buttonLayout === "rows";
  nodes[gridId] = {
    type: "grid",
    data: {
      cols: useRows ? 1 : buttonNodeIds.length,
      rows: useRows ? buttonNodeIds.length : 1,
      items: buttonNodeIds.map((_, index) => ({
        colStart: useRows ? 0 : index,
        colEnd: useRows ? 1 : index + 1,
        rowStart: useRows ? index : 0,
        rowEnd: useRows ? index + 1 : 1
      }))
    },
    config: {},
    children: buttonNodeIds
  };
  return gridId;
}
function createJournalNarrativeEmbedNode(block, id, nodes) {
  const nodeId = id("n");
  nodes[nodeId] = {
    type: "embed",
    data: createJournalEmbedData({
      url: block.url,
      altText: block.altText || "",
      caption: block.caption || ""
    }, { title: block.title || "Embedded media" }),
    config: { size: "wide" }
  };
  return nodeId;
}
function createButtonNode(block, id, nodes, sectionAnchorMap = /* @__PURE__ */ new Map()) {
  const nodeId = id("n");
  nodes[nodeId] = {
    type: "button",
    data: {
      text: block.text || "Open link",
      link: rewriteClassicJournalAnchors(block.url || "", sectionAnchorMap)
    }
  };
  return nodeId;
}
function createJournalActionButtonNode(block, id, nodes, resources, options = {}) {
  const action = options.actionMap?.get(block.actionId);
  if (!action?.media || !options.slideId || !Array.isArray(options.actionList)) {
    return createButtonNode({ text: block.text, url: action?.url || "" }, id, nodes);
  }
  const nodeId = id("n");
  const mediaNodeId = createJournalMediaNodeFromMedia(action.media, options.actionMediaTitle || block.text || "Action media", options.recipe || {}, id, nodes, resources);
  nodes[nodeId] = {
    type: "action-button",
    data: {
      text: block.text || "Show media"
    },
    config: { size: "wide" },
    dependents: {
      actionMedia: mediaNodeId
    }
  };
  options.actionList.push({
    origin: nodeId,
    trigger: "ActionButton_Apply",
    target: options.slideId,
    event: "ImmersiveSlide_ReplaceMedia",
    data: {
      media: mediaNodeId
    }
  });
  return nodeId;
}
function rewriteClassicJournalAnchors(value, sectionAnchorMap) {
  if (!sectionAnchorMap?.size || typeof value !== "string" || !value.includes("#classic-journal-section-")) return value;
  let nextValue = value;
  sectionAnchorMap.forEach((target, source) => {
    nextValue = nextValue.replaceAll(source, target);
  });
  return nextValue;
}
function isAllowedNarrativeHref(value) {
  const raw = String(value || "").trim();
  return /^https?:\/\//i.test(raw) || raw.startsWith("#classic-journal-section-") || raw.startsWith("#ref-");
}
function createJournalNarrativeImageNode(image, id, nodes, resources) {
  const resourceId = id("r");
  const nodeId = id("n");
  resources[resourceId] = {
    type: "image",
    data: {
      src: image.url,
      provider: "uri",
      height: 900,
      width: 1600
    }
  };
  nodes[nodeId] = {
    type: "image",
    data: {
      image: resourceId,
      alt: image.altText || "",
      caption: image.caption || "",
      isExpandable: true
    },
    config: {
      size: "standard",
      placement: {
        type: "fit",
        fill: { x: 0.5, y: 0.5 },
        fit: { color: "backgroundColor" }
      }
    }
  };
  return nodeId;
}
function createJournalEmbedData(media, section) {
  const providerUrl = getProviderUrl(media.url);
  return {
    url: media.url,
    embedType: "link",
    title: section.title,
    description: media.altText || "",
    providerUrl,
    isInteractiveByDefault: true,
    isEmbedSupported: true,
    display: "inline",
    embedSrc: media.url,
    fillParent: true,
    isInteractiveOnMobile: true,
    alt: media.altText || "",
    caption: media.caption || section.title
  };
}
function withRootLogo(rootData, logo, id, resources) {
  if (!logo?.imageUrl) return rootData;
  const resourceId = id("r");
  resources[resourceId] = {
    type: "image",
    data: {
      src: logo.imageUrl,
      provider: "uri",
      height: logo.height || 256,
      width: logo.width || 512
    }
  };
  return {
    ...rootData,
    storyLogoResource: resourceId,
    storyLogoLink: logo.linkUrl || "",
    storyLogoAlt: Object.prototype.hasOwnProperty.call(logo, "altText") ? logo.altText : "Classic source logo"
  };
}
function getSwipeWebMapIds(data) {
  const values = data?.values || {};
  const webMaps = Array.isArray(values.webmaps) ? values.webmaps : [];
  return uniqueStrings([
    ...webMaps.map(getSwipeWebMapId),
    getSwipeWebMapId(values.leftWebmap),
    getSwipeWebMapId(values.leftWebMap),
    getSwipeWebMapId(values.leftWebmapId),
    getSwipeWebMapId(values.leftWebMapId),
    getSwipeWebMapId(values.rightWebmap),
    getSwipeWebMapId(values.rightWebMap),
    getSwipeWebMapId(values.rightWebmapId),
    getSwipeWebMapId(values.rightWebMapId),
    getSwipeWebMapId(values.webmap)
  ]).filter(isArcGisItemId).slice(0, 2);
}
function getSwipeWebMapId(value) {
  if (typeof value === "string") return value;
  if (!isPlainObject2(value)) return "";
  return firstString(value.id, value.itemId, value.webmap, value.webMap, value.webmapId, value.webMapId);
}
function getSwipeLayerViews(values, webMapData) {
  const layers = getAllMapLayers(webMapData);
  if (!layers.length) return [];
  const layerIds = getSwipeLayerIds(values).filter((layerId) => layers.some((layer) => layer.id === layerId));
  if (!layerIds.length) return [];
  if (layerIds.length === 1) {
    const [layerId] = layerIds;
    return [
      { mapLayers: layers.map((layer) => ({ ...layer, visible: layer.id === layerId ? false : layer.visible })) },
      { mapLayers: layers.map((layer) => ({ ...layer, visible: layer.id === layerId ? true : layer.visible })) }
    ];
  }
  const [leftLayerId, rightLayerId] = layerIds;
  return [
    { mapLayers: layers.map((layer) => ({ ...layer, visible: layer.id === leftLayerId ? true : layer.id === rightLayerId ? false : layer.visible })) },
    { mapLayers: layers.map((layer) => ({ ...layer, visible: layer.id === leftLayerId ? false : layer.id === rightLayerId ? true : layer.visible })) }
  ];
}
function getSwipeLayerIds(values) {
  const layerCandidates = [
    ...Array.isArray(values.layers) ? values.layers : [],
    ...Array.isArray(values.layerIds) ? values.layerIds : [],
    ...Array.isArray(values.operationalLayers) ? values.operationalLayers : [],
    values.leftLayer,
    values.leftLayerId,
    values.leftSwipeLayer,
    values.leftSwipeLayerId,
    values.rightLayer,
    values.rightLayerId,
    values.rightSwipeLayer,
    values.rightSwipeLayerId,
    values.swipeLayer,
    values.swipeLayerId,
    values.spyglassLayer,
    values.spyglassLayerId
  ];
  return uniqueStrings(layerCandidates.map(getSwipeLayerId).filter(Boolean));
}
function getSwipeLayerId(value) {
  if (typeof value === "string") return value;
  if (!isPlainObject2(value)) return "";
  return firstString(value.id, value.layerId, value.itemId, value.name);
}
function createSwipeWebMapResourceData(webMap, extent) {
  return {
    ...compactExtentData(extent),
    mapLayers: getVisibleMapLayers(webMap?.data),
    itemId: webMap?.itemId || "",
    itemType: "Web Map",
    type: "default"
  };
}
function compactExtentData(extent) {
  if (!isPlainObject2(extent)) return {};
  const center = getExtentCenter(extent);
  if (!center) return {};
  return {
    extent,
    center,
    viewpoint: {
      rotation: 0,
      targetGeometry: center
    }
  };
}
function getExtentCenter(extent) {
  if (!isPlainObject2(extent)) return null;
  const xmin = Number(extent.xmin);
  const xmax = Number(extent.xmax);
  const ymin = Number(extent.ymin);
  const ymax = Number(extent.ymax);
  if (![xmin, xmax, ymin, ymax].every(Number.isFinite)) return null;
  return {
    spatialReference: extent.spatialReference || null,
    x: (xmin + xmax) / 2,
    y: (ymin + ymax) / 2
  };
}
function getVisibleMapLayers(webMapData) {
  return getAllMapLayers(webMapData).filter((layer) => layer.visible).slice(0, 20);
}
function getAllMapLayers(webMapData) {
  const layers = Array.isArray(webMapData?.operationalLayers) ? webMapData.operationalLayers : [];
  return layers.slice(0, 20).map((layer) => compactObject({
    id: layer.id,
    title: layer.title,
    visible: layer.visibility !== false
  }));
}
function getClassicWebMapChoreographyData(media) {
  const mapLayers = getClassicMapLayerOverrides(media.layerOverrides);
  const pinnedPopupInfo = getClassicPinnedPopupInfo(media.popup);
  return {
    ...mapLayers.length ? { mapLayers } : {},
    ...pinnedPopupInfo ? { pinnedPopupInfo, popupDocked: false } : {}
  };
}
function getMergedClassicMapLayerOverrides(classicLayers, webMapData) {
  if (!Array.isArray(classicLayers)) return [];
  const classicLayerOverrides = classicLayers.filter((layer) => layer?.id).map((layer) => ({
    id: String(layer.id),
    title: stripHtml(layer.title || layer.name || layer.id),
    visible: layer.visibility !== false
  }));
  if (!classicLayerOverrides.length) return [];
  const usedClassicLayerIds = /* @__PURE__ */ new Set();
  const mergedWebMapLayers = getAllMapLayers(webMapData).map((layer) => {
    const override = findClassicLayerOverride(layer.id, classicLayerOverrides);
    if (!override) return layer;
    usedClassicLayerIds.add(override.id);
    return {
      ...layer,
      title: layer.title || override.title,
      visible: override.visible
    };
  });
  const unknownClassicLayers = classicLayerOverrides.filter((layer) => !usedClassicLayerIds.has(layer.id));
  if (!mergedWebMapLayers.length) return classicLayerOverrides;
  return [
    ...mergedWebMapLayers,
    ...unknownClassicLayers
  ];
}
function findClassicLayerOverride(webMapLayerId, classicLayerOverrides) {
  const layerId = String(webMapLayerId || "");
  if (!layerId) return null;
  return classicLayerOverrides.find(
    (layer) => layer.id === layerId || layer.id.startsWith(`${layerId}_`)
  ) || null;
}
function getRelatedWebMapData(relatedContext, itemId) {
  return (relatedContext?.relatedWebMaps || []).find((webMap) => webMap.itemId === itemId)?.data || null;
}
function getClassicMapLayerOverrides(layers) {
  return (Array.isArray(layers) ? layers : []).filter((layer) => layer?.id).slice(0, 100).map((layer) => ({
    id: String(layer.id),
    title: stripHtml(layer.title || layer.name || layer.id),
    // Merged overrides already use StoryMaps' `visible`; raw Classic uses `visibility`.
    visible: (layer.visible ?? layer.visibility) !== false
  }));
}
function getClassicPinnedPopupInfo(popup) {
  if (!isPlainObject2(popup) || !popup.layerId || !popup.fieldName) return null;
  const anchorPoint = isPlainObject2(popup.anchorPoint) ? popup.anchorPoint : null;
  const x = Number(anchorPoint?.x);
  const y = Number(anchorPoint?.y);
  const location = Number.isFinite(x) && Number.isFinite(y) ? {
    spatialReference: anchorPoint.spatialReference || { wkid: 4326 },
    x,
    y
  } : null;
  return {
    ...location ? { location } : {},
    idFieldName: String(popup.fieldName || ""),
    idFieldValue: popup.fieldValue ?? "",
    layerId: popup.layerId
  };
}
function getMapJournalSection(section, index, item, relatedContext = {}) {
  const title = stripHtml(section.title || `Journal section ${index + 1}`) || `Journal section ${index + 1}`;
  const actionMap = getJournalActionMap(section.contentActions || [], item, relatedContext);
  const contentBlocks = getNarrativeBlocks(section.content || "", actionMap).slice(0, 80);
  return {
    id: String(section.id || section.pubDate || section.creaDate || index),
    title,
    contentBlocks: contentBlocks.length ? contentBlocks : [{ kind: "text", type: "paragraph", text: "" }],
    media: getMapJournalMedia(section.media, title, item, relatedContext),
    actionMap,
    actionCount: Array.isArray(section.contentActions) ? section.contentActions.length : 0,
    actionLinks: getJournalActionLinks(section.content || "", actionMap)
  };
}
function getCascadeSection(section, index, item) {
  const type = section?.type || "sequence";
  if (type === "cover") {
    return {
      type,
      title: stripHtml(section?.foreground?.title || item.title || ""),
      subtitle: stripHtml(section?.foreground?.subtitle || item.snippet || ""),
      blocks: [],
      media: getCascadeMedia(section?.background, item.title, item),
      unsupportedBlocks: 0
    };
  }
  if (type === "credits") {
    return getCascadeCreditsSection(section);
  }
  if (type === "immersive") {
    const views = (Array.isArray(section?.views) ? section.views : []).map((view, viewIndex) => getCascadeView(view, viewIndex, section, item));
    return {
      type,
      title: stripHtml(section?.views?.[0]?.foreground?.title?.value || `Cascade immersive ${index + 1}`),
      blocks: [],
      views,
      unsupportedBlocks: views.reduce((total, view) => total + view.unsupportedBlocks, 0)
    };
  }
  const blocks = getCascadeBlocks(section?.foreground?.blocks || []);
  return {
    type: "sequence",
    title: `Cascade section ${index + 1}`,
    blocks: blocks.items,
    media: null,
    unsupportedBlocks: blocks.unsupported
  };
}
function getCascadeCreditsSection(section) {
  const panels = Array.isArray(section?.foreground?.panels) ? section.foreground.panels : [];
  const textBlocks = panels.filter((panel) => panel?.type === "blocks").flatMap((panel) => getCascadeBlocks(panel.blocks || []).items).filter((block) => block.kind === "text");
  const attributions = panels.filter((panel) => panel?.type === "credits").flatMap((panel) => Array.isArray(panel.credits) ? panel.credits : []).map((credit) => ({
    label: stripHtml(credit?.label || ""),
    source: stripHtml(credit?.source || ""),
    link: normalizeUrl(credit?.link || "")
  })).filter((credit) => credit.label || credit.source || credit.link);
  return {
    type: "credits",
    title: "Credits",
    blocks: textBlocks,
    attributions,
    unsupportedBlocks: 0
  };
}
function createCascadeCreditNodes(section, id, nodes, resources) {
  const titleId = id("n");
  const children = [titleId];
  nodes[titleId] = { type: "text", data: { text: section.title || "Credits", type: "h4" } };
  section.blocks.slice(0, 20).forEach((block) => {
    children.push(createJournalNarrativeBlockNode(block, id, nodes, resources));
  });
  section.attributions.slice(0, 40).forEach((credit) => {
    const attributionId = id("n");
    nodes[attributionId] = {
      type: "attribution",
      data: {
        content: credit.label ? sanitizeBuilderInlineHtml(`<strong>${escapeHtml(credit.label)}</strong>`) : "",
        attribution: credit.link ? sanitizeBuilderInlineHtml(`<a href="${escapeHtml(credit.link)}" rel="noopener noreferrer" target="_blank">${escapeHtml(credit.source || credit.link)}</a>`) : escapeHtml(credit.source || "")
      }
    };
    children.push(attributionId);
  });
  if (children.length === 1) {
    const emptyParagraphId = id("n");
    nodes[emptyParagraphId] = { type: "text", data: { text: "", type: "paragraph" } };
    children.push(emptyParagraphId);
  }
  return children;
}
function getCascadeView(view, index, section, item) {
  const panelBlocks = (Array.isArray(view?.foreground?.panels) ? view.foreground.panels : []).flatMap((panel) => panel?.blocks || []);
  const blocks = getCascadeBlocks(panelBlocks);
  return {
    title: stripHtml(view?.foreground?.title?.value || (index === 0 ? section?.views?.[0]?.foreground?.title?.value : "") || ""),
    blocks: blocks.items,
    media: getCascadeMedia(view?.background, `Cascade view ${index + 1}`, item),
    unsupportedBlocks: blocks.unsupported
  };
}
function getCascadeSectionMediaItems(section) {
  return [
    section.media,
    ...Array.isArray(section.views) ? section.views.map((view) => view.media) : []
  ].filter(Boolean);
}
function getCascadeBlocks(blocks) {
  const items = [];
  let unsupported = 0;
  (Array.isArray(blocks) ? blocks : []).forEach((block) => {
    const converted = getCascadeBlock(block);
    if (converted.length) items.push(...converted);
    else unsupported += 1;
  });
  return { items, unsupported };
}
function getCascadeBlock(block) {
  if (block?.type === "text") return getNarrativeBlocks(block.text?.value || "");
  if (block?.type === "image") {
    const image = block.image || {};
    const url = normalizeUrl(firstUrl(image.url, image.thumbUrl));
    return url ? [{
      kind: "image",
      url,
      altText: image.altText || "",
      caption: stripHtml(image.caption || "")
    }] : [];
  }
  if (block?.type === "webpage" || block?.type === "embed") {
    const webpage = block.webpage || block.embed || {};
    const url = normalizeUrl(firstUrl(webpage.url, webpage.frameTag, webpage.iframe, webpage.html));
    return url ? [{ kind: "embed", url, title: getProviderUrl(url) || "Embedded media", altText: webpage.altText || "", caption: stripHtml(webpage.caption || "") }] : [];
  }
  return [];
}
function getCascadeMedia(source, title, item) {
  const media = source || {};
  const image = media.image || {};
  const webmap = media.webmap || {};
  const webpage = media.webpage || {};
  if (media.type === "webmap" && isArcGisItemId(webmap.id || webmap.itemId)) {
    return {
      type: "webmap",
      itemId: webmap.id || webmap.itemId,
      caption: title || "",
      extent: webmap.extent || null,
      layerOverrides: Array.isArray(webmap.layers) ? webmap.layers : [],
      popup: webmap.popup || null
    };
  }
  const imageUrl = normalizeUrl(firstUrl(image.url, image.thumbUrl));
  if (media.type === "image" && imageUrl) {
    return {
      type: "image",
      url: imageUrl,
      altText: image.altText || "",
      caption: stripHtml(image.caption || title || "")
    };
  }
  const webpageUrl = normalizeUrl(firstUrl(webpage.url, webpage.frameTag, webpage.iframe, webpage.html));
  if (media.type === "webpage" && webpageUrl) {
    return {
      type: "webpage",
      url: webpageUrl,
      altText: webpage.altText || "",
      caption: stripHtml(webpage.caption || title || "")
    };
  }
  return {
    type: "image",
    url: getSourceThumbnailUrl(item.id, item.thumbnail),
    altText: "",
    caption: title || ""
  };
}
function getMapJournalMedia(media, title, item, relatedContext = {}) {
  const source = media || {};
  const webpage = source.webpage || {};
  const webmap = source.webmap || {};
  const image = source.image || {};
  const webpageUrl = firstUrl(webpage.url, webpage.frameTag, webpage.iframe, webpage.html);
  const webpageWebMapId = getWebMapIdFromUrl(webpageUrl);
  if (source.type === "webpage" && webpageWebMapId) {
    return {
      type: "webmap",
      itemId: webpageWebMapId,
      caption: title,
      extent: null,
      sourceUrl: webpageUrl
    };
  }
  if (source.type === "webmap" && isArcGisItemId(webmap.id || webmap.itemId)) {
    const itemId = webmap.id || webmap.itemId;
    return {
      type: "webmap",
      itemId,
      caption: title,
      extent: webmap.extent || null,
      layerOverrides: getMergedClassicMapLayerOverrides(webmap.layers, getRelatedWebMapData(relatedContext, itemId)),
      popup: webmap.popup || null
    };
  }
  const imageUrl = firstUrl(image.url);
  if (source.type === "image" && imageUrl) {
    return {
      type: "image",
      url: imageUrl,
      altText: image.altText || "",
      caption: title
    };
  }
  if (source.type === "webpage" && webpageUrl) {
    return {
      type: "webpage",
      url: webpageUrl,
      altText: webpage.altText || "",
      caption: title
    };
  }
  return {
    type: "image",
    url: getSourceThumbnailUrl(item.id, item.thumbnail),
    altText: "",
    caption: title
  };
}
function getMapSeriesCollectionEntry(entry, index, options = {}) {
  const media = entry?.media || {};
  const webpage = media.webpage || {};
  const webmap = media.webmap || {};
  const image = media.image || {};
  const title = stripHtml(entry.title || `Series entry ${index + 1}`);
  const description = stripHtml(entry.description || webpage.altText || image.altText || "");
  const isHidden = String(entry.status || "PUBLISHED").toUpperCase() !== "PUBLISHED";
  const thumbnailUrl = getMapSeriesEntryThumbnailUrl(entry);
  const narrativeHtml = String(entry.description || entry.content || "");
  const details = {
    sourceIndex: index,
    narrativeHtml,
    actionMap: getJournalActionMap(entry.contentActions || [], options.item, options.relatedContext),
    media: getMapJournalMedia(media, title, options.item, options.relatedContext)
  };
  if (details.media.type === "webmap") details.media.viewData = getMapSeriesMapView(webmap);
  if (media.type === "webmap" && isArcGisItemId(webmap.id || webmap.itemId)) {
    const itemId = webmap.id || webmap.itemId;
    return {
      ...details,
      title,
      description,
      url: getCollectionMapViewerWebMapUrl(itemId, {
        theme: options.mapViewerTheme
      }),
      sourceType: "webmap",
      itemId,
      thumbnailUrl,
      isHidden
    };
  }
  const webpageUrl = firstUrl(webpage.url, webpage.frameTag, webpage.iframe, webpage.html);
  if (media.type === "webpage" && webpageUrl) {
    const itemId = extractItemId(webpageUrl);
    return {
      ...details,
      title,
      description,
      url: webpageUrl,
      sourceType: shouldUsePortalItem(webpageUrl, itemId) ? "portal-item" : "webpage",
      itemId,
      thumbnailUrl,
      isHidden
    };
  }
  const imageUrl = firstUrl(image.url);
  if (media.type === "image" && imageUrl) {
    const itemId = extractItemId(imageUrl);
    return {
      ...details,
      title,
      description,
      url: imageUrl,
      sourceType: shouldUsePortalItem(imageUrl, itemId) ? "portal-item" : "webpage",
      itemId,
      thumbnailUrl: thumbnailUrl || imageUrl,
      isHidden
    };
  }
  const fallbackUrl = firstUrl(entry.url, entry.link, entry.description, entry.frameTag);
  if (fallbackUrl) {
    const itemId = extractItemId(fallbackUrl);
    return {
      ...details,
      media: { type: "webpage", url: fallbackUrl, caption: title },
      title,
      description,
      url: fallbackUrl,
      sourceType: shouldUsePortalItem(fallbackUrl, itemId) ? "portal-item" : "webpage",
      itemId,
      thumbnailUrl,
      isHidden
    };
  }
  return null;
}
function getCollectionItemConfig(entry) {
  const config = {};
  if (entry.description) config.customSummary = entry.description;
  if (entry.isHidden) config.isHidden = true;
  if (entry.thumbnailResourceId) config.customThumbnail = entry.thumbnailResourceId;
  return config;
}
function getMapSeriesMapView(webmap) {
  const extentData = compactExtentData(webmap.extent);
  const rawCenter = webmap.center;
  const center = Array.isArray(rawCenter) && rawCenter.length >= 2 ? { x: rawCenter[0], y: rawCenter[1], spatialReference: webmap.spatialReference || { wkid: 4326 } } : isPlainObject2(rawCenter) ? rawCenter : extentData.center;
  const validCenter = center && Number.isFinite(center.x) && Number.isFinite(center.y);
  return {
    ...extentData,
    ...validCenter ? { center, viewpoint: {
      targetGeometry: center,
      rotation: Number.isFinite(webmap.rotation) ? webmap.rotation : 0,
      ...Number.isFinite(webmap.scale) && webmap.scale > 0 ? { scale: webmap.scale } : {}
    } } : {},
    ...Number.isFinite(webmap.zoom) ? { zoom: webmap.zoom } : {}
  };
}
function getMapSeriesEntryThumbnailUrl(entry) {
  const media = entry?.media || {};
  const image = media.image || {};
  return normalizeUrl(firstUrl(
    entry?.thumbnail,
    entry?.thumbUrl,
    entry?.thumbnailUrl,
    entry?.thumbURL,
    image.thumbUrl,
    image.thumbnailUrl,
    image.url,
    entry?.description || ""
  ));
}
function shouldUsePortalItem(url, itemId) {
  if (!isArcGisItemId(itemId)) return false;
  try {
    return new URL(url).hostname.toLowerCase().includes(".arcgis.com");
  } catch {
    return false;
  }
}
function getJournalActionMap(actions, item, relatedContext = {}) {
  const map = /* @__PURE__ */ new Map();
  (Array.isArray(actions) ? actions : []).forEach((action) => {
    if (!action?.id) return;
    map.set(action.id, {
      id: action.id,
      type: action.type || "",
      url: getJournalActionUrl(action),
      anchor: getJournalActionAnchor(action),
      media: getJournalActionMedia(action, item, relatedContext),
      targetIndex: typeof action.index === "number" ? action.index : null
    });
  });
  return map;
}
function getJournalActionUrl(action) {
  const media = action?.media || {};
  if (media.type === "webmap" && isArcGisItemId(media.webmap?.id || media.webmap?.itemId)) {
    return getMapViewerWebMapUrl(media.webmap.id || media.webmap.itemId, { extent: media.webmap.extent });
  }
  if (media.type === "image") return normalizeUrl(firstUrl(media.image?.url));
  if (media.type === "webpage") return normalizeUrl(firstUrl(media.webpage?.url, media.webpage?.frameTag, media.webpage?.iframe, media.webpage?.html));
  if (media.type === "video") return normalizeUrl(firstUrl(media.video?.url));
  return "";
}
function getJournalActionAnchor(action) {
  if (action?.type !== "navigate" || typeof action.index !== "number" || action.index < 0) return "";
  return `#classic-journal-section-${action.index}`;
}
function getJournalActionMedia(action, item, relatedContext = {}) {
  if (action?.type !== "media" || !action.media) return null;
  const media = action.media || {};
  const webpage = media.webpage || {};
  const webmap = media.webmap || {};
  const image = media.image || {};
  const video = media.video || {};
  const webpageUrl = firstUrl(webpage.url, webpage.frameTag, webpage.iframe, webpage.html);
  const webpageWebMapId = getWebMapIdFromUrl(webpageUrl);
  if (media.type === "webpage" && webpageWebMapId) {
    return {
      type: "webmap",
      itemId: webpageWebMapId,
      caption: "Action media",
      extent: null,
      sourceUrl: webpageUrl
    };
  }
  if (media.type === "webmap" && isArcGisItemId(webmap.id || webmap.itemId)) {
    const itemId = webmap.id || webmap.itemId;
    return {
      type: "webmap",
      itemId,
      caption: "Action media",
      extent: webmap.extent || null,
      layerOverrides: getMergedClassicMapLayerOverrides(webmap.layers, getRelatedWebMapData(relatedContext, itemId)),
      popup: webmap.popup || null
    };
  }
  const imageUrl = firstUrl(image.url);
  if (media.type === "image" && imageUrl) {
    return {
      type: "image",
      url: imageUrl,
      altText: image.altText || "",
      caption: stripHtml(image.caption || "")
    };
  }
  if (media.type === "webpage" && webpageUrl) {
    return {
      type: "webpage",
      url: webpageUrl,
      altText: webpage.altText || "",
      caption: stripHtml(webpage.caption || "")
    };
  }
  const videoUrl = firstUrl(video.url);
  if (media.type === "video" && videoUrl) {
    return {
      type: "webpage",
      url: videoUrl,
      altText: video.altText || "",
      caption: stripHtml(video.caption || "")
    };
  }
  return null;
}
function getJournalActionLinks(content, actionMap) {
  const div = document.createElement("div");
  div.innerHTML = String(content || "");
  const links = [];
  div.querySelectorAll("a[data-storymaps]").forEach((anchor) => {
    const id = anchor.getAttribute("data-storymaps");
    const action = actionMap.get(id);
    const url = action?.url || action?.anchor || "";
    if (!url) return;
    links.push({
      id,
      label: stripHtml(anchor.innerHTML || anchor.textContent || "Open media"),
      url
    });
  });
  return dedupeBy(links, (link) => `${link.label}|${link.url}`);
}
function getWebMapIdFromUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const webmap = parsed.searchParams.get("webmap");
    return isArcGisItemId(webmap) ? webmap : "";
  } catch {
    return "";
  }
}
function getMapViewerWebMapUrl(itemId, options = {}) {
  const query = new URLSearchParams({ webmap: itemId });
  const extent = getMapViewerExtentParam(options.extent);
  if (extent) query.set("extent", extent);
  return `https://www.arcgis.com/apps/mapviewer/index.html?${query.toString()}`;
}
function getCollectionMapViewerWebMapUrl(itemId, options = {}) {
  const query = new URLSearchParams();
  query.set("configurableview", "true");
  query.set("webmap", itemId);
  query.set("theme", options.theme === "dark" ? "dark" : "light");
  query.set("bookmarks", "true");
  query.set("heading", "true");
  query.set("legend", "true");
  query.set("information", "true");
  return `https://www.arcgis.com/apps/mapviewer/index.html?${query.toString()}`;
}
function getMapSeriesViewerTheme(themeHints) {
  return pickAgsmTheme({ themeHints }) === "obsidian" ? "dark" : "light";
}
function getMapViewerExtentParam(extent) {
  if (!extent || typeof extent !== "object") return "";
  const values = [extent.xmin, extent.ymin, extent.xmax, extent.ymax].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return "";
  const wkid = Number(extent.spatialReference?.latestWkid || extent.spatialReference?.wkid);
  return [...values, Number.isFinite(wkid) ? wkid : 4326].map((value) => String(value)).join(",");
}
function createCollectionEmbedData(entry) {
  const providerUrl = getProviderUrl(entry.url);
  return {
    url: entry.url,
    embedType: "link",
    title: entry.title,
    description: entry.description || "",
    providerUrl,
    height: 600,
    width: 800,
    useSmartEmbed: false,
    isInteractiveByDefault: true,
    caption: entry.title,
    isEmbedSupported: true,
    display: "inline",
    embedSrc: entry.url,
    fillParent: true,
    isInteractiveOnMobile: true
  };
}
function getProviderUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "";
  }
}
function getRecipeOutputKind(recipe) {
  return recipe.outputKind || "story";
}
function getStoryMapsBuilderUrl(itemId, outputKind = "story") {
  const builderPath = outputKind === "collection" ? "collections" : "stories";
  return itemId ? `https://storymaps.arcgis.com/${builderPath}/${encodeURIComponent(itemId)}/edit` : "";
}
function getRecipeTypeKeywords(recipe) {
  const keywords = [
    ...AGSM_TYPE_KEYWORDS,
    `storytoolkit-converter-${getRecipeConverterBlockType(recipe)}`,
    "classic-converter-v1",
    `classic-${recipe.template.key}`,
    `classic-source-${recipe.source.id}`
  ];
  if (getRecipeOutputKind(recipe) === "collection") keywords.push("storymapcollection");
  return uniqueStrings(keywords);
}
function getRecipeConverterBlockType(recipe) {
  const blockTypes = {
    maptour: "maptour",
    shortlist: "maptour",
    mapjournal: "sidecar",
    swipe: "swipe",
    mapseries: recipe.mapSeriesOutput === "sidecar" ? "sidecar" : "collection",
    cascade: "story"
  };
  return blockTypes[recipe?.template?.key] || (getRecipeOutputKind(recipe) === "collection" ? "collection" : "story");
}
function findShortlistLayer(webMapData, shortlistLayerId) {
  const layers = Array.isArray(webMapData?.operationalLayers) ? webMapData.operationalLayers : [];
  const normalizedId = normalizeShortlistLayerId(shortlistLayerId);
  return layers.find((layer) => layer.id === shortlistLayerId) || layers.find((layer) => normalizeShortlistLayerId(layer.id) === normalizedId) || layers.find((layer) => String(layer.id || "").toLowerCase().includes("shortlist")) || layers.find((layer) => getShortlistLayerScore(layer) > 0) || layers.find((layer) => layer.featureCollection) || null;
}
function normalizeShortlistLayerId(value) {
  return String(value || "").replace(/_\d+_copy$/i, "").replace(/_copy$/i, "").replace(/_\d+$/i, "").toLowerCase();
}
function getShortlistLayerScore(layer) {
  const fields = getFeatureCollectionFieldNames(layer).map((field) => field.toLowerCase());
  let score = 0;
  if (fields.includes("tab_name") || fields.includes("tab_id")) score += 3;
  if (fields.includes("name") && (fields.includes("pic_url") || fields.includes("thumb_url"))) score += 2;
  if (fields.includes("lat") && fields.includes("long")) score += 2;
  return score;
}
function getFeatureCollectionFieldNames(layer) {
  const featureCollectionLayers = Array.isArray(layer?.featureCollection?.layers) ? layer.featureCollection.layers : [];
  return uniqueStrings(featureCollectionLayers.flatMap(
    (child) => (child.layerDefinition?.fields || []).map((field) => field.name).filter(Boolean)
  ));
}
async function fetchShortlistFeatures(layer, token) {
  if (!layer) return [];
  const featureCollectionLayers = Array.isArray(layer.featureCollection?.layers) ? layer.featureCollection.layers : [];
  const embeddedLayer = featureCollectionLayers.find((child) => Array.isArray(child.featureSet?.features)) || featureCollectionLayers[0];
  if (Array.isArray(embeddedLayer?.featureSet?.features)) {
    return embeddedLayer.featureSet.features;
  }
  if (!layer.url) return [];
  const queryUrl = new URL(`${String(layer.url).replace(/\/$/, "")}/query`);
  queryUrl.searchParams.set("f", "json");
  queryUrl.searchParams.set("where", "1=1");
  queryUrl.searchParams.set("outFields", "*");
  queryUrl.searchParams.set("returnGeometry", "true");
  queryUrl.searchParams.set("resultRecordCount", "1000");
  queryUrl.searchParams.set("outSR", "4326");
  if (token) queryUrl.searchParams.set("token", token);
  const response = await fetch(queryUrl);
  const json = await response.json();
  assertArcGisSuccess(json, "Could not read the Shortlist feature layer.");
  return Array.isArray(json.features) ? json.features : [];
}
function getShortlistTabs(data) {
  const tabs = data?.values?.tabs;
  const values = Array.isArray(tabs) ? tabs : Object.values(tabs || {});
  return values.map((tab, index) => ({
    id: String(tab.id ?? index),
    title: stripHtml(tab.title || `Category ${index + 1}`),
    color: typeof tab.color === "string" ? tab.color : "",
    extent: tab.extent || null,
    order: Number(tab.id ?? index)
  })).sort((first, second) => first.order - second.order);
}
function getShortlistTabsFromStops(stops) {
  const seen = /* @__PURE__ */ new Set();
  return stops.map((stop) => stop.categoryId).filter((categoryId) => categoryId && categoryId !== "uncategorized").filter((categoryId) => {
    const key = normalizeCategoryKey(categoryId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((categoryId, index) => ({
    id: categoryId,
    title: stripHtml(categoryId),
    color: "",
    extent: null,
    order: index
  }));
}
function normalizeCategoryKey(value) {
  return stripHtml(String(value || "")).trim().toLowerCase();
}
function getShortlistStop(feature, index) {
  const attrs = feature?.attributes || {};
  const geometry = feature?.geometry || attrs.geometry || null;
  const categoryId = String(attrs.tab_id ?? attrs.tab ?? attrs.TAB_ID ?? attrs.TAB_NAME ?? attrs.tab_name ?? attrs.category ?? attrs.Category ?? "uncategorized");
  const imageUrl = firstUrl(attrs.pic_url, attrs.PIC_URL, attrs.picUrl, attrs.image_url, attrs.imageUrl, attrs.Picture, attrs.picture);
  const thumbnailUrl = firstUrl(attrs.thumb_url, attrs.THUMB_URL, attrs.thumbUrl, attrs.thumbnail, attrs.Thumb_URL);
  const website = firstUrl(attrs.website, attrs.WEBSITE, attrs.Website, attrs.url, attrs.URL);
  const attributePoint = getShortlistAttributePoint(attrs);
  const location = attributePoint || (geometry && typeof geometry.x === "number" && typeof geometry.y === "number" ? { x: geometry.x, y: geometry.y, spatialReference: geometry.spatialReference || null } : null);
  return {
    title: stripHtml(firstString(attrs.name, attrs.Name, attrs.NAME, attrs.title, attrs.Title, attrs.TITLE) || `Place ${index + 1}`),
    description: cleanRichTextHtml(getShortlistDescription(attrs)),
    imageUrl,
    thumbnailUrl,
    website,
    categoryId,
    sortOrder: Number(attrs.number ?? attrs.NUMBER ?? attrs.shortlist_id ?? attrs.__OBJECTID ?? index),
    location,
    sourceAttributes: compactObject(attrs)
  };
}
function getShortlistAttributePoint(attrs) {
  const x = Number(attrs.long ?? attrs.Long ?? attrs.LONG ?? attrs.lon ?? attrs.LON ?? attrs.longitude ?? attrs.Longitude);
  const y = Number(attrs.lat ?? attrs.Lat ?? attrs.LAT ?? attrs.latitude ?? attrs.Latitude);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y, spatialReference: { wkid: 4326 } };
}
function getShortlistDescriptionFields(attrs) {
  return [
    attrs.DESC1,
    attrs.DESC2,
    attrs.DESC3,
    attrs.DESC4,
    attrs.DESC5,
    attrs.ADDRESS,
    attrs.NOTES
  ].filter(Boolean).join("<br><br>");
}
function getShortlistDescription(attrs) {
  return [
    firstString(attrs.description, attrs.Description, attrs.SHORT_DESC, attrs.short_desc, attrs.caption, attrs.Caption),
    getShortlistDescriptionFields(attrs)
  ].filter(Boolean).join("<br><br>");
}
function getShortlistDescriptionText(stop) {
  const parts = [];
  if (stop.description) parts.push(stop.description);
  if (stop.website) {
    parts.push(`<a href="${escapeHtml(stop.website)}" rel="noopener noreferrer" target="_blank">More information</a>`);
  }
  return parts.join("<br><br>");
}
function cleanRichTextHtml(value) {
  if (!value) return "";
  const div = document.createElement("div");
  div.innerHTML = String(value);
  normalizeClassicInlineTextStyles(div);
  div.querySelectorAll("script, style, iframe, object").forEach((element) => element.remove());
  div.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "style") element.removeAttribute(attribute.name);
      if (name === "href" && !isAllowedNarrativeHref(attribute.value)) element.removeAttribute(attribute.name);
    });
  });
  const paragraphs = [...div.querySelectorAll("p")].map((paragraph) => paragraph.innerHTML.trim()).filter(Boolean);
  if (paragraphs.length) return paragraphs.join("<br><br>");
  return div.innerHTML.trim() || stripHtml(value);
}
function getNarrativeBlocks(value, actionMap = /* @__PURE__ */ new Map()) {
  if (!value) return [];
  const div = document.createElement("div");
  div.innerHTML = String(value);
  rewriteJournalActionLinks(div, actionMap);
  annotateClassicTextSize(div);
  normalizeClassicInlineTextStyles(div);
  sanitizeNarrativeElement(div);
  const blocks = [];
  [...div.childNodes].forEach((child) => {
    blocks.push(...getNarrativeBlocksFromNode(child));
  });
  return blocks.filter((block) => {
    if (block.kind === "image" || block.kind === "embed") return Boolean(block.url);
    if (block.kind === "button") return Boolean(block.url && block.text);
    if (block.kind === "action-button") return Boolean(block.actionId && block.text);
    return Boolean(stripHtml(block.text || ""));
  });
}
function rewriteJournalActionLinks(root, actionMap) {
  root.querySelectorAll("a[data-storymaps]").forEach((anchor) => {
    const actionId = anchor.getAttribute("data-storymaps");
    const action = actionMap.get(actionId);
    if (action?.type === "media" && action.media) {
      anchor.setAttribute("data-classic-action-id", actionId);
      anchor.setAttribute("data-classic-action-type", "media");
    }
    if (action?.url) {
      anchor.setAttribute("href", action.url);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
    } else if (action?.anchor) {
      anchor.setAttribute("href", action.anchor);
    } else {
      anchor.replaceWith(document.createTextNode(anchor.textContent || ""));
    }
  });
}
function sanitizeNarrativeElement(root) {
  root.querySelectorAll("script, style, object").forEach((element) => element.remove());
  root.querySelectorAll("*").forEach((element) => {
    if (["iframe", "video", "source"].includes(element.tagName.toLowerCase())) return;
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "style" || name === "tabindex" || name.startsWith("data-")) {
        if (["data-classic-text-size", "data-classic-action-id", "data-classic-action-type"].includes(name)) return;
        element.removeAttribute(attribute.name);
      }
      if (name === "class") {
        const colorClass = getAllowedAgsmTextColorClass(attribute.value);
        if (colorClass) {
          element.setAttribute("class", colorClass);
          return;
        }
        element.removeAttribute(attribute.name);
      }
      if (name === "href" && !isAllowedNarrativeHref(attribute.value)) element.removeAttribute(attribute.name);
      if (name === "target") element.setAttribute("target", "_blank");
      if (name === "href") element.setAttribute("rel", "noopener noreferrer");
    });
  });
}
function getNarrativeBlocksFromNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text2 = node.textContent.replace(/\s+/g, " ").trim();
    return text2 ? [{ kind: "text", type: "paragraph", text: escapeHtml(text2) }] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const element = node;
  const tag = element.tagName.toLowerCase();
  if (tag === "img") return [getNarrativeImageBlock(element)];
  if (tag === "iframe" || tag === "video") return [getNarrativeEmbedBlock(element)];
  if (tag === "figure") return getNarrativeFigureBlocks(element);
  const embeddedMedia = getDirectEmbeddedMediaBlocks(element);
  if (embeddedMedia.length) return embeddedMedia;
  if (tag === "ul" || tag === "ol") {
    return [{
      kind: "text",
      type: tag === "ul" ? "bullet-list" : "numbered-list",
      text: [...element.querySelectorAll(":scope > li")].map((item) => `<li>${sanitizeInlineHtml(item.innerHTML)}</li>`).join("")
    }];
  }
  if (["h1", "h2"].includes(tag)) return [{ kind: "text", type: "paragraph", text: sanitizeInlineHtml(element.innerHTML), textSize: "large" }];
  if (["h3", "h4"].includes(tag)) return [{ kind: "text", type: "paragraph", text: sanitizeInlineHtml(element.innerHTML), textSize: getClassicTextSize(element) || "large" }];
  if (tag === "p") return [getNarrativeParagraphBlock(element)];
  const childBlocks = [...element.childNodes].flatMap((child) => getNarrativeBlocksFromNode(child));
  if (childBlocks.length) return childBlocks;
  const text = sanitizeInlineHtml(element.innerHTML);
  return stripHtml(text) ? [{ kind: "text", type: "paragraph", text }] : [];
}
function getDirectEmbeddedMediaBlocks(element) {
  const mediaElements = [...element.children].filter((child) => {
    const tag = child.tagName.toLowerCase();
    if (tag === "iframe" || tag === "video") return true;
    if (tag === "p" && !stripHtml(child.innerHTML)) return false;
    return false;
  });
  if (!mediaElements.length) return [];
  const nonEmptyText = [...element.childNodes].filter((child) => !(child.nodeType === Node.ELEMENT_NODE && mediaElements.includes(child))).map((child) => child.textContent || "").join(" ").replace(/\s+/g, " ").trim();
  if (nonEmptyText) return [];
  return mediaElements.map(getNarrativeEmbedBlock).filter((block) => block.url);
}
function getNarrativeFigureBlocks(figure) {
  const blocks = [...figure.querySelectorAll("img")].map(getNarrativeImageBlock).filter((block) => block.url);
  const caption = sanitizeInlineHtml(figure.querySelector("figcaption")?.innerHTML || "");
  if (caption && !blocks.length) blocks.push({ kind: "text", type: "paragraph", text: caption, textSize: "small" });
  if (caption && blocks.length) blocks[blocks.length - 1].caption = stripHtml(caption);
  return blocks;
}
function getNarrativeParagraphBlock(paragraph) {
  const images = [...paragraph.querySelectorAll("img")];
  if (images.length && stripHtml(paragraph.innerHTML).length < 80) {
    return getNarrativeImageBlock(images[0]);
  }
  const button = getButtonLikeLinkBlock(paragraph);
  if (button) return button;
  const text = sanitizeInlineHtml(paragraph.innerHTML);
  return {
    kind: "text",
    type: inferNarrativeTextType(paragraph, text),
    text,
    textSize: getClassicTextSize(paragraph) || inferNarrativeTextSize(text)
  };
}
function annotateClassicTextSize(root) {
  root.querySelectorAll("[style]").forEach((element) => {
    const fontSizeMatch = /font-size\s*:\s*([^;]+)/i.exec(element.getAttribute("style") || "");
    if (!fontSizeMatch) return;
    const textSize = getAgsmTextSizeFromClassicFontSize(fontSizeMatch[1]);
    if (textSize) element.setAttribute("data-classic-text-size", textSize);
  });
}
function normalizeClassicInlineTextStyles(root) {
  root.querySelectorAll("[style]").forEach((element) => {
    const style = element.getAttribute("style") || "";
    const colorClass = getAgsmTextColorClass(style, element.style?.color || "");
    if (/font-weight\s*:\s*(bold|[6-9]00)\b/i.test(style) && element.tagName.toLowerCase() !== "strong") {
      wrapElementContents(element, "strong");
    }
    if (/font-style\s*:\s*italic\b/i.test(style) && element.tagName.toLowerCase() !== "em") {
      wrapElementContents(element, "em");
    }
    if (colorClass && element.tagName.toLowerCase() !== "span") {
      const wrapper = wrapElementContents(element, "span");
      wrapper.classList.add(colorClass);
      return;
    }
    if (colorClass) {
      element.classList.add(colorClass);
    }
  });
}
function getAgsmTextColorClass(style, cssColor = "") {
  const colorMatch = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style || "");
  const hex = normalizeCssColorToHex(colorMatch?.[1] || cssColor);
  return hex ? `sm-text-color-${hex.replace("#", "")}` : "";
}
function getAllowedAgsmTextColorClass(value) {
  return String(value || "").split(/\s+/).find((className) => /^sm-text-color-[0-9a-f]{6}$/i.test(className)) || "";
}
function normalizeCssColorToHex(value) {
  const raw = String(value || "").trim().toLowerCase();
  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) return normalizeHexColor(raw);
  const rgbMatch = raw.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (!rgbMatch) return "";
  const channels = rgbMatch.slice(1, 4).map((channel) => Math.max(0, Math.min(255, Math.round(Number(channel)))));
  if (channels.some((channel) => Number.isNaN(channel))) return "";
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
function wrapElementContents(element, tagName) {
  const wrapper = document.createElement(tagName);
  while (element.firstChild) {
    wrapper.appendChild(element.firstChild);
  }
  element.appendChild(wrapper);
  return wrapper;
}
function getClassicTextSize(element) {
  return element.getAttribute("data-classic-text-size") || "";
}
function getAgsmTextSizeFromClassicFontSize(value) {
  const raw = String(value || "").trim().toLowerCase();
  const numeric = Number.parseFloat(raw);
  if (!Number.isFinite(numeric)) return "";
  if (raw.includes("em") || raw.includes("rem")) {
    if (numeric >= 1.25) return "large";
    if (numeric <= 0.85) return "small";
    return "";
  }
  if (raw.includes("%")) {
    if (numeric >= 125) return "large";
    if (numeric <= 85) return "small";
    return "";
  }
  if (numeric >= 22) return "large";
  if (numeric > 0 && numeric <= 13) return "small";
  return "";
}
function getButtonLikeLinkBlock(element) {
  const links = [...element.querySelectorAll("a[href], a[data-classic-action-id]")];
  if (links.length !== 1) return null;
  const link = links[0];
  const label = stripHtml(link.innerHTML || link.textContent || "");
  const href = normalizeUrl(link.getAttribute("href") || "");
  const className = link.getAttribute("class") || "";
  const textOnly = stripHtml(element.innerHTML);
  const isButtonClass = /\b(btn|button)\b/i.test(className);
  const isShortStandaloneLink = label && textOnly === label && label.length <= 80;
  if (!isButtonClass && !isShortStandaloneLink) return null;
  const actionId = link.getAttribute("data-classic-action-id") || "";
  if (actionId && link.getAttribute("data-classic-action-type") === "media") {
    return {
      kind: "action-button",
      text: label || "Show media",
      actionId
    };
  }
  if (!href) return null;
  return {
    kind: "button",
    text: label || "Open link",
    url: href
  };
}
function getNarrativeImageBlock(img) {
  return {
    kind: "image",
    url: normalizeUrl(firstUrl(img.getAttribute("src") || "")),
    altText: img.getAttribute("alt") || "",
    caption: ""
  };
}
function getNarrativeEmbedBlock(element) {
  const url = normalizeUrl(firstUrl(element.getAttribute("src") || element.getAttribute("data-src") || ""));
  return {
    kind: "embed",
    url,
    title: getProviderUrl(url) || "Embedded media",
    altText: element.getAttribute("title") || element.getAttribute("aria-label") || "",
    caption: ""
  };
}
function inferNarrativeTextType(element, text) {
  const cleanText = stripHtml(text);
  if (element.querySelector("strong") && cleanText.length < 80) return "h4";
  return "paragraph";
}
function inferNarrativeTextSize(text) {
  const cleanText = stripHtml(text);
  if (cleanText.length <= 90 && /(?:^|\s)(more information|learn more|open|view|download)(?:\s|$)/i.test(cleanText)) return "small";
  return "";
}
function sanitizeInlineHtml(value) {
  const span = document.createElement("span");
  span.innerHTML = String(value || "");
  span.querySelectorAll("script, style, iframe, object, img").forEach((element) => element.remove());
  return sanitizeInlineHtmlFallback(span.innerHTML).trim();
}
function sanitizeBuilderInlineHtml(value) {
  return sanitizeInlineHtmlFallback(value);
}
function sanitizeInlineHtmlFallback(value) {
  const span = document.createElement("span");
  span.innerHTML = String(value || "");
  span.querySelectorAll("*").forEach((element) => {
    const tag = element.tagName.toLowerCase();
    if (!["a", "strong", "em", "span", "br", "u", "sub", "sup", "s", "ul", "ol", "li"].includes(tag)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (tag === "a" && ["href", "target", "rel"].includes(name)) return;
      if (tag === "span" && name === "class") {
        const colorClass = getAllowedAgsmTextColorClass(attribute.value);
        if (colorClass) {
          element.setAttribute("class", colorClass);
          return;
        }
      }
      element.removeAttribute(attribute.name);
    });
  });
  return span.innerHTML.trim();
}
function collectTextBlocks(data) {
  const values = [];
  walk(data, (value) => {
    if (typeof value !== "string") return;
    if (isLikelyUrl(value) || isArcGisItemId(value)) return;
    const text = stripHtml(value);
    if (text.length >= 28 && /[a-z]/i.test(text)) values.push(text);
  });
  return uniqueStrings(values);
}
function collectImageUrls(data) {
  const urls = [];
  walk(data, (value) => {
    if (typeof value === "string") {
      urls.push(...extractUrls(value).filter(isLikelyImageUrl));
    }
  });
  return uniqueStrings(urls);
}
function collectLinks(data) {
  const urls = [];
  walk(data, (value) => {
    if (typeof value === "string") urls.push(...extractUrls(value));
  });
  return uniqueStrings(urls);
}
function collectItemIds(data) {
  const ids = [];
  walk(data, (value, key) => {
    if (typeof value !== "string") return;
    if (/^(webmap|webmapid|itemid|id)$/i.test(String(key)) && isArcGisItemId(value)) ids.push(value);
    ids.push(...value.match(/[a-f0-9]{32}/gi) || []);
  });
  return uniqueStrings(ids);
}
function getClassicWebMapIds(data) {
  const ids = [];
  walk(data, (value, key) => {
    if (typeof value !== "string") return;
    if (/^webmap(?:id)?$/i.test(String(key)) && isArcGisItemId(value)) ids.push(value);
  });
  return uniqueStrings(ids);
}
function walk(value, visitor, key = "") {
  visitor(value, key);
  if (Array.isArray(value)) {
    value.forEach((item) => walk(item, visitor, key));
    return;
  }
  if (isPlainObject2(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => walk(childValue, visitor, childKey));
  }
}
function createIdFactory() {
  let index = 0;
  return (prefix) => `${prefix}-${(index++).toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function createFeatureId(value) {
  if (typeof value === "number") return `classic-tour-${String(value + 1).padStart(4, "0")}`;
  return `classic-tour-${String(value).replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
}
function getPlaceholderTourStop(recipe) {
  return {
    title: recipe.source.title || "Migrated tour stop",
    description: recipe.source.snippet || "Review the Classic source item and refine this generated Map Tour place.",
    imageUrl: getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
    thumbnailUrl: "",
    location: null,
    sourceAttributes: {}
  };
}
function getPlaceholderJournalSection(recipe) {
  return {
    id: "placeholder",
    title: recipe.source.title || "Migrated journal section",
    content: recipe.source.snippet || "Review the Classic source item and refine this generated sidecar slide.",
    media: {
      type: "image",
      url: getSourceThumbnailUrl(recipe.source.id, recipe.source.thumbnail),
      altText: "",
      caption: recipe.source.title || "Classic source item"
    },
    actionCount: 0
  };
}
function getSourceThumbnailUrl(itemId, thumbnail) {
  return thumbnail ? `${ARCGIS_ROOT}/content/items/${encodeURIComponent(itemId)}/info/${encodeURIComponent(thumbnail)}` : "https://placehold.co/1200x800.png?text=Classic%20StoryMap";
}
function getClassicLogo(data, item) {
  const values = data?.values || {};
  const header = values.header || values.settings?.header || data?.header || {};
  const candidates = [
    [values, "logoURL"],
    [values, "logoUrl"],
    [values, "logo"],
    [values, "logoImage"],
    [values, "logoImageUrl"],
    [values, "headerLogoURL"],
    [values, "headerLogoUrl"],
    [header, "logoURL"],
    [header, "logoUrl"],
    [header, "logo"],
    [data, "logoURL"],
    [data, "logoUrl"]
  ];
  const hasExplicitLogoField = candidates.some(([object, key]) => isPlainObject2(object) && Object.prototype.hasOwnProperty.call(object, key));
  const rawImageUrl = firstString(...candidates.map(([object, key]) => isPlainObject2(object) ? object[key] : "")) || (hasExplicitLogoField ? "" : firstLogoUrlFromObject(data));
  const imageUrl = normalizeClassicAssetUrl(rawImageUrl, item?.id);
  if (!imageUrl) return null;
  const linkUrl = firstUrl(
    values.logoTarget,
    values.logoTargetURL,
    values.logoTargetUrl,
    values.logoLink,
    values.logoLinkURL,
    values.headerLinkURL,
    header.logoTarget,
    header.logoTargetURL,
    header.logoLink,
    data?.logoTarget,
    data?.logoLink
  );
  return {
    imageUrl,
    linkUrl,
    altText: Object.prototype.hasOwnProperty.call(header, "linkText") ? stripHtml(String(header.linkText || "")) : stripHtml(firstString(values.logoAltText, header.logoAltText, item?.title, "Classic source logo"))
  };
}
function firstLogoUrlFromObject(data) {
  let match = "";
  walk(data, (value, key) => {
    if (match || typeof value !== "string") return;
    const normalizedKey = String(key).toLowerCase();
    if (!normalizedKey.includes("logo")) return;
    if (/(target|link|href)/i.test(normalizedKey)) return;
    match = firstString(value);
  });
  return match;
}
function normalizeClassicAssetUrl(value, itemId) {
  const raw = firstUrl(value) || String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (!itemId) return "";
  const fileName = raw.split("/").filter(Boolean).pop();
  if (!fileName || fileName.includes("{")) return "";
  return `${ARCGIS_ROOT}/content/items/${encodeURIComponent(itemId)}/info/${encodeURIComponent(fileName)}`;
}
function getTourPoint(stop) {
  const x = stop.location?.x;
  const y = stop.location?.y;
  const wkid = stop.location?.spatialReference?.wkid || stop.location?.spatialReference?.latestWkid || null;
  if (typeof x !== "number" || typeof y !== "number") return { long: 0, lat: 0 };
  if (wkid === 4326 || Math.abs(x) <= 180 && Math.abs(y) <= 90) return { long: x, lat: y };
  if (wkid === 3857 || wkid === 102100 || Math.abs(x) > 180 || Math.abs(y) > 90) return webMercatorToLonLat(x, y);
  return { long: x, lat: y };
}
function webMercatorToLonLat(x, y) {
  const radius = 6378137;
  const long = x / radius * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / radius)) - Math.PI / 2) * (180 / Math.PI);
  return {
    long: Number(long.toFixed(6)),
    lat: Number(Math.max(Math.min(lat, 90), -90).toFixed(6))
  };
}
function stripHtml(value) {
  const div = document.createElement("div");
  div.innerHTML = String(value).replace(/<br\s*\/?>/gi, " ");
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}
function extractUrls(value) {
  return String(value).match(/https?:\/\/[^\s"'<>]+/gi) || [];
}
function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}
function isLikelyUrl(value) {
  return /^https?:\/\//i.test(String(value).trim());
}
function isLikelyImageUrl(value) {
  return /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(value) || /\/thumbnail\//i.test(value);
}
function isArcGisItemId(value) {
  return /^[a-f0-9]{32}$/i.test(String(value).trim());
}
function isPlainObject2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function firstString(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}
function firstUrl(...values) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    const url = extractUrls(value)[0] || (isLikelyUrl(trimmed) || trimmed.startsWith("//") ? trimmed : "");
    if (url) return url;
  }
  return "";
}
function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}
function dedupeBy(values, getKey) {
  const seen = /* @__PURE__ */ new Set();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function compactObject(value) {
  const result = {};
  Object.entries(value).forEach(([key, val]) => {
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") result[key] = val;
  });
  return result;
}
function getTokenExpiryText(appInfo) {
  const expires = appInfo?.expires || appInfo?.expiration || appInfo?.tokenExpires;
  if (!expires) return "Expiration: not reported.";
  const ms = Number(expires);
  if (!Number.isFinite(ms)) return "Expiration: not reported.";
  const remainingMs = ms - Date.now();
  if (remainingMs <= 0) return "Token appears expired.";
  const minutes = Math.round(remainingMs / 6e4);
  if (minutes < 120) return `Time remaining: about ${minutes} minutes.`;
  const hours = Math.round(minutes / 60);
  return `Time remaining: about ${hours} hours.`;
}
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
if (hasClassicConverterUi) {
  renderJson({});
}
export {
  buildCascadeAgsmJson,
  buildCascadeMigrationRecipe,
  buildMapJournalAgsmJson,
  buildMapJournalMigrationRecipe,
  buildMapSeriesAgsmJson,
  buildMapSeriesCollectionJson,
  buildMapSeriesMigrationRecipe,
  buildMapSeriesSidecarJson,
  buildMapTourAgsmJson,
  buildMapTourMigrationRecipe,
  buildShortlistAgsmJson,
  buildShortlistDataDrivenAgsmJson,
  buildShortlistMigrationRecipe,
  buildSwipeAgsmJson,
  buildSwipeMigrationRecipe,
  convertClassicStoryMap,
  convertClassicStoryMapItem,
  createShortlistHostedFeatureLayer,
  deleteHostedFeatureLayerItem,
  detectClassicTemplate,
  detectClassicTemplateFromData
};
//# sourceMappingURL=classic-converter.js.map
