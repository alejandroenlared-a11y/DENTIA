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

  const reply = dentalTurn.reply;
  const intent = dentalTurn.state.intentCode || dentalTurn.state.intent || "INTENCION_PENDIENTE";
  const escalated = dentalTurn.state.escalated;
  const appointmentCreated = await persistDentalOutcome({
    tenantId: tenant.id,
    patientId: patient.id,
    conversationId: conversation.id,
    channel: payload.channel,
    dentalTurn
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
    await ensureEscalationTask(tenant.id, patient.id, conversation.id, patient.name, payload.from);
  }

  await prisma.agentSession.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      conversationId: conversation.id,
      intent,
      outcome: escalated
        ? AgentSessionOutcome.ESCALATED
        : appointmentCreated
          ? AgentSessionOutcome.APPOINTMENT_CREATED
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
        appointmentCreated
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

  await prisma.appointment.create({
    data: {
      tenantId,
      patientId,
      treatmentId: treatment?.id ?? null,
      providerId: provider?.id ?? null,
      operatoryId: operatory?.id ?? null,
      title: `IA WhatsApp: ${state.treatmentNeed}`,
      startsAt: inferAppointmentStart(state.availability),
      durationMinutes: treatment?.durationMinutes ?? 30,
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

async function ensureEscalationTask(tenantId: string, patientId: string, conversationId: string, patientName: string, phone: string) {
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

  await prisma.task.create({
    data: {
      tenantId,
      patientId,
      title: `URGENCIA: contactar a ${patientName} (${phone})`,
      type: "Urgencia",
      priority: TaskPriority.CRITICAL,
      status: TaskStatus.PENDING,
      dueAt: new Date(),
      linkedType: "Conversation",
      linkedId: conversationId
    }
  });
}

function inferAppointmentStart(availability: string) {
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
