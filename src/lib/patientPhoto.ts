import { supabase } from "./supabase";

const BUCKET = "patient-photos";

export function patientPhotoUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) return null;
  // Unique object paths already change the URL; keep a soft bust for safety.
  return `${data.publicUrl}?v=${encodeURIComponent(path)}`;
}

async function clearPatientPhotos(patientId: string, keepPath?: string | null) {
  const { data: files, error } = await supabase.storage.from(BUCKET).list(patientId);
  if (error) throw new Error(error.message);
  const toRemove = (files ?? [])
    .map((file) => `${patientId}/${file.name}`)
    .filter((filePath) => filePath !== keepPath);
  if (toRemove.length === 0) return;
  const { error: removeError } = await supabase.storage.from(BUCKET).remove(toRemove);
  if (removeError) throw new Error(removeError.message);
}

export async function uploadPatientPhoto(
  patientId: string,
  file: File,
  previousPath?: string | null,
) {
  const extension =
    (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${patientId}/photo-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "image/jpeg",
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);

  try {
    await clearPatientPhotos(patientId, path);
  } catch {
    if (previousPath && previousPath !== path) {
      try {
        await removePatientPhoto(previousPath);
      } catch {
        /* keep the new photo even if cleanup fails */
      }
    }
  }

  return path;
}

export async function removePatientPhoto(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export async function clearAllPatientPhotos(patientId: string) {
  await clearPatientPhotos(patientId);
}
