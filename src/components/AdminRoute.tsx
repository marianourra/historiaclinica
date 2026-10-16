import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading, profileLoading } = useAuth();

  if (loading || (!profile && profileLoading)) {
    return null;
  }

  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return children;
}
