# Classic StoryMaps Converter Requirements

## Purpose

Create a focused prototype tool for moving useful retired Classic Story Maps toward the current ArcGIS StoryMaps ecosystem.

The converter must be maintained separately from Story Toolkit. It lives in its own contained app folder so conversion-specific logic, UI, and risk do not overload the main app.

## Product Boundary

- This is a second app, not a new route in Story Toolkit.
- Requirements, notes, and future implementation decisions live under `public/classic-converter/docs`.
- The main Story Toolkit app may link to the converter later, but converter state and logic stay separate.
- The converter must remain a purely static browser app. It should be hostable from static files only, with no server-side runtime, API routes, database, background jobs, or server-managed secrets.

## Authentication

- The user pastes an ArcGIS token.
- The token is stored in browser localStorage for now so the signed-in session can be reused across tabs.
- If localStorage is unavailable, the app may fall back to sessionStorage for the current tab only.
- The app must not persist the token in cookies or files.
- The app validates the token with ArcGIS `/community/self`.
- The app reads the signed-in user's privileges from ArcGIS `/portals/self` using the active token. Hosted Shortlist publishing is allowed only when both `portal:user:createItem` and `portal:publisher:publishFeatures` are present; account type or role labels must not be used as a proxy.
- The validation result should show username, organization id when available, and token time remaining when ArcGIS returns expiration metadata.

## Source Selection

- The user can paste a Classic Story Map item id or URL.
- The app extracts the item id from common ArcGIS URL forms, including `appid=` and `id=`.
- The worker page supports `?item=<item id or URL>` for preloading and `?token=<token>` for external integrations. When `token` is present, the app should read it, validate it, and remove it from the address bar with `history.replaceState`.
- For prototyping, public Classic items can be analyzed and converted even when the token user is not the owner.
- A future production workflow should require ownership or explicit copy permission before conversion.

## Source Workflow

- The standalone root `index.html` contains Explorer directly; selected item IDs and explicit manual entry open `converter.html`. `worker.html` is a lean hidden worker page used for each conversion task.
- The source page accepts an ArcGIS token plus Classic item ids, Classic item URLs, an ArcGIS group id, or an ArcGIS group URL.
- The token validates automatically after paste or typing and must show user/expiry feedback before source loading or conversion.
- A same-origin Explorer handoff may include a token in the converter URL for convenience; the converter should immediately move it into the token field, validate it, and remove it from the visible URL.
- Explicit group URLs should load group contents. Explicit item URLs should load that one item. Bare 32-character ids should be resolved as an item first, then as a group when item lookup fails.
- Multiple Classic item ids can be pasted into the source field or provided as `?items=<id1>,<id2>` so Story Toolkit can hand selected Classic items to the converter without creating a temporary group.
- Story Toolkit can act as a Classic item selector, with a maximum of 10 selected items per converter handoff so the browser-run queue stays understandable.
- The source page reads one item or group content, detects Classic templates from item metadata, and selects supported templates by default.
- Only implemented templates are selectable for bulk creation: Map Tour, Shortlist, Swipe, Map Series, Map Journal, and Cascade.
- Each selected conversion runs as an isolated same-origin iframe task using `worker.html?embedded=1&item=<item id>`.
- The source page owns the token and sends it to worker iframes with `postMessage`; tokens are not placed in worker URLs.
- Worker frames report status back to the parent page with `postMessage`, including analyze/create progress, warnings, output type, errors, created item links, and elapsed task time.
- The source interface should stay organized as three visible steps: enter source/token, choose items to convert, then review status/results.
- Earlier bulk steps should auto-collapse as users progress, while preserving concise summaries of the validated source and selected conversion count.
- After reviewing results, users should be able to start another conversion without re-pasting a still-valid token. This reset must clear the source, selected items, queue, worker frames, and results, then return focus to the source field.
- The source page must tell users not to close the browser tab once conversion starts because all conversion jobs run in the browser.
- Bulk queue concurrency should stay low, currently two workers at a time, to avoid large ArcGIS REST request fan-out.

## Classic Detection

Detect Classic templates from item type and `typeKeywords`:

- Map Tour: `type:"Web Mapping Application" typekeywords:"maptour"`
- Cascade: `type:"Web Mapping Application" typekeywords:"cascade"`
- Map Series: `type:"Web Mapping Application" typekeywords:"mapseries"`
- Map Journal: `type:"Web Mapping Application" typekeywords:"mapjournal"`
- Shortlist: `type:"Web Mapping Application" typekeywords:"shortlist"`
- Swipe: `type:"Web Mapping Application" typekeywords:"SwipeSpyglass"`

## Converter Organization

- The converter is one static browser app with a shared shell for token validation, source analysis, preview, item creation, and `draft.json` upload.
- Template-specific behavior is routed through a converter registry. Each converter declares its key, label, support status, Classic `typeKeywords` signals, target AGSM pattern, analysis function, and draft builder.
- Every template should use the same lifecycle:
  1. Detect the Classic template.
  2. Fetch template-specific related context, such as web maps or feature collections.
  3. Build a migration recipe with counts, warnings, and preserved source content.
  4. Build AGSM `draft.json` only when that template converter is marked ready.
  5. Keep planned templates analysis-only until their draft builder is implemented and tested.
- The UI should show support status for all known Classic templates so users understand which conversions are ready, next, or planned.
- Converter internals should keep moving toward a two-step shape: Classic template parser to neutral migration recipe, then recipe to AGSM node/resource graph. The recipe is where warnings, source ids, and author-review notes belong.

## Conversion Strategy

- Tackle one Classic template at a time.
- Classic Map Tour, Classic Shortlist, Classic Swipe, Classic Map Series, Classic Map Journal, and Classic Cascade are the ready converters.
- Classic items will not contain express maps.
- Preserve the best available source content:
  - text
  - headings and paragraph-like HTML text
  - image URLs
  - links
  - web map item ids
  - tour stops or section-like structures
- For Classic Map Tour, follow referenced web map ids and read candidate Map Tour feature layers because tour stops often live in the web map's operational layer, not directly in the Classic app JSON. If the Classic config provides `values.webmap`, `values.sourceLayer` or `values.sourceLayerId`, and `values.order[]`, prefer that explicit source layer over generic layer discovery, query its features, preserve the visible order, and skip ordered ids that no longer exist in the source service.
- For Classic app logos, read `values.settings.header.logoURL` when present and map it to a URI image resource referenced by `storyLogoResource`. Map `values.settings.header.logoTarget` to `storyLogoLink`, and map `values.settings.header.linkText` to `storyLogoAlt`, preserving an empty string when Classic stores one.
- For Classic Map Tour, use `values.order[]` when available to preserve stop order and visibility. Hidden source records can be ignored for the draft output unless we later add an archive/debug mode.
- For Classic Map Tour layout mapping, Classic `layout:"integrated"` should generate an AGSM guided tour with `subtype:"map-focused"`, and Classic `layout:"side-panel"` should generate `subtype:"media-focused"`.
- For generated map tour blocks, when the Classic configuration has a source web map id, create a minimal webmap resource and attach it to the `tour-map` node data as `basemap:{ type:"resource", value:"<resource id>" }`, with `legend:true` and `mode:"2d"`. Tour media images should use fit placement because source image dimensions are often unknown.
- After creating a converted Story or Collection item, copy a thumbnail onto the new item with ArcGIS REST `updateThumbnail` by uploading fetched image bytes as multipart `file`. Prefer the Classic source item thumbnail, then a discovered image URL. Do not submit a thumbnail `url` fallback because the Classic item or external image may later disappear.
- After creating a converted Story or Collection item, copy any generated AGSM image resources that point back to the Classic source item's `/info/` folder or same-item `/sharing/rest/content/items/<classic item id>/resources/` URLs into the converted item with `addResources`, rewrite those draft resources to `provider:"item-resource"`, and update `draft.json` after the rewrite. Use the active token when fetching source item image bytes so private or org-shared Classic assets can be copied when the signed-in user can read them. Other ArcGIS item resource URLs can remain URI resources because they belong to separate ArcGIS items, and they should not be browser-probed for broken-image replacement.
- Before upload, replace clearly broken non-ArcGIS external image URLs with the ArcGIS StoryMaps placeholder image and annotate the affected image node caption for author review. Do not apply this browser reachability probe to ArcGIS item resource URLs because token, CORS, cache, and timing behavior can make those checks nondeterministic.
- For Classic Shortlist, read `values.tabs` from the app JSON, follow the referenced web map, locate the Shortlist feature layer, and group places by `tab_id` or category fields such as `TAB_NAME`. Some Shortlists reference copied CSV feature collections where `values.tabs` is empty and `values.shortlistLayerId` has a suffix such as `_0_copy`; match these back to the base web map layer id, infer categories from feature attributes, and preserve point coordinates from either geometry or `LAT`/`LONG` fields.
- When hosted publishing privileges are verified and the Shortlist has at most eight non-empty categories, create a private hosted point feature service, add one layer, populate it in batches, and generate one data-driven Explorer tour. Use `subtype:"categorized-grid"`, `categoryFieldName:"TAB_NAME"`, and category metadata for two or more categories; use `subtype:"grid"` for one category. Map title, description, image, thumbnail, website, and source order to stable hosted fields.
- If privileges are missing, no valid points exist, or hosted publishing fails, generate one embedded Explorer grid per category under navigable `h2` headings. If hosted publishing partially succeeds, delete only the newly created hosted item before continuing with the embedded fallback.
- For Classic Swipe, support `dataModel:"TWO_WEBMAPS"` by reading two web map ids from `values.webmaps`, creating two AGSM webmap resources/nodes, and placing them in one swipe block. Preserve the original orientation strictly: the first Classic web map remains slot `"0"`/left/before, and the second remains slot `"1"`/right/after, even if one map's metadata cannot be read. Preserve `values.popupTitles` as map captions, use the first bookmark extent when available, omit the swipe legend when Classic `legend:false`, and warn when Classic `layout:"spyglass"` is mapped to a regular AGSM swipe block. Also support single-web-map layer swipe when Classic layer ids can be matched to web map operational layers: create one webmap resource, two webmap nodes that both reference it, and opposite `mapLayers` visibility overrides for each side.
- For Classic Map Series, create an AGSM Collection-style draft by reading `values.story.entries[]` and converting webpage entries into Collection embed nodes. Preserve hidden Classic entries as hidden Collection items rather than dropping them. Extract iframe `src` values from `frameTag` when present. If a Map Series entry points to an ArcGIS-hosted URL with an item id, including image item `/data` URLs, add it as a Collection `portal-item` resource. If a Map Series entry uses `media.type:"webmap"` with `media.webmap.id`, do not add the Web Map as a raw portal item; use a configurable Map Viewer URL with `configurableview=true`, `theme`, `bookmarks`, `heading`, `legend`, and `information` parameters as a regular web link so the Collection entry opens the web map directly. Do not include `center` or `scale` URL parameters because Classic map projection differences can make those values misleading. Collection items should carry `customTitle`, and when an entry has an image URL or a description-embedded image, add a URI image resource and use it as `customThumbnail`. The collection cover should include a child paragraph node for the source summary when available. Add the `storymapcollection` type keyword when creating the target item.
- For Classic Map Journal, create one AGSM sidecar-style immersive block by reading published `values.story.sections[]`. Each section becomes one `immersive-slide` with an `immersive-narrative-panel` for the section title/body and one media node for the section media. Use a docked/fixed narrow side panel because Map Journal is fundamentally a fixed-panel sidecar pattern. Support webpage media as `embed`, image media as `image`, and webmap media as `webmap`. If webpage media is an ArcGIS presentation URL with a `webmap` query parameter, convert it to a webmap node. Preserve section-level `media.webmap.layers[]` by merging Classic layer visibility overrides with the referenced web map's default visible operational layers; this is required because many Journal source web maps store most layers off by default and rely on per-section layer choreography. Preserve a small number of images embedded in the section narrative as panel image nodes.
- Classic Map Journal story actions use `data-storymaps` plus `data-storymaps-type`. Support the known Classic action types from the Esri Journal template: `media`, `navigate`, and `zoom`. Convert standalone/button-like `media` actions into AGSM `action-button` nodes inside the sidecar narrative panel, create the action media node, and wire a top-level action with `trigger:"ActionButton_Apply"` and `event:"ImmersiveSlide_ReplaceMedia"` targeting the current `immersive-slide`. Inline media action links should remain ordinary links when they point to webpage, image, video, or webmap media; webmap links should open Map Viewer and include the Classic action extent when available. Rewrite `navigate` actions into AGSM internal anchor links using `#ref-<node id>` for the target section title. Treat `zoom` actions as author-review warnings because AGSM text links do not directly change the current map extent.
- Journal narrative panels should preserve block structure where possible instead of flattening all content into one paragraph. Map headings to heading text nodes, paragraphs to paragraph nodes, `ul`/`ol` to bullet/numbered list nodes, images to image nodes, and safe inline links/bold/italic markup inside text nodes. Button-like Classic links should become AGSM button nodes with `type:"button"` and `data:{ text, link }`.
- Classic narrative display text should be mapped visually, not literally. Classic `h1`/`h2` style text should become AGSM paragraph text with `textSize:"large"` unless it is intentionally generated by the converter as a navigation heading. Inline narrative images embedded between text blocks should use a small AGSM image layout by default so they behave like supporting graphics rather than full-width hero media.
- Generate a visible migration recipe before writing anything to ArcGIS.
- The generated item should be private by default.
- The tool should preserve source provenance in tags, type keywords, and generated JSON.
- Created AGSM items should include a stable `classic-source-<classic item id>` type keyword and converter version keyword so later runs can detect prior conversions and offer an explicit update/recreate choice.
- The converter must not silently update an existing converted item. If a prior conversion is detected, the UI should ask before updating or creating another draft.

## ArcGIS Write Flow

When the user explicitly chooses to create the prototype output:

1. For an eligible Classic Shortlist, call `createService`, add the point layer definition through the service admin endpoint, and populate layer `0` with `applyEdits`. Leave the hosted feature layer private. If any later creation step fails, delete only this newly created layer item.
2. Call ArcGIS `addItem` for the authenticated user.
3. Create a new private `StoryMap` item.
4. Include the generic StoryMaps type keywords `StoryMap`, `Web Application`, `arcgis-storymaps`, `smstatusdraft`, and `smdraftresourceid:draft.json`, plus migration provenance keywords.
5. Generate a Builder-oriented AGSM `draft.json` resource. Map Tour uses a guided tour. Shortlist uses a hosted data-driven Explorer grid when eligible and embedded Explorer grids otherwise.
6. Call ArcGIS `update` for the new item to write the same generated JSON as item text for inspection and compatibility.
7. Call ArcGIS `addResources` for the new item with `fileName=draft.json` and the generated JSON as `text`.
8. Show the new item id, ArcGIS item page link, direct `draft.json` resource URL, and hosted Shortlist layer link when one was created.
9. Do not create replacement relationships or update replacement keywords during conversion. After the converted item is reviewed, published, and shared, direct eligible owners and administrators to the Classic item details page in ArcGIS to use **Select replacement**.
10. When the Explorer can identify a published converted item through its `classic-source-<item id>` provenance keyword, show that ArcGIS replacement call to action from either the Classic source or converted item detail panel when the signed-in user can manage the source.

## Safety

- Do not overwrite the source Classic item.
- Do not perform source-item replacement writes during conversion.
- Do not replace or remove an existing Classic replacement link.
- Do not share the generated item publicly.
- Do not attempt automatic publishing.
- Do not store tokens.
- Show the generated JSON before writing.
- Make it clear that output is a prototype and needs author review.

## Backlog

- Keep replacement selection in the ArcGIS item details workflow after publication.

## MVP Output

The MVP output is an AGSM draft JSON payload intended to be readable by ArcGIS StoryMaps Builder. It preserves the source title, snippet, friendly byline when available, Map Tour or Shortlist places, Swipe web maps, Map Series entry URLs, images, category structure, point locations, and Classic logo image/link/alt metadata when they can be derived from Classic source data and related web maps.

Shortlist category structure is preserved as one data-driven categorized Explorer grid when the active token can publish hosted features and the source has two or more non-empty categories. One category becomes a regular data-driven Explorer grid. The private hosted feature layer is a dependency of the converted draft and must be shared for the intended audience. The embedded fallback uses separate Explorer grid blocks under heading sections only when hosted publishing is unavailable or fails.

Swipe support covers two-web-map comparison apps and single-web-map layer swipe configurations when layer ids can be matched. Authors should verify layer visibility after conversion because Classic layer configurations are not always stored consistently.

Future work should compare generated payloads with additional known valid AGSM item JSON examples and tighten the output template per target block type.

## Template Parser Notes

- Map Journal sections live under `values.story.sections[]`; section HTML and `contentActions` need to be parsed together because action ids may be embedded in the HTML.
- Map Series entries live under `values.story.entries[]`; entry order should be preserved, hidden entries should become hidden Collection items, and published entries should become visible Collection items.
- Classic Cascade sections live under `values.sections[]`; preserve foreground block order and treat `cover`, `sequence`, `immersive`, and `credits` as distinct conversion concepts. Convert sequence text/image/embed blocks into linear AGSM story blocks. Convert immersive views into floating-panel AGSM sidecar slides where the Classic background becomes the slide media and foreground panel blocks become narrative panel content. For immersive web map backgrounds, preserve `webmap.extent`, `webmap.layers[]` visibility overrides, and `webmap.popup` as AGSM webmap extent/mapLayers/pinnedPopupInfo data when available. Convert Classic cover images into URI image resources attached to full AGSM covers when available. Unsupported Cascade foreground blocks should produce author-review warnings rather than being silently dropped.
- Classic HTML should be sanitized, but preserve safe semantic structure such as links, emphasis, paragraphs, lists, and headings. Embedded images, iframes, and videos should become media/embed nodes where possible instead of being left inside paragraph HTML.
- Unsupported Classic settings should produce warnings in the migration recipe rather than disappearing silently.

## AGSM Draft JSON Notes

The shared AGSM block reference lives in `docs/agsm-blocks/`. Before adding or changing any generated AGSM block, consult the relevant block note there. If converter behavior, local schemas, observed item JSON, or these requirements disagree, ask before making assumptions and update the centralized block doc in the same change.

- AGSM draft JSON uses `n-` ids for nodes and `r-` ids for resources. Keep generated ids in those conventions.
- Text blocks are nodes with `type:"text"` and `data.type` indicating the semantic style:
  - `h2` for a major section heading.
  - `h3` for a secondary heading.
  - `h4` for a smaller heading.
  - `paragraph` for body text.
  - `bullet-list` and `numbered-list` for list content.
  - `quote` for block quotes, with the quote body in `data.text` and optional source text in `data.attribution`.
- Paragraph nodes can preserve simple inline HTML such as `<strong>`, `<em>`, `<sub>`, `<sup>`, `<s>`, `<a href="..." rel="noopener noreferrer" target="_blank">`, and StoryMaps Builder text color classes such as `<span class="sm-text-color-a9a9a9">`.
- Paragraph nodes can include `data.textSize` with values such as `small` or `large`; omit it for the default medium body size.
- Generated normal text blocks should omit `config.size` so authors are not locked into a width value that Builder cannot change.
- List nodes store their entries as HTML list item strings in `data.text`, such as `<li>First item</li><li>Second item</li>`. Nested lists can be preserved inside a list item with nested `<ul>` or `<ol>` markup.
- Code blocks are nodes with `type:"code"` and `data.content`, `data.lang`, `data.lineNumbers`, and `data.isEncoded`. When `isEncoded:true`, HTML-sensitive characters in `data.content` should be entity-encoded, such as `&lt;html&gt;`. Confirm supported language ids before generating from Markdown fences; observed examples include `html`, `css`, `javascript`, `arcade`, `python`, and `csharp` / C#-style snippets.
- Simple table blocks are nodes with `type:"table"` and `data.numRows`, `data.numColumns`, and `data.cells`. Cells are keyed by zero-based row and column indexes, with each cell storing at least `{ value:"..." }`. For Markdown conversion, pipe tables can map directly to this shape when they only require plain cell values.
- Image blocks are nodes with `type:"image"` and `data.image` pointing to an image resource id. The image node is where StoryMaps stores display metadata such as `caption`, `isExpandable`, and `attribution`.
- Image resources use `type:"image"` with URI provider metadata: `src`, `provider:"uri"`, `height`, and `width`. This resource id is what the image node references.
- Image gallery blocks are nodes with `type:"gallery"`, `data.galleryLayout`, optional `data.caption`, and child image node ids. Supported observed `galleryLayout` variants are `jigsaw`, `square-dynamic`, and `filmstrip`. For Markdown conversion, consecutive image blocks or an explicit gallery directive can map to one gallery parent with each image preserved as a normal child image node.
- Media block sizing uses `config.size` values `standard`, `wide`, `full`, and `float`. Do not use `small`, `medium`, or `large` for media block `config.size`; `small` was tested on an inline image node and caused Builder hydration errors. For smaller inline media, use `config:{ size:"standard" }`; for the current medium/default treatment, use `config:{ size:"wide" }`.
- Sidecar panel width is separate from media block sizing. Sidecar `data.narrativePanelSize` supports `small`, `medium`, and `large`.
- AGSM story theme resources can use one of the out-of-the-box theme ids: `summit`, `obsidian`, `ridgeline`, `mesa`, `tidal`, or `slate`, or a designer-authored featured StoryMap Theme item. Classic theme preservation is heuristic: inspect Classic color/theme/background/header hints and choose either the closest built-in theme or a strong featured theme match. Featured/custom themes should keep the base `themeId` and add `themeItemId`.
- Classic app logo fields such as `logoURL`, `logoTarget`, and nested header logo fields should be preserved on the AGSM root node using `storyLogoResource`, `storyLogoLink`, and `storyLogoAlt`; `storyLogoResource` must reference an image resource.
- Swipe blocks are nodes with `type:"swipe"`. Their `data.contents` maps slot `"0"` and slot `"1"` to two content node ids, usually webmap nodes. `data.legend` repeats those webmap node ids when both maps should appear in the legend, and `viewPlacement:"extent"` is a valid placement value.
- Sidecar blocks are `immersive` nodes with `data.type:"sidecar"`. Their children are `immersive-slide` nodes. Each slide should include one `immersive-narrative-panel` child and one media child such as `image`, `embed`, or `webmap`.
- Sidecar action buttons are `action-button` nodes with `data.text` and `dependents.actionMedia`. The behavior is defined in the draft's top-level `actions` array, where observed media replacement actions use `origin` as the action button node id, `target` as the immersive slide node id, and `data.media` as the replacement media node id.
- Big number infographics use `type:"large-number"`, word clouds use `type:"word-cloud"` with a JSON word resource, charts use `type:"chart"` with a JSON chart resource, and 360 images use `type:"image360"` with an image360 resource. These blocks are currently documented/validated and can be generated by the Markdown converter, but Classic conversion does not yet map Classic source content into them.
- Webmap nodes use `type:"webmap"` and point to webmap resources through `data.map`. They can include `caption`, `timeSlider:false`, `extent`, and `viewpoint`.
- Webmap resources use `type:"webmap"` and store `itemId`, `itemType:"Web Map"`, `type:"default"`, optional `mapLayers`, `extent`, `center`, `zoom`, and `viewpoint`.
- Map tour basemap resources can use a minimal webmap resource shape with `type:"minimal"`, `itemType:"Web Map"`, and `itemId`. The tour block references that resource through `basemap:{ type:"resource", value:"<resource id>" }`.
- These notes are especially relevant for Classic Swipe conversion and for richer media preservation in other Classic templates. Prefer adding detailed per-block findings to `docs/agsm-blocks/` rather than expanding this section indefinitely.

## Draft Validation Checklist

- Vendor AGSM validation schemas supplied by the StoryMaps team inside the static converter app so they can be used without server-side dependencies.
- Run the local validator after draft generation to check supported block schemas for generated action-button, audio, button, chart, embed, gallery, grid, image, image360, large-number, swipe, tour, tour-map, webmap, and word-cloud nodes.
- Treat schema validation results as author/developer feedback in the migration recipe. Do not hide validation failures; surface the first failure clearly so the generated JSON can be fixed.
- `root` exists and points to a `story` node.
- Narrative order is represented through `children` arrays.
- Every child node id exists in `nodes`.
- Every node resource reference exists in `resources`.
- Navigation `data.links[].nodeId` values point to existing heading nodes.
- Tour places reference geometry ids that exist in their tour map node.
- Web map resources use valid ArcGIS item ids.
- Source section, entry, tab, or tour stop order is preserved.
- Conversion warnings are emitted for inaccessible dependencies, missing media, dropped actions, or unsupported settings.

## Verified ArcGIS REST References

- ArcGIS `addItem` creates the target item under the authenticated user's content.
- ArcGIS `update` updates item metadata and text content after creation.
- ArcGIS `addResources` is supported for `StoryMap` items, accepts `.json` resources, supports `fileName` plus `text`, and stores resources at `/sharing/rest/content/items/<item id>/resources/<fileName>`.
- ArcGIS `addResources` is also used for copied Classic `/info/` and same-item `/resources/` image assets when the generated draft would otherwise reference the source Classic item directly.
- ArcGIS `updateThumbnail` accepts uploaded image bytes and is used for converted item thumbnails.
- `/relatedItems` reads the replacement relationship with `relationshipTypes=ReplacementItem2Item&direction=reverse`; the converter does not create that relationship.
