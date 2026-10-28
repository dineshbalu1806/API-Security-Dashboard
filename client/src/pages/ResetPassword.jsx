import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import api from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setComplete(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset your password. Request a new reset link.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-screen">
    <div className="auth-visual">
      <div className="brand light"><span className="brand-mark"><ShieldCheck size={18} /></span><span>sentinel<span className="brand-dot">.</span></span></div>
      <div className="auth-quote">
        <span className="eyebrow light-text">Account recovery</span>
        <h1>Choose a new password.</h1>
        <p>Your password reset link can only be used once and expires after one hour.</p>
      </div>
      <div className="visual-footer">OWASP API Top 10 <span>•</span> Continuous assurance</div>
    </div>
    <main className="auth-panel">
      <div className="auth-form">
        <span className="eyebrow">Password recovery</span>
        <h2>Reset your password</h2>
        {complete ? (
          <>
            <p className="form-success" role="status">Your password has been updated. Sign in with your new password.</p>
            <Link className="primary-button full auth-link-button" to="/login">Go to sign in<ArrowRight size={17} /></Link>
          </>
        ) : !token ? (
          <>
            <div className="form-error" role="alert">This reset link is invalid or incomplete. Request a new one.</div>
            <Link className="auth-switch" to="/forgot-password">Request a reset link</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <label>New password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full" disabled={busy}>{busy ? "Updating..." : "Update password"}<ArrowRight size={17} /></button>
            <Link className="auth-switch" to="/login">Back to sign in</Link>
          </form>
        )}
      </div>
    </main>
  </div>;
}
