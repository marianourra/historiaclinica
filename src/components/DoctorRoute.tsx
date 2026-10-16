import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function DoctorRoute({ children }: { children: ReactNode }) {
  const { profile, loading, profileLoading } = useAuth();

  // Only block when we still don't know the role.
  if (loading || (!profile && profileLoading)) {
    return null;
  }

  if (profile?.role === "paciente") return <Navigate to="/portal" replace />;
  return children;
}
