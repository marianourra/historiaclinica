import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/format";

export function Layout() {
  const { profile, user, signOut } = useAuth();
  const name = profile?.full_name || user?.email || "Médico";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal text-sm font-bold text-white">
              HC
            </span>
            <span>
              <span className="font-display block text-lg leading-tight">
                Historia Clínica
              </span>
              <span className="text-xs text-muted">Consultorio digital</span>
            </span>
          </NavLink>
          <nav className="hidden items-center gap-2 sm:flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-sage text-teal-dark" : "text-muted hover:text-ink"
                }`
              }
            >
              Pacientes
            </NavLink>
            <NavLink
              to="/pacientes/nuevo"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 text-sm font-medium ${
                  isActive ? "bg-sage text-teal-dark" : "text-muted hover:text-ink"
                }`
              }
            >
              Nuevo paciente
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{name}</p>
              <p className="text-xs text-muted">
                {profile?.specialty || profile?.username || "Médico"}
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-sage text-sm font-bold text-teal-dark">
              {initials(name)}
            </div>
            <button className="btn-ghost" onClick={() => void signOut()}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
