const { finding, probe } = require("./helpers");

const CATEGORY = "Broken Object Level Authorization";

module.exports = async ({ project, endpoint }) => {
  if (!/[{}/](?:id|user|account|order|record)[}/]?/i.test(endpoint.path)) return null;
  const result = await probe(project, endpoint);
  if (result.response && result.response.status >= 200 && result.response.status < 300) {
    return finding(CATEGORY, "High", endpoint, "An object-like endpoint returned success without scanner credentials. Verify object-level authorization for every requested resource.", `Unauthenticated GET ${result.url} returned HTTP ${result.response.status}`);
  }
  return null;
};