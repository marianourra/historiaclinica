import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center text-muted">
        Cargando...
      </div>
    );
  }

  if (!profile?.is_admin) return <Navigate to="/" replace />;
  return children;
}
