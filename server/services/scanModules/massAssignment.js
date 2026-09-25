const { finding, probe } = require("./helpers");

const CATEGORY = "Mass Assignment";

module.exports = async ({ project, endpoint }) => {
  if (!["POST", "PUT", "PATCH"].includes((endpoint.method || "GET").toUpperCase())) return null;
  const result = await probe(project, endpoint);
  if (result.response && result.response.status >= 200 && result.response.status < 300) {
    return finding(CATEGORY, "High", endpoint, "A write-capable endpoint is reachable during the unauthenticated safe probe. Use an allowlist of writable fields and reject privilege-bearing properties.", `Safe GET probe returned HTTP ${result.response.status}`);
  }
  return null;
};