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

export function ageFromBirthDate(value: string | null) {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const birth = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const month = today.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
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
