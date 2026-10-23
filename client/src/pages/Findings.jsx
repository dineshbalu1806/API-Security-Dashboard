import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, SlidersHorizontal } from "lucide-react";
import api from "../services/api";
import FindingsTable from "../components/FindingsTable";
import SeverityBadge from "../components/SeverityBadge";

export default function Findings() {
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [project, setProject] = useState(null);
  const [severity, setSeverity] = useState("All severities");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get(`/scans/${scanId}`), api.get("/projects")])
      .then(([scanResponse, projectsResponse]) => {
        if (!active) return;
        const result = scanResponse.data.scan;
        setScan(result);
        setProject(projectsResponse.data.projects.find((item) => item._id === result.projectId) || null);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load scan findings.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scanId]);

  const allFindings = scan?.findings || [];
  const findings = useMemo(() => severity === "All severities"
    ? allFindings
    : allFindings.filter((finding) => finding.severity === severity), [allFindings, severity]);

  if (loading) return <section className="page"><div className="loading-screen">Loading scan findings...</div></section>;
  if (error) return <section className="page"><div className="form-error">{error}</div></section>;

  return <section className="page">
    <div className="page-heading"><div><Link className="back-link" to="/dashboard"><ArrowLeft size={15} /> Overview</Link><span className="eyebrow">Scan {scanId}</span><h1>Vulnerability findings</h1><p className="muted">{allFindings.length} findings detected across {project?.name || "your API"}.</p></div><Link className="secondary-button" to={`/reports/${scanId}`}><Download size={16} /> Compliance report</Link></div>
    <div className="filter-bar"><span><SlidersHorizontal size={16} /> Filter results</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select><span className="filter-count">Showing {findings.length} of {allFindings.length}</span></div>
    <FindingsTable findings={findings} onSelect={setSelected} />
    {selected && <div className="drawer-backdrop" onClick={() => setSelected(null)}><aside className="finding-drawer" onClick={(event) => event.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close finding details">×</button><SeverityBadge severity={selected.severity} /><h2>{selected.owaspCategory}</h2><code>{selected.method} {selected.endpoint}</code><h3>What we found</h3><p>{selected.description}</p><h3>Evidence</h3><p className="evidence-copy">{selected.evidence || "No additional evidence was recorded."}</p><h3>Recommended fix</h3><p>{selected.aiRecommendation || "No AI recommendation has been generated for this finding yet."}</p></aside></div>}
  </section>;
}
