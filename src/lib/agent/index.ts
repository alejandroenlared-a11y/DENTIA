import {
  AgentSessionOutcome,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  PatientStatus,
  TaskPriority,
  TaskStatus,
  type Tenant,
  type TenantSetting
} from "@prisma/client";
import { buildReply, detectIntent, shouldEscalate } from "@/lib/agent/intents";
import { generateLlmReply } from "@/lib/agent/llm";
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

  const intent = detectIntent(payload.body);
  const escalated = shouldEscalate(intent);

  const treatments = await prisma.treatment.findMany({
    where: { tenantId: tenant.id, active: true },
    select: { name: true, priceCents: true }
  });

  const replyCtx = {
    assistantName: tenant.assistantName,
    clinicName: tenant.name,
    clinicPhone: tenant.phone,
    treatments
  };

  let reply: string | null = null;
  if (!escalated) {
    const recent = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 12
    });
    const history = recent.map(message => ({
      role: message.direction === MessageDirection.INBOUND ? ("user" as const) : ("assistant" as const),
      content: message.body
    }));
    reply = await generateLlmReply(replyCtx, history);
  }
  if (!reply) {
    reply = buildReply(intent, replyCtx);
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: MessageDirection.OUTBOUND,
      senderName: tenant.assistantName,
      body: reply,
      metadata: { intent, engine: "auto" }
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
    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        title: `URGENCIA: contactar a ${patient.name} (${payload.from})`,
        type: "Urgencia",
        priority: TaskPriority.CRITICAL,
        status: TaskStatus.PENDING,
        dueAt: new Date(),
        linkedType: "Conversation",
        linkedId: conversation.id
      }
    });
  }

  await prisma.agentSession.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      conversationId: conversation.id,
      intent,
      outcome: escalated ? AgentSessionOutcome.ESCALATED : AgentSessionOutcome.RESOLVED,
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
      metadata: { intent, channel: payload.channel }
    }
  });

  return { conversationId: conversation.id, reply, escalated };
}
