"use server";

import {
  ConsentKind,
  ConversationChannel,
  PatientStatus,
  MessageDirection,
  TaskStatus,
  UserRole
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/tenant";
import {
  appointmentInputSchema,
  consentToggleSchema,
  conversationIdSchema,
  conversationReplySchema,
  firstErrorMessage,
  inviteUserSchema,
  patientInputSchema,
  settingsInputSchema,
  taskFromConversationSchema,
  taskIdSchema,
  taskInputSchema,
  treatmentInputSchema
} from "@/lib/validation";

type NoticeParams = Record<string, string | undefined>;

function backTo(view: string, params: NoticeParams): never {
  const query = new URLSearchParams({ view });
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  redirect(`/?${query.toString()}`);
}

function succeed(view: string, ok: string, extra: NoticeParams = {}): never {
  revalidatePath("/");
  backTo(view, { ...extra, ok });
}

export async function createPatientAction(formData: FormData) {
  const parsed = patientInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("patients", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const patient = await prisma.patient.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        status: PatientStatus.NEW_LEAD,
        source: parsed.data.source,
        preferredChannel: ConversationChannel.WHATSAPP,
        treatmentNeed: parsed.data.treatmentNeed,
        estimatedValue: parsed.data.estimatedValue * 100
      }
    });

    await prisma.consent.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        kind: ConsentKind.DATA_PROCESSING,
        granted: false,
        source: "manual"
      }
    });

    await audit(tenant.id, user.id, "patient.created", "Patient", patient.id);
  } catch (error) {
    console.error("createPatientAction failed", error);
    backTo("patients", { error: "No se pudo crear el paciente. Telefono duplicado?" });
  }

  succeed("patients", "Paciente creado correctamente.");
}

export async function toggleConsentAction(formData: FormData) {
  const parsed = consentToggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("patients", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const patient = await prisma.patient.findFirstOrThrow({
      where: { id: parsed.data.patientId, tenantId: tenant.id }
    });
    const existing = await prisma.consent.findUnique({
      where: {
        tenantId_patientId_kind: {
          tenantId: tenant.id,
          patientId: patient.id,
          kind: parsed.data.kind
        }
      }
    });
    const granted = !(existing?.granted ?? false);
    await prisma.consent.upsert({
      where: {
        tenantId_patientId_kind: {
          tenantId: tenant.id,
          patientId: patient.id,
          kind: parsed.data.kind
        }
      },
      create: {
        tenantId: tenant.id,
        patientId: patient.id,
        kind: parsed.data.kind,
        granted,
        grantedAt: granted ? new Date() : null,
        source: "recepcion"
      },
      update: { granted, grantedAt: granted ? new Date() : null, source: "recepcion" }
    });

    await audit(tenant.id, user.id, granted ? "consent.granted" : "consent.revoked", "Patient", patient.id);
  } catch (error) {
    console.error("toggleConsentAction failed", error);
    backTo("patients", { error: "No se pudo actualizar el consentimiento." });
  }

  succeed("patients", "Consentimiento actualizado.");
}

export async function createAppointmentAction(formData: FormData) {
  const parsed = appointmentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("calendar", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00.000Z`);
  if (Number.isNaN(startsAt.getTime())) {
    backTo("calendar", { error: "Fecha u hora no validas." });
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: parsed.data.patientId,
        treatmentId: parsed.data.treatmentId || null,
        providerId: parsed.data.providerId || null,
        operatoryId: parsed.data.operatoryId || null,
        title: parsed.data.title,
        startsAt,
        status: parsed.data.status,
        channel: parsed.data.channel,
        createdByAi: false
      }
    });

    await audit(tenant.id, user.id, "appointment.created", "Appointment", appointment.id);
  } catch (error) {
    console.error("createAppointmentAction failed", error);
    backTo("calendar", { error: "No se pudo crear la cita. Revisa el paciente seleccionado." });
  }

  succeed("calendar", "Cita creada correctamente.");
}

export async function generateRemindersAction() {
  const { user, tenant } = await getCurrentContext();
  let created = 0;
  try {
    const windowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const upcoming = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        startsAt: { gte: new Date(), lte: windowEnd },
        status: { in: ["REQUESTED", "PROPOSED", "CONFIRMED", "URGENT"] }
      },
      include: { patient: true }
    });

    for (const appointment of upcoming) {
      const existing = await prisma.task.findFirst({
        where: {
          tenantId: tenant.id,
          linkedType: "AppointmentReminder",
          linkedId: appointment.id
        }
      });
      if (existing) {
        continue;
      }
      await prisma.task.create({
        data: {
          tenantId: tenant.id,
          patientId: appointment.patientId,
          title: `Recordatorio: ${appointment.title} de ${appointment.patient.name}`,
          type: "Recordatorio",
          priority: "MEDIUM",
          status: TaskStatus.PENDING,
          dueAt: appointment.startsAt,
          linkedType: "AppointmentReminder",
          linkedId: appointment.id
        }
      });
      created += 1;
    }

    await audit(tenant.id, user.id, "reminders.generated", "Task", String(created));
  } catch (error) {
    console.error("generateRemindersAction failed", error);
    backTo("calendar", { error: "No se pudieron generar los recordatorios." });
  }

  succeed(
    "calendar",
    created > 0 ? `${created} recordatorio(s) creados en colas de trabajo.` : "Sin citas nuevas que recordar en 48h."
  );
}

export async function createTaskAction(formData: FormData) {
  const parsed = taskInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("tasks", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        patientId: parsed.data.patientId || null,
        title: parsed.data.title,
        type: parsed.data.type,
        priority: parsed.data.priority,
        status: TaskStatus.PENDING,
        dueAt: parsed.data.dueAt ? new Date(`${parsed.data.dueAt}T09:00:00.000Z`) : null
      }
    });

    await audit(tenant.id, user.id, "task.created", "Task", task.id);
  } catch (error) {
    console.error("createTaskAction failed", error);
    backTo("tasks", { error: "No se pudo crear la tarea. Intentalo de nuevo." });
  }

  succeed("tasks", "Tarea creada correctamente.");
}

export async function completeTaskAction(formData: FormData) {
  const parsed = taskIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("tasks", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const task = await prisma.task.update({
      where: { id: parsed.data.taskId, tenantId: tenant.id },
      data: { status: TaskStatus.COMPLETED }
    });

    await audit(tenant.id, user.id, "task.completed", "Task", task.id);
  } catch (error) {
    console.error("completeTaskAction failed", error);
    backTo("tasks", { error: "No se pudo completar la tarea." });
  }

  succeed("tasks", "Tarea completada.");
}

export async function markConversationReadAction(formData: FormData) {
  const parsed = conversationIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("inbox", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const conversation = await prisma.conversation.update({
      where: { id: parsed.data.conversationId, tenantId: tenant.id },
      data: { unread: false }
    });

    await audit(tenant.id, user.id, "conversation.read", "Conversation", conversation.id);
  } catch (error) {
    console.error("markConversationReadAction failed", error);
    backTo("inbox", { error: "No se pudo marcar la conversacion como leida." });
  }

  succeed("inbox", "Conversacion marcada como leida.", { conversation: parsed.data.conversationId });
}

export async function replyConversationAction(formData: FormData) {
  const parsed = conversationReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const conversationId = formData.get("conversationId");
    backTo("inbox", {
      error: firstErrorMessage(parsed.error),
      conversation: typeof conversationId === "string" ? conversationId : undefined
    });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const conversation = await prisma.conversation.findFirstOrThrow({
      where: { id: parsed.data.conversationId, tenantId: tenant.id }
    });

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        senderName: user.name,
        body: parsed.data.body
      }
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        unread: false,
        result: "Respuesta manual"
      }
    });

    await audit(tenant.id, user.id, "conversation.replied", "Message", message.id);
  } catch (error) {
    console.error("replyConversationAction failed", error);
    backTo("inbox", {
      error: "No se pudo enviar la respuesta.",
      conversation: parsed.data.conversationId
    });
  }

  succeed("inbox", "Respuesta enviada.", { conversation: parsed.data.conversationId });
}

export async function createTaskFromConversationAction(formData: FormData) {
  const parsed = taskFromConversationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const conversationId = formData.get("conversationId");
    backTo("inbox", {
      error: firstErrorMessage(parsed.error),
      conversation: typeof conversationId === "string" ? conversationId : undefined
    });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const conversation = await prisma.conversation.findFirstOrThrow({
      where: { id: parsed.data.conversationId, tenantId: tenant.id },
      include: { patient: true }
    });

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        patientId: conversation.patientId,
        title: parsed.data.title,
        type: "Recepcion",
        priority: parsed.data.priority,
        status: TaskStatus.PENDING,
        dueAt: new Date(),
        linkedType: "Conversation",
        linkedId: conversation.id
      }
    });

    await audit(tenant.id, user.id, "conversation.task_created", "Task", task.id);
  } catch (error) {
    console.error("createTaskFromConversationAction failed", error);
    backTo("inbox", {
      error: "No se pudo crear la tarea desde la conversacion.",
      conversation: parsed.data.conversationId
    });
  }

  succeed("inbox", "Tarea creada en la cola de recepcion.", { conversation: parsed.data.conversationId });
}

export async function createTreatmentAction(formData: FormData) {
  const parsed = treatmentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("treatments", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const treatment = await prisma.treatment.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        durationMinutes: parsed.data.durationMinutes,
        priceCents: parsed.data.price === undefined ? null : parsed.data.price * 100,
        requiresAssessment: parsed.data.requiresAssessment === "on",
        rules: parsed.data.rules
      }
    });

    await audit(tenant.id, user.id, "treatment.created", "Treatment", treatment.id);
  } catch (error) {
    console.error("createTreatmentAction failed", error);
    backTo("treatments", { error: "No se pudo crear el tratamiento. Nombre duplicado?" });
  }

  succeed("treatments", "Tratamiento creado correctamente.");
}

export async function toggleAssistantAction(formData: FormData) {
  const viewValue = formData.get("view");
  const view = typeof viewValue === "string" && viewValue ? viewValue : "home";
  const { user, tenant } = await getCurrentContext();

  let enabled = tenant.assistantEnabled;
  try {
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { assistantEnabled: !tenant.assistantEnabled }
    });
    enabled = updated.assistantEnabled;
    await audit(tenant.id, user.id, "assistant.toggled", "Tenant", tenant.id);
  } catch (error) {
    console.error("toggleAssistantAction failed", error);
    backTo(view, { error: "No se pudo cambiar el estado del asistente." });
  }

  succeed(view, enabled ? "Asistente activado." : "Asistente pausado.");
}

export async function inviteUserAction(formData: FormData) {
  const parsed = inviteUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("settings", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  if (!hasRole(user, UserRole.MANAGER)) {
    backTo("settings", { error: "Solo OWNER o MANAGER pueden invitar usuarios." });
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      backTo("settings", { error: "Ese email ya esta registrado." });
    }
    const invited = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        email,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role
      }
    });
    await audit(tenant.id, user.id, "user.invited", "User", invited.id);
  } catch (error) {
    console.error("inviteUserAction failed", error);
    backTo("settings", { error: "No se pudo crear el usuario." });
  }

  succeed("settings", "Usuario creado. Ya puede iniciar sesion.");
}

export async function updateSettingsAction(formData: FormData) {
  const parsed = settingsInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("settings", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  if (!hasRole(user, UserRole.MANAGER)) {
    backTo("settings", { error: "Solo OWNER o MANAGER pueden cambiar la configuracion." });
  }

  try {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: parsed.data.name,
        assistantName: parsed.data.assistantName,
        phone: parsed.data.phone,
        pmsProvider: parsed.data.pmsProvider,
        retentionDays: parsed.data.retentionDays,
        settings: {
          upsert: {
            create: {
              tone: parsed.data.tone,
              escalationRules: parsed.data.escalationRules,
              rgpdNotes: parsed.data.rgpdNotes
            },
            update: {
              tone: parsed.data.tone,
              escalationRules: parsed.data.escalationRules,
              rgpdNotes: parsed.data.rgpdNotes
            }
          }
        }
      }
    });

    await audit(tenant.id, user.id, "settings.updated", "Tenant", tenant.id);
  } catch (error) {
    console.error("updateSettingsAction failed", error);
    backTo("settings", { error: "No se pudo guardar la configuracion." });
  }

  succeed("settings", "Configuracion guardada.");
}

async function audit(
  tenantId: string,
  actorUserId: string | null,
  action: string,
  entityType: string,
  entityId: string
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action,
      entityType,
      entityId
    }
  });
}
