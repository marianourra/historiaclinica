import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initials } from "../lib/format";

function navClass({ isActive }: { isActive: boolean }) {
  return `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-sage text-teal-dark"
      : "text-muted hover:bg-white/70 hover:text-ink"
  }`;
}

function topNavClass({ isActive }: { isActive: boolean }) {
  return `rounded-full px-3 py-1.5 text-sm font-medium ${
    isActive ? "bg-sage text-teal-dark" : "text-muted hover:text-ink"
  }`;
}

export function Layout() {
  const { profile, user, signOut } = useAuth();
  const name = profile?.full_name || user?.email || "Usuario";
  const isAdmin = Boolean(profile?.is_admin);
  const isPatient = profile?.role === "paciente";
  const isDoctor = !isPatient;
  const useSidebar = isAdmin || isPatient;

  return (
    <div className={`min-h-screen ${useSidebar ? "lg:grid lg:grid-cols-[240px_1fr]" : ""}`}>
      {useSidebar && (
        <aside className="border-b border-line/80 bg-card/90 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-4 py-5">
            <NavLink to={isPatient ? "/portal" : "/"} className="mb-6 flex items-center gap-3 px-1">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal text-sm font-bold text-white">
                CV
              </span>
              <span>
                <span className="font-display block text-lg leading-tight">
                  Consultorio Virtual
                </span>
                <span className="text-xs text-muted">
                  {isPatient ? "Portal del paciente" : "Administración"}
                </span>
              </span>
            </NavLink>
            <nav className="flex flex-col gap-1">
              {isPatient ? (
                <>
                  <NavLink to="/portal" end className={navClass}>
                    Mi historia
                  </NavLink>
                  <NavLink to="/portal/turnos" end className={navClass}>
                    Mis turnos
                  </NavLink>
                  <NavLink to="/portal/turnos/nuevo" className={navClass}>
                    Pedir turno
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/" end className={navClass}>
                    Pacientes
                  </NavLink>
                  <NavLink to="/pacientes/nuevo" className={navClass}>
                    Nuevo paciente
                  </NavLink>
                  <NavLink to="/agenda" end className={navClass}>
                    Turnos
                  </NavLink>
                  <NavLink to="/agenda/horarios" className={navClass}>
                    Configurar horarios
                  </NavLink>
                  {isAdmin && (
                    <NavLink to="/admin/parametrizacion" className={navClass}>
                      Parametrización
                    </NavLink>
                  )}
                </>
              )}
            </nav>
            <div className="mt-auto border-t border-line pt-4">
              <p className="px-1 text-sm font-semibold">{name}</p>
              <p className="px-1 text-xs text-muted">
                {isPatient
                  ? "Paciente"
                  : profile?.specialty || (isAdmin ? "Administrador" : "Médico")}
              </p>
              <button className="btn-ghost mt-3 w-full" onClick={() => void signOut()}>
                Salir
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="min-w-0">
        {isDoctor && !isAdmin && (
          <header className="sticky top-0 z-20 border-b border-line/80 bg-card/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
              <NavLink to="/" className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal text-sm font-bold text-white">
                  CV
                </span>
                <span>
                  <span className="font-display block text-lg leading-tight">
                    Consultorio Virtual
                  </span>
                  <span className="text-xs text-muted">Consultorio digital</span>
                </span>
              </NavLink>
              <nav className="hidden items-center gap-2 sm:flex">
                <NavLink to="/" end className={topNavClass}>
                  Pacientes
                </NavLink>
                <NavLink to="/pacientes/nuevo" className={topNavClass}>
                  Nuevo paciente
                </NavLink>
                <NavLink to="/agenda" end className={topNavClass}>
                  Turnos
                </NavLink>
                <NavLink to="/agenda/horarios" className={topNavClass}>
                  Configurar horarios
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
        )}

        {useSidebar && (
          <header className="sticky top-0 z-20 border-b border-line/80 bg-card/85 backdrop-blur-md lg:hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <p className="text-sm font-semibold">{name}</p>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-sage text-sm font-bold text-teal-dark">
                {initials(name)}
              </div>
            </div>
          </header>
        )}

        <main className="mx-auto max-w-6xl px-5 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
