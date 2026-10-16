import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  createDoctor,
  deleteDoctor,
  listDoctors,
  updateDoctor,
} from "../lib/adminDoctors";
import { useAuth } from "../context/AuthContext";
import { fullName } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { DoctorAccount, Patient, UserRole } from "../lib/types";

type AccountForm = {
  full_name: string;
  username: string;
  email: string;
  specialty: string;
  license_number: string;
  password: string;
  is_admin: boolean;
  role: UserRole;
  patient_id: string;
};

const emptyForm: AccountForm = {
  full_name: "",
  username: "",
  email: "",
  specialty: "",
  license_number: "",
  password: "",
  is_admin: false,
  role: "medico",
  patient_id: "",
};

export function Parametrization() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<DoctorAccount[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [tab, setTab] = useState<"medico" | "paciente">("medico");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DoctorAccount | null>(null);

  const doctors = useMemo(
    () => accounts.filter((a) => a.role !== "paciente"),
    [accounts],
  );
  const patientUsers = useMemo(
    () => accounts.filter((a) => a.role === "paciente"),
    [accounts],
  );
  const list = tab === "medico" ? doctors : patientUsers;

  async function refresh() {
    setError(null);
    const [{ doctors: rows }, patientsRes] = await Promise.all([
      listDoctors(),
      supabase
        .from("patients")
        .select("id, first_name, last_name, document_number")
        .order("last_name"),
    ]);
    setAccounts(rows);
    if (patientsRes.error) throw patientsRes.error;
    setPatients((patientsRes.data as Patient[]) ?? []);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    refresh()
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : err && typeof err === "object" && "message" in err
                ? String((err as { message: unknown }).message ?? "")
                : "No se pudo cargar.",
          );
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
    setForm({
      ...emptyForm,
      role: tab,
      is_admin: false,
    });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(account: DoctorAccount) {
    setEditingId(account.id);
    setForm({
      full_name: account.full_name ?? "",
      username: account.username ?? "",
      email: account.email ?? "",
      specialty: account.specialty ?? "",
      license_number: account.license_number ?? "",
      password: "",
      is_admin: Boolean(account.is_admin),
      role: account.role === "paciente" ? "paciente" : "medico",
      patient_id: account.patient_id ?? "",
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
    if (form.role === "paciente" && !form.patient_id) {
      setFormError("Seleccioná la ficha del paciente a vincular.");
      return;
    }
    setPending(true);
    try {
      const payload = {
        full_name: form.full_name,
        username: form.username,
        email: form.email,
        specialty: form.role === "medico" ? form.specialty : "",
        license_number: form.role === "medico" ? form.license_number : "",
        is_admin: form.role === "medico" ? form.is_admin : false,
        role: form.role,
        patient_id: form.role === "paciente" ? form.patient_id : null,
      };
      if (editingId) {
        await updateDoctor({
          id: editingId,
          ...payload,
          ...(form.password.trim() ? { password: form.password } : {}),
        });
      } else {
        await createDoctor({
          ...payload,
          password: form.password,
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

  function requestDelete(account: DoctorAccount) {
    if (account.id === user?.id) {
      setError("No podés eliminar tu propio usuario.");
      return;
    }
    setError(null);
    setDeleteTarget(account);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const account = deleteTarget;
    setPending(true);
    setError(null);
    try {
      await deleteDoctor(account.id);
      setDeleteTarget(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Parametrización</h1>
          <p className="mt-2 text-sm text-muted">
            Alta y gestión de usuarios médicos y del portal de pacientes.
          </p>
        </div>
        {!showForm && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            {tab === "medico" ? "Nuevo médico" : "Nuevo usuario paciente"}
          </button>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className={tab === "medico" ? "btn-primary" : "btn-ghost"}
          onClick={() => {
            setTab("medico");
            closeForm();
          }}
        >
          Médicos ({doctors.length})
        </button>
        <button
          type="button"
          className={tab === "paciente" ? "btn-primary" : "btn-ghost"}
          onClick={() => {
            setTab("paciente");
            closeForm();
          }}
        >
          Pacientes portal ({patientUsers.length})
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={onSubmit} className="card mt-6 grid gap-4 p-6">
          <h2 className="font-display text-2xl">
            {editingId
              ? form.role === "paciente"
                ? "Editar usuario paciente"
                : "Editar médico"
              : form.role === "paciente"
                ? "Nuevo usuario paciente"
                : "Nuevo médico"}
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
            {form.role === "medico" ? (
              <>
                <label>
                  <span className="field-label">Especialidad</span>
                  <input
                    className="field"
                    value={form.specialty}
                    onChange={(e) =>
                      setForm({ ...form, specialty: e.target.value })
                    }
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
              </>
            ) : (
              <label className="sm:col-span-2">
                <span className="field-label">Ficha de paciente vinculada</span>
                <select
                  className="field"
                  value={form.patient_id}
                  onChange={(e) =>
                    setForm({ ...form, patient_id: e.target.value })
                  }
                  required
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {fullName(p.first_name, p.last_name)} · {p.document_number}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {form.role === "medico" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-teal"
                checked={form.is_admin}
                onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
              />
              Es administrador
            </label>
          )}
          {formError && <p className="text-sm text-danger">{formError}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={pending}>
              {pending
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : form.role === "paciente"
                    ? "Crear usuario paciente"
                    : "Crear médico"}
            </button>
            <button type="button" className="btn-ghost" onClick={closeForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl">
            {tab === "medico" ? "Médicos" : "Usuarios del portal"}
          </h2>
          <p className="text-sm text-muted">{list.length} usuarios</p>
        </div>
        <div className="divide-y divide-line">
          {loading && (
            <p className="px-5 py-6 text-sm text-muted">Cargando...</p>
          )}
          {!loading && list.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted">
              {tab === "medico"
                ? "Todavía no hay médicos."
                : "Todavía no hay usuarios paciente."}
            </p>
          )}
          {!loading &&
            list.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-semibold">
                  {account.full_name}
                  {account.is_admin && (
                    <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-teal-dark">
                      Admin
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  @{account.username || "—"} · {account.email || "sin correo"}
                </p>
                {account.role === "paciente" ? (
                  <p className="mt-1 text-sm text-muted">
                    Ficha: {account.patient_label || account.patient_id || "sin vincular"}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    {account.specialty || "Sin especialidad"}
                    {account.license_number
                      ? ` · Mat. ${account.license_number}`
                      : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => openEdit(account)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn-ghost text-danger"
                  disabled={pending || account.id === user?.id}
                  onClick={() => requestDelete(account)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        badge="Parametrización"
        title="¿Eliminar este usuario?"
        message={
          deleteTarget
            ? `¿Estás seguro de que deseás eliminar al ${
                deleteTarget.role === "paciente"
                  ? "usuario paciente"
                  : "médico"
              } ${deleteTarget.full_name}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando..."
        danger
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
