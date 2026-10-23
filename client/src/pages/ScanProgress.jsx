import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Circle, LoaderCircle, X } from "lucide-react";
import useScanProgress from "../hooks/useScanProgress";

const statusIcon = (status) => {
  if (status === "completed") return <Check size={16} />;
  if (status === "running") return <LoaderCircle className="spin" size={16} />;
  if (status === "failed") return <X size={16} />;
  return <Circle size={16} />;
};

export default function ScanProgress() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const { scan, error } = useScanProgress(scanId);
  const modules = scan?.moduleProgress || [];
  const completedCount = modules.filter((item) => item.status === "completed").length;
  const progress = modules.length ? Math.round(completedCount / modules.length * 100) : 0;

  useEffect(() => {
    if (scan?.status === "completed") navigate(`/findings/${scanId}`, { replace: true });
  }, [navigate, scan?.status, scanId]);

  if (!scan && !error) return <section className="page centered-page"><div className="loading-screen">Connecting to scan...</div></section>;

  return <section className="page centered-page">
    <div className="scan-hero">
      <span className="scan-orbit">{scan?.status === "failed" ? <X size={32} /> : <LoaderCircle size={32} />}</span>
      <span className="eyebrow">{scan?.status === "failed" ? "Scan failed" : `Scan ${scan?.status || "status unavailable"}`}</span>
      <h1>{scan?.status === "failed" ? "The scan could not complete" : "Scanning your API"}</h1>
      <p className="muted">{scan?.errorMessage || error || "Sentinel is checking your API against the OWASP API Top 10."}</p>
    </div>
    {scan && <div className="progress-panel panel">
      <div className="progress-top"><strong>Analysis progress</strong><span>{completedCount} of {modules.length} modules</span></div>
      <div className="large-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="module-list">{modules.map(({ module, status }) => <div className={`module-row ${status === "completed" ? "done" : status === "running" ? "active" : status === "failed" ? "failed" : ""}`} key={module}>{statusIcon(status)}<span>{module}</span><small>{status}</small></div>)}</div>
    </div>}
    {scan?.status === "failed" && <Link className="text-button" to="/dashboard">Back to overview</Link>}
  </section>;
}
