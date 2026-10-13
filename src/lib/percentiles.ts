import { whoLms, type LmsSeries } from "../data/whoLms";
import type { Patient, VitalSigns } from "./types";

export type PercentileContext = {
  sex?: Patient["sex"];
  birthDate?: string | null;
  atDate?: string | null;
  heightCm?: string;
};

const PERCENTILE_KEYS = new Set<keyof VitalSigns>([
  "weight",
  "height",
  "headCircumference",
  "imc",
  "systolic",
  "diastolic",
]);

const BP_COEFFICIENTS = {
  M: {
    systolic: {
      a: [102.19768, 1.82416, 0.12776, 0.00249, -0.00135],
      b: [2.73157, -0.19618, -0.04659, 0.00947],
      sd: 10.7128,
    },
    diastolic: {
      a: [61.01217, 0.68314, -0.09835, 0.01711, 0.00045],
      b: [1.46993, -0.07849, -0.03144, -0.00967],
      sd: 11.6032,
    },
  },
  F: {
    systolic: {
      a: [102.01027, 1.94397, 0.00598, -0.00789, -0.00059],
      b: [2.03526, 0.02534, -0.01884, 0.00121],
      sd: 10.4855,
    },
    diastolic: {
      a: [60.5051, 1.01301, 0.01157, 0.00424, -0.00187],
      b: [1.16641, 0.12795, -0.03869, -0.00079],
      sd: 10.9573,
    },
  },
} as const;

function parseNumber(value: string | null | undefined) {
  const parsed = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDay(value: string | null | undefined) {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function ageInDays(birthDate?: string | null, atDate?: string | null) {
  const birth = parseDay(birthDate);
  const at = parseDay(atDate) ?? new Date();
  if (!birth) return null;
  return Math.round((at.getTime() - birth.getTime()) / 86_400_000);
}

function interpolateLms(series: LmsSeries, ageDays: number) {
  const { ages, l, m, s } = series;
  if (!ages.length || ageDays < ages[0] || ageDays > ages[ages.length - 1]) return null;
  let hi = ages.findIndex((age) => age >= ageDays);
  if (hi === -1) return null;
  if (ages[hi] === ageDays || hi === 0) return { l: l[hi], m: m[hi], s: s[hi] };
  const lo = hi - 1;
  const t = (ageDays - ages[lo]) / (ages[hi] - ages[lo]);
  return {
    l: l[lo] + (l[hi] - l[lo]) * t,
    m: m[lo] + (m[hi] - m[lo]) * t,
    s: s[lo] + (s[hi] - s[lo]) * t,
  };
}

function lmsZScore(value: number, l: number, m: number, s: number) {
  if (value <= 0 || m <= 0 || s <= 0) return null;
  const z = Math.abs(l) < 1e-6 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
  return Number.isFinite(z) ? z : null;
}

function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function zToPercentile(z: number) {
  const percentile = Math.round(normalCdf(z) * 100);
  return Math.min(100, Math.max(0, percentile));
}

function sexKey(sex?: Patient["sex"]): "M" | "F" | null {
  return sex === "M" || sex === "F" ? sex : null;
}

function growthZ(
  indicator: keyof typeof whoLms,
  value: number,
  sex: "M" | "F",
  ageDays: number,
) {
  const point = interpolateLms(whoLms[indicator][sex], ageDays);
  if (!point) return null;
  return lmsZScore(value, point.l, point.m, point.s);
}

function bloodPressureZ(
  kind: "systolic" | "diastolic",
  value: number,
  sex: "M" | "F",
  ageDays: number,
  heightCm?: string,
) {
  const years = ageDays / 365.25;
  if (years < 1 || years > 17.99) return null;
  const heightZ = parseNumber(heightCm) ? growthZ("height", parseNumber(heightCm)!, sex, ageDays) : 0;
  if (heightZ == null) return null;
  const { a, b, sd } = BP_COEFFICIENTS[sex][kind];
  const x = years - 10;
  const zht = Math.max(-3, Math.min(3, heightZ));
  const expected =
    a[0] +
    a[1] * x +
    a[2] * x ** 2 +
    a[3] * x ** 3 +
    a[4] * x ** 4 +
    b[0] * zht +
    b[1] * zht ** 2 +
    b[2] * zht ** 3 +
    b[3] * zht ** 4;
  return (value - expected) / sd;
}

export type VitalAssessment = {
  percentile: number;
  z: number;
};

export function vitalAssessment(
  key: keyof VitalSigns,
  value: string | undefined,
  ctx: PercentileContext,
): VitalAssessment | null {
  if (!PERCENTILE_KEYS.has(key)) return null;
  const sex = sexKey(ctx.sex);
  const days = ageInDays(ctx.birthDate, ctx.atDate);
  const measured = parseNumber(value);
  if (!sex || days == null || days < 0 || measured == null) return null;

  let z: number | null = null;
  if (key === "weight") z = growthZ("weight", measured, sex, days);
  else if (key === "height") z = growthZ("height", measured, sex, days);
  else if (key === "headCircumference") z = growthZ("hc", measured, sex, days);
  else if (key === "imc") z = growthZ("bmi", measured, sex, days);
  else if (key === "systolic" || key === "diastolic") {
    z = bloodPressureZ(key, measured, sex, days, ctx.heightCm);
  }
  if (z == null) return null;
  return { percentile: zToPercentile(z), z };
}

export function vitalPercentile(
  key: keyof VitalSigns,
  value: string | undefined,
  ctx: PercentileContext,
) {
  return vitalAssessment(key, value, ctx);
}

export function formatZ(z: number) {
  return (Math.round(z * 100) / 100).toFixed(2);
}

export function isExtremePercentile(percentile: number) {
  return percentile < 3 || percentile > 97;
}

export function formatPercentile(assessment: VitalAssessment | null | undefined) {
  if (!assessment) return "";
  const { percentile, z } = assessment;
  const pLabel = percentile < 1 ? "p<1" : percentile > 99 ? "p>99" : `p${percentile}`;
  if (isExtremePercentile(percentile)) return `${pLabel} (z ${formatZ(z)})`;
  return pLabel;
}

export function percentileContext(
  patient: Pick<Patient, "sex" | "birth_date"> | null | undefined,
  atDate: string | null | undefined,
  vitals?: VitalSigns,
): PercentileContext {
  return {
    sex: patient?.sex,
    birthDate: patient?.birth_date,
    atDate,
    heightCm: vitals?.height,
  };
}

export type GrowthIndicator = "weight" | "height" | "hc" | "bmi";

export const GROWTH_CHARTS: {
  id: GrowthIndicator;
  label: string;
  unit: string;
  vital: keyof VitalSigns;
}[] = [
  { id: "weight", label: "Peso", unit: "kg", vital: "weight" },
  { id: "height", label: "Talla", unit: "cm", vital: "height" },
  { id: "hc", label: "Perímetro cefálico", unit: "cm", vital: "headCircumference" },
  { id: "bmi", label: "IMC", unit: "kg/m²", vital: "imc" },
];

export const CURVE_PERCENTILES = [3, 10, 25, 50, 75, 90, 97] as const;

const PERCENTILE_Z: Record<(typeof CURVE_PERCENTILES)[number], number> = {
  3: -1.8807936,
  10: -1.2815516,
  25: -0.6744898,
  50: 0,
  75: 0.6744898,
  90: 1.2815516,
  97: 1.8807936,
};

function lmsValue(l: number, m: number, s: number, z: number) {
  if (m <= 0 || s <= 0) return null;
  if (Math.abs(l) < 1e-6) return m * Math.exp(s * z);
  const inner = 1 + l * s * z;
  if (inner <= 0) return null;
  const value = m * Math.pow(inner, 1 / l);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function growthSex(sex?: Patient["sex"]) {
  return sexKey(sex);
}

export function indicatorAgeSpan(indicator: GrowthIndicator, sex: "M" | "F") {
  const ages = whoLms[indicator][sex].ages;
  return { min: ages[0] ?? 0, max: ages[ages.length - 1] ?? 0 };
}

export type CurvePoint = { ageDays: number } & Record<string, number>;

export function growthCurves(indicator: GrowthIndicator, sex: "M" | "F", fromDays: number, toDays: number) {
  const series = whoLms[indicator][sex];
  const points: CurvePoint[] = [];
  for (let i = 0; i < series.ages.length; i += 1) {
    const ageDays = series.ages[i];
    if (ageDays < fromDays || ageDays > toDays) continue;
    const row: CurvePoint = { ageDays };
    let usable = false;
    for (const percentile of CURVE_PERCENTILES) {
      const value = lmsValue(series.l[i], series.m[i], series.s[i], PERCENTILE_Z[percentile]);
      if (value == null) continue;
      row[`p${percentile}`] = value;
      usable = true;
    }
    if (usable) points.push(row);
  }
  return points;
}

export type GrowthObservation = {
  consultationId: string;
  ageDays: number;
  value: number;
  date: string;
  assessment: VitalAssessment | null;
};

export function parseVitalNumber(value: string | null | undefined) {
  return parseNumber(value);
}
