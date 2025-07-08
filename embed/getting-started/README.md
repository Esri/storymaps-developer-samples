# Add a story to your domain and customize its link

Esri provides an easy way for developers to add ArcGIS StoryMaps stories to their own domains. This does not require you to download the story's source code or content. You will use a `<script>` tag to load the story in a simple HTML page on your organization's website, which enables you to establish your own URL for the story.

When using this method, you may continue to edit and republish the story in the ArcGIS StoryMaps builder.

This technique also enables you to customize the appearance and behavior of a story, but you can also embed the story as-is. For examples of the types of customizations you can do, see the other samples in this repo.

## Usage instructions

To implement a custom domain and link:

1. Create an `index.html` page (or add the following code elements to an existing HTML page)
1. Add a `<div>` called `storymaps-root` where you want the story to appear on the page
1. Add the two `<script>` elements detailed in the sample code below and include YOUR story item ID as the `data-story-id`
1. Host the HTML page in the web directory of your choosing to set its URL
    - e.g., `my-domain.gov/water-report`, `my-domain.org/our-stories/january-update`, etc.

> [!TIP]
> You can copy pre-generated `<script>` tag code from the story builder once you have enabled advanced embedding and published your story publicly. Go to the ... menu in the header, choose **Embed this story**, then switch the dropdown to show the script embed code.

### Search engine optimization
If you are adding a story to an existing web page, it will likely already have `<meta>` tags describing the page for search engines. However, if you are creating a new web page to host a stand-alone story, you'll want to add `<meta>` tags. As a start, you can use browser tools to inspect the page source on your published story to see what tags are there and mimic many of them. Ultimately, you should configure `<meta>` tags according to your organization's guidelines and best practices.

> [!TIP]
> Be sure to DISABLE "Show in web search results" on your story when publishing to drive search engine traffic to the custom page on your domain (rather than to the story on storymaps.arcgis.com).
  

## HTML code sample
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Add other optional metatags here (e.g. to identify the content of this page 
        for search engines) -->
    <title>Getting Started Sample</title>
  </head>
  <body>
    <!-- Place this root container where you want the story to appear in the page -->
    <div class="storymaps-root"></div>
    <!-- This is the config section. Replace {YOUR-STORY-ID} with the itemID of the 
        you wish to load -->
    <script>
      window.storyMapsEmbedConfig = {
        storyId: '{YOUR-STORY-ID}',
        rootSelector: '.storymaps-root'
      };
    </script>
    <!-- This final script tag loads the StoryMaps presentation engine  -->
    <script
      id="embed-script"
      src="https://storymaps.arcgis.com/embed/view"
    ></script>
  </body>
</html>
```

> [!NOTE]
> You may reference the `storymaps-root` `<div>` using a `class` (as shown above) or an `id`. If you reference it using an `id`, change `data-root-node=".storymaps-root"` to `data-root-node="#storymaps-root"`.
