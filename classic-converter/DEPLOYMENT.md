# Deploy Classic StoryMaps Toolkit

Classic StoryMaps Toolkit is a static site. It does not need Node.js, a database, environment variables, or a server-side build after this ZIP is created.

## Before publishing

1. Unzip `classic-storymaps-toolkit.zip`.
2. Serve the unzipped folder locally and open the site root:

   ```sh
   python3 -m http.server 9100
   ```

3. Confirm that Explorer can load public Classic story results.
4. Choose the deployed callback URL, such as `https://YOUR_HOST/OPTIONAL_PATH/arcgis-oauth-callback.html`, and register that exact URL in an ArcGIS OAuth application.
5. In `config.js`, set that application's client ID as `oauthClientId` and configure `oauthRedirectUri` to resolve to the registered callback URL.
6. Leave `storyToolkitHomeUrl` empty for a standalone deployment. Set it to the parent Story Toolkit URL only when these pages are hosted inside that app. The packaged `config.js` already uses the standalone OAuth client ID.
7. Confirm that your organization permits this host to connect to `https://www.arcgis.com`.
8. Sign in through Explorer, search a private scope, and hand a non-production item to Converter.

The standalone root `index.html` opens Classic Story Explorer directly. Explorer handoffs and the manual Converter navigation link open `converter.html`. Navigation paths are relative, so the folder may be hosted at a domain root or a subdirectory. Use HTTPS for deployed sign-in; local HTTP is suitable only for localhost testing.

`oauthRedirectUri` accepts any of these forms:

```js
oauthRedirectUri: "./arcgis-oauth-callback.html", // Beside the current Explorer page
oauthRedirectUri: "/tools/classic/arcgis-oauth-callback.html", // From the host root
oauthRedirectUri: "https://tools.example.com/classic/arcgis-oauth-callback.html", // Full same-origin URL
```

The resolved callback URL must use the same origin as Explorer because the callback returns the short-lived token directly to the opening window. For S3 and CloudFront, use the public CloudFront/custom-domain URL—not the S3 origin URL—and register that exact resolved URL in the ArcGIS OAuth application.

## Netlify

### Netlify web interface

1. Sign in to Netlify and choose **Add new site** → **Deploy manually**.
2. Unzip this package.
3. Drag the unzipped folder—not the ZIP itself—into the deployment area.
4. Open the generated Netlify URL and confirm it starts on Explorer, then test an Explorer-to-Converter handoff.
5. Add a custom domain in **Domain management** when ready.

The included `_headers` file adds baseline security and privacy headers on Netlify.

Add the final Netlify callback URL to the ArcGIS OAuth application's redirect URLs—for example, `https://YOUR_SITE.netlify.app/arcgis-oauth-callback.html`. Include any subdirectory in that URL. Preview domains need their own registered callback if sign-in will be tested there.

### Netlify CLI

From the unzipped folder:

```sh
npx netlify deploy --dir .
npx netlify deploy --dir . --prod
```

The first command creates a preview. Use the production command only after the preview is verified.

## Amazon S3

1. Create a dedicated S3 bucket.
2. In the bucket's **Properties**, enable **Static website hosting**.
3. Set `index.html` as the index document.
4. Upload every file and folder from the unzipped package, preserving the directory structure.
5. Configure read access for the website. Prefer CloudFront with Origin Access Control for a durable public deployment; use a public-read bucket policy only for a short-lived test and only when your AWS policy permits it.

With the AWS CLI configured, upload the extracted folder with:

```sh
aws s3 sync . s3://YOUR_BUCKET_NAME
```

For deployed OAuth sign-in, put CloudFront or another HTTPS-capable CDN in front of S3. Point CloudFront at the S3 bucket, redirect HTTP to HTTPS, and set `index.html` as the default root object. Apply the headers from `_headers` as a CloudFront response-headers policy because S3 does not interpret Netlify's `_headers` file.

Register the CloudFront or custom-domain callback URL in the ArcGIS OAuth application, then set both `oauthClientId` and `oauthRedirectUri` in `config.js` before uploading.

## Other static hosts

Upload the unzipped directory to any host that serves static HTML, JavaScript, CSS, JSON, and PNG files without rewriting asset paths. Examples include GitHub Pages, Azure Static Web Apps, Cloudflare Pages, and a conventional web server.

## Required network access

Browsers using the site must be able to make HTTPS requests to ArcGIS endpoints, primarily:

- `https://www.arcgis.com/sharing/rest/`
- `https://storymaps.arcgis.com/`

Converted drafts and related hosted feature layers are created in the ArcGIS account represented by the token. The static host never receives or stores the token separately; it lives in browser localStorage and is sent directly to ArcGIS. Explorer passes it to Converter without putting the token in the URL.

## Updating a deployment

Build a fresh ZIP from the source repository with:

```sh
npm run classic:package
```

Upload the new extracted contents over the existing deployment, then clear the CDN cache if one is in front of the site. Test Explorer search, Converter token validation, a single conversion, and the Guide before announcing the update.
