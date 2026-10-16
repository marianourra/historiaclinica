import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { appointmentStatusLabel, appointmentTypeLabel } from "../lib/agenda";
import { formatDateTime } from "../lib/format";
import { notifyAppointmentCancelled } from "../lib/notifyAppointment";
import { supabase } from "../lib/supabase";
import type { Appointment } from "../lib/types";

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const message = String((err as { message: unknown }).message ?? "");
    if (message) return message;
  }
  return fallback;
}

function AppointmentRow({
  row,
  showCancel,
  pending,
  onCancel,
}: {
  row: Appointment;
  showCancel?: boolean;
  pending?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div>
        <p className="font-semibold">
          {formatDateTime(row.starts_at)}
          <span className="ml-2 rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-teal-dark">
            {appointmentStatusLabel(row.status)}
          </span>
        </p>
        <p className="mt-1 text-sm">
          {row.doctor?.full_name || "Médico"}
          {row.doctor?.specialty ? ` · ${row.doctor.specialty}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          {appointmentTypeLabel(row.appointment_type)}
          {" · "}
          {new Intl.DateTimeFormat("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(row.starts_at))}
          {" – "}
          {new Intl.DateTimeFormat("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(row.ends_at))}
        </p>
      </div>
      {showCancel && onCancel && (
        <button
          type="button"
          className="btn-ghost text-danger"
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar turno
        </button>
      )}
    </div>
  );
}

export function PatientPortalAppointments() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  useEffect(() => {
    const state = location.state as { booked?: boolean } | null;
    if (state?.booked) {
      setSuccess("Tu turno se ha agendado correctamente.");
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  async function refresh() {
    if (!profile?.patient_id) return;
    const { data, error: loadError } = await supabase
      .from("appointments")
      .select("*, doctor:profiles!appointments_doctor_id_fkey(full_name, specialty)")
      .eq("patient_id", profile.patient_id)
      .order("starts_at", { ascending: false });
    if (loadError) throw loadError;
    setRows((data as Appointment[]) ?? []);
  }

  useEffect(() => {
    let active = true;
    if (!profile?.patient_id) {
      setError("Tu usuario no está vinculado a una ficha de paciente.");
      setLoading(false);
      return;
    }
    refresh()
      .catch((err) => {
        if (active) setError(errorMessage(err, "No se pudo cargar."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profile?.patient_id]);

  const { pendingRows, historyRows } = useMemo(() => {
    const pendingList = rows
      .filter((row) => row.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      );
    const historyList = rows
      .filter((row) => row.status !== "scheduled")
      .sort(
        (a, b) =>
          new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
    return { pendingRows: pendingList, historyRows: historyList };
  }, [rows]);

  async function confirmCancel() {
    if (!cancelTarget) return;
    const row = cancelTarget;
    setPending(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", row.id);
      if (updateError) throw updateError;
      notifyAppointmentCancelled(row.id);
      setCancelTarget(null);
      setSuccess("El turno programado fue cancelado.");
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo cancelar."));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal">
            Turnos
          </p>
          <h1 className="font-display mt-1 text-4xl">Mis turnos</h1>
          <p className="mt-2 text-sm text-muted">
            Revisá tus turnos pendientes o pedí uno nuevo.
          </p>
        </div>
        <Link to="/portal/turnos/nuevo" className="btn-primary">
          Pedir turno
        </Link>
      </div>

      {success && (
        <p className="mb-4 rounded-xl bg-sage/70 px-4 py-3 text-sm font-medium text-teal-dark">
          {success}
        </p>
      )}
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <p className="text-muted">Cargando turnos...</p>
      ) : (
        <>
          <section className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-xl">Turnos pendientes</h2>
            </div>
            <div className="divide-y divide-line">
              {pendingRows.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">
                  No tenés turnos pendientes agendados actualmente.{" "}
                  <Link
                    to="/portal/turnos/nuevo"
                    className="font-semibold text-teal underline underline-offset-2"
                  >
                    Pedir turno
                  </Link>
                </p>
              ) : (
                pendingRows.map((row) => (
                  <AppointmentRow
                    key={row.id}
                    row={row}
                    showCancel={
                      new Date(row.starts_at).getTime() > Date.now()
                    }
                    pending={pending}
                    onCancel={() => {
                      setError(null);
                      setCancelTarget(row);
                    }}
                  />
                ))
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-display mb-3 text-2xl">Historial de turnos</h2>
            <div className="card overflow-hidden">
              <div className="divide-y divide-line">
                {historyRows.length === 0 ? (
                  <p className="px-5 py-8 text-sm text-muted">
                    Todavía no hay turnos atendidos o cancelados.
                  </p>
                ) : (
                  historyRows.map((row) => (
                    <AppointmentRow key={row.id} row={row} />
                  ))
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        badge="Cancelar turno"
        title="¿Confirmás la cancelación?"
        message={
          cancelTarget
            ? `¿Estás seguro de que deseás confirmar la cancelación del turno programado${
                cancelTarget.doctor?.full_name
                  ? ` con ${cancelTarget.doctor.full_name}`
                  : ""
              } del ${formatDateTime(cancelTarget.starts_at)}?`
            : ""
        }
        confirmLabel="Sí, cancelar turno"
        pendingLabel="Cancelando..."
        danger
        pending={pending}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
