import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { InfantBirthHeader } from "../components/InfantBirthHeader";
import { PercentileMark } from "../components/PercentileMark";
import { useAuth } from "../context/AuthContext";
import {
  consultationTypeLabel,
  hasInfantBirthData,
  illnessLabel,
  infantBirthFromPatient,
  normalizeInfantBirthData,
  vitalFieldsFor,
} from "../lib/consultations";
import {
  bodyMassIndex,
  canEditConsultation,
  consultationEditDeadline,
  formatDateTime,
  fullName,
} from "../lib/format";
import { supabase } from "../lib/supabase";
import { percentileContext, vitalAssessment, type VitalAssessment } from "../lib/percentiles";
import type { Consultation, Patient, VitalSigns } from "../lib/types";

type ConsultationView = Consultation & { patient?: Patient | null };

export function ConsultationDetail() {
  const { consultationId } = useParams();
  const { user } = useAuth();
  const [consultation, setConsultation] = useState<ConsultationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!consultationId) return;
    supabase
      .from("consultations")
      .select("*, doctor:profiles(full_name, specialty), patient:patients(*)")
      .eq("id", consultationId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (loadError) setError(loadError.message);
        else setConsultation((data as ConsultationView | null) ?? null);
        setLoading(false);
      });
  }, [consultationId]);

  if (loading) return <p className="text-muted">Cargando consulta...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!consultation) return <p>No encontramos esta consulta.</p>;

  const vitals = (consultation.vital_signs ?? {}) as VitalSigns;
  const patient = consultation.patient;
  const type = consultation.consultation_type;
  const editable =
    user?.id === consultation.doctor_id && canEditConsultation(consultation.created_at);
  const vitalFields = vitalFieldsFor(type);
  const percentiles = percentileContext(patient, consultation.consultation_date, vitals);

  return (
    <article className="mx-auto max-w-3xl">
      <BackLink to={patient ? `/pacientes/${patient.id}` : "/"}>← Volver a la historia</BackLink>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal">
        {consultationTypeLabel(type)}
      </p>
      <h1 className="font-display mt-2 text-4xl">
        {patient ? fullName(patient.first_name, patient.last_name) : "Paciente"}
      </h1>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {formatDateTime(consultation.consultation_date)}
          {consultation.doctor?.full_name ? ` · ${consultation.doctor.full_name}` : ""}
        </p>
        {editable ? (
          <Link to={`/consultas/${consultation.id}/editar`} className="btn-primary">
            Editar
          </Link>
        ) : (
          <p className="text-xs text-muted">
            {user?.id === consultation.doctor_id
              ? `Cerrada desde ${formatDateTime(consultationEditDeadline(consultation.created_at).toISOString())}`
              : "Solo quien registró la consulta puede editarla"}
          </p>
        )}
      </div>
      {editable && (
        <p className="mt-2 text-xs text-muted">
          Se puede editar hasta el{" "}
          {formatDateTime(consultationEditDeadline(consultation.created_at).toISOString())}.
        </p>
      )}

      {type === "lactante" && (
        <div className="mt-6">
          <InfantBirthHeader
            data={
              hasInfantBirthData(consultation.infant_birth_data)
                ? normalizeInfantBirthData(consultation.infant_birth_data)
                : infantBirthFromPatient(patient)
            }
          />
        </div>
      )}

      <div className="mt-6 grid gap-4">
        <Block title="Motivo" body={consultation.reason} />
        <Block title={illnessLabel(type)} body={consultation.current_illness} />
        <div className="card p-5">
          <h2 className="field-label">Signos vitales</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {vitalFields.map((field) => {
              const value = field.computed
                ? vitals.imc || bodyMassIndex(vitals.weight, vitals.height)
                : vitals[field.key];
              return (
                <Vital
                  key={field.key}
                  label={field.label}
                  value={value}
                  suffix={field.suffix}
                  percentile={vitalAssessment(field.key, value, percentiles)}
                />
              );
            })}
          </div>
        </div>
        <Block title="Examen físico" body={consultation.physical_exam} />
        <Block title="Diagnóstico" body={consultation.diagnosis} />
        <Block title="Tratamiento" body={consultation.treatment} />
        <Block title="Observaciones" body={consultation.notes} />
      </div>
    </article>
  );
}

function Block({ title, body }: { title: string; body: string | null }) {
  return (
    <section className="card p-5">
      <h2 className="field-label">{title}</h2>
      <p className="whitespace-pre-wrap text-sm leading-7">{body || "—"}</p>
    </section>
  );
}

function Vital({
  label,
  value,
  suffix,
  percentile,
}: {
  label: string;
  value?: string;
  suffix?: string;
  percentile?: VitalAssessment | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="flex items-baseline gap-2 text-sm font-semibold">
        <span>{value ? `${value}${suffix ? ` ${suffix}` : ""}` : "—"}</span>
        <PercentileMark value={percentile} />
      </p>
    </div>
  );
}
