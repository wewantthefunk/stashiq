import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function AdminRoute() {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
