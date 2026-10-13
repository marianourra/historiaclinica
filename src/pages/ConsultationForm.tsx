import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { InfantBirthHeader } from "../components/InfantBirthHeader";
import { useAuth } from "../context/AuthContext";
import {
  CONSULTATION_TYPES,
  consultationTypeLabel,
  emptyInfantBirthData,
  hasInfantBirthData,
  illnessLabel,
  infantBirthFromPatient,
  infantBirthPayload,
  isConsultationType,
  normalizeInfantBirthData,
  vitalFieldsFor,
  type ConsultationType,
} from "../lib/consultations";
import { PercentileMark } from "../components/PercentileMark";
import { bodyMassIndex, canEditConsultation, fullName } from "../lib/format";
import { percentileContext, vitalAssessment, type VitalAssessment } from "../lib/percentiles";
import { supabase } from "../lib/supabase";
import type { Consultation, InfantBirthData, Patient, VitalSigns } from "../lib/types";

const emptyVitals: VitalSigns = {
  systolic: "",
  diastolic: "",
  heartRate: "",
  respiratoryRate: "",
  temperature: "",
  weight: "",
  height: "",
  oxygenSat: "",
  imc: "",
  headCircumference: "",
};

function localDateTimeValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return localDateTimeValue();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function ConsultationForm() {
  const { patientId, consultationId } = useParams();
  const [searchParams] = useSearchParams();
  const editing = Boolean(consultationId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const requestedType = searchParams.get("tipo");
  const [consultationType, setConsultationType] = useState<ConsultationType | null>(
    isConsultationType(requestedType) ? requestedType : null,
  );
  const [patient, setPatient] = useState<Patient | null>(null);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(!editing);
  const [consultationDate, setConsultationDate] = useState(localDateTimeValue);
  const [reason, setReason] = useState("");
  const [currentIllness, setCurrentIllness] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [notes, setNotes] = useState("");
  const [vitals, setVitals] = useState(emptyVitals);
  const [infantBirth, setInfantBirth] = useState<InfantBirthData>(emptyInfantBirthData());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (consultationId && !user) return;
      if (consultationId) {
        const { data, error: loadError } = await supabase
          .from("consultations")
          .select("*, patient:patients(*)")
          .eq("id", consultationId)
          .maybeSingle();
        if (!active) return;
        if (loadError || !data) {
          setError(loadError?.message || "No encontramos esta consulta.");
          setReady(true);
          return;
        }
        const consultation = data as Consultation & { patient?: Patient | null };
        if (
          !canEditConsultation(consultation.created_at) ||
          consultation.doctor_id !== user?.id
        ) {
          setLocked(true);
          setPatient(consultation.patient ?? null);
          setReady(true);
          return;
        }
        const loadedPatient = consultation.patient ?? null;
        const signs = { ...emptyVitals, ...(consultation.vital_signs ?? {}) };
        setPatient(loadedPatient);
        setConsultationType(
          isConsultationType(consultation.consultation_type)
            ? consultation.consultation_type
            : "demanda",
        );
        setConsultationDate(toLocalInput(consultation.consultation_date));
        setReason(consultation.reason ?? "");
        setCurrentIllness(consultation.current_illness ?? "");
        setPhysicalExam(consultation.physical_exam ?? "");
        setDiagnosis(consultation.diagnosis ?? "");
        setTreatment(consultation.treatment ?? "");
        setNotes(consultation.notes ?? "");
        setVitals(signs);
        setInfantBirth(
          hasInfantBirthData(consultation.infant_birth_data)
            ? normalizeInfantBirthData(consultation.infant_birth_data)
            : infantBirthFromPatient(loadedPatient),
        );
        setReady(true);
        return;
      }

      if (!patientId) return;
      const [{ data: patientData }, { data: lastInfant }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
        supabase
          .from("consultations")
          .select("infant_birth_data")
          .eq("patient_id", patientId)
          .eq("consultation_type", "lactante")
          .order("consultation_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      const loaded = (patientData as Patient | null) ?? null;
      setPatient(loaded);
      const lastSnapshot = (lastInfant as { infant_birth_data?: InfantBirthData } | null)
        ?.infant_birth_data;
      setInfantBirth(
        hasInfantBirthData(infantBirthFromPatient(loaded))
          ? infantBirthFromPatient(loaded)
          : normalizeInfantBirthData(lastSnapshot),
      );
    }

    void load();
    return () => {
      active = false;
    };
  }, [consultationId, patientId, user?.id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || locked || !consultationType) return;
    const ownerId = patient?.id || patientId;
    if (!editing && !ownerId) return;
    setError(null);
    setPending(true);
    const birthSnapshot = infantBirthPayload(infantBirth);
    const payload = {
      consultation_type: consultationType,
      consultation_date: new Date(consultationDate).toISOString(),
      reason: reason.trim() || null,
      current_illness: currentIllness.trim() || null,
      physical_exam: physicalExam.trim() || null,
      vital_signs: {
        ...vitals,
        imc: bodyMassIndex(vitals.weight, vitals.height),
      },
      diagnosis: diagnosis.trim() || null,
      treatment: treatment.trim() || null,
      notes: notes.trim() || null,
      infant_birth_data: consultationType === "lactante" ? birthSnapshot : {},
    };
    const query = editing
      ? supabase.from("consultations").update(payload).eq("id", consultationId).select("id").single()
      : supabase
          .from("consultations")
          .insert({
            ...payload,
            patient_id: ownerId,
            doctor_id: user.id,
          })
          .select("id")
          .single();
    const { data, error: saveError } = await query;
    if (saveError || !data) {
      setPending(false);
      const message = saveError?.message ?? "";
      setError(
        /48 horas|row-level security/i.test(message)
          ? "Esta consulta ya no se puede editar. Pasaron más de 48 horas desde su creación."
          : message || "No se pudo guardar la consulta.",
      );
      return;
    }

    if (consultationType === "lactante" && ownerId) {
      const { error: birthError } = await supabase
        .from("patients")
        .update(birthSnapshot)
        .eq("id", ownerId);
      if (birthError) {
        setPending(false);
        setError(birthError.message);
        return;
      }
    }

    setPending(false);
    navigate(`/consultas/${data.id}`);
  }

  if (!ready) return <p className="text-muted">Cargando consulta...</p>;

  if (locked) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink to={consultationId ? `/consultas/${consultationId}` : "/"}>
          ← Volver a la consulta
        </BackLink>
        <p className="mt-6 text-sm leading-6 text-muted">
          Esta consulta ya no se puede editar. Pasaron más de 48 horas desde su creación.
        </p>
      </div>
    );
  }

  if (!editing && !consultationType) {
    return (
      <div className="mx-auto max-w-3xl">
        <BackLink to={patient ? `/pacientes/${patient.id}` : "/"}>← Volver a la historia</BackLink>
        <h1 className="font-display mt-3 text-4xl">Nueva consulta</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          {patient ? fullName(patient.first_name, patient.last_name) : "Cargando paciente..."}
        </p>
        <div className="grid gap-3">
          {CONSULTATION_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className="card type-option p-5 text-left"
              onClick={() => setConsultationType(type.id)}
            >
              <p className="font-semibold">{type.label}</p>
              <p className="mt-1 text-sm text-muted">{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const vitalFields = vitalFieldsFor(consultationType);
  const percentiles = percentileContext(patient, consultationDate, vitals);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <BackLink
        to={
          editing && consultationId
            ? `/consultas/${consultationId}`
            : patient
              ? `/pacientes/${patient.id}`
              : "/"
        }
      >
        ← Volver a la historia
      </BackLink>
      <h1 className="font-display mt-3 text-4xl">{editing ? "Editar consulta" : "Nueva consulta"}</h1>
      <p className="mt-2 text-sm text-muted">
        {patient ? fullName(patient.first_name, patient.last_name) : "Cargando paciente..."}
      </p>
      <p className="mb-6 mt-1 text-sm font-semibold text-teal">
        {consultationTypeLabel(consultationType)}
      </p>

      {consultationType === "lactante" && (
        <InfantBirthHeader data={infantBirth} editable onChange={setInfantBirth} />
      )}

      <div className="card grid gap-4 p-6">
        <label>
          <span className="field-label">Fecha y hora</span>
          <input
            className="field"
            type="datetime-local"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
            required
          />
        </label>
        <label>
          <span className="field-label">Motivo de consulta</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <label>
          <span className="field-label">{illnessLabel(consultationType)}</span>
          <textarea className="field min-h-28" value={currentIllness} onChange={(e) => setCurrentIllness(e.target.value)} />
        </label>
        <div>
          <p className="field-label">Signos vitales</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {vitalFields.map((field) => {
              const value = field.computed
                ? bodyMassIndex(vitals.weight, vitals.height)
                : vitals[field.key];
              return (
                <Vital
                  key={field.key}
                  label={field.suffix ? `${field.label} ${field.suffix}` : field.label}
                  value={value}
                  percentile={vitalAssessment(field.key, value, percentiles)}
                  readOnly={field.computed}
                  onChange={
                    field.computed
                      ? undefined
                      : (next) => setVitals({ ...vitals, [field.key]: next })
                  }
                />
              );
            })}
          </div>
        </div>
        <label>
          <span className="field-label">Examen físico</span>
          <textarea className="field min-h-28" value={physicalExam} onChange={(e) => setPhysicalExam(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Diagnóstico</span>
          <textarea className="field min-h-24" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Indicaciones / tratamiento</span>
          <textarea className="field min-h-24" value={treatment} onChange={(e) => setTreatment(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Observaciones</span>
          <textarea className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      <button className="btn-primary mt-5" disabled={pending}>
        {pending ? "Guardando..." : editing ? "Guardar cambios" : "Guardar consulta"}
      </button>
    </form>
  );
}

function Vital({
  label,
  value,
  percentile,
  onChange,
  readOnly,
}: {
  label: string;
  value?: string;
  percentile?: VitalAssessment | null;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input
          className="field"
          value={value ?? ""}
          readOnly={readOnly}
          placeholder={readOnly ? "Se calcula" : undefined}
          onChange={(e) => onChange?.(e.target.value)}
        />
        <PercentileMark value={percentile} />
      </span>
    </label>
  );
}
