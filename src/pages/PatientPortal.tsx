import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  formatAge,
  formatDate,
  formatDateTime,
  fullName,
  sexLabel,
} from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Consultation, Patient } from "../lib/types";

export function PatientPortal() {
  const { profile } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [lastConsult, setLastConsult] = useState<Consultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!profile?.patient_id) {
        setError(
          "Tu usuario no está vinculado a una ficha de paciente. Pedile al consultorio que lo configure.",
        );
        setLoading(false);
        return;
      }
      const [patientRes, consultRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", profile.patient_id).maybeSingle(),
        supabase
          .from("consultations")
          .select("*, doctor:profiles(full_name, specialty)")
          .eq("patient_id", profile.patient_id)
          .order("consultation_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      if (patientRes.error) {
        setError(patientRes.error.message);
        return;
      }
      if (consultRes.error) {
        setError(consultRes.error.message);
        return;
      }
      setPatient(patientRes.data as Patient | null);
      setLastConsult(consultRes.data as Consultation | null);
    }
    load().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [profile?.patient_id]);

  if (loading) return <p className="text-muted">Cargando tu información...</p>;

  if (error) {
    return (
      <div className="card p-8">
        <h1 className="font-display text-3xl">Portal del paciente</h1>
        <p className="mt-3 text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!patient) {
    return <p className="text-muted">No encontramos tu ficha.</p>;
  }

  const age = formatAge(patient.birth_date);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Mi historia
          </p>
          <h1 className="font-display mt-1 text-4xl">
            {fullName(patient.first_name, patient.last_name)}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {patient.document_type} {patient.document_number}
            {age != null ? ` · ${age}` : ""} · {sexLabel(patient.sex)}
          </p>
        </div>
        <Link to="/portal/turnos/nuevo" className="btn-primary">
          Pedir turno
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-2xl">Antecedentes</h2>
          <p className="mt-1 text-sm text-muted">
            Información básica de tu historia clínica.
          </p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="field-label">Alergias</dt>
              <dd>{patient.allergies || "Sin datos"}</dd>
            </div>
            <div>
              <dt className="field-label">Antecedentes médicos</dt>
              <dd className="whitespace-pre-wrap">
                {patient.medical_history || "Sin datos"}
              </dd>
            </div>
            <div>
              <dt className="field-label">Medicación actual</dt>
              <dd className="whitespace-pre-wrap">
                {patient.current_medications || "Sin datos"}
              </dd>
            </div>
            <div>
              <dt className="field-label">Obra social</dt>
              <dd>{patient.insurance || "Sin datos"}</dd>
            </div>
            <div>
              <dt className="field-label">Grupo sanguíneo</dt>
              <dd>{patient.blood_type || "Sin datos"}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-2xl">Última consulta</h2>
          {!lastConsult ? (
            <p className="mt-4 text-sm text-muted">
              Todavía no hay consultas registradas.
            </p>
          ) : (
            <div className="mt-5 space-y-4 text-sm">
              <p>
                <span className="field-label">Fecha</span>
                {formatDateTime(lastConsult.consultation_date)}
              </p>
              <p>
                <span className="field-label">Médico</span>
                {lastConsult.doctor?.full_name || "—"}
                {lastConsult.doctor?.specialty
                  ? ` · ${lastConsult.doctor.specialty}`
                  : ""}
              </p>
              <p>
                <span className="field-label">Motivo</span>
                {lastConsult.reason || "—"}
              </p>
              <p>
                <span className="field-label">Diagnóstico</span>
                {lastConsult.diagnosis || "—"}
              </p>
              <p>
                <span className="field-label">Indicaciones</span>
                <span className="block whitespace-pre-wrap">
                  {lastConsult.treatment || "—"}
                </span>
              </p>
              <p className="text-xs text-muted">
                Registrada el {formatDate(lastConsult.created_at)}
              </p>
            </div>
          )}
          <Link to="/portal/turnos" className="btn-ghost mt-6 inline-flex">
            Ver mis turnos
          </Link>
        </section>
      </div>
    </div>
  );
}
