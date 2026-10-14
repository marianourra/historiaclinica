import { useEffect, useState, type FormEvent } from "react";
import {
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
} from "../lib/adminDoctors";
import { useAuth } from "../context/AuthContext";
import type { DoctorAccount } from "../lib/types";

const emptyForm = {
  full_name: "",
  username: "",
  email: "",
  specialty: "",
  license_number: "",
  password: "",
  is_admin: false,
};

export function Parametrization() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  async function refresh() {
    setError(null);
    const { doctors: rows } = await listDoctors();
    setDoctors(rows);
  }

  useEffect(() => {
    let active = true;
    listDoctors()
      .then(({ doctors: rows }) => {
        if (active) setDoctors(rows);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "No se pudo cargar.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(doctor: DoctorAccount) {
    setEditingId(doctor.id);
    setForm({
      full_name: doctor.full_name ?? "",
      username: doctor.username ?? "",
      email: doctor.email ?? "",
      specialty: doctor.specialty ?? "",
      license_number: doctor.license_number ?? "",
      password: "",
      is_admin: Boolean(doctor.is_admin),
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setPending(true);
    try {
      if (editingId) {
        await updateDoctor({
          id: editingId,
          full_name: form.full_name,
          username: form.username,
          email: form.email,
          specialty: form.specialty,
          license_number: form.license_number,
          is_admin: form.is_admin,
          ...(form.password.trim() ? { password: form.password } : {}),
        });
      } else {
        await createDoctor({
          full_name: form.full_name,
          username: form.username,
          email: form.email,
          password: form.password,
          specialty: form.specialty,
          license_number: form.license_number,
          is_admin: form.is_admin,
        });
      }
      await refresh();
      closeForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(doctor: DoctorAccount) {
    if (doctor.id === user?.id) {
      setError("No podés eliminar tu propio usuario.");
      return;
    }
    const ok = window.confirm(
      `¿Eliminar al médico ${doctor.full_name}? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      await deleteDoctor(doctor.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-muted">Cargando parametrización...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Parametrización</h1>
          <p className="mt-2 text-sm text-muted">
            Alta, edición y baja de usuarios médicos del consultorio.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            Nuevo médico
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={onSubmit} className="card mt-6 grid gap-4 p-6">
          <h2 className="font-display text-2xl">
            {editingId ? "Editar médico" : "Nuevo médico"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="field-label">Nombre completo</span>
              <input
                className="field"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Usuario</span>
              <input
                className="field"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                pattern="[a-zA-Z0-9._-]{3,32}"
                title="3 a 32 caracteres: letras, números, punto, guion o guion bajo"
                required
              />
            </label>
            <label>
              <span className="field-label">Correo</span>
              <input
                className="field"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </label>
            <label>
              <span className="field-label">Especialidad</span>
              <input
                className="field"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Matrícula</span>
              <input
                className="field"
                value={form.license_number}
                onChange={(e) =>
                  setForm({ ...form, license_number: e.target.value })
                }
              />
            </label>
            <label>
              <span className="field-label">
                {editingId ? "Nueva contraseña (opcional)" : "Contraseña"}
              </span>
              <input
                className="field"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={editingId ? undefined : 6}
                required={!editingId}
                placeholder={editingId ? "Dejar vacío para no cambiar" : undefined}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-teal"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
            />
            Es administrador
          </label>
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={pending}>
              {pending ? "Guardando..." : editingId ? "Guardar cambios" : "Crear médico"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl">Médicos</h2>
          <p className="text-sm text-muted">{doctors.length} usuarios</p>
        </div>
        <div className="divide-y divide-line">
          {doctors.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted">Todavía no hay médicos.</p>
          )}
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-semibold">
                  {doctor.full_name}
                  {doctor.is_admin && (
                    <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-teal-dark">
                      Admin
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  @{doctor.username || "—"} · {doctor.email || "sin correo"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {doctor.specialty || "Sin especialidad"}
                  {doctor.license_number ? ` · Mat. ${doctor.license_number}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => openEdit(doctor)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-ghost text-danger"
                  disabled={pending || doctor.id === user?.id}
                  onClick={() => void onDelete(doctor)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
