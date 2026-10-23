import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  const isSignUp = mode === "signup";
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (isSignUp && form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (isSignUp) {
        await signUp({ name: form.name, email: form.email, password: form.password });
      } else {
        await signIn({ email: form.email, password: form.password });
      }
      navigate("/dashboard");
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${isSignUp ? "create your account" : "sign in"}. Please try again.`);
    } finally {
      setBusy(false);
    }
  };

  const changeMode = () => {
    setMode(isSignUp ? "login" : "signup");
    setError("");
  };

  return <div className="auth-screen">
    <div className="auth-visual">
      <div className="brand light"><span className="brand-mark"><ShieldCheck size={18} /></span><span>sentinel<span className="brand-dot">.</span></span></div>
      <div className="auth-quote">
        <span className="eyebrow light-text">API security intelligence</span>
        <h1>Know what your API exposes.</h1>
        <p>Continuous, human-readable security testing for the systems your team ships.</p>
      </div>
      <div className="visual-footer">OWASP API Top 10 <span>•</span> Continuous assurance</div>
    </div>
    <main className="auth-panel">
      <div className="auth-form">
        <span className="eyebrow">{isSignUp ? "Get started" : "Welcome back"}</span>
        <h2>{isSignUp ? "Create your account" : "Sign in to your workspace"}</h2>
        <p className="muted">{isSignUp ? "Set up your Sentinel workspace to start securing your APIs." : "Use your Sentinel credentials to continue."}</p>
        <form onSubmit={submit}>
          {isSignUp && <label>Full name<input type="text" autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} required maxLength={100} /></label>}
          <label>Email address<input type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={form.password} onChange={(event) => update("password", event.target.value)} required minLength={isSignUp ? 6 : undefined} /></label>
          {isSignUp && <label>Confirm password<input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required minLength={6} /></label>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button full" disabled={busy}>{busy ? (isSignUp ? "Creating account..." : "Signing in...") : (isSignUp ? "Create account" : "Sign in")}<ArrowRight size={17} /></button>
        </form>
        <button type="button" className="auth-switch" onClick={changeMode}>{isSignUp ? "Already have an account? Sign in" : "New to Sentinel? Create an account"}</button>
        {!isSignUp && <small className="form-note">Demo credentials: demo@example.com / password123</small>}
      </div>
    </main>
  </div>;
}