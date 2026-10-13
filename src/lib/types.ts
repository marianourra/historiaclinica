export type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  specialty: string | null;
  license_number: string | null;
};

export type Patient = {
  id: string;
  created_by: string;
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string;
  birth_date: string | null;
  sex: "F" | "M" | "X" | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_type: string | null;
  insurance: string | null;
  allergies: string | null;
  medical_history: string | null;
  current_medications: string | null;
  notes: string | null;
  gestational_age: string | null;
  birth_weight: string | null;
  pregnancy_serologies: string | null;
  apgar: string | null;
  created_at: string;
  updated_at: string;
};

export type VitalSigns = {
  systolic?: string;
  diastolic?: string;
  heartRate?: string;
  respiratoryRate?: string;
  temperature?: string;
  weight?: string;
  height?: string;
  oxygenSat?: string;
  imc?: string;
  headCircumference?: string;
};

export type InfantBirthData = {
  gestational_age?: string | null;
  birth_weight?: string | null;
  pregnancy_serologies?: string | null;
  apgar?: string | null;
};

export type Consultation = {
  id: string;
  patient_id: string;
  doctor_id: string;
  consultation_type: "lactante" | "mayores" | "demanda";
  infant_birth_data: InfantBirthData;
  consultation_date: string;
  reason: string | null;
  current_illness: string | null;
  physical_exam: string | null;
  vital_signs: VitalSigns;
  diagnosis: string | null;
  treatment: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Pick<Profile, "full_name" | "specialty"> | null;
};
