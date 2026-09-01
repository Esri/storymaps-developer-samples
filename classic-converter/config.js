// Update oauthClientId and oauthRedirectUri when deploying to a new domain.
// oauthRedirectUri may be relative to the current page, root-relative, or a
// full same-origin HTTPS URL. Register the resolved URL in the ArcGIS OAuth app.
window.CLASSIC_TOOLKIT_CONFIG = Object.freeze({
  appVersion: "1.1.0",
  lastUpdatedDate: "2026-08-28",
  lastUpdatedLabel: "August 28, 2026",
  arcgisPortalUrl: "https://story.maps.arcgis.com",
  oauthClientId: "nTrvyGsyggcVkfXi",
  oauthRedirectUri: "./arcgis-oauth-callback.html",
  oauthExpirationMinutes: 120,
  archiveViewerUrl: "https://classic-story-archive.netlify.app/",
  // Set to an empty string for a standalone deployment.
  storyToolkitHomeUrl: "",
});

const storyToolkitHomeUrl = window.CLASSIC_TOOLKIT_CONFIG.storyToolkitHomeUrl;
document.querySelectorAll("[data-story-toolkit-back]").forEach(link => {
  if (!storyToolkitHomeUrl) return;
  link.href = storyToolkitHomeUrl;
  link.hidden = false;
});

document.querySelectorAll("[data-classic-app-meta]").forEach(element => {
  if (!window.location.pathname.endsWith("/changelog.html")) {
    const changelogLink = document.createElement("a");
    changelogLink.href = "./changelog.html";
    changelogLink.textContent = "Changelog";
    element.insertAdjacentElement("afterend", changelogLink);
  }
  const time = document.createElement("time");
  time.dateTime = window.CLASSIC_TOOLKIT_CONFIG.lastUpdatedDate;
  time.textContent = window.CLASSIC_TOOLKIT_CONFIG.lastUpdatedLabel;
  element.replaceChildren(
    document.createTextNode(`Version ${window.CLASSIC_TOOLKIT_CONFIG.appVersion} · Last updated `),
    time,
  );
});
