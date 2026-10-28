import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request a password reset. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-screen">
    <div className="auth-visual">
      <div className="brand light"><span className="brand-mark"><ShieldCheck size={18} /></span><span>sentinel<span className="brand-dot">.</span></span></div>
      <div className="auth-quote">
        <span className="eyebrow light-text">Account recovery</span>
        <h1>Get back to securing your APIs.</h1>
        <p>We’ll help you regain access to your Sentinel workspace.</p>
      </div>
      <div className="visual-footer">OWASP API Top 10 <span>•</span> Continuous assurance</div>
    </div>
    <main className="auth-panel">
      <div className="auth-form">
        <span className="eyebrow">Password recovery</span>
        <h2>Forgot your password?</h2>
        <p className="muted">Enter the email address associated with your Sentinel account.</p>
        {sent ? (
          <div className="form-success" role="status">
            If an account exists for that email, a password reset link will be sent. Check your inbox.
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full" disabled={busy}>{busy ? "Sending..." : "Send reset link"}<ArrowRight size={17} /></button>
          </form>
        )}
        <Link className="auth-switch" to="/login">Back to sign in</Link>
      </div>
    </main>
  </div>;
}
