import { ArrowUpRight } from "lucide-react";
import SeverityBadge from "./SeverityBadge";

export default function FindingsTable({ findings = [], onSelect }) {
  if (!findings.length) return <div className="empty-state"><span>✓</span><h3>No findings in this view</h3><p>This scan did not return any matching vulnerabilities.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Issue</th><th>Endpoint</th><th>Severity</th><th>Status</th><th /></tr></thead><tbody>{findings.map((finding) => <tr key={finding._id || finding.id} onClick={() => onSelect?.(finding)}><td><strong>{finding.owaspCategory}</strong><small>{finding.description}</small></td><td><code>{finding.method} {finding.endpoint}</code></td><td><SeverityBadge severity={finding.severity} /></td><td><span className="status-label">{finding.status || "open"}</span></td><td><ArrowUpRight size={16} /></td></tr>)}</tbody></table></div>;
}