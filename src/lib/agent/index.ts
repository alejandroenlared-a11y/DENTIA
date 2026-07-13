import {
  AgentSessionOutcome,
  AppointmentStatus,
  ConsentKind,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  PatientStatus,
  TaskPriority,
  TaskStatus,
  type Tenant,
  type TenantSetting
} from "@prisma/client";
import {
  dentalAgentStateSchema,
  runDentalAgentTurn,
  type DentalAgentApiTurn,
  type DentalChatMessage
} from "@/lib/agent/openai-dental-agent";
import { initialDentalAgentState, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import { prisma } from "@/lib/prisma";
import {
  cancelAppointment,
  findNextAvailableSlot,
  listNextAvailableSlots,
  rescheduleAppointment,
  roundUpToSlot,
  SchedulingConflictError,
  SLOT_MINUTES as URGENT_SLOT_MINUTES,
  URGENT_BOOKING_BUFFER_MINUTES,
  URGENT_MAX_DAYS_AHEAD
} from "@/lib/scheduling";
import { detectSchedulingRequest, type SchedulingRequestKind } from "@/lib/agent/scheduling-intent";
import { parseSlotChoice } from "@/lib/agent/slot-choice";

export { roundUpToSlot };

export interface InboundPayload {
  channel: ConversationChannel;
  from: string;
  name?: string;
  body: string;
}

export interface InboundResult {
  conversationId: string;
  reply: string | null;
  escalated: boolean;
}

type TenantWithSettings = Tenant & { settings: TenantSetting | null };

export type UrgentBooking = { startsAt: Date; providerName: string; operatoryName?: string };

export async function processInboundMessage(
  tenant: TenantWithSettings,
  payload: InboundPayload
): Promise<InboundResult> {
  const startedAt = Date.now();

  const patient = await prisma.patient.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: payload.from } },
    create: {
      tenantId: tenant.id,
      name: payload.name?.trim() || `Contacto ${payload.from}`,
      phone: payload.from,
      status: PatientStatus.NEW_LEAD,
      source: payload.channel.toLowerCase(),
      preferredChannel: payload.channel
    },
    update: payload.name?.trim() ? { name: payload.name.trim() } : {}
  });

  const existing = await prisma.conversation.findFirst({
    where: {
      tenantId: tenant.id,
      patientId: patient.id,
      channel: payload.channel,
      status: { in: [ConversationStatus.ACTIVE, ConversationStatus.AI_HANDLING, ConversationStatus.HUMAN_REQUIRED] }
    },
    orderBy: { updatedAt: "desc" }
  });

  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        channel: payload.channel,
        status: tenant.assistantEnabled ? ConversationStatus.AI_HANDLING : ConversationStatus.HUMAN_REQUIRED,
        unread: true
      }
    }));

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      senderName: patient.name,
      body: payload.body
    }
  });

  if (!tenant.assistantEnabled) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { unread: true, status: ConversationStatus.HUMAN_REQUIRED, result: "Pendiente de humano" }
    });
    return { conversationId: conversation.id, reply: null, escalated: false };
  }

  const pendingChoiceReply = existing
    ? await resolvePendingSchedulingChoice(tenant.id, conversation.id, payload.body)
    : null;
  if (pendingChoiceReply) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        senderName: tenant.assistantName,
        body: pendingChoiceReply,
        metadata: { intent: "AGENDA_RESCHEDULE_CONFIRMED" }
      }
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { intent: "AGENDA_RESCHEDULE_CONFIRMED", unread: true, result: "Atendido por IA" }
    });
    return { conversationId: conversation.id, reply: pendingChoiceReply, escalated: false };
  }

  const schedulingRequest = detectSchedulingRequest(payload.body);
  if (schedulingRequest) {
    const schedulingResult = await handleSchedulingRequest({
      tenantId: tenant.id,
      patientId: patient.id,
      kind: schedulingRequest
    });
    if (schedulingResult) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          direction: MessageDirection.OUTBOUND,
          senderName: tenant.assistantName,
          body: schedulingResult.reply,
          metadata: {
            intent: `AGENDA_${schedulingRequest.toUpperCase()}`,
            pendingReschedule: schedulingResult.pendingReschedule ?? null
          }
        }
      });
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { intent: `AGENDA_${schedulingRequest.toUpperCase()}`, unread: true, result: "Atendido por IA" }
      });
      return { conversationId: conversation.id, reply: schedulingResult.reply, escalated: false };
    }
  }

  const treatments = await prisma.treatment.findMany({
    where: { tenantId: tenant.id, active: true },
    select: { id: true, name: true, priceCents: true, durationMinutes: true, rules: true, requiresAssessment: true }
  });

  const recent = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20
  });
  const history = recent.slice(0, -1).map<DentalChatMessage>(message => ({
    role: message.direction === MessageDirection.INBOUND ? "patient" : "assistant",
    body: message.body
  }));
  const previousState = extractPreviousDentalState(recent);
  const dentalTurn = await runDentalAgentTurn({
    latestPatientMessage: payload.body,
    history,
    state: previousState,
    clinicContext: buildClinicContext(tenant, treatments)
  });

  let reply = dentalTurn.reply;
  const intent = dentalTurn.state.intentCode || dentalTurn.state.intent || "INTENCION_PENDIENTE";
  const escalated = dentalTurn.state.escalated;
  const appointmentCreated = await persistDentalOutcome({
    tenantId: tenant.id,
    patientId: patient.id,
    conversationId: conversation.id,
    channel: payload.channel,
    dentalTurn
  });

  let urgentBooking: UrgentBooking | null = null;
  // Regla conversacional: en una urgencia primero se hace la pregunta de
  // seguridad (fiebre, hinchazon, dificultad para tragar...) y se espera la
  // respuesta del paciente. Solo entonces se reserva y se habla de la cita.
  const safetyKnown = dentalTurn.state.safetyScreened || dentalTurn.state.redFlags.length > 0;
  if (escalated && safetyKnown) {
    urgentBooking = await bookUrgentSlot({
      tenantId: tenant.id,
      patientId: patient.id,
      conversationId: conversation.id,
      channel: payload.channel,
      treatmentNeed: dentalTurn.state.treatmentNeed,
      dentalTurn
    });
    if (urgentBooking) {
      if (dentalTurn.state.triageLevel === "EMERGENCY") {
        // En emergencia el aviso de acudir a urgencias debe conservarse.
        reply = `${reply}\n\n${formatUrgentSlotSentence(urgentBooking)}`;
      } else {
        reply = [
          formatUrgentSlotSentence(urgentBooking),
          !dentalTurn.state.consent
            ? "Para dejarla a tu nombre, aceptas que guardemos tus datos? Dime tambien tu nombre y un telefono."
            : !dentalTurn.state.name || !dentalTurn.state.phone
              ? "Dime tu nombre y un telefono para dejarla a tu nombre."
              : ""
        ].filter(Boolean).join(" ");
      }
    }
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      senderName: tenant.assistantName,
      body: reply,
      metadata: {
        intent,
        engine: dentalTurn.runtime,
        model: dentalTurn.model,
        fallbackReason: dentalTurn.fallbackReason,
        dentalState: dentalTurn.state
      }
    }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      intent,
      unread: true,
      status: escalated ? ConversationStatus.HUMAN_REQUIRED : ConversationStatus.AI_HANDLING,
      result: escalated ? "Escalado a humano" : "Atendido por IA"
    }
  });

  if (escalated) {
    await ensureEscalationTask(tenant.id, patient.id, conversation.id, patient.name, payload.from, urgentBooking);
  }

  await prisma.agentSession.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      conversationId: conversation.id,
      intent,
      outcome: appointmentCreated || urgentBooking
        ? AgentSessionOutcome.APPOINTMENT_CREATED
        : escalated
          ? AgentSessionOutcome.ESCALATED
          : AgentSessionOutcome.RESOLVED,
      escalated,
      latencyMs: Date.now() - startedAt
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: escalated ? "agent.escalated" : "agent.replied",
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: {
        intent,
        channel: payload.channel,
        engine: dentalTurn.runtime,
        model: dentalTurn.model,
        appointmentCreated,
        urgentSlotConfirmed: Boolean(urgentBooking)
      }
    }
  });

  return { conversationId: conversation.id, reply, escalated };
}

type TreatmentForContext = {
  id: string;
  name: string;
  priceCents: number | null;
  durationMinutes: number;
  rules: string;
  requiresAssessment: boolean;
};

function buildClinicContext(tenant: TenantWithSettings, treatments: TreatmentForContext[]) {
  return [
    `Tenant: ${tenant.name}`,
    `Slug: ${tenant.slug}`,
    `Assistant: ${tenant.assistantName}`,
    tenant.phone ? `Telefono clinica: ${tenant.phone}` : "",
    tenant.settings?.tone ? `Tono configurado: ${tenant.settings.tone}` : "",
    tenant.settings?.escalationRules ? `Reglas de escalado tenant: ${tenant.settings.escalationRules}` : "",
    tenant.settings?.rgpdNotes ? `Notas RGPD tenant: ${tenant.settings.rgpdNotes}` : "",
    treatments.length > 0
      ? `Catalogo real del tenant:\n${treatments
          .map(treatment =>
            `- ${treatment.name}: ${
              treatment.priceCents === null ? "valoracion previa" : `${Math.round(treatment.priceCents / 100)} EUR`
            }; ${treatment.durationMinutes} min; ${treatment.rules}; requiere valoracion: ${treatment.requiresAssessment ? "si" : "no"}`
          )
          .join("\n")}`
      : ""
  ].filter(Boolean).join("\n");
}

function extractPreviousDentalState(messages: Array<{ metadata: unknown }>): DentalAgentState {
  for (const message of [...messages].reverse()) {
    const metadata = asRecord(message.metadata);
    const parsed = dentalAgentStateSchema.safeParse(metadata.dentalState);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return initialDentalAgentState;
}

async function persistDentalOutcome(input: {
  tenantId: string;
  patientId: string;
  conversationId: string;
  channel: ConversationChannel;
  dentalTurn: DentalAgentApiTurn;
}) {
  const { tenantId, patientId, conversationId, channel, dentalTurn } = input;
  const state = dentalTurn.state;

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      ...(state.name ? { name: state.name } : {}),
      treatmentNeed: state.treatmentNeed,
      estimatedValue: state.estimatedValue,
      status: state.escalated ? PatientStatus.URGENT : state.ready ? PatientStatus.OPEN_BUDGET : PatientStatus.NEW_LEAD,
      preferredChannel: channel
    }
  });

  if (state.consent) {
    await prisma.consent.upsert({
      where: { tenantId_patientId_kind: { tenantId, patientId, kind: ConsentKind.DATA_PROCESSING } },
      create: {
        tenantId,
        patientId,
        kind: ConsentKind.DATA_PROCESSING,
        granted: true,
        grantedAt: new Date(),
        source: channel.toLowerCase()
      },
      update: {
        granted: true,
        grantedAt: new Date(),
        source: channel.toLowerCase()
      }
    });
  }

  if (!state.ready || state.escalated) {
    return false;
  }

  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId,
      patientId,
      createdByAi: true,
      startsAt: { gte: new Date() },
      status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.PROPOSED, AppointmentStatus.CONFIRMED] }
    },
    orderBy: { createdAt: "desc" }
  });
  if (existingAppointment) {
    return false;
  }

  const treatment = await prisma.treatment.findFirst({
    where: {
      tenantId,
      active: true,
      OR: [{ name: { contains: state.treatmentNeed.split(" ")[0] || state.treatmentNeed } }, { rules: { contains: state.intentCode } }]
    },
    orderBy: { name: "asc" }
  });
  const provider = await prisma.provider.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
  const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
  const durationMinutes = treatment?.durationMinutes ?? 30;
  const preferredFrom = inferPreferredStart(state.availability);
  const startsAt = provider
    ? (await findNextAvailableSlot(tenantId, provider.id, { durationMinutes, from: preferredFrom })) ?? preferredFrom
    : preferredFrom;

  await prisma.appointment.create({
    data: {
      tenantId,
      patientId,
      treatmentId: treatment?.id ?? null,
      providerId: provider?.id ?? null,
      operatoryId: operatory?.id ?? null,
      title: `IA WhatsApp: ${state.treatmentNeed}`,
      startsAt,
      durationMinutes,
      status: AppointmentStatus.PROPOSED,
      channel,
      createdByAi: true
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "agent.appointment_proposed",
      entityType: "Conversation",
      entityId: conversationId,
      metadata: {
        intent: state.intentCode,
        location: state.location,
        availability: state.availability,
        engine: dentalTurn.runtime,
        model: dentalTurn.model
      }
    }
  });

  return true;
}

async function ensureEscalationTask(
  tenantId: string,
  patientId: string,
  conversationId: string,
  patientName: string,
  phone: string,
  urgentBooking: UrgentBooking | null
) {
  const existingTask = await prisma.task.findFirst({
    where: {
      tenantId,
      linkedType: "Conversation",
      linkedId: conversationId,
      status: { in: [TaskStatus.OVERDUE, TaskStatus.PENDING, TaskStatus.SCHEDULED] }
    }
  });
  if (existingTask) {
    return;
  }

  const title = urgentBooking
    ? `URGENCIA: cita auto-confirmada ${formatSlotForStaff(urgentBooking.startsAt)} para ${patientName} (${phone}) — revisar o reasignar si hace falta`
    : `URGENCIA: contactar a ${patientName} (${phone})`;

  await prisma.task.create({
    data: {
      tenantId,
      patientId,
      title,
      type: "Urgencia",
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.PENDING,
      dueAt: urgentBooking?.startsAt ?? new Date(),
      linkedType: "Conversation",
      linkedId: conversationId
    }
  });
}

type SchedulingResult = { reply: string; pendingReschedule?: { appointmentId: string; options: string[] } };

async function handleSchedulingRequest(input: {
  tenantId: string;
  patientId: string;
  kind: SchedulingRequestKind;
}): Promise<SchedulingResult | null> {
  const { tenantId, patientId, kind } = input;

  const appointment = await prisma.appointment.findFirst({
    where: {
      tenantId,
      patientId,
      startsAt: { gte: new Date() },
      status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.PROPOSED, AppointmentStatus.CONFIRMED, AppointmentStatus.URGENT] }
    },
    orderBy: { startsAt: "asc" },
    include: { provider: true }
  });

  if (!appointment) {
    return { reply: "No encuentro ninguna cita proxima a tu nombre en la agenda. Si quieres, te ayudo a reservar una nueva." };
  }

  if (kind === "cancel") {
    await cancelAppointment(tenantId, appointment.id, { type: "ai" }, "Solicitado por paciente via chat");
    return { reply: `Listo, he cancelado tu cita del ${formatSlotForStaff(appointment.startsAt)}. Si quieres reservar otro hueco, dimelo cuando quieras.` };
  }

  if (!appointment.providerId) {
    return { reply: "Tu cita no tiene profesional asignado todavia, asi que no puedo reprogramarla automaticamente. He avisado a recepcion para que te contacte." };
  }

  const options = await listNextAvailableSlots(tenantId, appointment.providerId, {
    durationMinutes: appointment.durationMinutes,
    from: new Date(Date.now() + 60 * 60_000),
    limit: 3
  });
  if (options.length === 0) {
    return { reply: "No he encontrado hueco libre en los proximos dias para reprogramar. He avisado a recepcion para que te propongan una fecha." };
  }

  const optionLines = options.map((slot, index) => `${index + 1}) ${formatSlotForStaff(slot)}`).join("\n");
  return {
    reply: `Estos son los huecos que tengo libres para reprogramar tu cita:\n${optionLines}\nDime el numero de la opcion que prefieres.`,
    pendingReschedule: { appointmentId: appointment.id, options: options.map(slot => slot.toISOString()) }
  };
}

async function resolvePendingSchedulingChoice(
  tenantId: string,
  conversationId: string,
  body: string
): Promise<string | null> {
  const lastOutbound = await prisma.message.findFirst({
    where: { conversationId, direction: MessageDirection.OUTBOUND },
    orderBy: { createdAt: "desc" }
  });
  const metadata = asRecord(lastOutbound?.metadata);
  const pending = metadata.pendingReschedule as { appointmentId: string; options: string[] } | null | undefined;
  if (!pending || !Array.isArray(pending.options) || pending.options.length === 0) {
    return null;
  }

  const choiceIndex = parseSlotChoice(body, pending.options.length);
  if (choiceIndex === null) {
    return null;
  }

  const chosenSlot = new Date(pending.options[choiceIndex]);
  try {
    const updated = await rescheduleAppointment(tenantId, pending.appointmentId, chosenSlot, { type: "ai" });
    return `Hecho, tu nueva cita queda para el ${formatSlotForStaff(updated.startsAt)}.`;
  } catch (error) {
    if (error instanceof SchedulingConflictError) {
      return "Ese hueco se acaba de ocupar. Escribeme de nuevo y te busco otro.";
    }
    throw error;
  }
}

async function bookUrgentSlot(input: {
  tenantId: string;
  patientId: string;
  conversationId: string;
  channel: ConversationChannel;
  treatmentNeed: string;
  dentalTurn: DentalAgentApiTurn;
}): Promise<UrgentBooking | null> {
  const { tenantId, patientId, conversationId, channel, treatmentNeed, dentalTurn } = input;

  // Idempotencia: si el paciente ya tiene un hueco urgente futuro creado por
  // la IA, no crear otro en cada mensaje escalado de la misma conversacion.
  const alreadyBooked = await prisma.appointment.findFirst({
    where: {
      tenantId,
      patientId,
      createdByAi: true,
      startsAt: { gte: new Date() },
      status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.URGENT] },
      title: { startsWith: "Urgencia IA" }
    }
  });
  if (alreadyBooked) {
    return null;
  }

  const provider = await prisma.provider.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
  if (!provider) {
    return null;
  }
  const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });

  const startsAt = await findNextAvailableSlot(tenantId, provider.id, {
    durationMinutes: URGENT_SLOT_MINUTES,
    maxDaysAhead: URGENT_MAX_DAYS_AHEAD,
    bufferMinutes: URGENT_BOOKING_BUFFER_MINUTES
  });
  if (!startsAt) {
    return null;
  }

  const urgentTreatment = await prisma.treatment.findFirst({
    where: { tenantId, active: true, OR: [{ name: { contains: "urgen" } }, { rules: { contains: "urgen" } }] },
    orderBy: { name: "asc" }
  });

  await prisma.appointment.create({
    data: {
      tenantId,
      patientId,
      treatmentId: urgentTreatment?.id ?? null,
      providerId: provider.id,
      operatoryId: operatory?.id ?? null,
      title: `Urgencia IA: ${treatmentNeed || "valoracion urgente"}`,
      startsAt,
      durationMinutes: URGENT_SLOT_MINUTES,
      status: AppointmentStatus.CONFIRMED,
      channel,
      createdByAi: true
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "agent.urgent_slot_confirmed",
      entityType: "Conversation",
      entityId: conversationId,
      metadata: {
        providerId: provider.id,
        operatoryId: operatory?.id ?? null,
        startsAt,
        engine: dentalTurn.runtime,
        model: dentalTurn.model
      }
    }
  });

  return { startsAt, providerName: provider.name, operatoryName: operatory?.name };
}

export function formatUrgentSlotSentence(booking: UrgentBooking): string {
  const now = new Date();
  const sameDay = booking.startsAt.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(booking.startsAt);
  const dayLabel = sameDay
    ? "hoy"
    : new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(booking.startsAt);
  const withWho = ` con ${booking.providerName}`;
  const where = booking.operatoryName ? ` en ${booking.operatoryName}` : "";

  return `Te he reservado un hueco urgente ${dayLabel} a las ${time}${withWho}${where}. Queda confirmado; si no te encaja, dimelo y lo movemos.`;
}

function formatSlotForStaff(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function inferPreferredStart(availability: string) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setMinutes(0, 0, 0);

  const normalized = availability.toLowerCase();
  if (normalized.includes("tarde")) {
    start.setHours(17);
    return start;
  }
  if (normalized.includes("manana") || normalized.includes("mañana")) {
    start.setHours(10);
    return start;
  }

  const timeMatch = availability.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/);
  if (timeMatch?.[0]) {
    const [hours, minutes] = timeMatch[0].replace(".", ":").split(":").map(Number);
    start.setHours(hours, minutes);
    return start;
  }

  start.setHours(11);
  return start;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
