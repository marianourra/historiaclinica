import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { GrowthChart } from "../components/GrowthChart";
import { bodyMassIndex, formatDate, fullName, sexLabel } from "../lib/format";
import {
  GROWTH_CHARTS,
  ageInDays,
  formatPercentile,
  growthCurves,
  growthSex,
  indicatorAgeSpan,
  parseVitalNumber,
  percentileContext,
  vitalAssessment,
  type GrowthIndicator,
  type GrowthObservation,
} from "../lib/percentiles";
import { supabase } from "../lib/supabase";
import type { Consultation, Patient, VitalSigns } from "../lib/types";

export function GrowthCharts() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [indicator, setIndicator] = useState<GrowthIndicator>("weight");
  const [fitToPoints, setFitToPoints] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
      supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)
        .order("consultation_date", { ascending: true }),
    ]).then(([{ data: patientData, error: patientError }, { data: consultData, error: consultError }]) => {
      if (!active) return;
      if (patientError || consultError) {
        setError(patientError?.message || consultError?.message || "Error al cargar");
      } else {
        setPatient((patientData as Patient | null) ?? null);
        setConsultations((consultData as Consultation[]) ?? []);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [patientId]);

  const chart = GROWTH_CHARTS.find((item) => item.id === indicator) ?? GROWTH_CHARTS[0];
  const sex = growthSex(patient?.sex);
  const observations = useMemo(
    () => (patient ? observationsFor(chart.id, chart.vital, patient, consultations) : []),
    [chart, patient, consultations],
  );

  if (loading) return <p className="text-muted">Cargando gráficos...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!patient) return <p>No encontramos este paciente.</p>;

  const span = sex ? indicatorAgeSpan(indicator, sex) : { min: 0, max: 0 };
  const patientAge = ageInDays(patient.birth_date) ?? 0;
  const pointAges = observations.map((item) => item.ageDays);
  const latest = Math.max(patientAge, ...pointAges, 30);
  const xMin = fitToPoints && pointAges.length
    ? Math.max(span.min, Math.min(...pointAges) - 60)
    : span.min;
  const xMax = Math.min(
    span.max,
    fitToPoints && pointAges.length ? Math.max(...pointAges) + 90 : Math.max(latest + 180, latest * 1.05),
  );
  const curves = sex ? growthCurves(indicator, sex, xMin, xMax) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink to={`/pacientes/${patient.id}`}>← Volver a la historia</BackLink>
      <h1 className="font-display mt-3 text-4xl">Gráficos de crecimiento</h1>
      <p className="mt-2 text-sm text-muted">
        {fullName(patient.first_name, patient.last_name)} · {sexLabel(patient.sex)} · nacido/a{" "}
        {formatDate(patient.birth_date)}
      </p>
      <p className="mt-1 text-sm text-muted">
        Curvas OMS. Cada punto es una consulta; pasá el cursor para ver fecha, valor y percentilo.
      </p>

      {!sex && (
        <p className="mt-5 text-sm text-danger">
          Para graficar hace falta el sexo del paciente en datos personales.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {GROWTH_CHARTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={indicator === item.id ? "btn-primary" : "btn-ghost"}
            onClick={() => setIndicator(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className={fitToPoints ? "btn-primary" : "btn-ghost"}
          onClick={() => setFitToPoints((current) => !current)}
          disabled={observations.length === 0}
        >
          {fitToPoints ? "Ver toda la edad" : "Ajustar a controles"}
        </button>
      </div>

      <section className="card mt-5 p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl">
              {chart.label} para la edad
            </h2>
            <p className="text-sm text-muted">{chart.unit} según percentilos 3, 10, 25, 50, 75, 90 y 97</p>
          </div>
          <p className="text-sm text-muted">
            {observations.length} {observations.length === 1 ? "control" : "controles"}
          </p>
        </div>
        {sex && curves.length > 0 ? (
          <GrowthChart
            unit={chart.unit}
            curves={curves}
            observations={observations}
            xMin={xMin}
            xMax={Math.max(xMax, xMin + 30)}
          />
        ) : (
          <p className="text-sm text-muted">No hay curva de referencia para este indicador.</p>
        )}
        {sex && observations.length === 0 && (
          <p className="mt-3 text-sm text-muted">Todavía no hay mediciones de {chart.label.toLowerCase()} en las consultas.</p>
        )}
      </section>

      {observations.length > 0 && (
        <section className="card mt-4 p-5">
          <h3 className="field-label">Controles graficados</h3>
          <div className="mt-2 grid gap-2">
            {observations.map((item) => (
              <Link
                key={item.consultationId}
                to={`/consultas/${item.consultationId}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm hover:text-teal-dark"
              >
                <span>{formatDate(item.date)}</span>
                <span className="font-semibold">
                  {item.value} {chart.unit}
                  {item.assessment ? ` · ${formatPercentile(item.assessment)}` : ""}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function observationsFor(
  indicator: GrowthIndicator,
  vital: keyof VitalSigns,
  patient: Patient,
  consultations: Consultation[],
): GrowthObservation[] {
  return consultations
    .map((consultation) => {
      const vitals = (consultation.vital_signs ?? {}) as VitalSigns;
      const raw =
        vital === "imc"
          ? vitals.imc || bodyMassIndex(vitals.weight, vitals.height)
          : vitals[vital];
      const value = parseVitalNumber(raw);
      const days = ageInDays(patient.birth_date, consultation.consultation_date);
      if (value == null || days == null || days < 0) return null;
      const span = growthSex(patient.sex) ? indicatorAgeSpan(indicator, growthSex(patient.sex)!) : null;
      if (span && (days < span.min || days > span.max)) return null;
      return {
        consultationId: consultation.id,
        ageDays: days,
        value,
        date: consultation.consultation_date,
        assessment: vitalAssessment(vital, String(value), percentileContext(patient, consultation.consultation_date, vitals)),
      };
    })
    .filter((item): item is GrowthObservation => item != null)
    .sort((a, b) => a.ageDays - b.ageDays || a.date.localeCompare(b.date));
}
