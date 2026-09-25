const { finding, probe, responseBody } = require("./helpers");

const CATEGORY = "Excessive Data Exposure";
const SENSITIVE_FIELDS = /password|passwd|secret|token|api[_-]?key|private[_-]?key|credit[_-]?card|ssn/i;

module.exports = async ({ project, endpoint }) => {
  const result = await probe(project, endpoint);
  const body = responseBody(result.response);
  if (result.response && result.response.status >= 200 && result.response.status < 300 && SENSITIVE_FIELDS.test(body)) {
    return finding(CATEGORY, "High", endpoint, "The response appears to expose sensitive fields. Return only properties required by the client.", body.match(SENSITIVE_FIELDS)?.[0]);
  }
  return null;
};