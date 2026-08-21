# Classic StoryMaps Toolkit

Standalone static Explorer and Converter for finding retired Classic Story Maps and converting supported items into draft ArcGIS StoryMaps-style items.

This is intentionally separate from the main Story Toolkit app so Classic migration logic can evolve and the complete folder can be shared with a focused audience.

The converter is still a static app. Keep all converter files under this folder, avoid Next.js imports or server endpoints, and use plain browser ES modules so the folder can be hosted independently on any static host.

## Run Locally

From this folder:

```sh
python3 -m http.server 9100
```

Open the toolkit at its Explorer-first entry point:

```txt
http://localhost:9100/
```

When serving this repository source folder, open Classic Story Converter directly for manual entry at:

```txt
http://localhost:9100/index.html?manual=1
```

In the generated standalone package, the equivalent URL is `converter.html?manual=1`.

When deployed with the main Next.js app, this folder is served from:

```txt
/classic-converter/explorer.html
```

In the integrated Story Toolkit routes, opening `index.html` without selected item IDs redirects to `explorer.html`. In the downloadable standalone package, Explorer is served directly from root `index.html`, while its handoffs and the explicit manual navigation link open `converter.html`.

`config.js` uses `storyToolkitHomeUrl` to show a Back to Story Toolkit link when these pages are integrated with the main app. Leave that value empty in standalone deployments; the downloadable package does this automatically. Set `oauthRedirectUri` to the registered callback path or full same-origin URL when a host such as CloudFront serves the app from a prefix. Packaging also replaces the integrated OAuth client ID with the client ID registered for the standalone app.

## Create the downloadable package

From the repository root:

```sh
npm run classic:package
```

This creates `dist/classic-storymaps-toolkit.zip`. The ZIP includes `DEPLOYMENT.md` with Netlify, Amazon S3, CloudFront, and generic static-host instructions.

## Standalone Explorer

- Searches public Classic Story Maps directly through the ArcGIS REST API before sign-in.
- Uses ArcGIS OAuth sign-in to add My content and My organization scopes, including private items the signed-in user can access.
- Filters by supported template and replacement status.
- Sorts by modification date, creation date, title, or views.
- Keeps a selection of up to 10 items while browsing result pages.
- Opens a side panel with item metadata, access, tags, ArcGIS item, and Classic Archive details.
- Passes selected item IDs and the signed-in token to Converter through same-origin session storage without exposing credentials in the URL.

## Current Scope

- Keeps ArcGIS tokens in same-origin session storage so Explorer and Converter can share authentication within the current browser tab. Closing the tab clears that browser session.
- Validates tokens with ArcGIS `/community/self` and reads `/portals/self` privileges before offering hosted Shortlist publishing.
- Accepts a Classic item id, Classic URL, ArcGIS group id, or ArcGIS group URL.
- Uses `worker.html` as a lean hidden worker for each conversion task.
- Supports worker URL params such as `worker.html?item=<itemId>&token=<token>` for integrations. Token values are removed from the address bar after loading.
- Includes a source page that auto-validates the pasted ArcGIS token, loads either one item or group items, keeps only supported templates selectable, and runs selected conversions as queued same-origin iframe tasks with status, duration, and created item links.
- Lets users start another conversion after results are reviewed while keeping the validated token in memory.
- Fetches item info and item JSON from ArcGIS.
- Detects the Classic template from `typeKeywords`.
- Routes each Classic template through a converter registry with shared analysis, preview, and write steps.
- Keeps the Classic template registry in `modules/template-registry.js` so template support can evolve without crowding the app shell.
- Shows support status for known Classic templates so users can tell what is ready versus planned.
- For Classic Map Tour, follows referenced web maps, reads candidate Map Tour feature layers, and maps Classic `integrated` / `side-panel` layouts to AGSM map-focused / media-focused tour subtypes.
- For Classic Shortlist, creates a private hosted point layer and one data-driven categorized Explorer grid containing every populated category when the token has `portal:user:createItem` and `portal:publisher:publishFeatures`. A single category uses a regular data-driven grid. Without those privileges or after a publishing failure, the converter preserves the data in separate embedded Explorer grids.
- For Classic Swipe, converts two-web-map swipe layouts into one AGSM swipe block with web map resources and captions. Single-web-map layer swipe is supported when the Classic config exposes the compared layer ids; both swipe sides point to the same web map resource with per-side layer visibility overrides.
- For Classic Map Series, converts entries into an AGSM Collection with embedded URL items and preserves Classic hidden entries as hidden Collection items.
- For Classic Map Journal, converts published sections into one AGSM sidecar with a slide per section.
- For Classic Cascade, converts sequence blocks into linear story content, immersive views into floating-panel sidecar slides, cover images when available, credits, and theme hints.
- Builds a migration recipe and AGSM-style `draft.json`.
- Vendors AGSM block validation schemas under `schemas/` and runs a static, dependency-free draft validator against supported generated blocks before previewing the output.
- Adds source provenance to created item type keywords, including `classic-source-<classic item id>` and a converter version marker, so future runs can detect prior conversions before deciding whether to update or create another draft.
- Can create a private draft item with `addItem`, update its item data with `update`, and attach `draft.json` with `addResources`.
- Creates draft StoryMap items with the generic StoryMaps type keywords: `StoryMap`, `Web Application`, `arcgis-storymaps`, `smstatusdraft`, and `smdraftresourceid:draft.json`.
- Copies Classic source item `/info/` and same-item `/resources/` image assets into the converted StoryMap item with `addResources` when those images would otherwise depend on the Classic item continuing to exist.
- Leaves other ArcGIS item resource URLs as URI references and skips browser probing for them because they belong to separate ArcGIS items and can be sensitive to token, CORS, cache, or timing behavior.
- Replaces clearly broken non-ArcGIS external image URLs with the ArcGIS StoryMaps placeholder image and annotates the converted image caption for author review.
- Copies a thumbnail onto the converted item with `updateThumbnail` by uploading fetched image bytes, preferring the Classic source thumbnail and then discovered source imagery.
- Does not write replacement relationships or replacement keywords during conversion. After the converted draft is reviewed, published, and shared, open the Classic item details in ArcGIS and use **Select replacement** to choose the new item.
- Existing replacement links remain visible in the Explorer detail panel and are never changed by the converter.

The supported conversion targets are Classic Map Tour, Classic Shortlist, Classic Swipe, Classic Map Series, Classic Map Journal, and Classic Cascade.

See `conversion-guide.html` for the author-facing conversion guide, known limitations, and template-specific recipes. Product and implementation decisions are tracked in the repo-level `requirements.md`.

Shortlist hosted layers and converted StoryMap items are created private. Authors must review, publish, and share both dependencies appropriately. The converter keeps all populated categories and places in one backing feature layer. StoryMaps Builder supports eight visible categories in a categorized tour; for larger Shortlists, duplicate the tour and split the categories between two tours.

Known Swipe caveat: single-web-map layer swipe depends on readable Classic layer ids and readable web map operational layer ids. If those cannot be matched, authors should review or repair the swipe sides in StoryMaps Builder.
