// packages/storytoolkit/src/classic-converter/template-registry.js
function createClassicConverters({
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
      getRelatedContext: fetchRelatedMapTourContext,
      analyze: buildMapTourMigrationRecipe,
      buildDraft: buildMapTourAgsmJson
    },
    {
      key: "shortlist",
      label: "Classic Shortlist",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["shortlist"],
      target: "Story with an Explorer grid tour",
      description: "Creates a data-driven categorized Explorer grid when hosted publishing is allowed, with embedded Explorer grids as the fallback.",
      getRelatedContext: fetchRelatedShortlistContext,
      analyze: buildShortlistMigrationRecipe,
      buildDraft: buildShortlistAgsmJson
    },
    {
      key: "mapjournal",
      label: "Classic Map Journal",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["mapjournal"],
      target: "Story with sidecar slides",
      description: "Converts published journal sections into sidecar slides.",
      getRelatedContext: fetchRelatedMapJournalContext,
      analyze: buildMapJournalMigrationRecipe,
      buildDraft: buildMapJournalAgsmJson
    },
    {
      key: "cascade",
      label: "Classic Cascade",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["cascade"],
      target: "Long-form immersive story",
      description: "Converts sequences and immersive views into a long-form story.",
      getRelatedContext: fetchNoRelatedContext,
      analyze: buildCascadeMigrationRecipe,
      buildDraft: buildCascadeAgsmJson
    },
    {
      key: "swipe",
      label: "Classic Swipe",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["swipespyglass"],
      target: "Story or briefing with swipe block",
      description: "Converts two-web-map Swipe apps into a Story with one swipe block.",
      getRelatedContext: fetchRelatedSwipeContext,
      analyze: buildSwipeMigrationRecipe,
      buildDraft: buildSwipeAgsmJson
    },
    {
      key: "mapseries",
      label: "Classic Map Series",
      status: "ready",
      statusLabel: "Ready",
      keywords: ["mapseries"],
      target: "Collection or story with sidecar",
      description: "Creates native Collection maps or a single sidecar with narrative panels and navigation.",
      getRelatedContext: fetchRelatedMapSeriesContext,
      analyze: buildMapSeriesMigrationRecipe,
      buildDraft: buildMapSeriesAgsmJson
    }
  ];
}
export {
  createClassicConverters
};
//# sourceMappingURL=classic-template-registry.js.map
