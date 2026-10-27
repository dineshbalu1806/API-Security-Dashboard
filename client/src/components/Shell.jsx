import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, FilePlus2, History, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><ShieldCheck size={18} /></span><span>sentinel<span className="brand-dot">.</span></span></div>
      <div className="eyebrow">Workspace</div>
      <nav>
        <NavLink to="/dashboard"><LayoutDashboard size={17} /> Overview</NavLink>
        <NavLink to="/scans"><History size={17} /> Scan history</NavLink>
        <NavLink to="/projects/new"><FilePlus2 size={17} /> New project</NavLink>
      </nav>
      <div className="sidebar-foot"><div className="profile"><div className="avatar">{user?.name?.[0] || "A"}</div><div><strong>{user?.name || "Analyst"}</strong><small>{user?.role || "Security team"}</small></div></div><button className="icon-button" title="Sign out" onClick={() => { signOut(); navigate("/login"); }}><LogOut size={17} /></button></div>
    </aside>
    <main className="main-content"><header className="topbar"><div><span className="status-dot" /> Systems operational</div><div className="topbar-date"><Activity size={15} /> API posture monitoring</div></header><Outlet /></main>
  </div>;
}