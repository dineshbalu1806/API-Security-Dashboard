const axios = require("axios");

const SAFE_TIMEOUT = Number(process.env.SCAN_REQUEST_TIMEOUT || 5000);

const makeUrl = (project, endpoint) => {
  const base = project.apiBaseUrl.replace(/\/$/, "");
  const path = endpoint.path.startsWith("/") ? endpoint.path : `/${endpoint.path}`;
  return new URL(path, `${base}/`).toString();
};

const probe = async (project, endpoint, options = {}) => {
  const url = makeUrl(project, endpoint);
  try {
    const response = await axios({
      url,
      method: "GET",
      timeout: SAFE_TIMEOUT,
      maxRedirects: 3,
      validateStatus: () => true,
      headers: { Accept: "application/json", "User-Agent": "API-Security-Dashboard-Scanner/1.0" },
      ...options,
    });
    return { response, url };
  } catch (error) {
    return { error, url };
  }
};

const finding = (module, severity, endpoint, description, evidence) => ({
  owaspCategory: module,
  severity,
  endpoint: endpoint.path,
  method: endpoint.method || "GET",
  description,
  evidence: evidence ? String(evidence).slice(0, 2000) : undefined,
});

const responseBody = (response) => {
  if (!response || response.data === null || response.data === undefined) return "";
  return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
};

module.exports = { finding, makeUrl, probe, responseBody };