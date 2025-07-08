# Font replacement

This sample demonstrates how to reference a self-hosted font file and replace the typefaces used within your story with the self-hosted fonts.

This is useful when you want the typefaces of your story to conform to the style guide and fonts used by your organization that may not be available by default in the ArcGIS StoryMaps builder.

> [!NOTE]
> See [this sample](/embed/splash-page/README.md#css-customizations) for an example of referencing a font from a font delivery service (Google Fonts/Adobe Fonts)

## Live sample

Default fonts             |  Custom fonts
:-------------------------:|:-------------------------:
![Default fonts](/embed/fonts/assets/example_default_fonts.png)  |  ![Custom Fonts](/embed/fonts/assets/example_custom_fonts.png)

[Click to see the live example](https://esri.github.io/storymaps-developer-samples/embed/fonts/index.html)

## Usage instructions

To implement custom fonts for your story, follow these steps:

- Self-host your desired font files or have access to a font delivery service.
- Load the font (see CSS customizations below)
- Define a global config object (`storyMapsEmbedConfig`)

### HTML customizations
Reference a `*.css` file defining the source for your replacement fonts.
```html
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Custom Font Sample</title>
    <!-- Reference CSS defining the source for your replacement fonts-->
    <link rel="stylesheet" type="text/css" href="style.css">
  </head>

<!-- ...more code... -->
```

Create a `<script>` tag referencing a `config.js` script. This script will contain the logic for configuring your embedded story and the assignment of replacement fonts.

> [!IMPORTANT]
> This object needs to be defined before the script embed tag.

```html
<!-- ...more code... -->

  <body>
    <!-- Embedded story -->
    <div class="storymaps-root"></div>
    <script
      type="module"
      src="font-config.js"
    ></script>
  </body>
</html>
```

### JavaScript customizations

This file contains all of the JavaScript used to configure the embed and the font replacement.

> [!NOTE]
>This example implements the script tag using javascript within a separate `font-config.js` file. For an html-only example, see the [**getting started**](../getting-started/index.html) example.


```js
function generateScriptConfig() {
  window.storyMapsEmbedConfig = {
    // This is the config section.
    // Replace {YOUR-STORY-ID} with the itemID of the you wish to load
    storyId: "{YOUR-STORY-ID}",
    rootNode: ".storymaps-root",
    // Define the replacement fonts to be used
    // for the 'title'and 'body' of your story
      font: {
        title: {
          fontFamily: "Permanent Marker",
          weight: {
            normal: 400,
            bold: 400
          }
        },
        body: {
          fontFamily: "Kalam",
          weight: {
            normal: 400,
            bold: 700
          }
        }
      }
    }
  }

function createScriptedEmbed() {
    const script = document.createElement('script');
    script.id = 'embed-script';
    script.src =`https://storymaps.arcgis.com/embed/view`;
    document.body.appendChild(script);
  }

generateScriptConfig()
createScriptedEmbed()
```

### CSS customizations

**Loading fonts from font delivery service**: If using a typeface from a font delivery service, you need to reference the font in the `<head>` of your HTML:

```html
<!-- Reference Google Fonts and CSS -->
<head>
  <link href="https://fonts.googleapis.com/css2?family=Sigmar&family=Sigmar+One&display=swap" rel="stylesheet" />
</head>
```

**Referencing self-hosted font files**: When using self-hosted fonts, reference them in your CSS file using `@font-face`, with their `src` as a relative URL to the file location on your web server:

```css
/* Reference self-hosted font files */
@font-face {
  font-family: "Permanent-Marker";
  src: url("./fonts/PermanentMarker/PermanentMarker-Regular.ttf") format("truetype");
}
/* Reference hosted font from service ex. Google/Adobe */
@font-face {
  font-family: "Kalam";
  src: url("https://fonts.gstatic.com/s/kalam/v17/YA9Qr0Wd4kDdMtDqHTLMkiQ.woff2")
}
```
