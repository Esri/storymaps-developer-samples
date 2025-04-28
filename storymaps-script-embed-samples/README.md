# ArcGIS StoryMaps advanced embed examples

This folder contains code examples related to the **advanced embedding** capability of ArcGIS StoryMaps. Embedding stories using a `<script>` tag is a developer-friendly pathway for implementing custom functionality and styling.

## Features

Embedding a story in your webpage using `<script>` tags enables you to:

- [Add a story to your domain and customize its link](/storymaps-script-embed-samples/getting-started/README.md)
- [Wrap a story in your header and footer](/storymaps-script-embed-samples/header-footer/README.md)
- [Open a story with a splash page or pop-up](/storymaps-script-embed-samples/splash-page/README.md)
- [Replace the fonts in a story with self-hosted fonts or those from a font delivery service](/storymaps-script-embed-samples/font-replacement/README.md)
- [Track engagement using your preferred analytics provider](/storymaps-script-embed-samples/analytics/README.md)

## Instructions

Each sample folder within this repository demonstrates a specific use case and contains:

- **HTML** index.html file that acts as the main webpage with a script-embed of an ArcGIS StoryMap story.
- **CSS** style.css file containing rules for overriding the styling of elements within a story.
- **Javascript (optional)** javascript.js file containing code to manipulate content of the webpage.
- **README** A read me document that outlines the use case for the sample, how to implement it, and a link to a live example (if applicable).

The contents of these files can be copied and modified to suit your needs and hosted on your webserver.

### Embedding a story using script tags

> [!IMPORTANT]
> A story will not load when embedded with a `<script>` tag unless it was published with **advanced embedding** enabled AND at least one **allowed domain** is configured. Typically, you will add allowed domains for 1) the production system where you'll be embedding the story and 2) your test environment(s). For details, see [Configure story settings](https://doc.arcgis.com/en/arcgis-storymaps/author-and-share/add-analytics-to-a-story.htm).

Within the HTML `index.html` file a script tag is used to embed the story.

```html
<!-- Embedded story -->
<div class="storymaps-root"></div>
<script
  id="embed-script"
  src="https://storymaps.arcgis.com/embed/view"
></script>
```

> [!NOTE]
> A previous version of the script tag required both the Story ID and the Root Node to be defined within the script tag. This is no longer necessary as the Story ID can be defined in a global configuration [object]().

> [!TIP]
> Be sure to add appropriate [`<meta>` tags](https://ogp.me/) to your web page so it appears in web search results and looks good when it's shared on social media sites. Inspect any published story to see the set of tags attached to ArcGIS StoryMaps items.
>
> Additionally, it's recommended you DISABLE the "Show in web search results" option for an embedded story. This will direct web traffic to your custom page as opposed to the story. For details, see [Publish a story](https://doc.arcgis.com/en/arcgis-storymaps/author-and-share/publish-a-story.htm).

### Configuring your Story

Define a Global Configuration Object: Define a global object above the script embed tag to configure specific aspects of your story. Currently, the following configurations are supported:

- Story ID: The ID of the story you want to embed
- Root Node: The CSS selector of the div where the story will be embedded
- Custom Fonts: Refer to the font-replacement example for guidance
- Custom Header: Refer to the header-footer example for guidance

> [!IMPORTANT]
> It is crucial to define the configuration object before the script embed tag executes. This ensures that the Story can access the configuration upon loading.

#### Config typing

```ts
type StoryId = string;

type RootNode = string; // CSS selector

type EmbedFont = {
  fontFamily: string;
  weight: {
    normal: number;
    bold: number;
  };
};

interface StoryMapsEmbedConfig {
  topOffset?: `${string}${"rem" | "px"}` | number; // number is treated as px
  font?: {
    title?: EmbedFont;
    body?: EmbedFont;
  };
}
```

#### Config example

```ts
window.storyMapsEmbedConfig = {
  storyId: "<UPDATE_WITH_YOUR_STORY_ID>",
  rootNode: "<UPDATE WITH YOUR DIV SELECTOR>",
  font: {
    title: {
      // Defining title is optional
      // If title is defined, all of it's properties are required
      fontFamily: "Permanent-Marker",
      weight: {
        normal: 400,
        bold: 700
      }
    },
    body: {
      // Defining body is optional
      // If body is defined, all of it's properties are required
      fontFamily: "Kalam",
      weight: {
        normal: 400,
        bold: 700
      }
    }
  },
  topOffest: "5rem"
};
```

## Resources

- [GitHub Markdown Reference](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

## Issues

Find a bug or want to request a new feature? Please let us know by submitting an issue.

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
