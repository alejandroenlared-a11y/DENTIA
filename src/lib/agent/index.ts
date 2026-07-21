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
  type ClinicLocation,
  type Prisma,
  type Tenant,
  type TenantSetting
} from "@prisma/client";
import {
  dentalAgentStateSchema,
  runDentalAgentTurn,
  type DentalAgentApiTurn,
  type DentalChatMessage
} from "@/lib/agent/openai-dental-agent";
import { initialDentalAgentState, normalize, type DentalAgentState, type DentalIntentId } from "@/lib/agent/dental-senior-agent";
import { prisma } from "@/lib/prisma";
import {
  cancelAppointment,
  findNextAvailableSlot,
  hasConflict,
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
import { notifyAppointmentEvent } from "@/lib/notifications/appointment-notifications";
import { ensurePatientIntakeFromDentalState } from "@/lib/patient-intake";
import { parseLocation, parseOptionalLocation, providerScopesForLocation } from "@/lib/locations";

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
  const inboundEmail = extractEmail(payload.body);
  const inboundLocation = parseOptionalLocation(payload.body);

  const patient = await prisma.patient.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: payload.from } },
    create: {
      tenantId: tenant.id,
      ...(inboundLocation ? { primaryLocation: inboundLocation } : {}),
      name: payload.name?.trim() || `Contacto ${payload.from}`,
      phone: payload.from,
      email: inboundEmail || null,
      status: PatientStatus.NEW_LEAD,
      source: payload.channel.toLowerCase(),
      preferredChannel: payload.channel
    },
    update: {
      ...(payload.name?.trim() ? { name: payload.name.trim() } : {}),
      ...(inboundLocation ? { primaryLocation: inboundLocation } : {}),
      ...(inboundEmail ? { email: inboundEmail } : {})
    }
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

  const pendingBookingResult = existing
    ? await resolvePendingBookingChoice(tenant.id, conversation.id, payload.body)
    : null;
  if (pendingBookingResult) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        senderName: tenant.assistantName,
        body: pendingBookingResult.reply,
        metadata: {
          intent: "AGENDA_BOOKING_CONFIRMED",
          pendingRebookingConfirmation: pendingBookingResult.pendingRebookingConfirmation ?? null
        }
      }
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { intent: "AGENDA_BOOKING_CONFIRMED", unread: true, result: "Cita elegida por paciente" }
    });
    return { conversationId: conversation.id, reply: pendingBookingResult.reply, escalated: false };
  }

  const pendingRebookingResult = existing
    ? await resolvePendingRebookingConfirmation(tenant.id, conversation.id, payload.body)
    : null;
  if (pendingRebookingResult) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        senderName: tenant.assistantName,
        body: pendingRebookingResult.reply,
        metadata: {
          intent: "AGENDA_REBOOKING_CONFIRMATION",
          pendingReschedule: pendingRebookingResult.pendingReschedule ?? null
        }
      }
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { intent: "AGENDA_REBOOKING_CONFIRMATION", unread: true, result: "Atendido por IA" }
    });
    return { conversationId: conversation.id, reply: pendingRebookingResult.reply, escalated: false };
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
  const extractedPreviousState = extractPreviousDentalState(recent);
  const previousState = {
    ...extractedPreviousState,
    email: extractedPreviousState.email || patient.email || ""
  };
  const dentalTurn = await runDentalAgentTurn({
    latestPatientMessage: payload.body,
    history,
    state: previousState,
    clinicContext: buildClinicContext(tenant, treatments)
  });

  let reply = dentalTurn.reply;
  const intent = dentalTurn.state.intentCode || dentalTurn.state.intent || "INTENCION_PENDIENTE";
  const escalated = dentalTurn.state.escalated;
  const requestedOptionsPeriod = getRequestedAvailabilityOptionsPeriod(payload.body);
  const lastOutbound = [...recent].reverse().find(message => message.direction === MessageDirection.OUTBOUND);
  const hasOpenPendingBooking = Boolean(parsePendingBooking(asRecord(lastOutbound?.metadata).pendingBooking)?.options.length);
  // Si ya existe una cita real creada por la IA, el flujo de propuesta de
  // huecos NUNCA vuelve a dispararse solo (p.ej. tras "perfecto, gracias" o
  // "no quiero cambiarla"): cambiar de fecha pasa por detectSchedulingRequest
  // + resolvePendingRebookingConfirmation, no por aqui.
  const existingAiAppointment = await findActiveAiAppointment(tenant.id, patient.id);
  const shouldOfferDefaultAvailabilityOptions =
    !requestedOptionsPeriod &&
    canOfferAvailabilityOptions(dentalTurn.state) &&
    !hasOpenPendingBooking &&
    !existingAiAppointment;
  const availabilityOptionsPeriod = requestedOptionsPeriod || (shouldOfferDefaultAvailabilityOptions ? "manana" : "");
  const availabilityOptionsProposal =
    availabilityOptionsPeriod && canOfferAvailabilityOptions(dentalTurn.state) && !existingAiAppointment
      ? await buildBookingProposal({
          tenantId: tenant.id,
          patientId: patient.id,
          channel: payload.channel,
          dentalTurn: {
            ...dentalTurn,
            state: {
              ...dentalTurn.state,
              availability: availabilityOptionsPeriod,
              ready: true
            }
          }
        })
      : null;
  const bookingProposal =
    !availabilityOptionsProposal && !escalated && dentalTurn.state.ready && !previousState.ready && !existingAiAppointment
      ? await buildBookingProposal({
          tenantId: tenant.id,
          patientId: patient.id,
          channel: payload.channel,
          dentalTurn
        })
      : null;
  const { created: appointmentCreated, startsAt: bookedStartsAt, providerName: bookedProviderName } = await persistDentalOutcome({
    tenantId: tenant.id,
    patientId: patient.id,
    conversationId: conversation.id,
    channel: payload.channel,
    dentalTurn,
    autoBook: !bookingProposal
  });
  await ensurePatientIntakeFromDentalState({
    tenantId: tenant.id,
    patientId: patient.id,
    conversationId: conversation.id,
    channel: payload.channel,
    state: dentalTurn.state
  }).catch(error => {
    console.error("ensurePatientIntakeFromDentalState failed", error);
  });

  if (bookingProposal) {
    reply = bookingProposal.reply;
  }
  if (availabilityOptionsProposal) {
    reply = availabilityOptionsProposal.reply;
  }

  // La pre-reserva solo menciona la franja preferida ("franja manana"), nunca
  // el dia real ni con quien: sin esto el paciente se queda sin saber para
  // cuando es la cita (visto en QA: preguntaba "para cuando es?" tras la
  // confirmacion) ni que el enrutado por especialidad es real, no al azar.
  if (!bookingProposal && !escalated && dentalTurn.state.ready && !previousState.ready && bookedStartsAt) {
    const withWho = bookedProviderName ? ` con ${bookedProviderName}` : "";
    reply = `${reply}\n\nTe espero ${formatFriendlyDateTime(bookedStartsAt)}${withWho}.`;
  }

  let urgentBooking: UrgentBooking | null = null;
  // Regla conversacional: en una urgencia primero se hace la pregunta de
  // seguridad (fiebre, hinchazon, dificultad para tragar...) y se espera la
  // respuesta del paciente. Solo entonces se reserva y se habla de la cita.
  const safetyKnown = dentalTurn.state.safetyScreened || dentalTurn.state.redFlags.length > 0;
  if (escalated && safetyKnown && dentalTurn.state.ready) {
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
            ? "Para dejarla a tu nombre, aceptas que guardemos tus datos?"
            : !dentalTurn.state.name || !dentalTurn.state.phone
              ? "Dime tu nombre y apellidos para dejarla a tu nombre."
              : ""
        ].filter(Boolean).join("\n\n");
      }
    }
  }

  reply = sanitizeReceptionCallbackAfterNormalBooking(reply, {
    appointmentCreated: appointmentCreated || Boolean(bookingProposal) || Boolean(availabilityOptionsProposal),
    escalated,
    urgentBooking: Boolean(urgentBooking)
  });

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
        dentalState: dentalTurn.state,
        pendingBooking: bookingProposal?.pendingBooking ?? availabilityOptionsProposal?.pendingBooking ?? null
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

export function sanitizeReceptionCallbackAfterNormalBooking(
  reply: string,
  context: { appointmentCreated: boolean; escalated: boolean; urgentBooking: boolean }
) {
  if (!context.appointmentCreated || context.escalated || context.urgentBooking) {
    return reply;
  }

  return reply
    .split(/\n{2,}/)
    .filter(part => !mentionsReceptionCallback(part))
    .join("\n\n")
    .trim();
}

function mentionsReceptionCallback(text: string) {
  const normalized = normalize(text);
  return /(recepcion|equipo|persona|clinica).{0,80}(llam|contact|avis|confirm)|(?:te|le|lo|la)\s+(?:llamaremos|llamaran|contactaremos|contactaran)|(?:te|le)\s+llamamos|(?:te|le)\s+contactamos/.test(normalized);
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
    tenant.settings?.knowledgeNotes ? `Base de conocimiento de la clinica:\n${tenant.settings.knowledgeNotes}` : "",
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

type PendingBookingMetadata = {
  patientId: string;
  treatmentId: string | null;
  providerId: string | null;
  providerName: string | null;
  operatoryId: string | null;
  location: ClinicLocation;
  durationMinutes: number;
  treatmentNeed: string;
  channel: ConversationChannel;
  options: string[];
};

type BookingProposal = { reply: string; pendingBooking: PendingBookingMetadata };

type PersistOutcome = { created: boolean; startsAt: Date | null; providerName: string | null };

// Fuente unica de verdad para "ya existe una cita creada por la IA en curso".
// Usada para no crear/proponer una segunda cita (persistDentalOutcome), para
// avisar en vez de reservar de nuevo (resolvePendingBookingChoice) y para
// bloquear la re-propuesta espontanea de huecos en el flujo principal.
async function findActiveAiAppointment(tenantId: string, patientId: string) {
  return prisma.appointment.findFirst({
    where: {
      tenantId,
      patientId,
      createdByAi: true,
      startsAt: { gte: new Date() },
      status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.PROPOSED, AppointmentStatus.CONFIRMED] }
    },
    orderBy: { createdAt: "desc" },
    include: { provider: true }
  });
}

async function persistDentalOutcome(input: {
  tenantId: string;
  patientId: string;
  conversationId: string;
  channel: ConversationChannel;
  dentalTurn: DentalAgentApiTurn;
  autoBook?: boolean;
}): Promise<PersistOutcome> {
  const { tenantId, patientId, conversationId, channel, dentalTurn, autoBook = true } = input;
  const state = dentalTurn.state;
  const location = parseLocation(state.location);

  await prisma.patient.update({
    where: { id: patientId },
    data: {
      primaryLocation: location,
      ...(state.name ? { name: state.name } : {}),
      ...(state.email ? { email: state.email } : {}),
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

  if (!state.ready || state.escalated || !autoBook) {
    return { created: false, startsAt: null, providerName: null };
  }

  const existingAppointment = await findActiveAiAppointment(tenantId, patientId);
  if (existingAppointment) {
    return { created: false, startsAt: existingAppointment.startsAt, providerName: existingAppointment.provider?.name ?? null };
  }

  const treatment = await prisma.treatment.findFirst({
    where: {
      tenantId,
      active: true,
      OR: [{ name: { contains: state.treatmentNeed.split(" ")[0] || state.treatmentNeed } }, { rules: { contains: state.intentCode } }]
    },
    orderBy: { name: "asc" }
  });
  const provider = await findProviderForIntent(tenantId, state.intent, location);
  const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true, location }, orderBy: { name: "asc" } });
  const durationMinutes = treatment?.durationMinutes ?? 30;
  const preferredFrom = inferPreferredStart(state.availability);
  const startsAt = provider
    ? (await findNextAvailableSlot(tenantId, provider.id, { durationMinutes, from: preferredFrom })) ?? preferredFrom
    : preferredFrom;

  const createdAppointment = await prisma.appointment.create({
    data: {
      tenantId,
      location,
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
  await notifyAppointmentEvent({
    tenantId,
    appointmentId: createdAppointment.id,
    eventType: "created",
    actor: { type: "ai" }
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

  return { created: true, startsAt, providerName: provider?.name ?? null };
}

async function buildBookingProposal(input: {
  tenantId: string;
  patientId: string;
  channel: ConversationChannel;
  dentalTurn: DentalAgentApiTurn;
}): Promise<BookingProposal | null> {
  const { tenantId, patientId, channel, dentalTurn } = input;
  const state = dentalTurn.state;
  const location = parseLocation(state.location);
  const treatment = await prisma.treatment.findFirst({
    where: {
      tenantId,
      active: true,
      OR: [{ name: { contains: state.treatmentNeed.split(" ")[0] || state.treatmentNeed } }, { rules: { contains: state.intentCode } }]
    },
    orderBy: { name: "asc" }
  });
  const provider = await findProviderForIntent(tenantId, state.intent, location);
  const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true, location }, orderBy: { name: "asc" } });
  const durationMinutes = treatment?.durationMinutes ?? 30;
  const options = provider
    ? await listGuidedBookingSlots(tenantId, provider.id, state.availability, durationMinutes)
    : fallbackGuidedSlots(state.availability);

  if (options.length === 0) {
    return {
      reply: "Ya tengo tus datos.\n\nNo veo huecos claros ahora mismo; dejo aviso a recepcion para que te propongan una hora.",
      pendingBooking: {
        patientId,
        treatmentId: treatment?.id ?? null,
        providerId: provider?.id ?? null,
        providerName: provider?.name ?? null,
        operatoryId: operatory?.id ?? null,
        location,
        durationMinutes,
        treatmentNeed: state.treatmentNeed,
        channel,
        options: []
      }
    };
  }

  const optionLines = options.map((slot, index) => `${index + 1}. ${formatPatientSlotOption(slot)}`);
  const reply = [
    "Perfecto, ya tengo lo necesario.",
    `Te propongo estos huecos en ${state.location}:`,
    ...optionLines,
    "Responde con 1, 2 o 3 y te la dejo pre-reservada."
  ].join("\n\n");

  return {
    reply,
    pendingBooking: {
      patientId,
      treatmentId: treatment?.id ?? null,
      providerId: provider?.id ?? null,
      providerName: provider?.name ?? null,
      operatoryId: operatory?.id ?? null,
      location,
      durationMinutes,
      treatmentNeed: state.treatmentNeed,
      channel,
      options: options.map(slot => slot.toISOString())
    }
  };
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
    include: { provider: true, operatory: true }
  });

  if (!appointment) {
    return {
      reply:
        "No encuentro ninguna cita proxima con los datos que tengo. Para localizarla mejor, dime nombre completo y telefono de contacto."
    };
  }

  if (kind === "query") {
    const withWho = appointment.provider ? ` con ${appointment.provider.name}` : "";
    const where = appointment.operatory ? ` en ${appointment.operatory.name}` : "";
    return { reply: `Tu cita es ${formatFriendlyDateTime(appointment.startsAt)}${withWho}${where}. Si necesitas cambiarla, dimelo.` };
  }

  if (kind === "cancel") {
    await cancelAppointment(tenantId, appointment.id, { type: "ai" }, "Solicitado por paciente via chat");
    return { reply: `Listo, he cancelado tu cita del ${formatSlotForStaff(appointment.startsAt)}. Si quieres reservar otro hueco, dimelo cuando quieras.` };
  }

  return buildRescheduleOptionsReply(tenantId, appointment);
}

async function buildRescheduleOptionsReply(
  tenantId: string,
  appointment: { id: string; providerId: string | null; durationMinutes: number }
): Promise<SchedulingResult> {
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

type BookingChoiceResult = { reply: string; pendingRebookingConfirmation?: { appointmentId: string } };

async function resolvePendingBookingChoice(
  tenantId: string,
  conversationId: string,
  body: string
): Promise<BookingChoiceResult | null> {
  const lastOutbound = await prisma.message.findFirst({
    where: { conversationId, direction: MessageDirection.OUTBOUND },
    orderBy: { createdAt: "desc" }
  });
  const metadata = asRecord(lastOutbound?.metadata);
  const pending = parsePendingBooking(metadata.pendingBooking);
  if (!pending || pending.options.length === 0) {
    return null;
  }

  const choiceIndex = parseSlotChoice(body, pending.options.length);
  if (choiceIndex === null) {
    return null;
  }

  const startsAt = new Date(pending.options[choiceIndex]);
  if (Number.isNaN(startsAt.getTime())) {
    return { reply: "Ese hueco ya no parece valido. Te busco opciones nuevas si me escribes manana o tarde." };
  }

  const patient = await prisma.patient.findFirst({ where: { id: pending.patientId, tenantId }, select: { id: true, name: true } });
  if (!patient) {
    return { reply: "No encuentro tu ficha en esta clinica. Te paso con recepcion para revisarlo." };
  }

  const existingAppointment = await findActiveAiAppointment(tenantId, pending.patientId);
  if (existingAppointment) {
    return {
      reply: `Ya tenias una pre-reserva: ${formatFriendlyDateTime(existingAppointment.startsAt)}. Si quieres cambiarla, dimelo y te doy alternativas.`,
      pendingRebookingConfirmation: { appointmentId: existingAppointment.id }
    };
  }

  if (pending.providerId) {
    const conflict = await hasBookingConflict(tenantId, pending.providerId, startsAt, pending.durationMinutes);
    if (conflict) {
      return { reply: "Ese hueco se acaba de ocupar. Escribeme manana o tarde y te doy tres opciones nuevas." };
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      location: pending.location,
      patientId: pending.patientId,
      treatmentId: pending.treatmentId,
      providerId: pending.providerId,
      operatoryId: pending.operatoryId,
      title: `IA WhatsApp: ${pending.treatmentNeed}`,
      startsAt,
      durationMinutes: pending.durationMinutes,
      status: AppointmentStatus.PROPOSED,
      channel: pending.channel,
      createdByAi: true
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      action: "agent.appointment_slot_selected",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: {
        conversationId,
        startsAt,
        providerId: pending.providerId,
        choice: choiceIndex + 1
      } as Prisma.InputJsonValue
    }
  });
  await notifyAppointmentEvent({
    tenantId,
    appointmentId: appointment.id,
    eventType: "created",
    actor: { type: "ai" }
  });

  return { reply: formatPendingBookingConfirmation(startsAt) };
}

export function formatPendingBookingConfirmation(startsAt: Date) {
  return `Perfecto, te dejo pre-reservada la cita ${formatFriendlyDateTime(startsAt)}.\n\nSi no te encaja, dime cambiar y te doy otras opciones.`;
}

// Tras "Ya tenias una pre-reserva... si quieres cambiarla, dimelo", el
// paciente puede rechazar el cambio ("no", "asi esta bien") o confirmarlo
// ("si, cambiala"). Sin esto, cualquier respuesta caia al flujo general y
// podia interpretarse como una nueva peticion de cita (ver bug: "no quiero
// cambiarla" reabria una propuesta de huecos en vez de dejar la cita igual).
const DECLINE_REBOOKING_PATTERNS = [
  /^no\b/,
  /no\s+quiero\s+cambiar/,
  /asi\s+esta\s+bien/,
  /esta\s+bien\s+asi/,
  /dejal[ao]\s+asi/,
  /no\s+hace\s+falta/,
  /no\s+gracias/
];
const ACCEPT_REBOOKING_PATTERNS = [/^si\b/, /cambia(rla|rlo|la|lo)?/, /quiero\s+cambiar/, /reprograma/];

async function resolvePendingRebookingConfirmation(
  tenantId: string,
  conversationId: string,
  body: string
): Promise<SchedulingResult | null> {
  const lastOutbound = await prisma.message.findFirst({
    where: { conversationId, direction: MessageDirection.OUTBOUND },
    orderBy: { createdAt: "desc" }
  });
  const metadata = asRecord(lastOutbound?.metadata);
  const pending = metadata.pendingRebookingConfirmation as { appointmentId: string } | null | undefined;
  if (!pending?.appointmentId) {
    return null;
  }

  const normalized = normalize(body);
  if (DECLINE_REBOOKING_PATTERNS.some(pattern => pattern.test(normalized))) {
    return { reply: "Perfecto, la dejamos tal cual. Cualquier cosa me dices." };
  }
  if (!ACCEPT_REBOOKING_PATTERNS.some(pattern => pattern.test(normalized))) {
    return null;
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: pending.appointmentId, tenantId }
  });
  if (!appointment) {
    return null;
  }
  return buildRescheduleOptionsReply(tenantId, appointment);
}

function parsePendingBooking(value: unknown): PendingBookingMetadata | null {
  const record = asRecord(value);
  const options = Array.isArray(record.options) ? record.options.filter((option): option is string => typeof option === "string") : [];
  if (typeof record.patientId !== "string" || options.length === 0) {
    return null;
  }

  return {
    patientId: record.patientId,
    treatmentId: typeof record.treatmentId === "string" ? record.treatmentId : null,
    providerId: typeof record.providerId === "string" ? record.providerId : null,
    providerName: typeof record.providerName === "string" ? record.providerName : null,
    operatoryId: typeof record.operatoryId === "string" ? record.operatoryId : null,
    location: parseLocation(record.location),
    durationMinutes: typeof record.durationMinutes === "number" ? record.durationMinutes : 30,
    treatmentNeed: typeof record.treatmentNeed === "string" ? record.treatmentNeed : "valoracion dental",
    channel: isConversationChannel(record.channel) ? record.channel : ConversationChannel.WHATSAPP,
    options
  };
}

function isConversationChannel(value: unknown): value is ConversationChannel {
  return typeof value === "string" && Object.values(ConversationChannel).includes(value as ConversationChannel);
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

  const location = parseLocation(dentalTurn.state.location);
  const provider = await findProviderForIntent(tenantId, dentalTurn.state.intent, location);
  if (!provider) {
    return null;
  }
  const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true, location }, orderBy: { name: "asc" } });

  const startsAt = await findNextAvailableSlot(tenantId, provider.id, {
    durationMinutes: URGENT_SLOT_MINUTES,
    from: inferPreferredStart(dentalTurn.state.availability),
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

  const appointment = await prisma.appointment.create({
    data: {
      tenantId,
      location,
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
  await notifyAppointmentEvent({
    tenantId,
    appointmentId: appointment.id,
    eventType: "created",
    actor: { type: "ai" }
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

// Enrutado por especialidad: cada motivo de consulta se asigna al doctor
// cuya especialidad coincide (p.ej. ortodoncia -> doctor de ortodoncia), como
// haria una recepcionista que conoce al equipo. Si nadie coincide, cualquier
// profesional activo atiende (mejor eso que dejar sin cita).
type ProviderRoutingProfile = {
  keywords: string[];
  avoid?: string[];
};

const SPECIALTY_ROUTING: Partial<Record<DentalIntentId, ProviderRoutingProfile>> = {
  implant_price: { keywords: ["implant", "periodon", "cirug"], avoid: ["higien", "mantenimiento"] },
  orthodontics: { keywords: ["ortodon"] },
  endodontics: { keywords: ["endodon"] },
  // Periodoncia clinica debe ir al periodoncista. Una higienista puede tener
  // "mantenimiento periodontal" en su especialidad, pero no debe ganar el
  // enrutado de una valoracion de encias/periodoncia.
  periodontics: { keywords: ["periodon"], avoid: ["higien", "mantenimiento"] },
  reactivation: { keywords: ["higien"] },
  prosthetics: { keywords: ["estetic", "protesis", "conservador"] },
  whitening: { keywords: ["estetic"] },
  cosmetic_dentistry: { keywords: ["estetic"] },
  caries_restoration: { keywords: ["conservador"] },
  wisdom_tooth: { keywords: ["cirug", "urgenc"] },
  trauma: { keywords: ["cirug", "urgenc"] },
  urgent_pain: { keywords: ["urgenc", "conservador"] },
  tmj_bruxism: { keywords: ["conservador", "urgenc"] }
};

async function findProviderForIntent(tenantId: string, intent: DentalIntentId | undefined, location?: ClinicLocation) {
  const providers = await prisma.provider.findMany({
    where: {
      tenantId,
      active: true,
      ...(location ? { locationScope: { in: providerScopesForLocation(location) } } : {})
    },
    orderBy: { name: "asc" }
  });
  if (providers.length === 0) {
    return null;
  }
  return chooseProviderForIntent(providers, intent);
}

export function chooseProviderForIntent<T extends { specialty: string | null }>(
  providers: T[],
  intent: DentalIntentId | undefined
): T | null {
  if (providers.length === 0) {
    return null;
  }

  const routing = intent ? SPECIALTY_ROUTING[intent] : undefined;
  if (routing?.keywords.length) {
    const matches = providers.filter(candidate => {
      const specialty = normalize(candidate.specialty ?? "");
      return routing.keywords.some(keyword => specialty.includes(keyword));
    });
    if (matches.length > 0) {
      const preferred = matches.find(candidate => {
        const specialty = normalize(candidate.specialty ?? "");
        return !(routing.avoid ?? []).some(keyword => specialty.includes(keyword));
      });
      return preferred ?? matches[0];
    }
  }

  // Sin especialidad concreta que casar (p.ej. primera visita): el orden
  // alfabetico puede caer en el higienista, pero una primera visita/valoracion
  // la hace un odontologo. Se prioriza cualquier profesional que no sea
  // higienista antes de caer en el resto.
  return providers.find(candidate => !normalize(candidate.specialty ?? "").includes("higien")) ?? providers[0];
}

async function listGuidedBookingSlots(
  tenantId: string,
  providerId: string,
  availability: string,
  durationMinutes: number
): Promise<Date[]> {
  const slots: Date[] = [];
  const normalized = normalize(availability);
  const preferredHour = normalized.includes("tarde") ? 17 : 10;
  const start = new Date();

  for (let offset = 1; offset <= 10 && slots.length < 3; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (candidate.getDay() === 0 || candidate.getDay() === 6) {
      continue;
    }
    candidate.setHours(preferredHour, 0, 0, 0);
    const slot = await findNextAvailableSlot(tenantId, providerId, {
      durationMinutes,
      from: candidate,
      maxDaysAhead: 1
    });
    if (slot) {
      slots.push(slot);
    }
  }

  return slots;
}

function fallbackGuidedSlots(availability: string): Date[] {
  const normalized = normalize(availability);
  const hour = normalized.includes("tarde") ? 17 : 10;
  const slots: Date[] = [];
  const start = new Date();
  for (let offset = 1; offset <= 10 && slots.length < 3; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (candidate.getDay() === 0 || candidate.getDay() === 6) {
      continue;
    }
    candidate.setHours(hour, 0, 0, 0);
    slots.push(candidate);
  }
  return slots;
}

async function hasBookingConflict(
  tenantId: string,
  providerId: string,
  startsAt: Date,
  durationMinutes: number
): Promise<boolean> {
  return hasConflict(tenantId, { providerId, startsAt, durationMinutes });
}

// Fecha en lenguaje natural para el paciente ("hoy a las 18:00" / "martes 14
// de julio a las 10:00"): nunca dejamos una cita solo con la franja horaria
// preferida ("manana"/"tarde") sin decir el dia real reservado.
export function formatFriendlyDateTime(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(date);
  const dayLabel = sameDay
    ? "hoy"
    : new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
  return `${dayLabel} a las ${time}`;
}

function formatPatientSlotOption(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatUrgentSlotSentence(booking: UrgentBooking): string {
  const withWho = ` con ${booking.providerName}`;
  const where = booking.operatoryName ? ` en ${booking.operatoryName}` : "";

  return `Te he reservado un hueco urgente ${formatFriendlyDateTime(booking.startsAt)}${withWho}${where}. Queda confirmado; si no te encaja, dimelo y lo movemos.`;
}

function formatSlotForStaff(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function inferPreferredStartForTest(availability: string, now = new Date()) {
  return inferPreferredStart(availability, now);
}

function inferPreferredStart(availability: string, now = new Date()) {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  const normalized = normalize(availability);
  if (normalized.includes("pasado manana")) {
    start.setDate(start.getDate() + 2);
  } else if (normalized.includes("manana") || normalized.includes("proxima semana")) {
    start.setDate(start.getDate() + 1);
  } else {
    start.setDate(start.getDate() + 1);
  }

  if (normalized.includes("tarde")) {
    start.setHours(17);
    return start;
  }
  if (/(por la manana|por las mananas|de manana|primera hora|temprano)/.test(normalized)) {
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

function getRequestedAvailabilityOptionsPeriod(body: string) {
  const normalized = normalize(body);
  const asksForOptions = /(que dias|que dia|que huecos|que horas|tienes|teneis|disponible|disponibilidad|opciones|hueco|huecos)/.test(normalized);
  if (!asksForOptions) {
    return "";
  }
  if (/\b(tarde|tardes|por la tarde|por las tardes)\b/.test(normalized)) {
    return "tarde";
  }
  if (/\b(manana|mananas|por la manana|por las mananas)\b/.test(normalized)) {
    return "manana";
  }
  return "";
}

function canOfferAvailabilityOptions(state: DentalAgentState) {
  return Boolean(
    state.intent &&
    state.consent &&
    state.name.trim().split(/\s+/).filter(Boolean).length >= 2 &&
    state.phone &&
    state.email &&
    state.location &&
    !state.availability
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}
