const { finding, probe } = require("./helpers");

const CATEGORY = "Broken Authentication";

module.exports = async ({ project, endpoint }) => {
  if (endpoint.requiresAuth === false) return null;
  const result = await probe(project, endpoint);
  if (result.response && result.response.status >= 200 && result.response.status < 300) {
    return finding(CATEGORY, "Critical", endpoint, "An endpoint marked as requiring authentication accepted an unauthenticated request.", `GET ${result.url} returned HTTP ${result.response.status} without an Authorization header`);
  }
  return null;
};