import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authErrorMessage } from "../lib/authErrors";

const REMEMBER_KEY = "consultorio_virtual_remember";

type RememberedCredentials = {
  identifier: string;
  password: string;
};

function loadRemembered(): RememberedCredentials | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedCredentials;
    if (
      typeof parsed?.identifier === "string" &&
      typeof parsed?.password === "string" &&
      parsed.identifier.trim()
    ) {
      return parsed;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function saveRemembered(credentials: RememberedCredentials) {
  localStorage.setItem(REMEMBER_KEY, JSON.stringify(credentials));
}

function clearRemembered() {
  localStorage.removeItem(REMEMBER_KEY);
}

export function Login() {
  const { session, profile, loading, profileLoading, signIn } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadRemembered();
    if (saved) {
      setIdentifier(saved.identifier);
      setPassword(saved.password);
      setRemember(true);
    }
    setHydrated(true);
  }, []);

  if (session && !loading && !profileLoading) {
    return (
      <Navigate
        to={profile?.role === "paciente" ? "/portal" : "/"}
        replace
      />
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await signIn(identifier, password);
      if (remember) {
        saveRemembered({
          identifier: identifier.trim(),
          password,
        });
      } else {
        clearRemembered();
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_20%_0%,rgb(207_228_216/0.7),transparent_55%),radial-gradient(ellipse_at_90%_10%,rgb(243_231_200/0.55),transparent_45%)]"
      />

      <div className="relative mx-auto grid w-full items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-teal">
            Acceso seguro
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-ink sm:text-6xl">
            Consultorio Virtual
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted">
            Historias clínicas, agenda de turnos y portal para pacientes en un
            solo lugar.
          </p>
        </section>

        <form
          onSubmit={onSubmit}
          className="card mx-auto w-full max-w-md p-8 sm:p-9"
        >
          <h2 className="font-display text-2xl text-ink">Ingresar</h2>
          <p className="mt-1 mb-7 text-sm text-muted">
            Iniciá sesión con tu usuario o correo.
          </p>

          <label className="mb-4 block">
            <span className="field-label">Usuario o correo</span>
            <input
              className="field"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
              disabled={!hydrated}
            />
          </label>

          <label className="mb-4 block">
            <span className="field-label">Contraseña</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={remember ? "current-password" : "off"}
              required
              disabled={!hydrated}
            />
          </label>

          <label className="mb-6 flex cursor-pointer items-start gap-3 select-none">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-line accent-teal"
              checked={remember}
              onChange={(e) => {
                const next = e.target.checked;
                setRemember(next);
                if (!next) clearRemembered();
              }}
            />
            <span className="text-sm leading-5 text-ink">
              Recordar usuario y contraseña
              <span className="mt-0.5 block text-xs text-muted">
                Se guardan en este dispositivo para el próximo ingreso.
              </span>
            </span>
          </label>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button className="btn-primary w-full" disabled={pending || !hydrated}>
            {pending ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
