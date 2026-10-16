import type { Appointment, AppointmentType, DoctorSchedule } from "./types";

export const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
] as const;

export const APPOINTMENT_TYPES: {
  value: AppointmentType;
  label: string;
}[] = [
  { value: "control_salud", label: "Control de salud" },
  { value: "demanda_espontanea", label: "Demanda espontánea" },
];

export function weekdayLabel(day: number) {
  return WEEKDAYS.find((item) => item.value === day)?.label ?? `Día ${day}`;
}

export function appointmentStatusLabel(status: string) {
  if (status === "scheduled") return "Confirmado";
  if (status === "cancelled") return "Cancelado";
  if (status === "completed") return "Atendido";
  return status;
}

export function appointmentTypeLabel(type: string | null | undefined) {
  return APPOINTMENT_TYPES.find((item) => item.value === type)?.label ?? type ?? "—";
}

function parseTimeToMinutes(value: string) {
  const [h, m] = value.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function dateAtMinutes(day: Date, minutes: number) {
  const next = new Date(day);
  next.setHours(0, 0, 0, 0);
  next.setMinutes(minutes);
  return next;
}

export function buildAvailableSlots(
  day: Date,
  schedules: DoctorSchedule[],
  appointments: Pick<Appointment, "starts_at" | "ends_at" | "status">[],
  options?: { from?: Date },
) {
  const weekday = day.getDay();
  const blocks = schedules.filter((item) => item.active && item.weekday === weekday);
  const busy = appointments.filter((item) => item.status === "scheduled");
  const slots: { startsAt: Date; endsAt: Date; slotMinutes: number }[] = [];
  const now = options?.from ?? new Date();

  for (const block of blocks) {
    const startMin = parseTimeToMinutes(block.start_time);
    const endMin = parseTimeToMinutes(block.end_time);
    for (
      let cursor = startMin;
      cursor + block.slot_minutes <= endMin;
      cursor += block.slot_minutes
    ) {
      const startsAt = dateAtMinutes(day, cursor);
      const endsAt = dateAtMinutes(day, cursor + block.slot_minutes);
      if (startsAt <= now) continue;
      const overlaps = busy.some((item) => {
        const a = new Date(item.starts_at).getTime();
        const b = new Date(item.ends_at).getTime();
        return startsAt.getTime() < b && endsAt.getTime() > a;
      });
      if (!overlaps) {
        slots.push({ startsAt, endsAt, slotMinutes: block.slot_minutes });
      }
    }
  }

  return slots.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function formatSlotRange(startsAt: Date, endsAt: Date) {
  const fmt = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(startsAt)} – ${fmt.format(endsAt)}`;
}

export function toLocalDateInput(value = new Date()) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function parseLocalDateInput(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Weekdays (0–6) with at least one active schedule block. */
export function activeWeekdays(schedules: DoctorSchedule[]) {
  return new Set(
    schedules.filter((item) => item.active).map((item) => item.weekday),
  );
}

export function isScheduleDay(date: Date, schedules: DoctorSchedule[]) {
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  if (day < today) return false;
  return activeWeekdays(schedules).has(day.getDay());
}

export type SlotOption = {
  startsAt: Date;
  endsAt: Date;
  slotMinutes: number;
};

/** First free slot within maxDays, walking only schedule weekdays. */
export function findNextAvailableSlot(
  schedules: DoctorSchedule[],
  busy: Pick<Appointment, "starts_at" | "ends_at" | "status">[],
  options?: { from?: Date; maxDays?: number },
): { day: string; slot: SlotOption } | null {
  const from = options?.from ?? new Date();
  const maxDays = options?.maxDays ?? 60;
  const weekdays = activeWeekdays(schedules);
  if (weekdays.size === 0) return null;

  const cursor = startOfDay(from);
  for (let i = 0; i < maxDays; i += 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + i);
    if (!weekdays.has(day.getDay())) continue;
    const slots = buildAvailableSlots(day, schedules, busy, { from });
    if (slots[0]) {
      return { day: toLocalDateInput(day), slot: slots[0] };
    }
  }
  return null;
}

export function formatSuggestedSlot(day: string, slot: SlotOption) {
  const date = parseLocalDateInput(day);
  const dayLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(date);
  return `${dayLabel} · ${formatSlotRange(slot.startsAt, slot.endsAt)}`;
}

export function slotKeyOf(slot: Pick<SlotOption, "startsAt" | "endsAt">) {
  return `${slot.startsAt.toISOString()}|${slot.endsAt.toISOString()}`;
}
