const { finding, probe } = require("./helpers");

const CATEGORY = "Lack of Resources & Rate Limiting";

module.exports = async ({ project, endpoint }) => {
  const results = await Promise.all([
    probe(project, endpoint),
    probe(project, endpoint),
    probe(project, endpoint),
  ]);
  const successful = results.filter(({ response }) => response && response.status >= 200 && response.status < 300);
  if (successful.length === results.length && !results.some(({ response }) => response.headers["retry-after"])) {
    return finding(CATEGORY, "Medium", endpoint, "Three immediate requests were accepted without a rate-limit response. Confirm throttling is enforced per client and sensitive operation.", `${successful.length}/3 requests returned success`);
  }
  return null;
};