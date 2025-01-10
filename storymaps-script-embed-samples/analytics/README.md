# Analytics

This sample demonstrates how to implement several analytics providers within your site to track metrics associated with website traffic. These include but are not limited to Google Analytics, Adobe Analytics, and Meta Pixel (facebook).

## Usage instructions

To implement analytics for your script-embedded stories you'll need:

- Credentials for an analytics tracking platform

### HTML customizations

Configuring these analytics platforms typically involves placing some script within the `<head>` of your webpage. Below is an example of a Google Analytics script.

```html
<!-- Google Analytics Code -->
<!-- Replace {TAG_ID} -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id={TAG_ID}"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());

  // Add TAG_ID here
  gtag("config", "{TAG_ID}");
</script>
<!-- END Google Analytics Code-->
```
