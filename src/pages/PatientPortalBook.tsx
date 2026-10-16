import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScheduleCalendar } from "../components/ScheduleCalendar";
import { useAuth } from "../context/AuthContext";
import {
  APPOINTMENT_TYPES,
  buildAvailableSlots,
  findNextAvailableSlot,
  formatSlotRange,
  formatSuggestedSlot,
  parseLocalDateInput,
  slotKeyOf,
  toLocalDateInput,
} from "../lib/agenda";
import { notifyAppointmentCreated } from "../lib/notifyAppointment";
import { supabase } from "../lib/supabase";
import type {
  Appointment,
  AppointmentType,
  DoctorSchedule,
  Profile,
} from "../lib/types";

type DoctorOption = Pick<Profile, "id" | "full_name" | "specialty">;

export function PatientPortalBook() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [day, setDay] = useState("");
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [busy, setBusy] = useState<Appointment[]>([]);
  const [appointmentType, setAppointmentType] =
    useState<AppointmentType>("control_salud");
  const [slotKey, setSlotKey] = useState("");
  const [suggestionLabel, setSuggestionLabel] = useState<string | null>(null);
  const [pendingByDoctor, setPendingByDoctor] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingWithSelectedDoctor = doctorId
    ? pendingByDoctor[doctorId] ?? null
    : null;

  const dayStart = useMemo(
    () => (day ? parseLocalDateInput(day) : null),
    [day],
  );

  useEffect(() => {
    let active = true;
    async function loadDoctorsAndPending() {
      try {
        const doctorsRes = await supabase
          .from("profiles")
          .select("id, full_name, specialty")
          .eq("role", "medico")
          .order("full_name");
        if (doctorsRes.error) throw doctorsRes.error;
        if (!active) return;

        const rows = (doctorsRes.data as DoctorOption[]) ?? [];
        setDoctors(rows);
        if (rows[0]) setDoctorId(rows[0].id);

        if (profile?.patient_id) {
          const pendingRes = await supabase
            .from("appointments")
            .select("id, doctor_id")
            .eq("patient_id", profile.patient_id)
            .eq("status", "scheduled");
          if (pendingRes.error) throw pendingRes.error;
          if (!active) return;
          const map: Record<string, string> = {};
          for (const row of pendingRes.data ?? []) {
            map[row.doctor_id] = row.id;
          }
          setPendingByDoctor(map);
        } else {
          setPendingByDoctor({});
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los médicos.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDoctorsAndPending();
    return () => {
      active = false;
    };
  }, [profile?.patient_id]);

  useEffect(() => {
    let active = true;
    async function loadAvailability() {
      if (!doctorId) return;
      setSlotsLoading(true);
      setError(null);
      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 42);
        const [schedRes, busyRes] = await Promise.all([
          supabase
            .from("doctor_schedules")
            .select("*")
            .eq("doctor_id", doctorId)
            .eq("active", true),
          supabase.rpc("busy_slots_for_doctor", {
            p_doctor_id: doctorId,
            p_from: from.toISOString(),
            p_to: to.toISOString(),
          }),
        ]);
        if (schedRes.error) throw schedRes.error;
        if (busyRes.error) throw busyRes.error;
        if (!active) return;

        const scheduleRows = (schedRes.data as DoctorSchedule[]) ?? [];
        const busyRows = (
          (busyRes.data as { starts_at: string; ends_at: string }[]) ?? []
        ).map(
          (item, index) =>
            ({
              id: `busy-${index}`,
              doctor_id: doctorId,
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
        setSchedules(scheduleRows);
        setBusy(busyRows);

        const next = findNextAvailableSlot(scheduleRows, busyRows);
        if (next) {
          setDay(next.day);
          setSlotKey(slotKeyOf(next.slot));
          setSuggestionLabel(formatSuggestedSlot(next.day, next.slot));
        } else {
          setDay("");
          setSlotKey("");
          setSuggestionLabel(null);
        }
      } catch (err) {
        if (active) {
          const raw =
            err instanceof Error
              ? err.message
              : err && typeof err === "object" && "message" in err
                ? String((err as { message: unknown }).message ?? "")
                : "";
          setError(raw || "No se pudieron cargar los horarios.");
        }
      } finally {
        if (active) setSlotsLoading(false);
      }
    }
    void loadAvailability();
    return () => {
      active = false;
    };
  }, [doctorId]);

  const slots = useMemo(() => {
    if (!dayStart) return [];
    return buildAvailableSlots(dayStart, schedules, busy);
  }, [dayStart, schedules, busy]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !profile?.patient_id) {
      setError("Tu usuario no está vinculado a una ficha de paciente.");
      return;
    }
    if (!doctorId || !day || !slotKey) {
      setError("Elegí médico, fecha y horario.");
      return;
    }
    if (pendingByDoctor[doctorId]) {
      setError(
        "Ya tenés un turno pendiente asignado. Para solicitar un nuevo turno, primero cancelá el turno programado.",
      );
      return;
    }
    setPending(true);
    setError(null);
    try {
      const [starts, ends] = slotKey.split("|");
      const { data: created, error: insertError } = await supabase
        .from("appointments")
        .insert({
          doctor_id: doctorId,
          patient_id: profile.patient_id,
          starts_at: starts,
          ends_at: ends,
          status: "scheduled",
          appointment_type: appointmentType,
          created_by: user.id,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      if (created?.id) notifyAppointmentCreated(created.id);
      navigate("/portal/turnos", { state: { booked: true } });
    } catch (err) {
      const raw =
        err instanceof Error
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message ?? "")
            : "";
      const message = raw || "No se pudo agendar el turno.";
      setError(
        message.includes("appointments_one_scheduled_per_patient_doctor") ||
          message.includes("duplicate key")
          ? "Ya tenés un turno pendiente asignado. Para solicitar un nuevo turno, primero cancelá el turno programado."
          : message.includes("appointments_no_overlap") ||
              message.includes("exclusion")
            ? "Ese horario acaba de ocuparse. Elegí otro."
            : message,
      );
    } finally {
      setPending(false);
    }
  }

  if (loading) return <p className="text-muted">Cargando médicos...</p>;

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
          Turnos
        </p>
        <h1 className="font-display mt-1 text-4xl">Pedir turno</h1>
        <p className="mt-2 text-sm text-muted">
          Elegí tipo, médico, día y un horario disponible según su agenda.
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {!profile?.patient_id ? (
        <div className="card p-6 text-sm text-muted">
          Tu cuenta aún no está vinculada a una ficha. Contactá al consultorio.
        </div>
      ) : doctors.length === 0 ? (
        <div className="card p-6 text-sm text-muted">
          No hay médicos disponibles para agendar.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card grid max-w-xl gap-4 p-6">
          <label>
            <span className="field-label">Médico</span>
            <select
              className="field"
              value={doctorId}
              onChange={(e) => {
                setDoctorId(e.target.value);
                setDay("");
                setSlotKey("");
                setSuggestionLabel(null);
                setError(null);
              }}
              required
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.full_name}
                  {doctor.specialty ? ` · ${doctor.specialty}` : ""}
                  {pendingByDoctor[doctor.id] ? " · (turno pendiente)" : ""}
                </option>
              ))}
            </select>
          </label>
          {pendingWithSelectedDoctor ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p>
                Ya tenés un turno pendiente asignado. Para solicitar un nuevo
                turno, primero cancelá el turno programado.
              </p>
              <Link
                to="/portal/turnos"
                className="mt-2 inline-block font-semibold text-teal underline-offset-2 hover:underline"
              >
                Ver mis turnos
              </Link>
            </div>
          ) : (
            <>
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
              <div>
                <span className="field-label">Fecha</span>
                {suggestionLabel && (
                  <p className="mb-3 rounded-xl bg-sage/60 px-3 py-2 text-sm text-teal-dark">
                    Próximo disponible sugerido:{" "}
                    <span className="font-semibold capitalize">
                      {suggestionLabel}
                    </span>
                  </p>
                )}
                <ScheduleCalendar
                  value={day}
                  schedules={schedules}
                  disabled={!doctorId || slotsLoading}
                  minDate={toLocalDateInput()}
                  onChange={(nextDay) => {
                    setDay(nextDay);
                    const dayDate = parseLocalDateInput(nextDay);
                    const daySlots = buildAvailableSlots(
                      dayDate,
                      schedules,
                      busy,
                    );
                    setSlotKey(daySlots[0] ? slotKeyOf(daySlots[0]) : "");
                  }}
                />
              </div>
              <label>
                <span className="field-label">Horario</span>
                <select
                  className="field"
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  required
                  disabled={slotsLoading || !day}
                >
                  <option value="">
                    {slotsLoading
                      ? "Cargando..."
                      : !day
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
                {!slotsLoading && day && slots.length === 0 && (
                  <p className="mt-2 text-sm text-muted">
                    No hay turnos libres ese día con este médico.
                  </p>
                )}
              </label>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!pendingWithSelectedDoctor && (
              <button className="btn-primary" disabled={pending || !slotKey}>
                {pending ? "Agendando..." : "Confirmar turno"}
              </button>
            )}
            <Link to="/portal/turnos" className="btn-ghost">
              Volver
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
