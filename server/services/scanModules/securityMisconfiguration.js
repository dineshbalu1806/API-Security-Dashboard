const { finding, probe } = require("./helpers");

const CATEGORY = "Security Misconfiguration";

module.exports = async ({ project, endpoint }) => {
  const result = await probe(project, endpoint);
  if (!result.response) return null;
  const headers = result.response.headers;
  const missing = ["x-content-type-options", "x-frame-options", "content-security-policy"]
    .filter((header) => !headers[header]);
  if (missing.length >= 2) {
    return finding(CATEGORY, "Medium", endpoint, "The response is missing multiple common browser security headers.", `Missing: ${missing.join(", ")}`);
  }
  return null;
};