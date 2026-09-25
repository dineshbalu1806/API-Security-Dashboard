const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const categories = [
  "Broken Object Level Authorization",
  "Broken Authentication",
  "Excessive Data Exposure",
  "Lack of Resources & Rate Limiting",
  "Broken Function Level Authorization",
  "Mass Assignment",
  "Security Misconfiguration",
  "Injection",
  "Improper Assets Management",
  "Insufficient Logging & Monitoring",
];

const severityClass = (severity) => severity.toLowerCase();

const renderReportHtml = ({ project, scan, findings }) => {
  const findingCounts = findings.reduce((counts, item) => {
    counts[item.owaspCategory] = (counts[item.owaspCategory] || 0) + 1;
    return counts;
  }, {});
  const grouped = ["Critical", "High", "Medium", "Low"].map((severity) => ({
    severity,
    findings: findings.filter((item) => item.severity === severity),
  }));

  const summaryRows = categories.map((category) => `
    <tr><td>${escapeHtml(category)}</td><td class="${findingCounts[category] ? "fail" : "pass"}">${findingCounts[category] ? `${findingCounts[category]} finding(s)` : "Pass"}</td></tr>
  `).join("");

  const findingSections = grouped.filter((group) => group.findings.length).map((group) => `
    <h2 class="severity-heading ${severityClass(group.severity)}">${escapeHtml(group.severity)} (${group.findings.length})</h2>
    ${group.findings.map((item) => `
      <article class="finding">
        <div class="finding-title"><span class="badge ${severityClass(item.severity)}">${escapeHtml(item.severity)}</span><strong>${escapeHtml(item.owaspCategory)}</strong></div>
        <p><strong>${escapeHtml(item.method)} ${escapeHtml(item.endpoint)}</strong></p>
        <p>${escapeHtml(item.description)}</p>
        ${item.evidence ? `<p class="evidence"><strong>Evidence:</strong> ${escapeHtml(item.evidence)}</p>` : ""}
        <div class="recommendation"><strong>Recommended fix</strong><p>${escapeHtml(item.aiRecommendation || "AI recommendation not generated yet.").replace(/\n/g, "<br>")}</p></div>
      </article>
    `).join("")}
  `).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>API Security Report - ${escapeHtml(project.name)}</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #17202a; margin: 0; font-size: 11px; }
  .header { background: #17202a; color: #fff; padding: 28px; margin: -18mm -14mm 24px; }
  h1 { font-size: 26px; margin: 0 0 8px; } h2 { font-size: 16px; margin: 24px 0 10px; border-bottom: 2px solid #dce1e5; padding-bottom: 6px; }
  .meta { color: #c8d0d8; } .score { float: right; font-size: 38px; font-weight: bold; color: #72d6a3; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; } th, td { text-align: left; padding: 8px; border-bottom: 1px solid #dce1e5; } th { background: #eef1f3; }
  .pass { color: #16804b; font-weight: bold; } .fail { color: #bb2d3b; font-weight: bold; }
  .severity-heading { page-break-before: auto; } .severity-heading.critical { color: #bb2d3b; } .severity-heading.high { color: #d66a14; } .severity-heading.medium { color: #9b7410; } .severity-heading.low { color: #16804b; }
  .finding { border: 1px solid #dce1e5; border-left: 4px solid #87929d; padding: 12px; margin: 10px 0; page-break-inside: avoid; } .finding-title { display: flex; align-items: center; gap: 8px; }
  .badge { color: white; padding: 3px 7px; font-size: 9px; font-weight: bold; } .badge.critical { background: #bb2d3b; } .badge.high { background: #d66a14; } .badge.medium { background: #c39b19; } .badge.low { background: #16804b; }
  .evidence { color: #56616b; font-family: monospace; } .recommendation { background: #f3f6f8; padding: 9px; margin-top: 10px; } p { line-height: 1.45; }
</style></head><body>
  <header class="header"><span class="score">${escapeHtml(scan.overallScore ?? "-")}/100</span><h1>API Security Compliance Report</h1><div class="meta">${escapeHtml(project.name)} &middot; Scan date: ${escapeHtml(new Date(scan.completedAt || scan.createdAt).toLocaleString())}</div></header>
  <h2>OWASP API Top 10 Summary</h2><table><thead><tr><th>Category</th><th>Result</th></tr></thead><tbody>${summaryRows}</tbody></table>
  <h2>Findings (${findings.length})</h2>${findingSections || "<p>No findings were recorded for this scan.</p>"}
</body></html>`;
};

module.exports = { renderReportHtml, escapeHtml };