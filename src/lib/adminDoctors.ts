import { supabase } from "./supabase";
import type { DoctorAccount, UserRole } from "./types";

type AdminAction =
  | {
      action: "create";
      email: string;
      password: string;
      full_name: string;
      username: string;
      specialty?: string;
      license_number?: string;
      is_admin?: boolean;
      role?: UserRole;
      patient_id?: string | null;
    }
  | {
      action: "update";
      id: string;
      email?: string;
      password?: string;
      full_name?: string;
      username?: string;
      specialty?: string;
      license_number?: string;
      is_admin?: boolean;
      role?: UserRole;
      patient_id?: string | null;
    }
  | { action: "delete"; id: string };

async function invokeAdminDoctors<T>(body: AdminAction): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-doctors", {
    body,
  });
  if (error) throw new Error(error.message || "No se pudo contactar al servidor.");
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

/** Lists accounts from profiles (no edge cold-start). */
export async function listDoctors() {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, specialty, license_number, is_admin, role, patient_id, email, created_at, updated_at",
    )
    .order("full_name");
  if (error) throw new Error(error.message);

  const patientIds = [
    ...new Set(
      (profiles ?? [])
        .map((p) => p.patient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let patientLabelById = new Map<string, string>();
  if (patientIds.length) {
    const { data: patients, error: patientsError } = await supabase
      .from("patients")
      .select("id, first_name, last_name, document_number")
      .in("id", patientIds);
    if (patientsError) throw new Error(patientsError.message);
    patientLabelById = new Map(
      (patients ?? []).map((p) => [
        p.id,
        `${p.last_name}, ${p.first_name} · ${p.document_number}`,
      ]),
    );
  }

  const doctors: DoctorAccount[] = (profiles ?? []).map((profile) => ({
    ...(profile as DoctorAccount),
    role: profile.role === "paciente" ? "paciente" : "medico",
    email: profile.email ?? "",
    patient_label: profile.patient_id
      ? patientLabelById.get(profile.patient_id) ?? null
      : null,
  }));

  return { doctors };
}

export function createDoctor(
  payload: Omit<Extract<AdminAction, { action: "create" }>, "action">,
) {
  return invokeAdminDoctors<{ id: string }>({ action: "create", ...payload });
}

export function updateDoctor(
  payload: Omit<Extract<AdminAction, { action: "update" }>, "action">,
) {
  return invokeAdminDoctors<{ ok: boolean }>({ action: "update", ...payload });
}

export function deleteDoctor(id: string) {
  return invokeAdminDoctors<{ ok: boolean }>({ action: "delete", id });
}
