export function authErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();

  if (lower.includes("email address") && lower.includes("invalid")) {
    return "Ese correo no es válido para el alta. Evitá dominios de prueba como example.com y usá un correo real (Gmail, Outlook, etc.).";
  }
  if (lower.includes("already registered") || lower.includes("user already")) {
    return "Ese correo ya tiene una cuenta. Probá ingresar o usá otro correo.";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Usuario o contraseña incorrectos.";
  }
  if (lower.includes("email not confirmed")) {
    return "El correo todavía no está confirmado. Revisá la bandeja de entrada.";
  }
  if (message) return message;
  return "No se pudo completar la operación.";
}
