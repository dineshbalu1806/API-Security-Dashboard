const { finding, probe } = require("./helpers");

const CATEGORY = "Injection";

module.exports = async ({ project, endpoint }) => {
  const result = await probe(project, endpoint, { params: { api_security_probe: "'" } });
  if (result.response && result.response.status >= 500) {
    return finding(CATEGORY, "High", endpoint, "A harmless quote probe caused a server error. Review input validation and parameterized queries for injection handling.", `GET ${result.url} with api_security_probe=' returned HTTP ${result.response.status}`);
  }
  return null;
};