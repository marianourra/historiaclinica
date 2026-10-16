import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { EditableField } from "../components/EditableField";
import { useAuth } from "../context/AuthContext";
import { consultationTypeLabel } from "../lib/consultations";
import { supabase } from "../lib/supabase";
import type { Consultation, Patient } from "../lib/types";
import {
  canEditConsultation,
  formatAge,
  formatDate,
  formatDateTime,
  fullName,
  sexLabel,
} from "../lib/format";
import { patientPhotoUrl } from "../lib/patientPhoto";
import { printClinicalHistory } from "../lib/printHistory";

export function PatientDetail() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printSelecting, setPrintSelecting] = useState(false);
  const [selectedConsultationIds, setSelectedConsultationIds] = useState<string[]>([]);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let active = true;

    async function load() {
      const [{ data: patientData, error: patientError }, { data: consultData, error: consultError }] =
        await Promise.all([
          supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
          supabase
            .from("consultations")
            .select("*, doctor:profiles(full_name, specialty)")
            .eq("patient_id", patientId)
            .order("consultation_date", { ascending: false }),
        ]);

      if (!active) return;
      if (patientError || consultError) {
        setError(patientError?.message || consultError?.message || "Error al cargar");
      } else {
        setPatient((patientData as Patient | null) ?? null);
        setConsultations((consultData as Consultation[]) ?? []);
      }
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [patientId]);

  async function saveClinical(
    field: "medical_history" | "current_medications" | "allergies",
    value: string,
  ) {
    if (!patient) return;
    const next = value.trim() || null;
    if ((patient[field] ?? null) === next) return;
    const { error: saveError } = await supabase
      .from("patients")
      .update({ [field]: next })
      .eq("id", patient.id);
    if (saveError) throw new Error(saveError.message);
    setPatient((current) => (current ? { ...current, [field]: next } : current));
  }

  function startPrintSelection() {
    setPrintError(null);
    setSelectedConsultationIds(consultations.map((consultation) => consultation.id));
    setPrintSelecting(true);
  }

  function cancelPrintSelection() {
    setPrintSelecting(false);
    setSelectedConsultationIds([]);
    setPrintError(null);
  }

  function toggleConsultation(id: string) {
    setSelectedConsultationIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function confirmPrint() {
    if (!patient) return;
    const selected = consultations.filter((consultation) =>
      selectedConsultationIds.includes(consultation.id),
    );
    if (selected.length === 0) {
      setPrintError("Marcá al menos una consulta para generar el PDF.");
      return;
    }
    try {
      setPrintError(null);
      printClinicalHistory(patient, selected);
      setPrintSelecting(false);
      setSelectedConsultationIds([]);
    } catch (err) {
      setPrintError(
        err instanceof Error ? err.message : "No se pudo abrir la impresión.",
      );
    }
  }

  if (loading) return <p className="text-muted">Cargando historia...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!patient) return <p>No encontramos este paciente.</p>;

  const age = formatAge(patient.birth_date);
  const photoUrl = patientPhotoUrl(patient.photo_path);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section>
        <BackLink to="/">← Pacientes</BackLink>
        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-4">
            {photoUrl ? (
              <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                <img
                  src={photoUrl}
                  alt={`Foto de ${patient.first_name}`}
                  className="h-full w-full rounded-2xl object-cover"
                />
                <button
                  type="button"
                  className="absolute inset-0 flex items-end justify-center rounded-2xl bg-gradient-to-t from-black/55 via-black/10 to-transparent pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white transition hover:from-black/70"
                  onClick={() => setPhotoOpen(true)}
                  aria-label="Ampliar foto del paciente"
                >
                  Ampliar
                </button>
              </div>
            ) : null}
            <div className="min-w-0">
              <h1 className="font-display text-4xl">
                {fullName(patient.first_name, patient.last_name)}
              </h1>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm text-muted">
                <span>
                  {patient.document_type} {patient.document_number}
                </span>
                <span aria-hidden="true">·</span>
                <span>{sexLabel(patient.sex)}</span>
                <span aria-hidden="true">·</span>
                <span>{age ?? "Edad no informada"}</span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(patient.birth_date)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/pacientes/${patient.id}/datos`} className="btn-ghost btn-equal">
              Datos personales
            </Link>
            <Link to={`/pacientes/${patient.id}/crecimiento`} className="btn-ghost btn-equal">
              Gráficos de crecimiento
            </Link>
            <Link to={`/pacientes/${patient.id}/consultas/nueva`} className="btn-primary btn-equal">
              Nueva consulta
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <EditableField
            label="Antecedentes"
            value={patient.medical_history}
            kind="textarea"
            onSave={(value) => saveClinical("medical_history", value)}
          />
          <EditableField
            label="Medicación habitual"
            value={patient.current_medications}
            kind="textarea"
            onSave={(value) => saveClinical("current_medications", value)}
          />
          <EditableField
            label="Alergias"
            value={patient.allergies}
            kind="textarea"
            accent
            onSave={(value) => saveClinical("allergies", value)}
          />
        </div>
      </section>

      <aside className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Evolución</h2>
          {printSelecting ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={cancelPrintSelection}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={selectedConsultationIds.length === 0}
                onClick={confirmPrint}
              >
                Generar PDF
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={consultations.length === 0}
              onClick={startPrintSelection}
            >
              Imprimir HC
            </button>
          )}
        </div>
        <p className="mt-1 mb-5 text-sm text-muted">
          {printSelecting
            ? `${selectedConsultationIds.length} de ${consultations.length} consultas seleccionadas`
            : `${consultations.length} consultas registradas`}
        </p>
        {printError && <p className="mb-4 text-sm text-danger">{printError}</p>}
        <div className="grid gap-3">
          {consultations.length === 0 && (
            <p className="text-sm text-muted">Todavía no hay consultas en esta historia.</p>
          )}
          {consultations.map((consultation) => {
            const editable =
              user?.id === consultation.doctor_id &&
              canEditConsultation(consultation.created_at);
            const selected = selectedConsultationIds.includes(consultation.id);
            const content = (
              <>
                <p className="line-clamp-2 text-sm font-semibold">
                  {consultation.diagnosis || "Consulta sin diagnóstico"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {consultationTypeLabel(consultation.consultation_type)} ·{" "}
                  {formatDateTime(consultation.consultation_date)}
                </p>
                {consultation.doctor?.full_name && (
                  <p className="mt-2 text-xs text-teal">{consultation.doctor.full_name}</p>
                )}
              </>
            );
            return (
              <div
                key={consultation.id}
                className={`rounded-2xl border bg-white p-4 ${
                  printSelecting && selected ? "border-teal" : "border-line"
                }`}
              >
                {printSelecting ? (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-teal"
                      checked={selected}
                      onChange={() => toggleConsultation(consultation.id)}
                    />
                    <span className="min-w-0 flex-1">{content}</span>
                  </label>
                ) : (
                  <>
                    <Link to={`/consultas/${consultation.id}`} className="block hover:text-teal-dark">
                      {content}
                    </Link>
                    {editable && (
                      <Link
                        to={`/consultas/${consultation.id}/editar`}
                        className="mt-3 inline-block text-xs font-semibold text-teal"
                      >
                        Editar
                      </Link>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {photoOpen && photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada del paciente"
          onClick={() => setPhotoOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={photoUrl}
              alt={`Foto ampliada de ${patient.first_name}`}
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              className="btn-primary absolute top-3 right-3"
              onClick={() => setPhotoOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
