import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../lib/authErrors";

export function Login() {
  const { session, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(identifier, password);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
      <section className="max-w-xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal">
          Consultorio
        </p>
        <h1 className="font-display text-5xl leading-tight text-ink">
          Historia clínica clara, seguimiento continuo.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted">
          Registrá pacientes, abrí consultas y dejá constancia de cada evolución
          en un entorno pensado para el trabajo diario del médico.
        </p>
      </section>

      <form onSubmit={onSubmit} className="card mx-auto w-full max-w-md p-8">
        <h2 className="font-display text-2xl">Ingresar</h2>
        <p className="mt-1 mb-6 text-sm text-muted">
          Usá tu usuario o el correo. Para probar: usuario <strong>medico</strong>{" "}
          / contraseña <strong>consultorio123</strong>.
        </p>
        <label className="mb-4 block">
          <span className="field-label">Usuario o correo</span>
          <input
            className="field"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="mb-6 block">
          <span className="field-label">Contraseña</span>
          <input
            className="field"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando..." : "Entrar al consultorio"}
        </button>
        <p className="mt-5 text-center text-sm text-muted">
          ¿Todavía no tenés cuenta?{" "}
          <Link to="/registro" className="font-semibold text-teal">
            Crear usuario médico
          </Link>
        </p>
      </form>
    </div>
  );
}
