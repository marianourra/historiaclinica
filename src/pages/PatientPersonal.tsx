import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { formatDate, fullName, sexLabel } from "../lib/format";
import {
  clearAllPatientPhotos,
  patientPhotoUrl,
  uploadPatientPhoto,
} from "../lib/patientPhoto";
import { supabase } from "../lib/supabase";
import type { Patient } from "../lib/types";

type PersonalForm = {
  first_name: string;
  last_name: string;
  document_type: string;
  document_number: string;
  birth_date: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  blood_type: string;
  insurance: string;
  mother_name: string;
  mother_phone: string;
  father_name: string;
  father_phone: string;
  notes: string;
};

function toForm(patient: Patient): PersonalForm {
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    document_type: patient.document_type,
    document_number: patient.document_number,
    birth_date: patient.birth_date ?? "",
    sex: patient.sex ?? "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    blood_type: patient.blood_type ?? "",
    insurance: patient.insurance ?? "",
    mother_name: patient.mother_name ?? "",
    mother_phone: patient.mother_phone ?? "",
    father_name: patient.father_name ?? "",
    father_phone: patient.father_phone ?? "",
    notes: patient.notes ?? "",
  };
}

export function PatientPersonal() {
  const { patientId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<PersonalForm | null>(null);
  const [editing, setEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    let active = true;
    supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .maybeSingle()
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(loadError.message);
        else if (data) {
          const loaded = data as Patient;
          setPatient(loaded);
          setForm(toForm(loaded));
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function update(key: keyof PersonalForm, value: string) {
    setSaved(false);
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function cancel() {
    if (patient) setForm(toForm(patient));
    setEditing(false);
    setPhotoFile(null);
    setRemovePhoto(false);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onPhotoPick(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("La foto debe ser una imagen (JPG, PNG o WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede superar los 5 MB.");
      return;
    }
    setError(null);
    setSaved(false);
    setRemovePhoto(false);
    setPhotoFile(file);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!patient || !form) return;
    setError(null);
    setSaved(false);
    setPending(true);

    let nextPhotoPath = patient.photo_path;
    try {
      if (photoFile) {
        nextPhotoPath = await uploadPatientPhoto(
          patient.id,
          photoFile,
          patient.photo_path,
        );
      } else if (removePhoto && patient.photo_path) {
        await clearAllPatientPhotos(patient.id);
        nextPhotoPath = null;
      }

      const { data, error: saveError } = await supabase
        .from("patients")
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          document_type: form.document_type,
          document_number: form.document_number.trim(),
          birth_date: form.birth_date || null,
          sex: form.sex || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          blood_type: form.blood_type.trim() || null,
          insurance: form.insurance.trim() || null,
          mother_name: form.mother_name.trim() || null,
          mother_phone: form.mother_phone.trim() || null,
          father_name: form.father_name.trim() || null,
          father_phone: form.father_phone.trim() || null,
          notes: form.notes.trim() || null,
          photo_path: nextPhotoPath,
        })
        .eq("id", patient.id)
        .select("*")
        .single();

      if (saveError) throw new Error(saveError.message);

      const updated = data as Patient;
      setPatient(updated);
      setForm(toForm(updated));
      setPhotoFile(null);
      setRemovePhoto(false);
      setEditing(false);
      setSaved(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los datos.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-muted">Cargando datos personales...</p>;
  if (!patient || !form) return <p>{error || "No encontramos este paciente."}</p>;

  const currentPhoto =
    photoPreview ||
    (!removePhoto ? patientPhotoUrl(patient.photo_path) : null);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <BackLink to={`/pacientes/${patient.id}`}>← Volver a la historia</BackLink>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Datos personales
          </p>
          <h1 className="font-display mt-2 text-4xl">
            {fullName(patient.first_name, patient.last_name)}
          </h1>
        </div>
        {!editing && (
          <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
            Editar datos
          </button>
        )}
      </div>

      <div className="card mt-6 p-6">
        <p className="field-label">Foto del paciente</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-2xl border border-line bg-sage/40">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`Foto de ${patient.first_name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-xs text-muted">Sin foto</span>
            )}
          </div>
          {editing && (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={(e) => onPhotoPick(e.target.files?.[0] ?? null)}
              />
              {(patient.photo_path || photoFile) && !removePhoto && (
                <button
                  type="button"
                  className="btn-ghost self-start text-danger"
                  onClick={() => {
                    setPhotoFile(null);
                    setRemovePhoto(true);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Quitar foto
                </button>
              )}
              {removePhoto && (
                <p className="text-xs text-muted">La foto se eliminará al guardar.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Nombre" editing={editing} value={form.first_name} display={patient.first_name} onChange={(v) => update("first_name", v)} required />
        <Field label="Apellido" editing={editing} value={form.last_name} display={patient.last_name} onChange={(v) => update("last_name", v)} required />
        <Field
          label="Tipo de documento"
          editing={editing}
          value={form.document_type}
          display={patient.document_type}
          kind="select"
          options={["DNI", "Pasaporte", "LC", "LE", "Otro"]}
          onChange={(v) => update("document_type", v)}
        />
        <Field label="Número" editing={editing} value={form.document_number} display={patient.document_number} onChange={(v) => update("document_number", v)} required />
        <Field
          label="Fecha de nacimiento"
          editing={editing}
          value={form.birth_date}
          display={formatDate(patient.birth_date)}
          kind="date"
          onChange={(v) => update("birth_date", v)}
        />
        <Field
          label="Sexo"
          editing={editing}
          value={form.sex}
          display={sexLabel(patient.sex)}
          kind="select"
          options={[
            { value: "", label: "No informado" },
            { value: "F", label: "Femenino" },
            { value: "M", label: "Masculino" },
            { value: "X", label: "Otro" },
          ]}
          onChange={(v) => update("sex", v)}
        />
        <Field label="Teléfono" editing={editing} value={form.phone} display={patient.phone} onChange={(v) => update("phone", v)} />
        <Field label="Correo" editing={editing} value={form.email} display={patient.email} kind="email" onChange={(v) => update("email", v)} />
        <Field label="Grupo sanguíneo" editing={editing} value={form.blood_type} display={patient.blood_type} onChange={(v) => update("blood_type", v)} />
        <Field label="Obra social / cobertura" editing={editing} value={form.insurance} display={patient.insurance} onChange={(v) => update("insurance", v)} />
        <Field label="Domicilio" editing={editing} value={form.address} display={patient.address} wide onChange={(v) => update("address", v)} />
      </div>

      <div className="card mt-4 grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-display text-xl sm:col-span-2">Familiares</h2>
        <Field
          label="Nombre de la madre"
          editing={editing}
          value={form.mother_name}
          display={patient.mother_name}
          onChange={(v) => update("mother_name", v)}
        />
        <Field
          label="Teléfono de la madre"
          editing={editing}
          value={form.mother_phone}
          display={patient.mother_phone}
          onChange={(v) => update("mother_phone", v)}
        />
        <Field
          label="Nombre del padre"
          editing={editing}
          value={form.father_name}
          display={patient.father_name}
          onChange={(v) => update("father_name", v)}
        />
        <Field
          label="Teléfono del padre"
          editing={editing}
          value={form.father_phone}
          display={patient.father_phone}
          onChange={(v) => update("father_phone", v)}
        />
      </div>

      <div className="card mt-4 grid gap-4 p-6">
        <Field label="Notas" editing={editing} value={form.notes} display={patient.notes} kind="textarea" wide onChange={(v) => update("notes", v)} />
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {saved && !editing && <p className="mt-4 text-sm text-teal">Datos guardados.</p>}
      {editing && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Guardando..." : "Guardar datos"}
          </button>
          <button type="button" className="btn-ghost" onClick={cancel}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  editing,
  value,
  display,
  kind = "text",
  options,
  required,
  wide,
  onChange,
}: {
  label: string;
  editing: boolean;
  value: string;
  display: string | null | undefined;
  kind?: "text" | "textarea" | "date" | "email" | "select";
  options?: Array<string | { value: string; label: string }>;
  required?: boolean;
  wide?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={wide ? "sm:col-span-2" : undefined}>
      <span className="field-label">{label}</span>
      {editing ? (
        kind === "textarea" ? (
          <textarea className="field min-h-24" value={value} onChange={(e) => onChange(e.target.value)} />
        ) : kind === "select" ? (
          <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
            {options?.map((option) => {
              const item = typeof option === "string" ? { value: option, label: option } : option;
              return (
                <option key={item.value || "empty"} value={item.value}>
                  {item.label}
                </option>
              );
            })}
          </select>
        ) : (
          <input className="field" type={kind} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
        )
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">{display || "—"}</p>
      )}
    </label>
  );
}
