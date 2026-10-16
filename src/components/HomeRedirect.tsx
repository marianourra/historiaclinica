import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Patients } from "../pages/Patients";

export function HomeRedirect() {
  const { profile, loading, profileLoading } = useAuth();

  if (loading || (!profile && profileLoading)) {
    return null;
  }

  if (profile?.role === "paciente") {
    return <Navigate to="/portal" replace />;
  }

  return <Patients />;
}
