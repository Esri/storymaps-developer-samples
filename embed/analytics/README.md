# Track engagement using your preferred analytics provider

This sample demonstrates how to implement multiple analytics providers on a single webpage to track website traffic and user engagement. It includes integrations with **Google Analytics**, **Adobe Analytics** (via Adobe Launch), and **Meta Pixel** (formerly Facebook Pixel).

## About the working sample

- While the sample includes code for all three analytics platforms, you’ll likely only use **one**. Feel free to remove or comment out any blocks you don't plan to deploy.
- The provided `index.html` does **not** include actual IDs or credentials. This will likely produce console errors until you replace the placeholders with your own values.

---

## Usage Instructions

To implement analytics you’ll need:

- Tracking IDs or credentials for your chosen analytics platform(s) (e.g., Google, Adobe, or Meta)
- Access to edit the `<head>` of your HTML file

---

## HTML Customizations

Each analytics platform requires inserting a code snippet into the `<head>` of your page. Below are sample configurations for each.

---

### Google Analytics

```html
<!-- Google Analytics Code -->
<!-- Replace {G-XXXXXXX} -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX');
</script>
<!-- End Google Analytics Code -->
```

[Getting started with Google Analytics](https://developers.google.com/tag-platform/gtagjs)

---

### Adobe Analytics

```html
<!-- Adobe Analytics -->
<!-- Replace {launch-XXXX.min.js} with your actual Launch URL -->
<script src="https://assets.adobedtm.com/{launch-XXXX.min.js}"></script>
<script>
  window._satellite && _satellite.pageBottom();  // Initialize Adobe Analytics
</script>
<!-- End Adobe Analytics -->
```

[Getting started with Adobe Analytics and Tags](https://experienceleague.adobe.com/en/docs/experience-platform/tags/home)

---

### Meta Pixel

```html
<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s){
    if(f.fbq) return; n = f.fbq = function(){ 
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); 
    };
    if(!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
    n.queue = []; t = b.createElement(e); t.async = !0;
    t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  /* Replace {PIXEL_ID} */
  fbq('init', '{PIXEL_ID}');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
       src="https://www.facebook.com/tr?id={PIXEL_ID}&ev=PageView&noscript=1" />
</noscript>
<!-- End Meta Pixel Code -->
```

[Getting started with Meta Pixel](https://developers.facebook.com/docs/meta-pixel/get-started/)