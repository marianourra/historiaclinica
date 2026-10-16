import { useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { WEEKDAYS, weekdayLabel } from "../lib/agenda";
import { supabase } from "../lib/supabase";
import type { DoctorSchedule } from "../lib/types";

const emptyForm = {
  weekday: 1,
  start_time: "09:00",
  end_time: "13:00",
  slot_minutes: 30,
};

export function DoctorSchedules() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<DoctorSchedule | null>(null);

  async function refresh() {
    if (!user) return;
    const { data, error: loadError } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", user.id)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });
    if (loadError) throw loadError;
    setRows((data as DoctorSchedule[]) ?? []);
  }

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }
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
  }, [user?.id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (form.start_time >= form.end_time) {
      setError("La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("doctor_schedules").insert({
        doctor_id: user.id,
        weekday: form.weekday,
        start_time: form.start_time,
        end_time: form.end_time,
        slot_minutes: form.slot_minutes,
        active: true,
      });
      if (insertError) throw insertError;
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el horario.");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(row: DoctorSchedule) {
    setPending(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("doctor_schedules")
        .update({ active: !row.active })
        .eq("id", row.id);
      if (updateError) throw updateError;
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setPending(false);
    }
  }

  async function confirmRemove() {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setPending(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("doctor_schedules")
        .delete()
        .eq("id", row.id);
      if (deleteError) throw deleteError;
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
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
          Turnos
        </p>
        <h1 className="font-display mt-1 text-4xl">Configurar horarios</h1>
        <p className="mt-2 text-sm text-muted">
          Definí los días y franjas en los que atendés. Los turnos se ofrecen solo en
          estos bloques.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <form onSubmit={onSubmit} className="card mb-6 grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <label>
          <span className="field-label">Día</span>
          <select
            className="field"
            value={form.weekday}
            onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Desde</span>
          <input
            className="field"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            required
          />
        </label>
        <label>
          <span className="field-label">Hasta</span>
          <input
            className="field"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            required
          />
        </label>
        <label>
          <span className="field-label">Duración turno</span>
          <select
            className="field"
            value={form.slot_minutes}
            onChange={(e) =>
              setForm({ ...form, slot_minutes: Number(e.target.value) })
            }
          >
            {[15, 20, 30, 45, 60].map((mins) => (
              <option key={mins} value={mins}>
                {mins} min
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={pending}>
            {pending ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl">Franjas configuradas</h2>
          <p className="text-sm text-muted">{rows.length} bloques</p>
        </div>
        <div className="divide-y divide-line">
          {loading && (
            <p className="px-5 py-6 text-sm text-muted">Cargando...</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted">
              Todavía no definiste horarios de atención.
            </p>
          )}
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-semibold">
                  {weekdayLabel(row.weekday)}{" "}
                  <span className="font-normal text-muted">
                    {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
                  </span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  Turnos de {row.slot_minutes} min ·{" "}
                  {row.active ? "Activo" : "Pausado"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => void toggleActive(row)}
                >
                  {row.active ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  className="btn-ghost text-danger"
                  disabled={pending}
                  onClick={() => setDeleteTarget(row)}
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
        badge="Horarios"
        title="¿Eliminar este horario?"
        message={
          deleteTarget
            ? `¿Estás seguro de que deseás eliminar el horario del ${weekdayLabel(deleteTarget.weekday)} ${deleteTarget.start_time.slice(0, 5)}–${deleteTarget.end_time.slice(0, 5)}?`
            : ""
        }
        confirmLabel="Sí, eliminar"
        pendingLabel="Eliminando..."
        danger
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmRemove()}
      />
    </div>
  );
}
