import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clock3,
  FileCheck2,
  Plus,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";
import StatCard from "../components/StatCard";
import ScoreGauge from "../components/ScoreGauge";
import SeverityDonutChart from "../components/SeverityDonutChart";
import ScoreTrendLineChart from "../components/ScoreTrendLineChart";
import SeverityBadge from "../components/SeverityBadge";

const scannerModules = [
  "BOLA",
  "Broken Authentication",
  "Excessive Data Exposure",
  "Lack of Resources & Rate Limiting",
  "Mass Assignment",
  "Security Misconfiguration",
  "Injection",
];

const scanPath = (scan) => ["queued", "running"].includes(scan.status)
  ? `/scan/${scan._id}`
  : `/findings/${scan._id}`;

const formatDate = (value) => new Date(value).toLocaleString(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [latestScan, setLatestScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data: response } = await api.get("/scans/overview");
        const latestScanId = response.overview.recentScans[0]?._id;
        const latestResponse = latestScanId
          ? await api.get(`/scans/${latestScanId}`)
          : null;
        if (active) {
          setData(response.overview);
          setLatestScan(latestResponse?.data.scan || null);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();
    const timer = window.setInterval(refresh, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  if (loading) {
    return <section className="page"><div className="loading-screen">Loading security posture...</div></section>;
  }

  const metrics = data?.metrics || {};
  const projects = data?.projects || {};
  const findings = data?.findings || { totalOpen: 0, bySeverity: {} };
  const recentScans = data?.recentScans || [];
  const trend = (data?.scoreTrend || []).map((scan) => ({
    label: new Date(scan.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: scan.score,
  }));
  const latestFindings = (latestScan?.findings || []).filter((finding) => finding.status === "open");
  const completedModules = latestScan?.moduleProgress?.filter((item) => item.status === "completed").length || 0;
  const averageScore = Number.isFinite(metrics.averageScore)
    ? Number(metrics.averageScore.toFixed(1))
    : "—";

  return <section className="page dashboard-page">
    <div className="page-heading">
      <div>
        <span className="eyebrow">Workspace overview</span>
        <h1>Security overview</h1>
        <p className="muted">A clear view of your API coverage, scan activity, and security findings.</p>
      </div>
      <Link className="primary-button" to="/projects/new"><Plus size={17} /> Add API</Link>
    </div>
    {error && <div className="form-error" role="alert">{error}</div>}

    <section className="overview-banner">
      <div className="overview-banner-copy">
        <span className="overview-kicker"><ShieldCheck size={14} /> SENTINEL SECURITY POSTURE</span>
        <h2>Your API surface,<br />at a glance.</h2>
        <p>Track real scan results, follow findings by severity, and keep your authorized APIs in view.</p>
        <div className="overview-banner-meta">
          <span><span className="status-dot" /> Workspace data is up to date</span>
          <span><ScanLine size={14} /> Read-only security probes</span>
          <span><Activity size={14} /> {metrics.activeScans || 0} scans in progress</span>
        </div>
      </div>
      <div className="overview-banner-mark" aria-hidden="true">
        <div className="overview-mark-orbit"><div><ShieldCheck size={45} /></div></div>
        <span className="overview-mark-caption">API SECURITY<br />MONITORING</span>
      </div>
    </section>

    <div className="stat-grid overview-stats">
      <StatCard
        label="Average security score"
        value={averageScore === "—" ? averageScore : `${averageScore} / 100`}
        detail={metrics.completedScans ? `Across ${metrics.completedScans} completed scans` : "Available after your first completed scan"}
        tone="positive"
      />
      <StatCard
        label="Total scans"
        value={(metrics.totalScans || 0).toLocaleString()}
        detail={`${metrics.completedScans || 0} completed · ${metrics.activeScans || 0} active · ${metrics.failedScans || 0} failed`}
      />
      <StatCard
        label="API projects"
        value={(projects.total || 0).toLocaleString()}
        detail={`${(projects.endpoints || 0).toLocaleString()} configured endpoints`}
      />
      <StatCard
        label="Open findings"
        value={(findings.totalOpen || 0).toLocaleString()}
        detail={`${findings.bySeverity?.Critical || 0} critical · ${findings.bySeverity?.High || 0} high`}
        tone="warning"
      />
    </div>

    <div className="dashboard-grid">
      <div className="panel score-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Latest scan</span><h2>{recentScans[0]?.projectName || "No scan activity yet"}</h2></div>
          {latestScan && <button className="text-button" onClick={() => navigate(scanPath(latestScan))}>View scan <ArrowUpRight size={15} /></button>}
        </div>
        {latestScan ? <div className="score-row">
          {latestScan.overallScore == null
            ? <div className="latest-scan-pending"><Clock3 size={24} /><span>Score pending</span><small>Available when the scan completes</small></div>
            : <ScoreGauge score={latestScan.overallScore} />}
          <div className="score-copy">
            <strong className="latest-status-title">{latestScan.status === "completed" ? "Scan complete" : `Scan ${latestScan.status}`}</strong>
            <p>{latestFindings.length
              ? `${latestFindings.length} open ${latestFindings.length === 1 ? "finding" : "findings"} in the latest scan.`
              : latestScan.status === "completed" ? "No open findings in the latest scan." : "Security checks are running against this API."}</p>
            <div className="mini-progress"><span style={{ width: `${latestScan.moduleProgress?.length ? completedModules / latestScan.moduleProgress.length * 100 : 0}%` }} /></div>
            <small>{completedModules} of {latestScan.moduleProgress?.length || 0} checks completed</small>
          </div>
        </div> : <div className="dashboard-empty">
          <p>Run a scan to see its score and results here.</p>
          <Link className="text-button" to="/projects/new">Set up your first API <ArrowUpRight size={15} /></Link>
        </div>}
      </div>

      <div className="panel chart-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Workspace findings</span><h2>Open by severity</h2></div>
          <span className="chart-total">{findings.totalOpen || 0} total</span>
        </div>
        <SeverityDonutChart counts={findings.bySeverity} />
      </div>

      <div className="panel trend-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Security history</span><h2>Score trend</h2></div>
          <Link className="text-button" to="/scans">All scans <ArrowUpRight size={15} /></Link>
        </div>
        {trend.length ? <ScoreTrendLineChart data={trend} /> : <div className="dashboard-empty chart-empty"><p>Score history will appear after a scan completes.</p></div>}
      </div>

      <div className="panel recent-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Workspace activity</span><h2>Recent scans</h2></div>
          <Link className="text-button" to="/scans">History <ArrowUpRight size={15} /></Link>
        </div>
        {recentScans.length ? <div className="recent-list scan-activity-list">
          {recentScans.map((scan) => <button className="scan-activity-row" key={scan._id} onClick={() => navigate(scanPath(scan))}>
            <span className={`scan-activity-icon ${scan.status}`}><Activity size={15} /></span>
            <span className="scan-activity-copy">
              <strong>{scan.projectName}</strong>
              <small>{formatDate(scan.createdAt)}</small>
            </span>
            <span className={`scan-status ${scan.status}`}>{scan.status}</span>
            <strong className="scan-activity-score">{scan.overallScore == null ? "—" : scan.overallScore}</strong>
          </button>)}
        </div> : <div className="dashboard-empty">
          <p>Your completed scans and in-progress runs will appear here.</p>
        </div>}
      </div>

      <div className="panel coverage-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">Scanner coverage</span><h2>Seven focused security checks</h2></div>
          <span className="coverage-count"><Check size={13} /> 7 modules</span>
        </div>
        <p className="coverage-intro">Each run checks for common API security weaknesses using the endpoints you configure.</p>
        <div className="coverage-list">
          {scannerModules.map((module) => <span key={module}><Check size={14} />{module}</span>)}
        </div>
        <div className="coverage-foot">
          <span><FileCheck2 size={15} /> Saved scan history</span>
          <span><CircleAlert size={15} /> Findings prioritized by severity</span>
        </div>
      </div>
    </div>
  </section>;
}
