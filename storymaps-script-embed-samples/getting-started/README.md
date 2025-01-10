# Custom domain

Esri provides an easy way for developers to host ArcGIS StoryMaps stories on their own domains. While users can't download the story's source code, they can use a simple script to change the URL from `https://storymaps.arcgis.com/stories/xxxxxxxxxxxxxxxxxxxxx` to their organization's domain. This method allows authors to keep editing and updating their stories in the ArcGIS StoryMaps builder.

## Live sample

https://codepen.io/rdonihue/pen/oNKBboj

## Usage instructions

Implementing a custom domain involves:
- Create an index.html page or add the following to an existing HTML page
- add the embed-script id to your HTML page
- add your story id in the data-story-id=""
- host your HTML page

### HTML customizations

```html
<div class="storymaps-root"></div>
<script>
  id="embed-script"
  src="https://storymapsstg.arcgis.com/embed/view"
  data-story-id="1ba69ca9c31b4183b1ee486c36364198"
  data-root-node=".storymaps-root"
</script>
```
