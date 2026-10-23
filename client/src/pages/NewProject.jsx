import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, UploadCloud } from "lucide-react";
import api from "../services/api";

const getErrorMessage = (error) => {
  if (error instanceof SyntaxError) return "OpenAPI spec must be valid JSON.";
  if (error.code === "ECONNABORTED") {
    return "The scan request timed out. Check that the API server and Redis are running, then retry.";
  }
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message === "Network Error") {
    return "Cannot reach the API server. Start the backend and check VITE_API_URL.";
  }
  return error.message || "Unable to create the project or start the scan.";
};

export default function NewProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    apiBaseUrl: "",
    description: "",
    openApiSpec: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [createdProjectId, setCreatedProjectId] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    let projectId = createdProjectId;
    let projectCreated = Boolean(projectId);

    try {
      if (!projectId) {
        const payload = {
          ...form,
          openApiSpec: form.openApiSpec ? JSON.parse(form.openApiSpec) : undefined,
        };
        const { data } = await api.post("/projects", payload);
        projectId = data.project._id;
        projectCreated = true;
        setCreatedProjectId(projectId);
      }

      const scan = await api.post(
        "/scans",
        { projectId },
        { timeout: 15000 }
      );
      navigate(`/scan/${scan.data.scanId}`);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(
        projectCreated
          ? `Project saved, but the scan could not be started: ${message} You can retry without creating another project.`
          : message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page narrow-page">
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={15} /> Back to overview
      </button>
      <div className="page-heading compact">
        <div>
          <span className="eyebrow">Create workspace</span>
          <h1>Add an API to scan</h1>
          <p className="muted">Define the API surface Sentinel should inspect.</p>
        </div>
      </div>
      <form className="project-form panel" onSubmit={submit}>
        <div className="form-section">
          <span className="section-number">01</span>
          <div>
            <h2>Project details</h2>
            <p className="muted">Give your API a clear name and its root URL.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Project name
            <input
              placeholder="Commerce API"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </label>
          <label>
            Base URL
            <input
              type="url"
              placeholder="https://api.example.com"
              value={form.apiBaseUrl}
              onChange={(event) => update("apiBaseUrl", event.target.value)}
              required
            />
          </label>
        </div>
        <label>
          Description <span className="optional">Optional</span>
          <textarea
            rows="3"
            placeholder="What does this API own?"
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
          />
        </label>
        <div className="form-section second">
          <span className="section-number">02</span>
          <div>
            <h2>API definition</h2>
            <p className="muted">Paste an OpenAPI JSON document to map endpoints automatically.</p>
          </div>
        </div>
        <label className="upload-box">
          <UploadCloud size={22} />
          <span>
            <strong>Paste OpenAPI JSON</strong>
            <small>Swagger 2.0 and OpenAPI 3 supported</small>
          </span>
          <textarea
            rows="6"
            placeholder='{"openapi":"3.0.0","paths":{}}'
            value={form.openApiSpec}
            onChange={(event) => update("openApiSpec", event.target.value)}
          />
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "Creating..." : createdProjectId ? "Retry scan" : "Create and scan"}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </section>
  );
}
