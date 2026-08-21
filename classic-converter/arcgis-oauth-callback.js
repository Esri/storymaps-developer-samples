const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
const token = params.get("access_token");
const expiresIn = params.get("expires_in");
const code = params.get("code");
const state = params.get("state");
const error = params.get("error_description") || params.get("error");

if (window.opener && code && state) {
  window.opener.postMessage({ type: "arcgis-oauth-code", code, state }, window.location.origin);
} else if (window.opener && token) {
  window.opener.postMessage({ type: "arcgis-oauth-token", token, expiresIn }, window.location.origin);
} else if (window.opener && error) {
  window.opener.postMessage({ type: "arcgis-oauth-error", error }, window.location.origin);
}

window.close();
