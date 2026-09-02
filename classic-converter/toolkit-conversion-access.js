// packages/storytoolkit/src/classic-converter/conversion-access.js
var CLASSIC_CONVERSION_RESTRICTION = "You can view this story, but conversion is limited to stories you own or can access within your ArcGIS organization. Public access alone does not allow conversion.";
function canConvertClassicItem(item, user) {
  if (!user?.username || !item?.owner) return false;
  if (item.owner.toLowerCase() === user.username.toLowerCase()) return true;
  const sourceOrgId = item.orgId || item.ownerOrgId;
  return Boolean(user.orgId && sourceOrgId && user.orgId === sourceOrgId);
}
async function checkClassicConversionAccess(item, user, token) {
  if (!token || !user?.username || !item?.owner) return false;
  if (canConvertClassicItem(item, user)) return true;
  const read = async (path) => {
    const url = new URL(`https://www.arcgis.com/sharing/rest/${path}`);
    url.searchParams.set("f", "json");
    url.searchParams.set("token", token);
    const response = await fetch(url, { cache: "no-store" });
    const json = await response.json();
    if (!response.ok || json.error) throw new Error("Could not verify conversion access.");
    return json;
  };
  try {
    let orgId = user.orgId;
    if (!orgId) {
      const portal = await read("portals/self");
      if (portal.user?.username?.toLowerCase() !== user.username.toLowerCase()) return false;
      orgId = portal.user.orgId || portal.id;
    }
    if (!orgId) return false;
    let ownerOrgId = item.orgId || item.ownerOrgId;
    if (!ownerOrgId) {
      const owner = await read(`community/users/${encodeURIComponent(item.owner)}`);
      if (owner.username?.toLowerCase() !== item.owner.toLowerCase()) return false;
      ownerOrgId = owner.orgId;
    }
    return canConvertClassicItem({ ...item, ownerOrgId }, { ...user, orgId });
  } catch {
    return false;
  }
}
export {
  CLASSIC_CONVERSION_RESTRICTION,
  canConvertClassicItem,
  checkClassicConversionAccess
};
//# sourceMappingURL=classic-conversion-access.js.map
