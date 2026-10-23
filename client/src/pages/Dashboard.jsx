import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import api from "../services/api";
import StatCard from "../components/StatCard";
import ScoreGauge from "../components/ScoreGauge";
import SeverityDonutChart from "../components/SeverityDonutChart";
import ScoreTrendLineChart from "../components/ScoreTrendLineChart";
import SeverityBadge from "../components/SeverityBadge";

const endpointCount = (project) => {
  if (!project) return 0;
  if (project.manualEndpoints?.length) return project.manualEndpoints.length;
  return Object.values(project.openApiSpec?.paths || {}).reduce(
    (total, path) => total + Object.keys(path || {}).filter((method) =>
      ["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())
    ).length,
    0
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({ projects: [], scans: [], latestScan: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/projects"), api.get("/scans")])
      .then(async ([projectResponse, scanResponse]) => {
        const projects = projectResponse.data.projects;
        const scans = scanResponse.data.scans;
        const latestScan = scans[0]
          ? (await api.get(`/scans/${scans[0]._id}`)).data.scan
          : null;
        if (active) setData({ projects, scans, latestScan });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load dashboard data.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const { projects, scans, latestScan } = data;
  const latestProject = projects.find((project) => project._id === latestScan?.projectId);
  const findings = latestScan?.findings || [];
  const openFindings = findings.filter((finding) => finding.status === "open");
  const trend = scans.slice(0, 5).reverse()
    .filter((scan) => Number.isFinite(scan.overallScore))
    .map((scan) => ({
      label: new Date(scan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: scan.overallScore,
    }));
  const coveredEndpoints = endpointCount(latestProject);
  const completedCount = latestScan?.moduleProgress?.filter((item) => item.status === "completed").length || 0;

  if (loading) return <section className="page"><div className="loading-screen">Loading security posture...</div></section>;

  return <section className="page">
    <div className="page-heading">
      <div><span className="eyebrow">Workspace overview</span><h1>Security posture</h1><p className="muted">A focused view of your API attack surface and recent assurance work.</p></div>
      <Link className="primary-button" to="/projects/new"><Plus size={17} /> New scan</Link>
    </div>
    {error && <div className="form-error">{error}</div>}
    <div className="stat-grid">
      <StatCard label="Security score" value={latestScan?.overallScore ?? "—"} detail={latestScan ? "Latest completed scan" : "No completed scans"} />
      <StatCard label="Open findings" value={openFindings.length} detail={`${findings.filter((item) => item.severity === "Critical").length} critical · ${findings.filter((item) => item.severity === "High").length} high`} tone="warning" />
      <StatCard label="Endpoints covered" value={coveredEndpoints} detail={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`} />
      <StatCard label="Completed scans" value={scans.filter((scan) => scan.status === "completed").length} detail={scans[0] ? new Date(scans[0].createdAt).toLocaleDateString() : "No scans yet"} />
    </div>
    {latestScan ? <div className="dashboard-grid">
      <div className="panel score-panel">
        <div className="panel-heading"><div><span className="eyebrow">Latest scan</span><h2>{latestProject?.name || "API project"}</h2></div><button className="text-button" onClick={() => navigate(`/findings/${latestScan._id}`)}>View findings <ArrowUpRight size={15} /></button></div>
        <div className="score-row"><ScoreGauge score={latestScan.overallScore ?? 0} /><div className="score-copy"><strong>{latestScan.status === "completed" ? "Scan complete" : `Scan ${latestScan.status}`}</strong><p>{openFindings.length ? `${openFindings.length} findings remain open for review.` : "No open findings remain for this scan."}</p><div className="mini-progress"><span style={{ width: `${latestScan.moduleProgress?.length ? completedCount / latestScan.moduleProgress.length * 100 : 0}%` }} /></div><small>{completedCount} of {latestScan.moduleProgress?.length || 0} checks completed</small></div></div>
      </div>
      <div className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Distribution</span><h2>Findings by severity</h2></div></div><SeverityDonutChart findings={findings} /></div>
      <div className="panel trend-panel"><div className="panel-heading"><div><span className="eyebrow">Recent scans</span><h2>Score trend</h2></div></div>{trend.length ? <ScoreTrendLineChart data={trend} /> : <div className="empty-state"><p>Score history appears after completed scans.</p></div>}</div>
      <div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">Latest results</span><h2>Open findings</h2></div><Link className="text-button" to={`/findings/${latestScan._id}`}>View all <ArrowUpRight size={15} /></Link></div>{openFindings.length ? <div className="recent-list">{openFindings.slice(0, 4).map((finding) => <button className="recent-row" key={finding._id} onClick={() => navigate(`/findings/${latestScan._id}`)}><span><strong>{finding.owaspCategory}</strong><small>{finding.method} {finding.endpoint}</small></span><SeverityBadge severity={finding.severity} /></button>)}</div> : <div className="empty-state"><p>No open findings in the latest scan.</p></div>}</div>
    </div> : <div className="empty-state"><h3>No scans yet</h3><p>Add a project and start the first security scan.</p></div>}
  </section>;
}
