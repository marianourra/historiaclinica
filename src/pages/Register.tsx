import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../lib/authErrors";

export function Register() {
  const { session, signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signUp({ email, password, fullName, username, specialty });
      setDone(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-10">
      <form onSubmit={onSubmit} className="card w-full p-8">
        <h1 className="font-display text-3xl">Alta de médico</h1>
        <p className="mt-1 mb-6 text-sm text-muted">
          Creá tu usuario para registrar pacientes y consultas. El correo tiene
          que ser real: Supabase rechaza dominios de prueba como example.com.
        </p>
        {done ? (
          <div className="rounded-2xl bg-sage/60 p-5 text-sm leading-6 text-teal-dark">
            Cuenta creada. Si el proyecto pide confirmación de correo, revisá tu
            bandeja y después{" "}
            <Link to="/ingresar" className="font-semibold underline">
              ingresá acá
            </Link>
            .
          </div>
        ) : (
          <>
            <label className="mb-4 block">
              <span className="field-label">Nombre completo</span>
              <input
                className="field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </label>
            <label className="mb-4 block">
              <span className="field-label">Usuario</span>
              <input
                className="field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-zA-Z0-9._-]{3,32}"
                title="3 a 32 caracteres: letras, números, punto, guion o guion bajo"
                required
              />
            </label>
            <label className="mb-4 block">
              <span className="field-label">Correo</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="mb-4 block">
              <span className="field-label">Especialidad</span>
              <input
                className="field"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Clínica médica, pediatría..."
              />
            </label>
            <label className="mb-6 block">
              <span className="field-label">Contraseña</span>
              <input
                className="field"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && (
              <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <button className="btn-primary w-full" disabled={pending}>
              {pending ? "Creando..." : "Crear cuenta"}
            </button>
          </>
        )}
        <p className="mt-5 text-center text-sm text-muted">
          ¿Ya tenés usuario?{" "}
          <Link to="/ingresar" className="font-semibold text-teal">
            Ingresar
          </Link>
        </p>
      </form>
    </div>
  );
}
