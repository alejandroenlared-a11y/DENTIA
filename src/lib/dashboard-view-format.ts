import { AppointmentStatus, PatientIntakeStatus, PatientStatus } from "@prisma/client";
import type { Tone } from "@/components/clinical-ui";
import { formatDateTime } from "@/lib/format";

export function patientStatusTone(status: PatientStatus): Tone {
  switch (status) {
    case PatientStatus.ACTIVE:
      return "green";
    case PatientStatus.OPEN_BUDGET:
      return "purple";
    case PatientStatus.URGENT:
      return "red";
    case PatientStatus.INACTIVE:
      return "orange";
    case PatientStatus.NEW_LEAD:
    default:
      return "blue";
  }
}

export function patientStatusLabel(status: PatientStatus) {
  switch (status) {
    case PatientStatus.NEW_LEAD:
      return "Nuevo";
    case PatientStatus.ACTIVE:
      return "Activo";
    case PatientStatus.INACTIVE:
      return "Baja";
    case PatientStatus.OPEN_BUDGET:
      return "Presupuesto";
    case PatientStatus.URGENT:
      return "Urgente";
    default:
      return status;
  }
}

export function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function appointmentStatusTone(status: AppointmentStatus): Tone {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.COMPLETED:
      return "green";
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return "red";
    case AppointmentStatus.URGENT:
      return "orange";
    case AppointmentStatus.PROPOSED:
      return "purple";
    default:
      return "blue";
  }
}

export function patientIntakeStatusTone(status: PatientIntakeStatus): Tone {
  switch (status) {
    case PatientIntakeStatus.LINKED:
      return "green";
    case PatientIntakeStatus.DUPLICATE_REVIEW:
      return "orange";
    case PatientIntakeStatus.DISCARDED:
      return "red";
    case PatientIntakeStatus.CAPTURED:
    default:
      return "purple";
  }
}

export function patientIntakeStatusLabel(status: PatientIntakeStatus) {
  switch (status) {
    case PatientIntakeStatus.LINKED:
      return "Vinculada";
    case PatientIntakeStatus.DUPLICATE_REVIEW:
      return "Revisar duplicado";
    case PatientIntakeStatus.DISCARDED:
      return "Descartada";
    case PatientIntakeStatus.CAPTURED:
    default:
      return "Capturada";
  }
}

export function appointmentStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
      return "Confirmada";
    case AppointmentStatus.COMPLETED:
      return "Completada";
    case AppointmentStatus.NO_SHOW:
      return "No asistio";
    case AppointmentStatus.CANCELLED:
      return "Cancelada";
    case AppointmentStatus.URGENT:
      return "Urgente";
    case AppointmentStatus.PROPOSED:
      return "Propuesta";
    case AppointmentStatus.REQUESTED:
    default:
      return "Solicitada";
  }
}

export function formatAppointmentAuditAction(action: string, metadata: unknown) {
  const previousStartsAt = metadataDate(metadata, "previousStartsAt");
  const newStartsAt = metadataDate(metadata, "newStartsAt");

  switch (action) {
    case "appointment.created":
    case "api.appointment.created":
      return "Cita creada por recepcion/API";
    case "agent.appointment_proposed":
      return "Cita propuesta por Clara";
    case "agent.appointment_slot_selected":
      return "Paciente eligio un hueco propuesto por Clara";
    case "agent.urgent_slot_confirmed":
      return "Urgencia confirmada por Clara";
    case "appointment.rescheduled":
    case "agent.appointment_rescheduled":
      return previousStartsAt && newStartsAt
        ? `Cita modificada: de ${previousStartsAt} a ${newStartsAt}`
        : "Cita modificada";
    case "appointment.cancelled":
    case "agent.appointment_cancelled":
      return "Cita cancelada";
    case "notification.appointment_webhook_sent":
      return "Email enviado a traves de Make";
    case "notification.appointment_webhook_failed":
      return "Fallo enviando email a Make";
    case "notification.appointment_webhook_error":
      return "Error tecnico enviando email a Make";
    default:
      return action;
  }
}

function metadataDate(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value !== "string" && !(value instanceof Date)) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDateTime(date);
}
