import { supabase } from "./supabase";

export type AppointmentNotifyEvent = "created" | "updated" | "cancelled";

/** Fire-and-forget: does not block or fail the booking if mail fails. */
export function notifyAppointment(
  appointmentId: string,
  event: AppointmentNotifyEvent = "created",
) {
  void supabase.functions
    .invoke("notify-appointment", {
      body: { appointment_id: appointmentId, event },
    })
    .then(({ error, data }) => {
      if (error) {
        console.warn("No se pudo enviar la notificación del turno:", error.message);
        return;
      }
      if (data?.error) {
        console.warn("No se pudo enviar la notificación del turno:", data.error);
      }
    })
    .catch((err) => {
      console.warn("No se pudo enviar la notificación del turno:", err);
    });
}

export function notifyAppointmentCreated(appointmentId: string) {
  notifyAppointment(appointmentId, "created");
}

export function notifyAppointmentUpdated(appointmentId: string) {
  notifyAppointment(appointmentId, "updated");
}

export function notifyAppointmentCancelled(appointmentId: string) {
  notifyAppointment(appointmentId, "cancelled");
}
