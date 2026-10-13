import type { InfantBirthData, Patient, VitalSigns } from "./types";

export type ConsultationType = "lactante" | "mayores" | "demanda";

export const CONSULTATION_TYPES: {
  id: ConsultationType;
  label: string;
  description: string;
}[] = [
  {
    id: "lactante",
    label: "Control de salud lactante",
    description: "Seguimiento de crecimiento en el primer año de vida.",
  },
  {
    id: "mayores",
    label: "Control de salud mayores",
    description: "Control periódico de niños, adolescentes o adultos.",
  },
  {
    id: "demanda",
    label: "Demanda espontánea",
    description: "Consulta por un motivo puntual o un cuadro agudo.",
  },
];

export function consultationTypeLabel(type?: string | null) {
  return CONSULTATION_TYPES.find((item) => item.id === type)?.label ?? "Consulta médica";
}

export function isConsultationType(value: string | null | undefined): value is ConsultationType {
  return value === "lactante" || value === "mayores" || value === "demanda";
}

export function illnessLabel(type?: string | null) {
  return type === "lactante" || type === "mayores" ? "Control" : "Enfermedad actual";
}

export type VitalField = {
  key: keyof VitalSigns;
  label: string;
  suffix?: string;
  computed?: boolean;
};

export function vitalFieldsFor(type?: string | null): VitalField[] {
  if (type === "lactante") {
    return [
      { key: "weight", label: "Peso", suffix: "kg" },
      { key: "height", label: "Talla", suffix: "cm" },
      { key: "headCircumference", label: "PC", suffix: "cm" },
    ];
  }
  if (type === "mayores") {
    return [
      { key: "systolic", label: "TAS" },
      { key: "diastolic", label: "TAD" },
      { key: "temperature", label: "Temp", suffix: "°C" },
      { key: "weight", label: "Peso", suffix: "kg" },
      { key: "height", label: "Talla", suffix: "cm" },
      { key: "imc", label: "IMC", computed: true },
    ];
  }
  return [
    { key: "systolic", label: "TAS" },
    { key: "diastolic", label: "TAD" },
    { key: "heartRate", label: "FC" },
    { key: "respiratoryRate", label: "FR" },
    { key: "temperature", label: "Temp", suffix: "°C" },
    { key: "weight", label: "Peso", suffix: "kg" },
    { key: "height", label: "Talla", suffix: "cm" },
    { key: "imc", label: "IMC", computed: true },
    { key: "headCircumference", label: "PC", suffix: "cm" },
    { key: "oxygenSat", label: "SatO2", suffix: "%" },
  ];
}

export function emptyInfantBirthData(): InfantBirthData {
  return {
    gestational_age: "",
    birth_weight: "",
    pregnancy_serologies: "",
    apgar: "",
  };
}

export function infantBirthFromPatient(patient: Patient | null | undefined): InfantBirthData {
  return {
    gestational_age: patient?.gestational_age ?? "",
    birth_weight: patient?.birth_weight ?? "",
    pregnancy_serologies: patient?.pregnancy_serologies ?? "",
    apgar: patient?.apgar ?? "",
  };
}

export function normalizeInfantBirthData(data?: InfantBirthData | null): InfantBirthData {
  return {
    gestational_age: data?.gestational_age ?? "",
    birth_weight: data?.birth_weight ?? "",
    pregnancy_serologies: data?.pregnancy_serologies ?? "",
    apgar: data?.apgar ?? "",
  };
}

export function hasInfantBirthData(data?: InfantBirthData | null) {
  return Boolean(
    data?.gestational_age ||
      data?.birth_weight ||
      data?.pregnancy_serologies ||
      data?.apgar,
  );
}

export function infantBirthPayload(data: InfantBirthData): InfantBirthData {
  return {
    gestational_age: data.gestational_age?.trim() || null,
    birth_weight: data.birth_weight?.trim() || null,
    pregnancy_serologies: data.pregnancy_serologies?.trim() || null,
    apgar: data.apgar?.trim() || null,
  };
}
