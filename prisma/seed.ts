import { randomBytes } from "node:crypto";
import {
  AgentSessionOutcome,
  AppointmentStatus,
  ConsentKind,
  ConversationChannel,
  ConversationStatus,
  ExpenseCategory,
  ExpenseStatus,
  InvoiceStatus,
  MessageDirection,
  PatientStatus,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserRole
} from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "dentia-demo-2026";
const PRIMARY_TENANT = {
  name: "Clinica Dental Murcia-Elche",
  slug: "clinica-murcia-elche",
  legalName: "Clinica Dental Murcia-Elche S.L.",
  phone: "+34 968 000 111",
  address: "Sedes en Murcia y Elche",
  pmsProvider: "Klinikare API",
  assistantName: "Clara",
  assistantEnabled: true,
  retentionDays: 90
};
const PRIMARY_SETTINGS = {
  tone: "Cercano, profesional y empatico",
  escalationRules:
    "Urgencia real, enfado, pagos/reclamaciones, peticion explicita de humano, dos fallos de comprension o sintomas fuera de protocolo.",
  rgpdNotes:
    "Locucion previa, consentimiento explicito, retencion 90 dias, residencia UE y minima PII al LLM.",
  voiceEnabled: true,
  whatsappEnabled: true,
  smsEnabled: true,
  webEnabled: true
};

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: PRIMARY_TENANT.slug },
    update: {
      ...PRIMARY_TENANT,
      settings: {
        upsert: {
          update: PRIMARY_SETTINGS,
          create: PRIMARY_SETTINGS
        }
      }
    },
    create: {
      ...PRIMARY_TENANT,
      settings: {
        create: PRIMARY_SETTINGS
      }
    }
  });

  if (!tenant.apiKey) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { apiKey: `dentia_${randomBytes(24).toString("hex")}` }
    });
  }

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "alejandro@dentia.ai" } },
    update: { name: "Alejandro Marti", passwordHash: hashPassword(DEMO_PASSWORD), role: UserRole.OWNER },
    create: {
      tenantId: tenant.id,
      name: "Alejandro Marti",
      email: "alejandro@dentia.ai",
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: UserRole.OWNER
    }
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "recepcion@dentia.ai" } },
    update: { name: "Recepcion Murcia-Elche", passwordHash: hashPassword(DEMO_PASSWORD), role: UserRole.RECEPTION },
    create: {
      tenantId: tenant.id,
      name: "Recepcion Murcia-Elche",
      email: "recepcion@dentia.ai",
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: UserRole.RECEPTION
    }
  });

  const secondTenant = await prisma.tenant.upsert({
    where: { slug: "clinica-elche-demo" },
    update: {
      name: "Clinica Elche Demo",
      phone: "+34 965 000 111",
      address: "Sede Elche",
      pmsProvider: "standalone",
      assistantName: "Iris"
    },
    create: {
      name: "Clinica Elche Demo",
      slug: "clinica-elche-demo",
      phone: "+34 965 000 111",
      address: "Sede Elche",
      pmsProvider: "standalone",
      assistantName: "Iris",
      apiKey: `dentia_${randomBytes(24).toString("hex")}`,
      settings: {
        create: {
          tone: "Directo y claro",
          escalationRules: "Urgencias a humano.",
          rgpdNotes: "Consentimiento explicito antes de guardar datos."
        }
      }
    }
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: secondTenant.id, email: "demo@elche.dentia.ai" } },
    update: { passwordHash: hashPassword(DEMO_PASSWORD) },
    create: {
      tenantId: secondTenant.id,
      name: "Demo Elche",
      email: "demo@elche.dentia.ai",
      passwordHash: hashPassword(DEMO_PASSWORD),
      role: UserRole.OWNER
    }
  });

  const [draVidal, drMarin, higienista] = await Promise.all([
    prisma.provider.upsert({
      where: { id: "seed-provider-vidal" },
      update: {},
      create: {
        id: "seed-provider-vidal",
        tenantId: tenant.id,
        name: "Dra. Laura Vidal",
        specialty: "Ortodoncia e implantologia"
      }
    }),
    prisma.provider.upsert({
      where: { id: "seed-provider-marin" },
      update: {},
      create: {
        id: "seed-provider-marin",
        tenantId: tenant.id,
        name: "Dr. Sergio Marin",
        specialty: "Urgencias y conservadora"
      }
    }),
    prisma.provider.upsert({
      where: { id: "seed-provider-marta" },
      update: {},
      create: {
        id: "seed-provider-marta",
        tenantId: tenant.id,
        name: "Higienista Marta",
        specialty: "Higiene y periodoncia"
      }
    })
  ]);

  const [gab1, gab2, urgencias] = await Promise.all([
    prisma.operatory.upsert({
      where: { id: "seed-operatory-1" },
      update: {},
      create: { id: "seed-operatory-1", tenantId: tenant.id, name: "Gabinete 1", kind: "Higiene" }
    }),
    prisma.operatory.upsert({
      where: { id: "seed-operatory-2" },
      update: {},
      create: { id: "seed-operatory-2", tenantId: tenant.id, name: "Gabinete 2", kind: "General" }
    }),
    prisma.operatory.upsert({
      where: { id: "seed-operatory-urgencias" },
      update: {},
      create: { id: "seed-operatory-urgencias", tenantId: tenant.id, name: "Urgencias", kind: "Urgencias" }
    })
  ]);

  const treatments = await Promise.all([
    upsertTreatment(tenant.id, "Revision dental", 30, 0, true, "Primera visita con consentimiento previo."),
    upsertTreatment(tenant.id, "Higiene", 45, 5500, false, "Recordatorio 24h. Lista de espera activa."),
    upsertTreatment(tenant.id, "Ortodoncia invisible", 30, null, true, "Valoracion obligatoria antes de precio cerrado."),
    upsertTreatment(tenant.id, "Implante unitario", 20, 120000, false, "Permite financiacion hasta 12 meses."),
    upsertTreatment(tenant.id, "Urgencia dental", 30, 7000, false, "Dolor agudo o inflamacion: hueco en menos de 24h.")
  ]);

  const maria = await upsertPatient(tenant.id, {
    name: "Maria Lopez Gonzalez",
    phone: "+34 612 456 890",
    email: "maria.lopez@mail.com",
    status: PatientStatus.NEW_LEAD,
    source: "WhatsApp",
    preferredChannel: ConversationChannel.WHATSAPP,
    treatmentNeed: "Ortodoncia invisible",
    estimatedValue: 180000,
    notes: "Alta intencion. Pregunta por alineadores invisibles."
  });

  const javier = await upsertPatient(tenant.id, {
    name: "Javier Ruiz Moreno",
    phone: "+34 666 102 488",
    email: "javier.ruiz@mail.com",
    status: PatientStatus.URGENT,
    source: "Llamada",
    preferredChannel: ConversationChannel.VOICE,
    treatmentNeed: "Dolor agudo",
    estimatedValue: 22000,
    notes: "Prioritario por dolor agudo e inflamacion."
  });

  const ana = await upsertPatient(tenant.id, {
    name: "Ana Molina Prieto",
    phone: "+34 600 331 987",
    email: "ana.molina@mail.com",
    status: PatientStatus.OPEN_BUDGET,
    source: "WhatsApp",
    preferredChannel: ConversationChannel.WHATSAPP,
    treatmentNeed: "Implante unitario",
    estimatedValue: 120000,
    notes: "Duda de financiacion."
  });

  const carlos = await upsertPatient(tenant.id, {
    name: "Carlos Vega Martin",
    phone: "+34 689 220 187",
    email: "carlos.vega@mail.com",
    status: PatientStatus.ACTIVE,
    source: "SMS",
    preferredChannel: ConversationChannel.SMS,
    treatmentNeed: "Higiene",
    estimatedValue: 5500,
    notes: "Acepta huecos de lista de espera."
  });

  await Promise.all([
    createConsent(tenant.id, maria.id, ConsentKind.DATA_PROCESSING, false),
    createConsent(tenant.id, maria.id, ConsentKind.AI_DISCLOSURE, false),
    createConsent(tenant.id, javier.id, ConsentKind.DATA_PROCESSING, true),
    createConsent(tenant.id, ana.id, ConsentKind.DATA_PROCESSING, true),
    createConsent(tenant.id, carlos.id, ConsentKind.DATA_PROCESSING, true)
  ]);

  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.appointment.createMany({
    data: [
      {
        tenantId: tenant.id,
        patientId: maria.id,
        treatmentId: treatments[2].id,
        providerId: draVidal.id,
        operatoryId: gab2.id,
        title: "Valoracion ortodoncia",
        startsAt: new Date("2026-07-09T09:30:00.000Z"),
        durationMinutes: 30,
        status: AppointmentStatus.PROPOSED,
        channel: ConversationChannel.WHATSAPP,
        createdByAi: true
      },
      {
        tenantId: tenant.id,
        patientId: javier.id,
        treatmentId: treatments[4].id,
        providerId: drMarin.id,
        operatoryId: urgencias.id,
        title: "Dolor agudo",
        startsAt: new Date("2026-07-08T18:15:00.000Z"),
        durationMinutes: 30,
        status: AppointmentStatus.URGENT,
        channel: ConversationChannel.VOICE,
        createdByAi: true
      },
      {
        tenantId: tenant.id,
        patientId: carlos.id,
        treatmentId: treatments[1].id,
        providerId: higienista.id,
        operatoryId: gab1.id,
        title: "Higiene",
        startsAt: new Date("2026-07-10T12:00:00.000Z"),
        durationMinutes: 45,
        status: AppointmentStatus.CONFIRMED,
        channel: ConversationChannel.SMS,
        createdByAi: true
      },
      {
        tenantId: tenant.id,
        patientId: ana.id,
        treatmentId: treatments[3].id,
        providerId: draVidal.id,
        operatoryId: gab2.id,
        title: "Cierre presupuesto",
        startsAt: new Date("2026-07-11T10:30:00.000Z"),
        durationMinutes: 20,
        status: AppointmentStatus.CONFIRMED,
        channel: ConversationChannel.WHATSAPP,
        createdByAi: true
      }
    ]
  });

  await prisma.conversation.deleteMany({ where: { tenantId: tenant.id } });
  await createConversation(tenant.id, maria.id, ConversationChannel.WHATSAPP, "Cita propuesta", ConversationStatus.AI_HANDLING, true, [
    [MessageDirection.INBOUND, "Maria Lopez", "Hola, queria saber si haceis Invisalign y cuanto dura la primera visita."],
    [MessageDirection.OUTBOUND, "Clara IA", "Si, trabajamos alineadores invisibles. La primera valoracion dura unos 30 minutos."],
    [MessageDirection.SYSTEM, "Sistema", "Agenda verificada: jueves 09:30 o viernes 10:30."],
    [MessageDirection.OUTBOUND, "Clara IA", "Tengo jueves 09:30 o viernes 10:30. Cual te viene mejor?"]
  ]);

  await createConversation(tenant.id, javier.id, ConversationChannel.VOICE, "Escalado urgencia", ConversationStatus.HUMAN_REQUIRED, true, [
    [MessageDirection.INBOUND, "Javier Ruiz", "Me duele mucho una muela y tengo la cara algo inflamada desde anoche."],
    [MessageDirection.OUTBOUND, "Clara IA", "Lo siento. Por lo que cuentas es prioritario. Voy a buscar el primer hueco disponible y avisar a recepcion."],
    [MessageDirection.SYSTEM, "Sistema", "Triaje: prioritaria. Hueco disponible hoy 18:15."]
  ]);

  await createConversation(tenant.id, ana.id, ConversationChannel.WHATSAPP, "Presupuesto", ConversationStatus.ACTIVE, false, [
    [MessageDirection.OUTBOUND, "Clara IA", "Hola Ana, soy Clara. Te escribo por si quieres resolver alguna duda del presupuesto del implante."],
    [MessageDirection.INBOUND, "Ana Molina", "Queria saber si puedo financiarlo y cuanto tardaria."],
    [MessageDirection.OUTBOUND, "Clara IA", "Tenemos financiacion hasta 12 meses. Puedo reservarte una cita corta para resolverlo con el doctor."]
  ]);

  await createConversation(tenant.id, carlos.id, ConversationChannel.SMS, "Cita creada", ConversationStatus.COMPLETED, false, [
    [MessageDirection.SYSTEM, "Sistema", "Se libera hueco de higiene hoy 12:00."],
    [MessageDirection.OUTBOUND, "Clara IA", "Carlos, se ha liberado una higiene hoy a las 12:00. Quieres que te la reserve?"],
    [MessageDirection.INBOUND, "Carlos Vega", "Si, perfecto."],
    [MessageDirection.OUTBOUND, "Clara IA", "Confirmado. Te esperamos hoy a las 12:00."]
  ]);

  await prisma.task.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.task.createMany({
    data: [
      {
        tenantId: tenant.id,
        patientId: javier.id,
        title: "Confirmar urgencia de Javier Ruiz",
        type: "Recepcion",
        dueAt: new Date("2026-07-08T11:00:00.000Z"),
        status: TaskStatus.OVERDUE,
        priority: TaskPriority.HIGH
      },
      {
        tenantId: tenant.id,
        patientId: ana.id,
        title: "Llamar a Ana por financiacion",
        type: "Presupuesto",
        dueAt: new Date("2026-07-09T10:00:00.000Z"),
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM
      },
      {
        tenantId: tenant.id,
        patientId: maria.id,
        title: "Enviar consentimientos previos",
        type: "RGPD",
        dueAt: new Date("2026-07-09T09:00:00.000Z"),
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM
      }
    ]
  });

  await prisma.agentSession.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.agentSession.createMany({
    data: [
      {
        tenantId: tenant.id,
        patientId: maria.id,
        intent: "schedule_orthodontics_assessment",
        outcome: AgentSessionOutcome.APPOINTMENT_CREATED,
        escalated: false,
        costCents: 18,
        latencyMs: 820
      },
      {
        tenantId: tenant.id,
        patientId: javier.id,
        intent: "urgent_tooth_pain",
        outcome: AgentSessionOutcome.ESCALATED,
        escalated: true,
        costCents: 24,
        latencyMs: 760
      }
    ]
  });

  await seedBilling(tenant.id, { maria, javier, ana, carlos });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: "seed.initialized",
      entityType: "Tenant",
      entityId: tenant.id,
      metadata: { source: "prisma/seed.ts" }
    }
  });

  console.log(`Seed completado para tenant: ${tenant.slug}`);
}

async function upsertTreatment(
  tenantId: string,
  name: string,
  durationMinutes: number,
  priceCents: number | null,
  requiresAssessment: boolean,
  rules: string
) {
  return prisma.treatment.upsert({
    where: { tenantId_name: { tenantId, name } },
    update: { durationMinutes, priceCents, requiresAssessment, rules },
    create: { tenantId, name, durationMinutes, priceCents, requiresAssessment, rules }
  });
}

async function upsertPatient(
  tenantId: string,
  data: {
    name: string;
    phone: string;
    email: string;
    status: PatientStatus;
    source: string;
    preferredChannel: ConversationChannel;
    treatmentNeed: string;
    estimatedValue: number;
    notes: string;
  }
) {
  return prisma.patient.upsert({
    where: { tenantId_phone: { tenantId, phone: data.phone } },
    update: data,
    create: { tenantId, ...data }
  });
}

async function createConsent(tenantId: string, patientId: string, kind: ConsentKind, granted: boolean) {
  return prisma.consent.upsert({
    where: { tenantId_patientId_kind: { tenantId, patientId, kind } },
    update: { granted, grantedAt: granted ? new Date() : null, source: "seed" },
    create: { tenantId, patientId, kind, granted, grantedAt: granted ? new Date() : null, source: "seed" }
  });
}

async function createConversation(
  tenantId: string,
  patientId: string,
  channel: ConversationChannel,
  result: string,
  status: ConversationStatus,
  unread: boolean,
  messages: Array<[MessageDirection, string, string]>
) {
  return prisma.conversation.create({
    data: {
      tenantId,
      patientId,
      channel,
      result,
      status,
      unread,
      intent: result,
      messages: {
        create: messages.map(([direction, senderName, body]) => ({ direction, senderName, body }))
      }
    }
  });
}

function daysFromNow(offset: number): Date {
  return new Date(Date.now() + offset * 86_400_000);
}

function monthsAgo(months: number, day: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months, day);
  date.setHours(10, 0, 0, 0);
  return date;
}

async function seedBilling(
  tenantId: string,
  patients: { maria: { id: string }; javier: { id: string }; ana: { id: string }; carlos: { id: string } }
) {
  const lucia = await upsertPatient(tenantId, {
    name: "Lucia Rivas Fernandez",
    phone: "+34 655 902 341",
    email: "lucia.rivas@mail.com",
    status: PatientStatus.ACTIVE,
    source: "Instagram",
    preferredChannel: ConversationChannel.WHATSAPP,
    treatmentNeed: "Ortodoncia invisible",
    estimatedValue: 210000,
    notes: "En tratamiento de ortodoncia, pago fraccionado."
  });

  const antonio = await upsertPatient(tenantId, {
    name: "Antonio Fernandez Ruiz",
    phone: "+34 611 774 502",
    email: "antonio.fernandez@mail.com",
    status: PatientStatus.ACTIVE,
    source: "Google",
    preferredChannel: ConversationChannel.EMAIL,
    treatmentNeed: "Implante unitario",
    estimatedValue: 120000,
    notes: "Implante colocado, pendiente de segunda cuota."
  });

  await prisma.invoice.deleteMany({ where: { tenantId } });
  await prisma.invoice.createMany({
    data: [
      { tenantId, patientId: patients.maria.id, number: "F-2026-001", treatmentName: "Ortodoncia invisible", amountCents: 159000, status: InvoiceStatus.SENT, issuedAt: daysFromNow(-15), dueAt: daysFromNow(15) },
      { tenantId, patientId: lucia.id, number: "F-2026-002", treatmentName: "Ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.SENT, issuedAt: daysFromNow(-2), dueAt: daysFromNow(28) },
      { tenantId, patientId: patients.javier.id, number: "F-2026-003", treatmentName: "Urgencia dental", amountCents: 7000, status: InvoiceStatus.OVERDUE, issuedAt: daysFromNow(-40), dueAt: daysFromNow(-35) },
      { tenantId, patientId: antonio.id, number: "F-2026-004", treatmentName: "Implante unitario", amountCents: 60000, status: InvoiceStatus.OVERDUE, issuedAt: daysFromNow(-50), dueAt: daysFromNow(-20) },
      { tenantId, patientId: patients.carlos.id, number: "F-2026-005", treatmentName: "Higiene", amountCents: 5500, status: InvoiceStatus.PAID, issuedAt: daysFromNow(-10), dueAt: daysFromNow(5), paidAt: daysFromNow(-3) },
      { tenantId, patientId: patients.ana.id, number: "F-2026-006", treatmentName: "Implante unitario", amountCents: 60000, status: InvoiceStatus.PAID, issuedAt: daysFromNow(-8), dueAt: daysFromNow(7), paidAt: daysFromNow(-1) },
      { tenantId, patientId: antonio.id, number: "F-2026-007", treatmentName: "Implante unitario", amountCents: 60000, status: InvoiceStatus.PAID, issuedAt: daysFromNow(-49), dueAt: daysFromNow(-19), paidAt: daysFromNow(-45) },
      { tenantId, patientId: lucia.id, number: "F-2025-018", treatmentName: "Higiene", amountCents: 5500, status: InvoiceStatus.PAID, issuedAt: monthsAgo(1, 6), dueAt: monthsAgo(1, 21), paidAt: monthsAgo(1, 10) },
      { tenantId, patientId: patients.carlos.id, number: "F-2025-017", treatmentName: "Ortodoncia invisible", amountCents: 85000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(1, 3), dueAt: monthsAgo(1, 18), paidAt: monthsAgo(1, 12) },
      { tenantId, patientId: antonio.id, number: "F-2025-016", treatmentName: "Implante unitario", amountCents: 60000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(2, 14), dueAt: monthsAgo(1, 29), paidAt: monthsAgo(2, 20) },
      { tenantId, patientId: patients.maria.id, number: "F-2025-015", treatmentName: "Higiene", amountCents: 5500, status: InvoiceStatus.PAID, issuedAt: monthsAgo(2, 2), dueAt: monthsAgo(1, 17), paidAt: monthsAgo(2, 9) },
      { tenantId, patientId: lucia.id, number: "F-2025-014", treatmentName: "Ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(3, 20), dueAt: monthsAgo(3, 5), paidAt: monthsAgo(3, 25) },
      { tenantId, patientId: patients.javier.id, number: "F-2025-013", treatmentName: "Urgencia dental", amountCents: 7000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(3, 8), dueAt: monthsAgo(2, 23), paidAt: monthsAgo(3, 11) },
      { tenantId, patientId: antonio.id, number: "F-2025-012", treatmentName: "Implante unitario", amountCents: 60000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(4, 12), dueAt: monthsAgo(3, 27), paidAt: monthsAgo(4, 18) },
      { tenantId, patientId: patients.carlos.id, number: "F-2025-011", treatmentName: "Higiene", amountCents: 5500, status: InvoiceStatus.PAID, issuedAt: monthsAgo(4, 3), dueAt: monthsAgo(3, 18), paidAt: monthsAgo(4, 8) },
      { tenantId, patientId: lucia.id, number: "F-2025-010", treatmentName: "Ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.PAID, issuedAt: monthsAgo(5, 15), dueAt: monthsAgo(4, 30), paidAt: monthsAgo(5, 22) },
      { tenantId, patientId: patients.maria.id, number: "F-2025-009", treatmentName: "Higiene", amountCents: 5500, status: InvoiceStatus.PAID, issuedAt: monthsAgo(5, 5), dueAt: monthsAgo(4, 20), paidAt: monthsAgo(5, 9) },
      { tenantId, patientId: lucia.id, number: "F-2026-008", treatmentName: "Ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.SENT, issuedAt: daysFromNow(-1), dueAt: daysFromNow(55) },
      { tenantId, patientId: patients.maria.id, number: "F-2026-009", treatmentName: "Ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.SENT, issuedAt: daysFromNow(-1), dueAt: daysFromNow(85) }
    ]
  });

  await prisma.expense.deleteMany({ where: { tenantId } });
  await prisma.expense.createMany({
    data: [
      { tenantId, supplier: "Laboratorio Dentalab", category: ExpenseCategory.LABORATORIO, amountCents: 38000, status: ExpenseStatus.PENDING, incurredAt: daysFromNow(-4), dueAt: daysFromNow(11) },
      { tenantId, supplier: "Colegio Oficial de Dentistas Region de Murcia", category: ExpenseCategory.OTROS, amountCents: 18000, status: ExpenseStatus.PENDING, incurredAt: daysFromNow(-6), dueAt: daysFromNow(9) },
      { tenantId, supplier: "Asesoria clinica Murcia-Elche", category: ExpenseCategory.OTROS, amountCents: 38000, status: ExpenseStatus.PENDING, incurredAt: daysFromNow(-9), dueAt: daysFromNow(2) },
      { tenantId, supplier: "Suministros Dentales Iberia", category: ExpenseCategory.SUMINISTROS, amountCents: 42500, status: ExpenseStatus.PAID, incurredAt: daysFromNow(-12), dueAt: daysFromNow(-2), paidAt: daysFromNow(-3) },
      { tenantId, supplier: "Nominas equipo clinico", category: ExpenseCategory.NOMINAS, amountCents: 620000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(0, 1), dueAt: monthsAgo(0, 1), paidAt: monthsAgo(0, 1) },
      { tenantId, supplier: "Alquiler sedes Murcia y Elche", category: ExpenseCategory.ALQUILER, amountCents: 280000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(0, 1), dueAt: monthsAgo(0, 1), paidAt: monthsAgo(0, 1) },
      { tenantId, supplier: "Google Ads Clinica", category: ExpenseCategory.MARKETING, amountCents: 32000, status: ExpenseStatus.PAID, incurredAt: daysFromNow(-15), dueAt: daysFromNow(-10), paidAt: daysFromNow(-10) },
      { tenantId, supplier: "Mantenimiento autoclave", category: ExpenseCategory.MANTENIMIENTO, amountCents: 15000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(1, 8), dueAt: monthsAgo(1, 8), paidAt: monthsAgo(1, 8) },
      { tenantId, supplier: "Curso formacion implantologia", category: ExpenseCategory.FORMACION, amountCents: 45000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(2, 5), dueAt: monthsAgo(2, 5), paidAt: monthsAgo(2, 5) },
      { tenantId, supplier: "Nominas equipo clinico", category: ExpenseCategory.NOMINAS, amountCents: 620000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(1, 1), dueAt: monthsAgo(1, 1), paidAt: monthsAgo(1, 1) },
      { tenantId, supplier: "Alquiler sedes Murcia y Elche", category: ExpenseCategory.ALQUILER, amountCents: 280000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(1, 1), dueAt: monthsAgo(1, 1), paidAt: monthsAgo(1, 1) },
      { tenantId, supplier: "Laboratorio Dentalab", category: ExpenseCategory.LABORATORIO, amountCents: 52000, status: ExpenseStatus.PAID, incurredAt: monthsAgo(2, 14), dueAt: monthsAgo(2, 29), paidAt: monthsAgo(2, 25) }
    ]
  });
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
