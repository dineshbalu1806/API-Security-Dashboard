import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock3, Plus } from "lucide-react";
import api from "../services/api";

const formatDate = (value) => value
  ? new Date(value).toLocaleString()
  : "Date unavailable";

const scanPath = (scan) => ["queued", "running"].includes(scan.status)
  ? `/scan/${scan._id}`
  : `/findings/${scan._id}`;

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/scans"), api.get("/projects")])
      .then(([scanResponse, projectResponse]) => {
        if (!active) return;
        setScans(scanResponse.data.scans);
        setProjects(projectResponse.data.projects);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load scan history.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const projectNames = new Map(projects.map((project) => [project._id, project.name]));

  if (loading) return <section className="page"><div className="loading-screen">Loading saved scans...</div></section>;

  return <section className="page">
    <div className="page-heading">
      <div>
        <span className="eyebrow">Saved results</span>
        <h1>Scan history</h1>
        <p className="muted">Review previous scans, their status, scores, and recorded findings.</p>
      </div>
      <Link className="primary-button" to="/projects/new"><Plus size={17} /> New scan</Link>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}
    {!error && scans.length === 0 && <div className="empty-state">
      <Clock3 size={24} />
      <h3>No saved scans yet</h3>
      <p>When you run a scan, its results will be saved here.</p>
      <Link className="text-button" to="/projects/new">Start your first scan <ArrowUpRight size={15} /></Link>
    </div>}
    {scans.length > 0 && <div className="table-wrap scan-history-table">
      <table>
        <thead><tr><th>Project</th><th>Started</th><th>Status</th><th>Security score</th><th /></tr></thead>
        <tbody>
          {scans.map((scan) => (
            <tr key={scan._id}>
              <td><strong>{projectNames.get(scan.projectId) || "API project"}</strong><small>Scan {scan._id}</small></td>
              <td>{formatDate(scan.startedAt || scan.createdAt)}</td>
              <td><span className={`scan-status ${scan.status}`}>{scan.status}</span></td>
              <td>{scan.overallScore == null ? "—" : `${scan.overallScore} / 100`}</td>
              <td><Link className="text-button" to={scanPath(scan)}>{["queued", "running"].includes(scan.status) ? "View progress" : "View details"} <ArrowUpRight size={15} /></Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>}
  </section>;
}
