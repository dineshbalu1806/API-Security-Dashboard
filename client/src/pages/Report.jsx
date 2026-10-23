import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileCheck2 } from "lucide-react";
import api from "../services/api";
import ScoreGauge from "../components/ScoreGauge";
import SeverityBadge from "../components/SeverityBadge";

const categories = [
  "Broken Object Level Authorization",
  "Broken Authentication",
  "Excessive Data Exposure",
  "Lack of Resources & Rate Limiting",
  "Mass Assignment",
  "Security Misconfiguration",
  "Injection",
];

const endpointCount = (project) => {
  if (project?.manualEndpoints?.length) return project.manualEndpoints.length;
  return Object.values(project?.openApiSpec?.paths || {}).reduce(
    (total, path) => total + Object.keys(path || {}).filter((method) =>
      ["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())
    ).length,
    0
  );
};

export default function Report() {
  const { scanId } = useParams();
  const [scan, setScan] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
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
        if (active) setError(requestError.response?.data?.message || "Unable to load report data.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scanId]);

  const downloadReport = async () => {
    setDownloading(true);
    setError("");
    try {
      const { data } = await api.get(`/scans/${scanId}/report`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${(project?.name || "api-security").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-scan-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to download the PDF report.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <section className="page"><div className="loading-screen">Preparing report...</div></section>;
  if (error && !scan) return <section className="page"><div className="form-error">{error}</div></section>;

  const findings = scan?.findings || [];
  const completedAt = scan?.completedAt || scan?.createdAt;

  return <section className="page report-page">
    <div className="page-heading"><div><Link className="back-link" to={`/findings/${scanId}`}><ArrowLeft size={15} /> Findings</Link><span className="eyebrow">Compliance export</span><h1>OWASP API report</h1><p className="muted">Prepared for {project?.name || "your API"} · {completedAt ? new Date(completedAt).toLocaleDateString() : "Date unavailable"}</p></div><button className="primary-button" onClick={downloadReport} disabled={downloading || scan?.status !== "completed"}><Download size={16} /> {downloading ? "Preparing PDF..." : "Download PDF"}</button></div>
    {error && <div className="form-error">{error}</div>}
    {scan?.status !== "completed" && <div className="form-error">A report is available after the scan completes. Current status: {scan?.status || "unknown"}.</div>}
    <div className="report-sheet"><div className="report-cover"><div><span className="brand-mark"><FileCheck2 size={18} /></span><h2>API security<br />compliance report</h2><p>{project?.name || "API project"}</p></div><ScoreGauge score={scan?.overallScore ?? 0} label="Overall score" /></div>
      <div className="report-section"><div className="report-section-head"><div><span className="eyebrow">Executive summary</span><h2>A clear view of your risk posture</h2></div><span className="report-date">{completedAt ? new Date(completedAt).toLocaleString() : "Scan date unavailable"}</span></div><div className="summary-grid"><div><strong>{categories.length}</strong><span>OWASP categories tested</span></div><div><strong>{endpointCount(project)}</strong><span>Endpoints in scope</span></div><div><strong>{findings.length}</strong><span>Findings identified</span></div></div></div>
      <div className="report-section"><span className="eyebrow">Top 10 coverage</span><h2>Category status</h2><div className="category-list">{categories.map((category) => { const match = findings.find((item) => item.owaspCategory === category); return <div key={category}><span>{category}</span>{match ? <SeverityBadge severity={match.severity} /> : <span className="pass-label">Pass</span>}</div>; })}</div></div>
    </div>
  </section>;
}
