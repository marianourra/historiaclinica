export function fullName(first: string, last: string) {
  return `${last}, ${first}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function parseBirthDate(value: string | null) {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const birth = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  return birth;
}

export function ageFromBirthDate(value: string | null, at = new Date()) {
  const birth = parseBirthDate(value);
  if (!birth) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const month = at.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && at.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
}

/** Completed months of age (0 if birth date is in the future). */
export function ageInMonths(value: string | null, at = new Date()) {
  const birth = parseBirthDate(value);
  if (!birth) return null;
  let months =
    (at.getFullYear() - birth.getFullYear()) * 12 +
    (at.getMonth() - birth.getMonth());
  if (at.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Age label: months if under 2 years, otherwise years. */
export function formatAge(value: string | null, at = new Date()) {
  const months = ageInMonths(value, at);
  if (months == null) return null;
  if (months < 24) {
    return months === 1 ? "1 mes" : `${months} meses`;
  }
  const years = ageFromBirthDate(value, at);
  if (years == null) return null;
  return years === 1 ? "1 año" : `${years} años`;
}

export function sexLabel(sex: string | null) {
  if (sex === "F") return "Femenino";
  if (sex === "M") return "Masculino";
  if (sex === "X") return "Otro";
  return "No informado";
}

const CONSULTATION_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

export function canEditConsultation(createdAt: string, now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now - created < CONSULTATION_EDIT_WINDOW_MS;
}

export function consultationEditDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + CONSULTATION_EDIT_WINDOW_MS);
}

export function bodyMassIndex(weight?: string, heightCm?: string) {
  const kilos = Number(String(weight ?? "").replace(",", "."));
  const meters = Number(String(heightCm ?? "").replace(",", ".")) / 100;
  if (!kilos || !meters || kilos <= 0 || meters <= 0) return "";
  return (kilos / (meters * meters)).toFixed(1);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
