"use server";

import {
  AgentSessionOutcome,
  AppointmentStatus,
  ConsentKind,
  ConversationChannel,
  ConversationStatus,
  ElectronicInvoiceStatus,
  PatientStatus,
  PatientIntakeStatus,
  InvoiceReceiverType,
  InvoiceStatus,
  MessageDirection,
  SifMode,
  TaskPriority,
  TaskStatus,
  UserRole,
  type Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasRole } from "@/lib/auth";
import { runDemoScenario } from "@/lib/agent/demo";
import { buildFacturaePreviewXml, buildFiscalInvoiceHash, buildQrPayload, calculateInvoiceTax } from "@/lib/billing";
import { hashPassword } from "@/lib/password";
import { notifyAppointmentEvent } from "@/lib/notifications/appointment-notifications";
import { prisma } from "@/lib/prisma";
import { getCurrentContext } from "@/lib/tenant";
import { parseLocation, providerScopesForLocation } from "@/lib/locations";
import {
  cancelAppointment,
  cancelCalendarEvent,
  createCalendarEvent,
  rescheduleAppointment,
  SchedulingConflictError
} from "@/lib/scheduling";
import {
  appointmentIdSchema,
  appointmentInputSchema,
  appointmentRescheduleSchema,
  calendarEventIdSchema,
  calendarEventInputSchema,
  consentToggleSchema,
  conversationIdSchema,
  conversationReplySchema,
  firstErrorMessage,
  inviteUserSchema,
  interactiveDemoSchema,
  invoiceElectronicStatusSchema,
  invoiceInputSchema,
  patientIntakeStatusSchema,
  patientInputSchema,
  patientStatusSchema,
  settingsInputSchema,
  taskFromConversationSchema,
  taskFromPatientIntakeSchema,
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
        primaryLocation: parsed.data.primaryLocation,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        fiscalName: parsed.data.fiscalName || null,
        taxId: parsed.data.taxId || null,
        fiscalAddress: parsed.data.fiscalAddress || null,
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

export async function updatePatientStatusAction(formData: FormData) {
  const parsed = patientStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("patients", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const existing = await prisma.patient.findFirstOrThrow({
      where: { id: parsed.data.patientId, tenantId: tenant.id },
      select: { id: true, status: true }
    });

    const patient = await prisma.patient.update({
      where: { id: existing.id },
      data: { status: parsed.data.status }
    });

    await audit(tenant.id, user.id, "patient.status_updated", "Patient", patient.id, {
      from: existing.status,
      to: patient.status
    });
  } catch (error) {
    console.error("updatePatientStatusAction failed", error);
    backTo("patients", { error: "No se pudo actualizar el estado del paciente." });
  }

  succeed("patients", "Estado del paciente actualizado.");
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
    const [patient, treatmentId, providerId, operatoryId] = await Promise.all([
      requireTenantPatient(tenant.id, parsed.data.patientId),
      requireOptionalTenantTreatment(tenant.id, parsed.data.treatmentId),
      requireOptionalTenantProvider(tenant.id, parsed.data.providerId),
      requireOptionalTenantOperatory(tenant.id, parsed.data.operatoryId)
    ]);

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        treatmentId,
        providerId,
        operatoryId,
        location: parsed.data.location,
        title: parsed.data.title,
        startsAt,
        status: parsed.data.status,
        channel: parsed.data.channel,
        createdByAi: false
      }
    });

    await audit(tenant.id, user.id, "appointment.created", "Appointment", appointment.id);
    await notifyAppointmentEvent({
      tenantId: tenant.id,
      appointmentId: appointment.id,
      eventType: "created",
      actor: { type: "staff", userId: user.id }
    });
  } catch (error) {
    console.error("createAppointmentAction failed", error);
    backTo("calendar", { error: "No se pudo crear la cita. Revisa el paciente seleccionado." });
  }

  succeed("calendar", "Cita creada correctamente.");
}

export async function cancelAppointmentAction(formData: FormData) {
  const parsed = appointmentIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("calendar", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();

  try {
    await cancelAppointment(tenant.id, parsed.data.appointmentId, { type: "staff", userId: user.id });
  } catch (error) {
    console.error("cancelAppointmentAction failed", error);
    backTo("calendar", { error: "No se pudo cancelar la cita." });
  }

  succeed("calendar", "Cita cancelada.");
}

export async function rescheduleAppointmentAction(formData: FormData) {
  const parsed = appointmentRescheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("calendar", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  const newStartsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00.000Z`);
  if (Number.isNaN(newStartsAt.getTime())) {
    backTo("calendar", { error: "Fecha u hora no validas." });
  }

  try {
    await rescheduleAppointment(tenant.id, parsed.data.appointmentId, newStartsAt, { type: "staff", userId: user.id });
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      backTo("calendar", { error: "Ese hueco ya esta ocupado para este profesional." });
    }
    console.error("rescheduleAppointmentAction failed", error);
    backTo("calendar", { error: "No se pudo reprogramar la cita." });
  }

  succeed("calendar", "Cita reprogramada.");
}

export async function createCalendarEventAction(formData: FormData) {
  const parsed = calendarEventInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("calendar", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00.000Z`);
  if (Number.isNaN(startsAt.getTime())) {
    backTo("calendar", { error: "Fecha u hora no validas." });
  }

  try {
    const [providerId, operatoryId] = await Promise.all([
      requireOptionalTenantProvider(tenant.id, parsed.data.providerId),
      requireOptionalTenantOperatory(tenant.id, parsed.data.operatoryId)
    ]);

    await createCalendarEvent(
      tenant.id,
      {
        providerId,
        operatoryId,
        title: parsed.data.title,
        type: parsed.data.type,
        startsAt,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes || null
      },
      { type: "staff", userId: user.id }
    );
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      backTo("calendar", { error: "Ese profesional ya tiene algo en ese horario." });
    }
    console.error("createCalendarEventAction failed", error);
    backTo("calendar", { error: "No se pudo crear el evento." });
  }

  succeed("calendar", "Evento creado correctamente.");
}

export async function cancelCalendarEventAction(formData: FormData) {
  const parsed = calendarEventIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("calendar", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();

  try {
    await cancelCalendarEvent(tenant.id, parsed.data.eventId, { type: "staff", userId: user.id });
  } catch (error) {
    console.error("cancelCalendarEventAction failed", error);
    backTo("calendar", { error: "No se pudo eliminar el evento." });
  }

  succeed("calendar", "Evento eliminado.");
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
    const patientId = parsed.data.patientId
      ? (await requireTenantPatient(tenant.id, parsed.data.patientId)).id
      : null;

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        patientId,
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

export async function updatePatientIntakeStatusAction(formData: FormData) {
  const parsed = patientIntakeStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("patients", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const intake = await prisma.patientIntake.findFirstOrThrow({
      where: { id: parsed.data.intakeId, tenantId: tenant.id },
      select: { id: true, patientId: true, status: true }
    });

    if (parsed.data.targetStatus === PatientIntakeStatus.LINKED && !intake.patientId) {
      backTo("patients", { error: "No se puede marcar como vinculada una pre-ficha sin paciente asociado." });
    }

    const updated = await prisma.patientIntake.update({
      where: { id: intake.id },
      data: { status: parsed.data.targetStatus }
    });

    await audit(tenant.id, user.id, "patient_intake.status_updated", "PatientIntake", updated.id, {
      from: intake.status,
      to: updated.status
    });
  } catch (error) {
    console.error("updatePatientIntakeStatusAction failed", error);
    backTo("patients", { error: "No se pudo actualizar la pre-ficha." });
  }

  succeed("patients", "Pre-ficha actualizada.");
}

export async function createTaskFromPatientIntakeAction(formData: FormData) {
  const parsed = taskFromPatientIntakeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("patients", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const intake = await prisma.patientIntake.findFirstOrThrow({
      where: { id: parsed.data.intakeId, tenantId: tenant.id },
      select: { id: true, patientId: true, name: true, phone: true, email: true, status: true }
    });

    const task = await prisma.task.create({
      data: {
        tenantId: tenant.id,
        patientId: intake.patientId,
        title: parsed.data.title,
        type: "Revision pre-ficha",
        priority: parsed.data.priority,
        status: TaskStatus.PENDING,
        linkedType: "PatientIntake",
        linkedId: intake.id
      }
    });

    await audit(tenant.id, user.id, "patient_intake.task_created", "PatientIntake", intake.id, {
      taskId: task.id,
      status: intake.status,
      patient: intake.name,
      phone: intake.phone,
      email: intake.email
    });
  } catch (error) {
    console.error("createTaskFromPatientIntakeAction failed", error);
    backTo("patients", { error: "No se pudo crear la tarea desde la pre-ficha." });
  }

  succeed("patients", "Tarea de recepcion creada desde la pre-ficha.");
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

export async function createInvoiceAction(formData: FormData) {
  const parsed = invoiceInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("billing", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  const dueAt = new Date(`${parsed.data.dueAt}T00:00:00.000Z`);
  if (Number.isNaN(dueAt.getTime())) {
    backTo("billing", { error: "Fecha de vencimiento no valida." });
  }

  try {
    const patient = await prisma.patient.findFirstOrThrow({
      where: { id: parsed.data.patientId, tenantId: tenant.id },
      select: { id: true, name: true, email: true, fiscalName: true, taxId: true, fiscalAddress: true }
    });
    const issuedAt = new Date();
    const series = normalizeInvoiceSeries(tenant.invoiceSeries);
    const sequence = await getNextInvoiceSequence(tenant.id, series, issuedAt.getFullYear());
    const number = `${series}-${issuedAt.getFullYear()}-${String(sequence).padStart(3, "0")}`;
    const tax = calculateInvoiceTax(Math.round(parsed.data.amount * 100), parsed.data.taxRate);
    const receiverName = parsed.data.receiverName || patient.fiscalName || patient.name;
    const receiverTaxId = parsed.data.receiverTaxId || patient.taxId || null;
    const issuerLegalName = tenant.legalName || tenant.name;
    const issuerTaxId = tenant.taxId || "";
    const previousInvoice = await prisma.invoice.findFirst({
      where: { tenantId: tenant.id, fiscalHash: { not: null } },
      orderBy: { issuedAt: "desc" },
      select: { fiscalHash: true }
    });
    const fiscalHash = buildFiscalInvoiceHash({
      tenantId: tenant.id,
      number,
      issuedAt,
      amountCents: tax.amountCents,
      taxBaseCents: tax.taxBaseCents,
      taxCents: tax.taxCents,
      receiverTaxId,
      previousFiscalHash: previousInvoice?.fiscalHash
    });
    const requiresElectronicInvoice = parsed.data.receiverType !== InvoiceReceiverType.PATIENT;
    const electronicPayload =
      requiresElectronicInvoice && issuerTaxId && receiverTaxId
        ? buildFacturaePreviewXml({
            invoiceNumber: number,
            issuedAt,
            issuerLegalName,
            issuerTaxId,
            receiverName,
            receiverTaxId,
            treatmentName: parsed.data.treatmentName,
            tax
          })
        : null;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        number,
        series,
        sequence,
        documentType: parsed.data.documentType,
        receiverType: parsed.data.receiverType,
        receiverName,
        receiverTaxId,
        receiverAddress: parsed.data.receiverAddress || patient.fiscalAddress || null,
        receiverEmail: parsed.data.receiverEmail || patient.email || null,
        issuerLegalName,
        issuerTaxId: issuerTaxId || null,
        issuerAddress: tenant.fiscalAddress || tenant.address || null,
        treatmentName: parsed.data.treatmentName,
        amountCents: tax.amountCents,
        taxBaseCents: tax.taxBaseCents,
        taxCents: tax.taxCents,
        taxRateBasisPoints: tax.taxRateBasisPoints,
        taxExemptionReason: parsed.data.taxExemptionReason || (tax.taxCents === 0 ? "Operacion sanitaria exenta o no sujeta a IVA segun configuracion de la clinica." : null),
        status: InvoiceStatus.SENT,
        electronicStatus: requiresElectronicInvoice ? ElectronicInvoiceStatus.READY : ElectronicInvoiceStatus.NOT_REQUIRED,
        electronicProvider: tenant.electronicInvoiceProvider || null,
        electronicPayload,
        sifMode: tenant.sifMode,
        fiscalHash,
        previousFiscalHash: previousInvoice?.fiscalHash ?? null,
        qrPayload: buildQrPayload({ issuerTaxId, number, issuedAt, amountCents: tax.amountCents }),
        immutableIssued: true,
        notes: parsed.data.notes || null,
        issuedAt,
        dueAt
      }
    });

    await audit(tenant.id, user.id, "invoice.created", "Invoice", invoice.id, {
      number,
      receiverType: parsed.data.receiverType,
      electronicStatus: invoice.electronicStatus
    });
  } catch (error) {
    console.error("createInvoiceAction failed", error);
    backTo("billing", { error: "No se pudo emitir la factura. Revisa numeracion, paciente y datos fiscales." });
  }

  succeed("billing", "Factura fiscal emitida y registrada.");
}

export async function updateInvoiceElectronicStatusAction(formData: FormData) {
  const parsed = invoiceElectronicStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("billing", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  try {
    const now = new Date();
    const data: Prisma.InvoiceUpdateInput = {
      electronicStatus: parsed.data.electronicStatus,
      electronicRejectReason: parsed.data.rejectReason || null
    };

    if (parsed.data.electronicStatus === ElectronicInvoiceStatus.SENT) {
      data.electronicSubmittedAt = now;
    }
    if (parsed.data.electronicStatus === ElectronicInvoiceStatus.ACCEPTED) {
      data.electronicAcceptedAt = now;
    }
    if (parsed.data.electronicStatus === ElectronicInvoiceStatus.REJECTED) {
      data.electronicRejectedAt = now;
    }
    if (parsed.data.electronicStatus === ElectronicInvoiceStatus.PAID) {
      data.status = InvoiceStatus.PAID;
      data.paidAt = now;
    }

    const invoice = await prisma.invoice.update({
      where: { id: parsed.data.invoiceId, tenantId: tenant.id },
      data
    });

    await audit(tenant.id, user.id, "invoice.electronic_status_updated", "Invoice", invoice.id, {
      number: invoice.number,
      electronicStatus: invoice.electronicStatus
    });
  } catch (error) {
    console.error("updateInvoiceElectronicStatusAction failed", error);
    backTo("billing", { error: "No se pudo actualizar el estado electronico de la factura." });
  }

  succeed("billing", "Estado electronico actualizado.");
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

export async function runAgentDemoAction(formData: FormData) {
  const { user, tenant } = await getCurrentContext();
  let result: Awaited<ReturnType<typeof runDemoScenario>>;
  try {
    result = await runDemoScenario(tenant.id, user.id, formData.get("scenario"));
  } catch (error) {
    console.error("runAgentDemoAction failed", error);
    backTo("agent", { error: "No se pudo ejecutar la demo de la recepcionista IA." });
  }

  revalidatePath("/");
  backTo("inbox", {
    ok: `Demo creada: ${result.title}. Revisa la conversacion y el resultado operativo.`,
    conversation: result.conversationId
  });
}

export async function saveInteractiveDemoAction(formData: FormData) {
  const parsed = interactiveDemoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backTo("agent", { error: firstErrorMessage(parsed.error) });
  }

  const { user, tenant } = await getCurrentContext();
  const escalated = parsed.data.escalated === "true";
  const demoLocation = parseLocation(parsed.data.location);
  let transcript: Array<{ role: "patient" | "assistant"; body: string }>;
  try {
    transcript = parseInteractiveTranscript(parsed.data.transcript);
  } catch (error) {
    console.error("saveInteractiveDemoAction transcript failed", error);
    backTo("agent", { error: "No se pudo leer la conversacion interactiva." });
  }

  let conversationId: string;
  try {
    const patient = await prisma.patient.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: parsed.data.phone } },
      update: {
        primaryLocation: demoLocation,
        name: parsed.data.patientName,
        status: escalated ? PatientStatus.URGENT : PatientStatus.NEW_LEAD,
        source: "Demo interactiva IA",
        preferredChannel: ConversationChannel.WHATSAPP,
        treatmentNeed: parsed.data.treatmentNeed,
        estimatedValue: parsed.data.estimatedValue,
        notes: [
          "Demo interactiva de recepcionista IA.",
          `Presupuesto orientativo: ${parsed.data.budget || "pendiente"}.`,
          `Sede: ${parsed.data.location || "pendiente"}.`,
          `Disponibilidad: ${parsed.data.availability || "pendiente"}.`
        ].join(" ")
      },
      create: {
        tenantId: tenant.id,
        primaryLocation: demoLocation,
        name: parsed.data.patientName,
        phone: parsed.data.phone,
        status: escalated ? PatientStatus.URGENT : PatientStatus.NEW_LEAD,
        source: "Demo interactiva IA",
        preferredChannel: ConversationChannel.WHATSAPP,
        treatmentNeed: parsed.data.treatmentNeed,
        estimatedValue: parsed.data.estimatedValue,
        notes: [
          "Demo interactiva de recepcionista IA.",
          `Presupuesto orientativo: ${parsed.data.budget || "pendiente"}.`,
          `Sede: ${parsed.data.location || "pendiente"}.`,
          `Disponibilidad: ${parsed.data.availability || "pendiente"}.`
        ].join(" ")
      }
    });

    await prisma.consent.upsert({
      where: {
        tenantId_patientId_kind: {
          tenantId: tenant.id,
          patientId: patient.id,
          kind: ConsentKind.DATA_PROCESSING
        }
      },
      create: {
        tenantId: tenant.id,
        patientId: patient.id,
        kind: ConsentKind.DATA_PROCESSING,
        granted: true,
        grantedAt: new Date(),
        source: "demo-interactiva"
      },
      update: { granted: true, grantedAt: new Date(), source: "demo-interactiva" }
    });

    const conversation = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        channel: ConversationChannel.WHATSAPP,
        status: escalated ? ConversationStatus.HUMAN_REQUIRED : ConversationStatus.AI_HANDLING,
        intent: parsed.data.intent,
        result: escalated ? "Urgencia escalada desde demo interactiva" : "Pre-reserva preparada desde demo interactiva",
        unread: true,
        messages: {
          create: [
            ...transcript.map(message => ({
              direction: message.role === "patient" ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
              senderName: message.role === "patient" ? parsed.data.patientName : tenant.assistantName,
              body: message.body,
              metadata: { demo: true, interactive: true }
            })),
            {
              direction: MessageDirection.SYSTEM,
              senderName: "Resumen operativo",
              body: parsed.data.summary || "Demo interactiva registrada.",
              metadata: {
                demo: true,
                interactive: true,
                budget: parsed.data.budget,
                location: parsed.data.location,
                availability: parsed.data.availability
              }
            }
          ]
        }
      }
    });
    conversationId = conversation.id;

    if (escalated) {
      await prisma.task.create({
        data: {
          tenantId: tenant.id,
          patientId: patient.id,
          title: `Demo IA: revisar urgencia de ${parsed.data.patientName}`,
          type: "Urgencia",
          priority: TaskPriority.CRITICAL,
          status: TaskStatus.PENDING,
          dueAt: new Date(),
          linkedType: "Conversation",
          linkedId: conversation.id
        }
      });
    } else {
      const treatment = await prisma.treatment.findFirst({
        where: { tenantId: tenant.id, name: { contains: parsed.data.treatmentNeed.split(" ")[0] } }
      });
      const provider = await prisma.provider.findFirst({
        where: { tenantId: tenant.id, active: true, locationScope: { in: providerScopesForLocation(demoLocation) } },
        orderBy: { name: "asc" }
      });
      const operatory = await prisma.operatory.findFirst({ where: { tenantId: tenant.id, active: true, location: demoLocation }, orderBy: { name: "asc" } });
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          location: demoLocation,
          patientId: patient.id,
          treatmentId: treatment?.id ?? null,
          providerId: provider?.id ?? null,
          operatoryId: operatory?.id ?? null,
          title: `Demo IA interactiva: ${parsed.data.treatmentNeed}`,
          startsAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
          durationMinutes: treatment?.durationMinutes ?? 30,
          status: AppointmentStatus.PROPOSED,
          channel: ConversationChannel.WHATSAPP,
          createdByAi: true
        }
      });
    }

    await prisma.agentSession.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        conversationId: conversation.id,
        intent: parsed.data.intent,
        outcome: escalated ? AgentSessionOutcome.ESCALATED : AgentSessionOutcome.APPOINTMENT_CREATED,
        escalated,
        costCents: escalated ? 26 : 20,
        latencyMs: 1200 + transcript.length * 80
      }
    });

    await audit(tenant.id, user.id, "agent.interactive_demo_saved", "Conversation", conversation.id, {
      intent: parsed.data.intent,
      budget: parsed.data.budget,
      location: parsed.data.location,
      availability: parsed.data.availability
    });
  } catch (error) {
    console.error("saveInteractiveDemoAction failed", error);
    backTo("agent", { error: "No se pudo guardar la demo interactiva." });
  }

  succeed(
    "inbox",
    escalated ? "Demo interactiva guardada como urgencia para recepcion." : "Demo interactiva guardada como conversacion y cita propuesta.",
    { conversation: conversationId }
  );
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
        legalName: parsed.data.legalName || null,
        taxId: parsed.data.taxId || null,
        fiscalAddress: parsed.data.fiscalAddress || null,
        assistantName: parsed.data.assistantName,
        phone: parsed.data.phone,
        invoiceSeries: normalizeInvoiceSeries(parsed.data.invoiceSeries),
        electronicInvoiceProvider: parsed.data.electronicInvoiceProvider || null,
        sifMode: parsed.data.sifMode as SifMode,
        pmsProvider: parsed.data.pmsProvider,
        retentionDays: parsed.data.retentionDays,
        settings: {
          upsert: {
            create: {
              tone: parsed.data.tone,
              escalationRules: parsed.data.escalationRules,
              rgpdNotes: parsed.data.rgpdNotes,
              knowledgeNotes: parsed.data.knowledgeNotes || null
            },
            update: {
              tone: parsed.data.tone,
              escalationRules: parsed.data.escalationRules,
              rgpdNotes: parsed.data.rgpdNotes,
              knowledgeNotes: parsed.data.knowledgeNotes || null
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
  entityId: string,
  metadata?: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

async function requireTenantPatient(tenantId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, tenantId }, select: { id: true } });
  if (!patient) {
    throw new Error("Paciente no encontrado en esta clinica.");
  }
  return patient;
}

async function requireOptionalTenantTreatment(tenantId: string, treatmentId: string | undefined) {
  if (!treatmentId) {
    return null;
  }
  const treatment = await prisma.treatment.findFirst({ where: { id: treatmentId, tenantId }, select: { id: true } });
  if (!treatment) {
    throw new Error("Tratamiento no encontrado en esta clinica.");
  }
  return treatment.id;
}

async function requireOptionalTenantProvider(tenantId: string, providerId: string | undefined) {
  if (!providerId) {
    return null;
  }
  const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId }, select: { id: true } });
  if (!provider) {
    throw new Error("Profesional no encontrado en esta clinica.");
  }
  return provider.id;
}

async function requireOptionalTenantOperatory(tenantId: string, operatoryId: string | undefined) {
  if (!operatoryId) {
    return null;
  }
  const operatory = await prisma.operatory.findFirst({ where: { id: operatoryId, tenantId }, select: { id: true } });
  if (!operatory) {
    throw new Error("Gabinete no encontrado en esta clinica.");
  }
  return operatory.id;
}

function normalizeInvoiceSeries(value: string | null | undefined): string {
  const normalized = (value || "F").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized.slice(0, 8) || "F";
}

async function getNextInvoiceSequence(tenantId: string, series: string, year: number): Promise<number> {
  const prefix = `${series}-${year}-`;
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId, series, number: { startsWith: prefix } },
    orderBy: [{ sequence: "desc" }, { issuedAt: "desc" }],
    select: { sequence: true, number: true }
  });

  if (lastInvoice?.sequence) {
    return lastInvoice.sequence + 1;
  }

  const parsed = lastInvoice?.number.match(/-(\d+)$/)?.[1];
  return parsed ? Number(parsed) + 1 : 1;
}

function parseInteractiveTranscript(raw: string) {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Transcript is not an array");
  }
  const messages = parsed
    .slice(0, 30)
    .map((item: unknown) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const role = "role" in item ? item.role : null;
      const body = "body" in item ? item.body : null;
      if ((role !== "patient" && role !== "assistant") || typeof body !== "string") {
        return null;
      }
      const cleanBody = body.trim().slice(0, 1200);
      return cleanBody ? { role, body: cleanBody } : null;
    })
    .filter((message): message is { role: "patient" | "assistant"; body: string } => Boolean(message));

  if (messages.length < 2) {
    throw new Error("Transcript does not include enough messages");
  }
  return messages;
}
