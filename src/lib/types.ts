export type UserRole = "medico" | "paciente";

export type Profile = {
  id: string;
  full_name: string;
  username: string | null;
  specialty: string | null;
  license_number: string | null;
  is_admin: boolean;
  role: UserRole;
  patient_id: string | null;
  email?: string | null;
};

export type DoctorAccount = Profile & {
  email: string;
  created_at?: string;
  updated_at?: string;
  patient_label?: string | null;
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
  photo_path: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  father_name: string | null;
  father_phone: string | null;
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

export type DoctorSchedule = {
  id: string;
  doctor_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = "scheduled" | "cancelled" | "completed";

export type AppointmentType = "control_salud" | "demanda_espontanea";

export type Appointment = {
  id: string;
  doctor_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  appointment_type: AppointmentType;
  reason: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  doctor?: Pick<Profile, "full_name" | "specialty"> | null;
  patient?: Pick<Patient, "first_name" | "last_name" | "document_number"> | null;
};
