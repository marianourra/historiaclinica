import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { DoctorRoute } from "./components/DoctorRoute";
import { HomeRedirect } from "./components/HomeRedirect";
import { Layout } from "./components/Layout";
import { PatientRoute } from "./components/PatientRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Agenda } from "./pages/Agenda";
import { ConsultationDetail } from "./pages/ConsultationDetail";
import { ConsultationForm } from "./pages/ConsultationForm";
import { DoctorSchedules } from "./pages/DoctorSchedules";
import { GrowthCharts } from "./pages/GrowthCharts";
import { Login } from "./pages/Login";
import { Parametrization } from "./pages/Parametrization";
import { PatientDetail } from "./pages/PatientDetail";
import { PatientForm } from "./pages/PatientForm";
import { PatientPersonal } from "./pages/PatientPersonal";
import { PatientPortal } from "./pages/PatientPortal";
import { PatientPortalAppointments } from "./pages/PatientPortalAppointments";
import { PatientPortalBook } from "./pages/PatientPortalBook";
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
        <Route index element={<HomeRedirect />} />
        <Route
          path="pacientes/nuevo"
          element={
            <DoctorRoute>
              <PatientForm />
            </DoctorRoute>
          }
        />
        <Route
          path="pacientes/:patientId"
          element={
            <DoctorRoute>
              <PatientDetail />
            </DoctorRoute>
          }
        />
        <Route
          path="pacientes/:patientId/datos"
          element={
            <DoctorRoute>
              <PatientPersonal />
            </DoctorRoute>
          }
        />
        <Route
          path="pacientes/:patientId/crecimiento"
          element={
            <DoctorRoute>
              <GrowthCharts />
            </DoctorRoute>
          }
        />
        <Route
          path="pacientes/:patientId/consultas/nueva"
          element={
            <DoctorRoute>
              <ConsultationForm />
            </DoctorRoute>
          }
        />
        <Route
          path="consultas/:consultationId"
          element={
            <DoctorRoute>
              <ConsultationDetail />
            </DoctorRoute>
          }
        />
        <Route
          path="consultas/:consultationId/editar"
          element={
            <DoctorRoute>
              <ConsultationForm />
            </DoctorRoute>
          }
        />
        <Route
          path="agenda"
          element={
            <DoctorRoute>
              <Agenda />
            </DoctorRoute>
          }
        />
        <Route
          path="agenda/horarios"
          element={
            <DoctorRoute>
              <DoctorSchedules />
            </DoctorRoute>
          }
        />
        <Route
          path="portal"
          element={
            <PatientRoute>
              <PatientPortal />
            </PatientRoute>
          }
        />
        <Route
          path="portal/turnos"
          element={
            <PatientRoute>
              <PatientPortalAppointments />
            </PatientRoute>
          }
        />
        <Route
          path="portal/turnos/nuevo"
          element={
            <PatientRoute>
              <PatientPortalBook />
            </PatientRoute>
          }
        />
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
