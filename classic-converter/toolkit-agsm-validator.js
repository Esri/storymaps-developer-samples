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
export {
  createAgsmDraftValidator,
  validateAgsmDraft
};
//# sourceMappingURL=classic-agsm-validator.js.map
