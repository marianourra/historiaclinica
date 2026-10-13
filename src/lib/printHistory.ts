import {
  consultationTypeLabel,
  hasInfantBirthData,
  illnessLabel,
  infantBirthFromPatient,
  normalizeInfantBirthData,
  vitalFieldsFor,
} from "./consultations";
import {
  ageFromBirthDate,
  bodyMassIndex,
  formatDate,
  formatDateTime,
  fullName,
  sexLabel,
} from "./format";
import { formatPercentile, percentileContext, vitalAssessment } from "./percentiles";
import type { Consultation, InfantBirthData, Patient, VitalSigns } from "./types";

function escapeHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function text(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? escapeHtml(trimmed).replace(/\n/g, "<br />") : "—";
}

function birthHeader(data: InfantBirthData) {
  if (!hasInfantBirthData(data)) return "";
  return `
    <div class="box">
      <h3>Datos de nacimiento</h3>
      <div class="grid">
        <div><span>Edad gestacional al nacer</span><p>${text(data.gestational_age)}</p></div>
        <div><span>Peso al nacer</span><p>${text(data.birth_weight)}</p></div>
        <div><span>Serologías del embarazo</span><p>${text(data.pregnancy_serologies)}</p></div>
        <div><span>APGAR</span><p>${text(data.apgar)}</p></div>
      </div>
    </div>
  `;
}

function vitalsBlock(consultation: Consultation, patient: Patient) {
  const vitals = (consultation.vital_signs ?? {}) as VitalSigns;
  const fields = vitalFieldsFor(consultation.consultation_type);
  const percentiles = percentileContext(patient, consultation.consultation_date, vitals);
  const cells = fields
    .map((field) => {
      const raw =
        field.computed
          ? vitals.imc || bodyMassIndex(vitals.weight, vitals.height)
          : vitals[field.key];
      const percentile = formatPercentile(vitalAssessment(field.key, raw, percentiles));
      const value = raw
        ? `${raw}${field.suffix ? ` ${field.suffix}` : ""}${percentile ? ` ${percentile}` : ""}`
        : "—";
      return `<div><span>${escapeHtml(field.label)}</span><p>${escapeHtml(value)}</p></div>`;
    })
    .join("");
  return `
    <div class="box">
      <h3>Signos vitales</h3>
      <div class="grid">${cells}</div>
    </div>
  `;
}

function consultationBlock(consultation: Consultation, patient: Patient) {
  const infantData = hasInfantBirthData(consultation.infant_birth_data)
    ? normalizeInfantBirthData(consultation.infant_birth_data)
    : infantBirthFromPatient(patient);
  return `
    <article class="report">
      <header>
        <p class="kicker">${escapeHtml(consultationTypeLabel(consultation.consultation_type))}</p>
        <h2>${escapeHtml(consultation.diagnosis || "Consulta sin diagnóstico")}</h2>
        <p class="meta">
          ${escapeHtml(formatDateTime(consultation.consultation_date))}
          ${consultation.doctor?.full_name ? ` · ${escapeHtml(consultation.doctor.full_name)}` : ""}
          ${consultation.doctor?.specialty ? ` · ${escapeHtml(consultation.doctor.specialty)}` : ""}
        </p>
      </header>
      ${consultation.consultation_type === "lactante" ? birthHeader(infantData) : ""}
      <div class="box"><h3>Motivo</h3><p>${text(consultation.reason)}</p></div>
      <div class="box"><h3>${escapeHtml(illnessLabel(consultation.consultation_type))}</h3><p>${text(consultation.current_illness)}</p></div>
      ${vitalsBlock(consultation, patient)}
      <div class="box"><h3>Examen físico</h3><p>${text(consultation.physical_exam)}</p></div>
      <div class="box"><h3>Diagnóstico</h3><p>${text(consultation.diagnosis)}</p></div>
      <div class="box"><h3>Tratamiento</h3><p>${text(consultation.treatment)}</p></div>
    </article>
  `;
}

export function printClinicalHistory(patient: Patient, consultations: Consultation[]) {
  const age = ageFromBirthDate(patient.birth_date);
  const chronological = [...consultations].sort(
    (a, b) => new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime(),
  );
  const printedAt = formatDateTime(new Date().toISOString());
  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Historia clínica · ${escapeHtml(fullName(patient.first_name, patient.last_name))}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 28px;
        font-family: "Segoe UI", "DM Sans", sans-serif;
        color: #16343a;
        background: #fff;
      }
      h1, h2, h3 { margin: 0 0 8px; }
      h1 { font-size: 26px; }
      h2 { font-size: 18px; }
      h3 { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c7176; }
      p { margin: 0; line-height: 1.5; }
      .banner { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .brand { font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: #1b6b6a; font-weight: 700; }
      .meta, .muted { color: #5c7176; font-size: 13px; }
      .summary, .box, .report {
        border: 1px solid #dfe6e3;
        border-radius: 12px;
        padding: 14px 16px;
        margin-top: 12px;
      }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
      .grid span { display: block; font-size: 11px; color: #5c7176; }
      .kicker { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #1b6b6a; font-weight: 700; }
      .report { page-break-inside: avoid; }
      .toolbar { margin-top: 20px; }
      .toolbar button {
        border: 0;
        border-radius: 999px;
        background: #1b6b6a;
        color: #fff;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      @media print {
        body { padding: 0; }
        .report { break-inside: avoid; }
        .no-print { display: none !important; }
      }
    </style>
  </head>
  <body>
    <div class="banner">
      <div>
        <p class="brand">Historia clínica</p>
        <h1>${escapeHtml(fullName(patient.first_name, patient.last_name))}</h1>
        <p class="meta">
          ${escapeHtml(patient.document_type)} ${escapeHtml(patient.document_number)}
          · ${escapeHtml(sexLabel(patient.sex))}
          · ${age != null ? `${age} años` : "Edad no informada"}
          · ${escapeHtml(formatDate(patient.birth_date))}
        </p>
      </div>
      <p class="muted">Impreso ${escapeHtml(printedAt)}</p>
    </div>
    <section class="summary">
      <div class="box" style="border:0;padding:0;margin:0">
        <h3>Antecedentes</h3>
        <p>${text(patient.medical_history)}</p>
      </div>
      <div class="box">
        <h3>Medicación habitual</h3>
        <p>${text(patient.current_medications)}</p>
      </div>
      <div class="box">
        <h3>Alergias</h3>
        <p>${text(patient.allergies)}</p>
      </div>
    </section>
    ${
      chronological.length
        ? chronological.map((consultation) => consultationBlock(consultation, patient)).join("")
        : "<p class='muted'>No hay consultas registradas.</p>"
    }
    <div class="toolbar no-print">
      <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    <script>
      window.addEventListener("load", function () {
        window.focus();
        window.print();
      });
    </script>
  </body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const revokeLater = (target?: Window | null) => {
    const cleanup = () => URL.revokeObjectURL(url);
    target?.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 60_000);
  };

  const popup = window.open(url, "historia-clinica-impresion", "width=920,height=740");
  if (popup) {
    revokeLater(popup);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Impresión de historia clínica");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  iframe.src = url;
  iframe.addEventListener(
    "load",
    () => {
      const frameWindow = iframe.contentWindow;
      revokeLater(frameWindow);
      frameWindow?.addEventListener("afterprint", () => iframe.remove(), { once: true });
    },
    { once: true },
  );
  document.body.appendChild(iframe);
}
