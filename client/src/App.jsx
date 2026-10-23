import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewProject from "./pages/NewProject";
import ScanProgress from "./pages/ScanProgress";
import Findings from "./pages/Findings";
import Report from "./pages/Report";
import Shell from "./components/Shell";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Restoring workspace...</div>;
  return user ? <Shell /> : <Navigate to="/login" replace />;
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/projects/new" element={<NewProject />} />
      <Route path="/scan/:scanId" element={<ScanProgress />} />
      <Route path="/findings/:scanId" element={<Findings />} />
      <Route path="/reports/:scanId" element={<Report />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}