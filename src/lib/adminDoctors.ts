import { supabase } from "./supabase";
import type { DoctorAccount } from "./types";

type AdminAction =
  | { action: "list" }
  | {
      action: "create";
      email: string;
      password: string;
      full_name: string;
      username: string;
      specialty?: string;
      license_number?: string;
      is_admin?: boolean;
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

export function listDoctors() {
  return invokeAdminDoctors<{ doctors: DoctorAccount[] }>({ action: "list" });
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
