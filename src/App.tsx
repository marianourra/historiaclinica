import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ConsultationDetail } from "./pages/ConsultationDetail";
import { ConsultationForm } from "./pages/ConsultationForm";
import { Login } from "./pages/Login";
import { GrowthCharts } from "./pages/GrowthCharts";
import { Parametrization } from "./pages/Parametrization";
import { PatientDetail } from "./pages/PatientDetail";
import { PatientPersonal } from "./pages/PatientPersonal";
import { PatientForm } from "./pages/PatientForm";
import { Patients } from "./pages/Patients";
import { Register } from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Patients />} />
        <Route path="pacientes/nuevo" element={<PatientForm />} />
        <Route path="pacientes/:patientId" element={<PatientDetail />} />
        <Route path="pacientes/:patientId/datos" element={<PatientPersonal />} />
        <Route path="pacientes/:patientId/crecimiento" element={<GrowthCharts />} />
        <Route
          path="pacientes/:patientId/consultas/nueva"
          element={<ConsultationForm />}
        />
        <Route path="consultas/:consultationId" element={<ConsultationDetail />} />
        <Route path="consultas/:consultationId/editar" element={<ConsultationForm />} />
        <Route
          path="admin/parametrizacion"
          element={
            <AdminRoute>
              <Parametrization />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
