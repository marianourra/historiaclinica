import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ScheduleCalendar } from "../components/ScheduleCalendar";
import { useAuth } from "../context/AuthContext";
import {
  APPOINTMENT_TYPES,
  appointmentStatusLabel,
  appointmentTypeLabel,
  buildAvailableSlots,
  findNextAvailableSlot,
  formatSlotRange,
  formatSuggestedSlot,
  parseLocalDateInput,
  slotKeyOf,
  toLocalDateInput,
} from "../lib/agenda";
import { formatDateTime, fullName } from "../lib/format";
import {
  notifyAppointmentCancelled,
  notifyAppointmentCreated,
  notifyAppointmentUpdated,
} from "../lib/notifyAppointment";
import { supabase } from "../lib/supabase";
import type {
  Appointment,
  AppointmentType,
  DoctorSchedule,
  Patient,
} from "../lib/types";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message) return message;
  }
  return fallback;
}

export function Agenda() {
  const { user } = useAuth();
  const [day, setDay] = useState(toLocalDateInput());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [formDay, setFormDay] = useState("");
  const [formBusy, setFormBusy] = useState<Appointment[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotKey, setSlotKey] = useState("");
  const [suggestionLabel, setSuggestionLabel] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>("control_salud");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dayStart = useMemo(() => new Date(`${day}T00:00:00`), [day]);

  const formDayStart = useMemo(
    () => (formDay ? parseLocalDateInput(formDay) : null),
    [formDay],
  );

  async function loadStatic() {
    if (!user) return;
    const [schedRes, patientsRes] = await Promise.all([
      supabase.from("doctor_schedules").select("*").eq("doctor_id", user.id),
      supabase
        .from("patients")
        .select("id, first_name, last_name, document_number")
        .order("last_name"),
    ]);
    if (schedRes.error) throw schedRes.error;
    if (patientsRes.error) throw patientsRes.error;
    setSchedules((schedRes.data as DoctorSchedule[]) ?? []);
    setPatients((patientsRes.data as Patient[]) ?? []);
  }

  async function loadDay(listDay = day) {
    if (!user) return;
    const listStart = new Date(`${listDay}T00:00:00`);
    const listEnd = new Date(listStart);
    listEnd.setDate(listEnd.getDate() + 1);

    const { data, error: appsError } = await supabase
      .from("appointments")
      .select("*, patient:patients(first_name, last_name, document_number)")
      .eq("doctor_id", user.id)
      .gte("starts_at", listStart.toISOString())
      .lt("starts_at", listEnd.toISOString())
      .order("starts_at");
    if (appsError) throw appsError;
    setAppointments((data as Appointment[]) ?? []);
  }

  async function refresh(listDay = day) {
    await Promise.all([loadStatic(), loadDay(listDay)]);
  }

  useEffect(() => {
    let active = true;
    if (!user) return;
    loadStatic().catch((err) => {
      if (active) setError(errorMessage(err, "No se pudo cargar."));
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    loadDay(day)
      .catch((err) => {
        if (active) setError(errorMessage(err, "No se pudo cargar."));
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, day]);

  useEffect(() => {
    let active = true;
    async function loadFormAvailability() {
      if (!user || !showForm || editing || !patientId) {
        setFormBusy([]);
        setSuggestionLabel(null);
        return;
      }
      setSlotsLoading(true);
      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 42);
        const { data, error: busyError } = await supabase.rpc(
          "busy_slots_for_doctor",
          {
            p_doctor_id: user.id,
            p_from: from.toISOString(),
            p_to: to.toISOString(),
          },
        );
        if (busyError) throw busyError;
        if (!active) return;
        const busyRows = (
          (data as { starts_at: string; ends_at: string }[]) ?? []
        ).map(
          (item, index) =>
            ({
              id: `busy-${index}`,
              doctor_id: user.id,
              patient_id: "",
              starts_at: item.starts_at,
              ends_at: item.ends_at,
              status: "scheduled",
              appointment_type: "demanda_espontanea",
              reason: null,
              notes: null,
              created_by: "",
              created_at: "",
              updated_at: "",
            }) satisfies Appointment,
        );
        setFormBusy(busyRows);
        const next = findNextAvailableSlot(schedules, busyRows);
        if (next) {
          setFormDay(next.day);
          setSlotKey(slotKeyOf(next.slot));
          setSuggestionLabel(formatSuggestedSlot(next.day, next.slot));
        } else {
          setFormDay("");
          setSlotKey("");
          setSuggestionLabel(null);
        }
      } catch (err) {
        if (active) {
          setError(errorMessage(err, "No se pudieron cargar los horarios."));
        }
      } finally {
        if (active) setSlotsLoading(false);
      }
    }
    void loadFormAvailability();
    return () => {
      active = false;
    };
  }, [user, showForm, editing, patientId, schedules]);

  const slots = useMemo(() => {
    if (!patientId || !formDayStart) return [];
    return buildAvailableSlots(formDayStart, schedules, formBusy);
  }, [patientId, formDayStart, schedules, formBusy]);

  function openCreate() {
    setEditing(null);
    setPatientId("");
    setFormDay("");
    setSlotKey("");
    setFormBusy([]);
    setSuggestionLabel(null);
    setAppointmentType("control_salud");
    setNotes("");
    setShowForm(true);
  }

  function openEdit(row: Appointment) {
    setEditing(row);
    setPatientId(row.patient_id);
    setFormDay(toLocalDateInput(new Date(row.starts_at)));
    setSlotKey("");
    setAppointmentType(row.appointment_type ?? "demanda_espontanea");
    setNotes(row.notes ?? "");
    setShowForm(true);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      if (editing) {
        const { error: updateError } = await supabase
          .from("appointments")
          .update({
            appointment_type: appointmentType,
            notes: notes.trim() || null,
            status: editing.status,
          })
          .eq("id", editing.id);
        if (updateError) throw updateError;
        notifyAppointmentUpdated(editing.id);
      } else {
        if (!patientId || !formDay || !slotKey) {
          throw new Error("Completá paciente, fecha y horario.");
        }
        const [starts, ends] = slotKey.split("|");
        const { data: created, error: insertError } = await supabase
          .from("appointments")
          .insert({
            doctor_id: user.id,
            patient_id: patientId,
            starts_at: starts,
            ends_at: ends,
            status: "scheduled",
            appointment_type: appointmentType,
            notes: notes.trim() || null,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        if (created?.id) notifyAppointmentCreated(created.id);
        setDay(formDay);
      }
      setShowForm(false);
      await refresh(editing ? day : formDay);
    } catch (err) {
      const raw = errorMessage(err, "No se pudo guardar el turno.");
      setError(
        raw.includes("appointments_one_scheduled_per_patient_doctor") ||
          raw.includes("duplicate key")
          ? "Este paciente ya tiene un turno pendiente con vos. Debe atenderse o cancelarse antes de asignar otro."
          : raw.includes("appointments_no_overlap") || raw.includes("exclusion")
            ? "Ese horario acaba de ocuparse. Elegí otro."
            : raw,
      );
    } finally {
      setPending(false);
    }
  }

  async function setStatus(row: Appointment, status: Appointment["status"]) {
    setPending(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", row.id);
      if (updateError) throw updateError;
      if (status === "cancelled") {
        notifyAppointmentCancelled(row.id);
      } else if (status === "scheduled" && row.status === "cancelled") {
        notifyAppointmentUpdated(row.id);
      }
      await refresh(day);
    } catch (err) {
      const raw = errorMessage(err, "No se pudo actualizar.");
      setError(
        raw.includes("appointments_one_scheduled_per_patient_doctor") ||
          raw.includes("duplicate key")
          ? "Este paciente ya tiene otro turno pendiente. Cancelalo o atendelo antes de reactivar este."
          : raw,
      );
    } finally {
      setPending(false);
    }
  }

  const dayLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(dayStart);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Turnos
          </p>
          <h1 className="font-display mt-1 text-4xl">Turnos</h1>
          <p className="mt-2 text-sm capitalize text-muted">{dayLabel}</p>
        </div>
        {!showForm && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field w-auto"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              aria-label="Fecha de la agenda"
            />
            <button type="button" className="btn-primary" onClick={openCreate}>
              Asignar turno
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid gap-4 p-6">
          <h2 className="font-display text-2xl">
            {editing ? "Modificar turno" : "Nuevo turno"}
          </h2>
          {!editing && (
            <>
              <label>
                <span className="field-label">1. Paciente</span>
                <select
                  className="field"
                  value={patientId}
                  onChange={(e) => {
                    setPatientId(e.target.value);
                    setFormDay("");
                    setSlotKey("");
                    setSuggestionLabel(null);
                  }}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {fullName(p.first_name, p.last_name)} · {p.document_number}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="field-label">2. Fecha</span>
                {suggestionLabel && (
                  <p className="mb-3 rounded-xl bg-sage/60 px-3 py-2 text-sm text-teal-dark">
                    Próximo disponible sugerido:{" "}
                    <span className="font-semibold capitalize">{suggestionLabel}</span>
                  </p>
                )}
                <ScheduleCalendar
                  value={formDay}
                  schedules={schedules}
                  disabled={!patientId || slotsLoading}
                  onChange={(nextDay) => {
                    setFormDay(nextDay);
                    const dayDate = parseLocalDateInput(nextDay);
                    const daySlots = buildAvailableSlots(
                      dayDate,
                      schedules,
                      formBusy,
                    );
                    setSlotKey(daySlots[0] ? slotKeyOf(daySlots[0]) : "");
                  }}
                />
                {!patientId && (
                  <p className="mt-2 text-sm text-muted">
                    Elegí un paciente para ver los días habilitados.
                  </p>
                )}
              </div>
              <label>
                <span className="field-label">3. Horario disponible</span>
                <select
                  className="field"
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  required
                  disabled={!patientId || !formDay || slotsLoading}
                >
                  <option value="">
                    {!patientId
                      ? "Elegí un paciente primero"
                      : slotsLoading
                        ? "Cargando horarios..."
                        : !formDay
                          ? "Elegí una fecha"
                          : "Seleccionar..."}
                  </option>
                  {slots.map((slot) => {
                    const key = slotKeyOf(slot);
                    return (
                      <option key={key} value={key}>
                        {formatSlotRange(slot.startsAt, slot.endsAt)} (
                        {slot.slotMinutes} min)
                      </option>
                    );
                  })}
                </select>
                {patientId && formDay && !slotsLoading && slots.length === 0 && (
                  <p className="mt-2 text-sm text-muted">
                    No hay huecos libres esa fecha. Elegí otro día habilitado.
                  </p>
                )}
              </label>
            </>
          )}
          {editing && (
            <p className="text-sm text-muted">
              {formatDateTime(editing.starts_at)} –{" "}
              {formatDateTime(editing.ends_at)} ·{" "}
              {editing.patient
                ? fullName(editing.patient.first_name, editing.patient.last_name)
                : "Paciente"}
            </p>
          )}
          <label>
            <span className="field-label">Tipo de turno</span>
            <select
              className="field"
              value={appointmentType}
              onChange={(e) =>
                setAppointmentType(e.target.value as AppointmentType)
              }
              required
            >
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="field-label">Notas internas</span>
            <textarea
              className="field min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={pending}>
              {pending ? "Guardando..." : editing ? "Guardar" : "Asignar"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-2xl">Turnos del día</h2>
            <p className="text-sm text-muted">{appointments.length} registros</p>
          </div>
          <div className="divide-y divide-line">
            {listLoading && (
              <p className="px-5 py-6 text-sm text-muted">Cargando...</p>
            )}
            {!listLoading && appointments.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted">
                No hay turnos cargados para esta fecha.
              </p>
            )}
            {!listLoading &&
              appointments.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {formatDateTime(row.starts_at)}
                    <span className="ml-2 text-sm font-normal text-muted">
                      hasta{" "}
                      {new Intl.DateTimeFormat("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(row.ends_at))}
                    </span>
                    <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-teal-dark">
                      {appointmentStatusLabel(row.status)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm">
                    {row.patient
                      ? fullName(row.patient.first_name, row.patient.last_name)
                      : "Paciente"}
                    {row.patient?.document_number
                      ? ` · Doc. ${row.patient.document_number}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {appointmentTypeLabel(row.appointment_type)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={pending}
                    onClick={() => openEdit(row)}
                  >
                    Editar
                  </button>
                  {row.status === "scheduled" && (
                    <>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={pending}
                        onClick={() => void setStatus(row, "completed")}
                      >
                        Atendido
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-danger"
                        disabled={pending}
                        onClick={() => void setStatus(row, "cancelled")}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {row.status === "cancelled" && (
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={pending}
                      onClick={() => void setStatus(row, "scheduled")}
                    >
                      Reactivar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
    </div>
  );
}
