const axios = require("axios");

const SAFE_TIMEOUT = Number(process.env.SCAN_REQUEST_TIMEOUT || 5000);

const recommendations = {
  "Broken Object Level Authorization": "Authorize every object request against the authenticated user's ownership or tenant before returning or changing that object.",
  "Broken Authentication": "Require authentication for protected routes, validate credentials and tokens, and reject unauthenticated requests with 401 or 403.",
  "Excessive Data Exposure": "Return an explicit response DTO containing only necessary fields; never expose credentials, tokens, payment data, or internal metadata.",
  "Lack of Resources & Rate Limiting": "Apply per-user and per-IP rate limits, especially to sensitive and expensive operations, and return 429 with a retry policy.",
  "Mass Assignment": "Validate request bodies with a strict schema and allowlist writable fields; reject client-supplied privilege and server-managed properties.",
  "Security Misconfiguration": "Set appropriate security headers, disable framework disclosure headers, and avoid exposing debug or administrative responses publicly.",
  Injection: "Validate inputs and use parameterized database queries; return generic client errors instead of leaking parser or database details.",
};

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
  aiRecommendation: recommendations[module],
});

const responseBody = (response) => {
  if (!response || response.data === null || response.data === undefined) return "";
  return typeof response.data === "string" ? response.data : JSON.stringify(response.data);
};

module.exports = { finding, makeUrl, probe, responseBody };