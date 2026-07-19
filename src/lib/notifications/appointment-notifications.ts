import { type Prisma } from "@prisma/client";
import { fetchWithTimeout, resolveTimeoutMs } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const MAKE_APPOINTMENT_TIMEOUT_MS = resolveTimeoutMs("MAKE_APPOINTMENT_TIMEOUT_MS", 8_000);

export type AppointmentNotificationEventType = "created" | "rescheduled" | "cancelled";
export type AppointmentNotificationActor = { type: "staff" | "ai" | "api"; userId?: string | null };

type AppointmentWithNotificationRelations = Prisma.AppointmentGetPayload<{
  include: {
    tenant: true;
    patient: true;
    provider: true;
    operatory: true;
    treatment: true;
  };
}>;

type AppointmentNotificationIntake = {
  id: string;
  accessCode: string;
  status: string;
} | null;

export async function notifyAppointmentEvent(input: {
  tenantId: string;
  appointmentId: string;
  eventType: AppointmentNotificationEventType;
  actor: AppointmentNotificationActor;
  previousStartsAt?: Date | null;
  reason?: string | null;
}) {
  const webhookUrl = process.env.MAKE_APPOINTMENT_WEBHOOK_URL;
  if (!webhookUrl) {
    return { sent: false, reason: "MAKE_APPOINTMENT_WEBHOOK_URL no configurada" };
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, tenantId: input.tenantId },
    include: { tenant: true, patient: true, provider: true, operatory: true, treatment: true }
  });
  if (!appointment) {
    return { sent: false, reason: "Cita no encontrada" };
  }

  const patientIntake = await findPatientIntakeForAppointment(appointment.tenantId, appointment.patientId);
  const payload = buildAppointmentMakePayload(appointment, {
    eventType: input.eventType,
    actor: input.actor,
    previousStartsAt: input.previousStartsAt ?? null,
    reason: input.reason ?? null,
    patientIntake
  });

  try {
    const response = await fetchWithTimeout(
      webhookUrl,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      },
      MAKE_APPOINTMENT_TIMEOUT_MS
    );

    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actor.type === "staff" ? input.actor.userId ?? null : null,
        action: response.ok ? "notification.appointment_webhook_sent" : "notification.appointment_webhook_failed",
        entityType: "Appointment",
        entityId: input.appointmentId,
        metadata: {
          eventType: input.eventType,
          status: response.status,
          recipientEmail: appointment.patient.email,
          makeConfigured: true
        } as Prisma.InputJsonValue
      }
    });

    if (!response.ok) {
      return { sent: false, reason: `Make webhook ${response.status}` };
    }
    return { sent: true, reason: null };
  } catch (error) {
    console.error("notifyAppointmentEvent failed", error);
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actor.type === "staff" ? input.actor.userId ?? null : null,
        action: "notification.appointment_webhook_error",
        entityType: "Appointment",
        entityId: input.appointmentId,
        metadata: {
          eventType: input.eventType,
          recipientEmail: appointment.patient.email,
          error: error instanceof Error ? error.message : "unknown"
        } as Prisma.InputJsonValue
      }
    });
    return { sent: false, reason: error instanceof Error ? error.message : "Error enviando webhook Make" };
  }
}

export function buildAppointmentMakePayload(
  appointment: AppointmentWithNotificationRelations,
  context: {
    eventType: AppointmentNotificationEventType;
    actor: AppointmentNotificationActor;
    previousStartsAt?: Date | null;
    reason?: string | null;
    patientIntake?: AppointmentNotificationIntake;
    appBaseUrl?: string | null;
  }
) {
  const startsAt = appointment.startsAt;
  const endsAt = new Date(startsAt.getTime() + appointment.durationMinutes * 60_000);
  const patientPortalUrl = buildPatientPortalUrl(context.patientIntake?.accessCode, context.appBaseUrl);

  return {
    source: "dentia",
    sourceOfTruth: "dentia_native_calendar",
    eventId: `${context.eventType}:${appointment.id}:${appointment.updatedAt.toISOString()}`,
    eventType: context.eventType,
    occurredAt: new Date().toISOString(),
    shouldEmailPatient: Boolean(appointment.patient.email),
    patientPortalUrl,
    patientIntake: context.patientIntake
      ? {
          id: context.patientIntake.id,
          accessCode: context.patientIntake.accessCode,
          status: context.patientIntake.status,
          portalUrl: patientPortalUrl
        }
      : null,
    tenant: {
      id: appointment.tenant.id,
      name: appointment.tenant.name,
      slug: appointment.tenant.slug
    },
    patient: {
      id: appointment.patient.id,
      name: appointment.patient.name,
      phone: appointment.patient.phone,
      email: appointment.patient.email
    },
    appointment: {
      id: appointment.id,
      title: appointment.title,
      status: appointment.status,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      durationMinutes: appointment.durationMinutes,
      channel: appointment.channel,
      createdByAi: appointment.createdByAi,
      treatment: appointment.treatment
        ? { id: appointment.treatment.id, name: appointment.treatment.name }
        : null,
      provider: appointment.provider
        ? { id: appointment.provider.id, name: appointment.provider.name, specialty: appointment.provider.specialty }
        : null,
      operatory: appointment.operatory ? { id: appointment.operatory.id, name: appointment.operatory.name } : null
    },
    change: {
      previousStartsAt: context.previousStartsAt?.toISOString() ?? null,
      newStartsAt: startsAt.toISOString(),
      reason: context.reason ?? null
    },
    actor: {
      type: context.actor.type,
      userId: context.actor.userId ?? null
    },
    control: {
      calendarOwner: "dentia",
      makeRole: "email_delivery_only",
      patientEmailRequiredForPatientEmail: true
    }
  };
}

async function findPatientIntakeForAppointment(tenantId: string, patientId: string): Promise<AppointmentNotificationIntake> {
  const intake = await prisma.patientIntake.findFirst({
    where: { tenantId, patientId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, accessCode: true, status: true }
  });
  return intake ? { ...intake, status: intake.status } : null;
}

function buildPatientPortalUrl(accessCode?: string | null, appBaseUrl?: string | null) {
  if (!accessCode) return null;
  const baseUrl = (appBaseUrl || process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  if (!baseUrl) return null;
  return `${baseUrl}/ficha/${encodeURIComponent(accessCode)}`;
}
