import { AgentSessionOutcome, AppointmentStatus, ConversationChannel, ConversationStatus, MessageDirection, PatientStatus, TaskPriority, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { demoKnowledge, demoScenarios } from "@/lib/agent/demo-data";

export function getDemoScenario(id: FormDataEntryValue | null) {
  return demoScenarios.find(scenario => scenario.id === id) ?? demoScenarios[0];
}

export async function runDemoScenario(tenantId: string, actorUserId: string, scenarioId: FormDataEntryValue | null) {
  const startedAt = Date.now();
  const scenario = getDemoScenario(scenarioId);

  const patient = await prisma.patient.upsert({
    where: { tenantId_phone: { tenantId, phone: scenario.phone } },
    update: {
      name: scenario.patientName,
      status: scenario.escalated ? PatientStatus.URGENT : PatientStatus.NEW_LEAD,
      source: "Demo IA",
      preferredChannel: ConversationChannel.WHATSAPP,
      treatmentNeed: scenario.treatmentNeed,
      estimatedValue: scenario.estimatedValue,
      notes: `Demo recepcionista IA: ${scenario.impact}`
    },
    create: {
      tenantId,
      name: scenario.patientName,
      phone: scenario.phone,
      status: scenario.escalated ? PatientStatus.URGENT : PatientStatus.NEW_LEAD,
      source: "Demo IA",
      preferredChannel: ConversationChannel.WHATSAPP,
      treatmentNeed: scenario.treatmentNeed,
      estimatedValue: scenario.estimatedValue,
      notes: `Demo recepcionista IA: ${scenario.impact}`
    }
  });

  const conversation = await prisma.conversation.create({
    data: {
      tenantId,
      patientId: patient.id,
      channel: ConversationChannel.WHATSAPP,
      status: scenario.escalated ? ConversationStatus.HUMAN_REQUIRED : ConversationStatus.AI_HANDLING,
      intent: scenario.intent,
      result: scenario.outcome,
      unread: true,
      messages: {
        create: [
          {
            direction: MessageDirection.INBOUND,
            senderName: scenario.patientName,
            body: scenario.prompt,
            metadata: { demo: true, source: "scenario" }
          },
          {
            direction: MessageDirection.SYSTEM,
            senderName: "Base de conocimiento",
            body: `Conocimiento usado: sedes ${demoKnowledge.clinic.locations.join(" / ")}; ${scenario.treatmentNeed}; financiacion hasta 24 meses; guardrails clinicos activos.`,
            metadata: { demo: true, knowledge: true }
          },
          {
            direction: MessageDirection.OUTBOUND,
            senderName: demoKnowledge.clinic.assistant,
            body: scenario.reply,
            metadata: { demo: true, intent: scenario.intent, trainedKnowledge: true }
          }
        ]
      }
    }
  });

  if (scenario.escalated) {
    await prisma.task.create({
      data: {
        tenantId,
        patientId: patient.id,
        title: `Demo IA: llamar urgente a ${scenario.patientName}`,
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
      where: { tenantId, name: { contains: scenario.treatmentNeed.split(" ")[0] } }
    });
    const provider = await prisma.provider.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
    const operatory = await prisma.operatory.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
    await prisma.appointment.create({
      data: {
        tenantId,
        patientId: patient.id,
        treatmentId: treatment?.id ?? null,
        providerId: provider?.id ?? null,
        operatoryId: operatory?.id ?? null,
        title: `Demo IA: ${scenario.treatmentNeed}`,
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
      tenantId,
      patientId: patient.id,
      conversationId: conversation.id,
      intent: scenario.intent,
      outcome: scenario.escalated ? AgentSessionOutcome.ESCALATED : AgentSessionOutcome.APPOINTMENT_CREATED,
      escalated: scenario.escalated,
      costCents: scenario.escalated ? 24 : 18,
      latencyMs: Date.now() - startedAt
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId,
      action: "agent.demo_run",
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: { scenario: scenario.id, intent: scenario.intent, impact: scenario.impact }
    }
  });

  return { conversationId: conversation.id, title: scenario.title };
}
