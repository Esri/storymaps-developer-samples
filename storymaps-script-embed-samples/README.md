# ArcGIS StoryMaps script embed examples

This repository is intended for sharing samples of script-embedded ArcGIS StoryMaps stories. Embedding stories using a script-embed is a developer-friendly pathway for customizing your stories and implementing custom functionality.

## Features

Embedding stories in your webpage usings `<script>` tags enables you to:
- [Embed the story within a webpage within your own domain](/storymaps-script-embed-samples/getting-started/README.md).
- [Wrap the story in your header and footer](/storymaps-script-embed-samples/header-footer/README.md).
- [Open the story with a splash page or pop-up](/storymaps-script-embed-samples/splash-page/README.md).
- [Replace the fonts in your story with self-hosted fonts or those from a font delivery service.](/storymaps-script-embed-samples/font-replacement/README.md)
- [Implement your own analytics](/storymaps-script-embed-samples/analytics/README.md).

## Instructions

Each sample folder within this repository demonstrates a specific use case and contains:
- **HTML** index.html file that acts as the main webpage with a script-embed of an ArcGIS StoryMap story.
- **CSS**  style.css file containing rules for overriding the styling of elements within a story.
- **Javascript (optional)** javascript.js file containing code to manipulate content of the webpage.
- **README** A read me document that outlines the use case for the sample, how to implement it, and a link to a live example (if applicable).

The contents of these files can be copied and modified to suit your needs and hosted on your webserver.

### Embedding a story using script tags

Within the HTML `index.html` file a script tag is used to embed the story.

```html
  <!-- Embedded story -->
  <div class="storymaps-root"></div>
  <script
    id="embed-script"
    src="https://storymapsstg.arcgis.com/embed/view"
    data-story-id="<UPDATE_WITH_YOUR_STORY_ID>"
    data-root-node=".storymaps-root"
  ></script>
```

## Resources

- [GitHub Markdown Reference](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing

Copyright 2024 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [license.txt](/LICENSE) file.
