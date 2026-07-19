import {
  AgentSessionOutcome,
  AppointmentStatus,
  ConsentKind,
  ConversationChannel,
  ConversationStatus,
  ElectronicInvoiceStatus,
  InvoiceDocumentType,
  InvoiceReceiverType,
  InvoiceStatus,
  MessageDirection,
  PatientIntakeStatus,
  PatientStatus,
  SifMode,
  TaskPriority,
  TaskStatus,
  type Prisma
} from "@prisma/client";
import { buildFiscalInvoiceHash, buildQrPayload } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

const DEFAULT_TENANT_SLUG = "clinica-murcia-elche";

const demoPatients = [
  {
    name: "Laura Medina Santos",
    phone: "+34 611 284 730",
    email: "laura.medina.santos@example.com",
    fiscalName: "Laura Medina Santos",
    taxId: "48739215L",
    fiscalAddress: "Calle Santa Teresa 18, 30005 Murcia",
    status: PatientStatus.ACTIVE,
    source: "Google Ads",
    preferredChannel: ConversationChannel.WHATSAPP,
    treatmentNeed: "Ortodoncia invisible",
    estimatedValue: 385000,
    lastVisitOffset: -12,
    notes: "Quiere alinear incisivos antes de su boda. Prefiere tardes y financiacion mensual.",
    appointment: { title: "Revision de ortodoncia invisible", offset: 2, hour: 17, duration: 45, status: AppointmentStatus.CONFIRMED },
    invoice: { treatmentName: "Estudio de ortodoncia invisible", amountCents: 70000, status: InvoiceStatus.SENT, issuedOffset: -2, dueOffset: 28 },
    task: { title: "Enviar plan de financiacion de ortodoncia a Laura", priority: TaskPriority.HIGH, dueOffset: 1 }
  },
  {
    name: "Javier Ruiz Moreno",
    phone: "+34 622 517 904",
    email: "javier.ruiz.moreno@example.com",
    fiscalName: "Javier Ruiz Moreno",
    taxId: "53918427Q",
    fiscalAddress: "Avenida de la Libertad 42, 03201 Elche",
    status: PatientStatus.URGENT,
    source: "Llamada entrante",
    preferredChannel: ConversationChannel.VOICE,
    treatmentNeed: "Endodoncia molar inferior",
    estimatedValue: 92000,
    lastVisitOffset: -1,
    notes: "Dolor nocturno en molar inferior derecho. Solicita hueco urgente y confirmacion telefonica.",
    appointment: { title: "Urgencia por dolor molar", offset: 1, hour: 10, duration: 30, status: AppointmentStatus.URGENT },
    invoice: { treatmentName: "Consulta de urgencia dental", amountCents: 7000, status: InvoiceStatus.PAID, issuedOffset: -1, dueOffset: 0, paidOffset: -1 },
    task: { title: "Llamar a Javier con instrucciones preconsulta", priority: TaskPriority.CRITICAL, dueOffset: 0 }
  },
  {
    name: "Marta Soler Ibanez",
    phone: "+34 633 905 118",
    email: "marta.soler.ibanez@example.com",
    fiscalName: "Marta Soler Ibanez",
    taxId: "26841759B",
    fiscalAddress: "Calle Corredera 7, 03202 Elche",
    status: PatientStatus.OPEN_BUDGET,
    source: "Referido paciente",
    preferredChannel: ConversationChannel.EMAIL,
    treatmentNeed: "Implante unitario con corona",
    estimatedValue: 245000,
    lastVisitOffset: -20,
    notes: "Pendiente de aceptar presupuesto. Requiere factura completa y justificante para mutua.",
    appointment: { title: "Valoracion de implante unitario", offset: 5, hour: 12, duration: 45, status: AppointmentStatus.PROPOSED },
    invoice: { treatmentName: "Estudio implantologico", amountCents: 12000, status: InvoiceStatus.SENT, issuedOffset: -5, dueOffset: 25 },
    task: { title: "Revisar presupuesto de implante con Marta", priority: TaskPriority.HIGH, dueOffset: 3 }
  },
  {
    name: "Andres Navarro Costa",
    phone: "+34 644 731 662",
    email: "andres.navarro.costa@example.com",
    fiscalName: "Andres Navarro Costa",
    taxId: "71269384V",
    fiscalAddress: "Gran Via Alfonso X 11, 30008 Murcia",
    status: PatientStatus.NEW_LEAD,
    source: "Formulario web",
    preferredChannel: ConversationChannel.WEB,
    treatmentNeed: "Primera visita y limpieza",
    estimatedValue: 5500,
    lastVisitOffset: -180,
    notes: "Lead nuevo reactivado tras valoracion informativa inicial. Quiere revision, limpieza y alta en recordatorios por WhatsApp.",
    appointment: { title: "Primera visita y limpieza", offset: 7, hour: 9, duration: 60, status: AppointmentStatus.REQUESTED },
    invoice: { treatmentName: "Higiene dental", amountCents: 5500, status: InvoiceStatus.SENT, issuedOffset: 0, dueOffset: 15 },
    task: { title: "Confirmar disponibilidad de primera visita con Andres", priority: TaskPriority.MEDIUM, dueOffset: 2 }
  },
  {
    name: "Carmen Ortega Vidal",
    phone: "+34 655 408 219",
    email: "carmen.ortega.vidal@example.com",
    fiscalName: "Carmen Ortega Vidal",
    taxId: "43182765N",
    fiscalAddress: "Plaza Circular 3, 30008 Murcia",
    status: PatientStatus.ACTIVE,
    source: "Recuperacion agenda",
    preferredChannel: ConversationChannel.SMS,
    treatmentNeed: "Revision periodontal de mantenimiento",
    estimatedValue: 78000,
    lastVisitOffset: -75,
    notes: "Paciente recurrente. Seguimiento periodontal cada seis meses y aviso por SMS.",
    appointment: { title: "Mantenimiento periodontal", offset: 10, hour: 16, duration: 45, status: AppointmentStatus.CONFIRMED },
    invoice: { treatmentName: "Mantenimiento periodontal", amountCents: 78000, status: InvoiceStatus.OVERDUE, issuedOffset: -35, dueOffset: -5 },
    task: { title: "Revisar factura vencida de Carmen", priority: TaskPriority.HIGH, dueOffset: 1 }
  }
];

export type DemoPatientResetResult = {
  tenant: { id: string; slug: string; name: string };
  deletedPatients: number;
  createdPatients: Array<{ id: string; name: string; phone: string; status: PatientStatus }>;
  counts: {
    patients: number;
    consents: number;
    appointments: number;
    conversations: number;
    intakes: number;
    tasks: number;
    invoices: number;
  };
};

export async function resetDemoPatientsForTenant({
  tenantSlug = DEFAULT_TENANT_SLUG,
  actorUserId
}: {
  tenantSlug?: string;
  actorUserId?: string | null;
} = {}): Promise<DemoPatientResetResult> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) {
    throw new Error(`No existe el tenant ${tenantSlug}.`);
  }

  const result = await prisma.$transaction(
    async tx => {
      const oldPatients = await tx.patient.findMany({
        where: { tenantId: tenant.id },
        select: { id: true }
      });
      const oldPatientIds = oldPatients.map(patient => patient.id);
      const oldConversations = oldPatientIds.length
        ? await tx.conversation.findMany({
            where: { tenantId: tenant.id, patientId: { in: oldPatientIds } },
            select: { id: true }
          })
        : [];
      const oldAppointments = oldPatientIds.length
        ? await tx.appointment.findMany({
            where: { tenantId: tenant.id, patientId: { in: oldPatientIds } },
            select: { id: true }
          })
        : [];
      const oldInvoices = oldPatientIds.length
        ? await tx.invoice.findMany({
            where: { tenantId: tenant.id, patientId: { in: oldPatientIds } },
            select: { id: true }
          })
        : [];
      const oldConversationIds = oldConversations.map(conversation => conversation.id);
      const oldAppointmentIds = oldAppointments.map(appointment => appointment.id);
      const oldInvoiceIds = oldInvoices.map(invoice => invoice.id);
      const auditEntityIds = [...oldPatientIds, ...oldAppointmentIds, ...oldInvoiceIds, ...oldConversationIds];

      if (oldPatientIds.length) {
        await tx.agentSession.deleteMany({
          where: {
            tenantId: tenant.id,
            OR: [
              { patientId: { in: oldPatientIds } },
              ...(oldConversationIds.length ? [{ conversationId: { in: oldConversationIds } }] : [])
            ]
          }
        });
        await tx.patientIntake.deleteMany({
          where: {
            tenantId: tenant.id,
            OR: [
              { patientId: { in: oldPatientIds } },
              ...(oldConversationIds.length ? [{ conversationId: { in: oldConversationIds } }] : []),
              { accessCode: { startsWith: `DEMO-${new Date().getFullYear()}-` } }
            ]
          }
        });
        await tx.task.deleteMany({
          where: {
            tenantId: tenant.id,
            OR: [
              { patientId: { in: oldPatientIds } },
              ...(oldAppointmentIds.length ? [{ linkedType: "Appointment", linkedId: { in: oldAppointmentIds } }] : []),
              ...(oldInvoiceIds.length ? [{ linkedType: "Invoice", linkedId: { in: oldInvoiceIds } }] : [])
            ]
          }
        });
        if (oldConversationIds.length) {
          await tx.conversation.deleteMany({ where: { tenantId: tenant.id, id: { in: oldConversationIds } } });
        }
        await tx.auditLog.deleteMany({
          where: {
            tenantId: tenant.id,
            OR: [
              ...(auditEntityIds.length ? [{ entityId: { in: auditEntityIds } }] : []),
              { entityType: { in: ["Patient", "Appointment", "Invoice", "Conversation"] } }
            ]
          }
        });
        await tx.patient.deleteMany({ where: { tenantId: tenant.id, id: { in: oldPatientIds } } });
      }

      const provider = await ensureProvider(tx, tenant.id);
      const operatory = await ensureOperatory(tx, tenant.id);
      const treatments = await ensureTreatments(tx, tenant.id);
      const series = normalizeInvoiceSeries(tenant.invoiceSeries);
      let nextSequence = await getNextInvoiceSequence(tx, tenant.id, series, new Date().getFullYear());
      let previousFiscalHash =
        (
          await tx.invoice.findFirst({
            where: { tenantId: tenant.id, fiscalHash: { not: null } },
            orderBy: { issuedAt: "desc" },
            select: { fiscalHash: true }
          })
        )?.fiscalHash ?? null;
      const createdPatients: DemoPatientResetResult["createdPatients"] = [];

      for (const [index, item] of demoPatients.entries()) {
        const patient = await tx.patient.create({
          data: {
            tenantId: tenant.id,
            name: item.name,
            phone: item.phone,
            email: item.email,
            fiscalName: item.fiscalName,
            taxId: item.taxId,
            fiscalAddress: item.fiscalAddress,
            status: item.status,
            source: item.source,
            preferredChannel: item.preferredChannel,
            treatmentNeed: item.treatmentNeed,
            estimatedValue: item.estimatedValue,
            lastVisitAt: daysFromNow(item.lastVisitOffset, 11),
            notes: item.notes
          }
        });
        createdPatients.push({ id: patient.id, name: patient.name, phone: patient.phone, status: patient.status });

        await tx.consent.createMany({
          data: Object.values(ConsentKind).map(kind => ({
            tenantId: tenant.id,
            patientId: patient.id,
            kind,
            granted: true,
            grantedAt: daysFromNow(-1 * (index + 1), 10),
            source: "ficha_demo"
          }))
        });

        const treatment = pickTreatment(treatments, item.treatmentNeed);
        const appointment = await tx.appointment.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            treatmentId: treatment.id,
            providerId: provider.id,
            operatoryId: operatory.id,
            title: item.appointment.title,
            startsAt: daysFromNow(item.appointment.offset, item.appointment.hour),
            durationMinutes: item.appointment.duration,
            status: item.appointment.status,
            channel: item.preferredChannel,
            createdByAi: index % 2 === 0
          }
        });

        const conversation = await tx.conversation.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            channel: item.preferredChannel,
            status: item.status === PatientStatus.URGENT ? ConversationStatus.HUMAN_REQUIRED : ConversationStatus.ACTIVE,
            intent: item.treatmentNeed,
            result: item.appointment.title,
            unread: item.status === PatientStatus.URGENT || item.status === PatientStatus.OPEN_BUDGET,
            startedAt: daysFromNow(-1 * (index + 2), 9),
            messages: {
              create: [
                {
                  direction: MessageDirection.INBOUND,
                  senderName: item.name,
                  body: `Hola, quiero informacion sobre ${item.treatmentNeed.toLowerCase()}.`
                },
                {
                  direction: MessageDirection.OUTBOUND,
                  senderName: tenant.assistantName,
                  body: `He dejado registrada tu ficha y la clinica revisara tu caso: ${item.appointment.title}.`
                }
              ]
            }
          }
        });

        await tx.patientIntake.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            conversationId: conversation.id,
            accessCode: buildAccessCode(index),
            status: PatientIntakeStatus.LINKED,
            name: item.name,
            email: item.email,
            phone: item.phone,
            location: item.fiscalAddress,
            treatmentNeed: item.treatmentNeed,
            channel: item.preferredChannel,
            source: item.source,
            consent: true,
            duplicatePatientIds: [],
            stateSnapshot: {
              source: "admin_demo_reset",
              fiscalDataCompleted: true,
              linkedPatientId: patient.id
            }
          }
        });

        await tx.agentSession.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            conversationId: conversation.id,
            intent: item.treatmentNeed,
            outcome: item.appointment.status === AppointmentStatus.REQUESTED ? AgentSessionOutcome.ESCALATED : AgentSessionOutcome.APPOINTMENT_CREATED,
            escalated: item.status === PatientStatus.URGENT || item.appointment.status === AppointmentStatus.REQUESTED,
            costCents: 18 + index * 4,
            latencyMs: 780 + index * 120,
            createdAt: daysFromNow(-1 * (index + 1), 12)
          }
        });

        await tx.task.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            title: item.task.title,
            type: "seguimiento_paciente",
            status: item.status === PatientStatus.URGENT ? TaskStatus.SCHEDULED : TaskStatus.PENDING,
            priority: item.task.priority,
            dueAt: daysFromNow(item.task.dueOffset, 9),
            linkedType: "Appointment",
            linkedId: appointment.id
          }
        });

        const issuedAt = daysFromNow(item.invoice.issuedOffset, 10);
        const dueAt = daysFromNow(item.invoice.dueOffset, 23);
        const paidAt =
          "paidOffset" in item.invoice && typeof item.invoice.paidOffset === "number"
            ? daysFromNow(item.invoice.paidOffset, 10)
            : null;
        const number = `${series}-${issuedAt.getFullYear()}-${String(nextSequence).padStart(3, "0")}`;
        const fiscalHash = buildFiscalInvoiceHash({
          tenantId: tenant.id,
          number,
          issuedAt,
          amountCents: item.invoice.amountCents,
          taxBaseCents: item.invoice.amountCents,
          taxCents: 0,
          receiverTaxId: item.taxId,
          previousFiscalHash
        });

        await tx.invoice.create({
          data: {
            tenantId: tenant.id,
            patientId: patient.id,
            number,
            series,
            sequence: nextSequence,
            documentType: InvoiceDocumentType.COMPLETE,
            receiverType: InvoiceReceiverType.PATIENT,
            receiverName: item.fiscalName,
            receiverTaxId: item.taxId,
            receiverAddress: item.fiscalAddress,
            receiverEmail: item.email,
            issuerLegalName: tenant.legalName || tenant.name,
            issuerTaxId: tenant.taxId,
            issuerAddress: tenant.fiscalAddress || tenant.address,
            treatmentName: item.invoice.treatmentName,
            amountCents: item.invoice.amountCents,
            taxBaseCents: item.invoice.amountCents,
            taxCents: 0,
            taxRateBasisPoints: 0,
            taxExemptionReason: "Operacion sanitaria exenta o no sujeta a IVA segun configuracion de la clinica.",
            status: item.invoice.status,
            electronicStatus: ElectronicInvoiceStatus.NOT_REQUIRED,
            electronicProvider: tenant.electronicInvoiceProvider,
            sifMode: tenant.sifMode || SifMode.NOT_CONFIGURED,
            fiscalHash,
            previousFiscalHash,
            qrPayload: buildQrPayload({
              issuerTaxId: tenant.taxId,
              number,
              issuedAt,
              amountCents: item.invoice.amountCents
            }),
            immutableIssued: true,
            notes: `Factura demo vinculada a ${item.treatmentNeed}.`,
            issuedAt,
            dueAt,
            paidAt
          }
        });
        previousFiscalHash = fiscalHash;
        nextSequence += 1;
      }

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorUserId,
          action: "demo_patients.reset",
          entityType: "Patient",
          entityId: tenant.id,
          metadata: {
            deletedPatients: oldPatientIds.length,
            createdPatients: createdPatients.length,
            patientNames: createdPatients.map(patient => patient.name)
          }
        }
      });

      return {
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        deletedPatients: oldPatientIds.length,
        createdPatients
      };
    },
    { timeout: 20_000 }
  );

  const counts = await prisma.$transaction([
    prisma.patient.count({ where: { tenantId: tenant.id } }),
    prisma.consent.count({ where: { tenantId: tenant.id } }),
    prisma.appointment.count({ where: { tenantId: tenant.id, patient: { tenantId: tenant.id } } }),
    prisma.conversation.count({ where: { tenantId: tenant.id, patient: { tenantId: tenant.id } } }),
    prisma.patientIntake.count({ where: { tenantId: tenant.id, patient: { tenantId: tenant.id } } }),
    prisma.task.count({ where: { tenantId: tenant.id, patient: { tenantId: tenant.id } } }),
    prisma.invoice.count({ where: { tenantId: tenant.id, patient: { tenantId: tenant.id } } })
  ]);

  return {
    ...result,
    counts: {
      patients: counts[0],
      consents: counts[1],
      appointments: counts[2],
      conversations: counts[3],
      intakes: counts[4],
      tasks: counts[5],
      invoices: counts[6]
    }
  };
}

async function ensureProvider(tx: Prisma.TransactionClient, tenantId: string) {
  return (
    (await tx.provider.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } })) ??
    tx.provider.create({
      data: {
        tenantId,
        name: "Dra. Elena Ruiz",
        specialty: "Odontologia integral"
      }
    })
  );
}

async function ensureOperatory(tx: Prisma.TransactionClient, tenantId: string) {
  return (
    (await tx.operatory.findFirst({ where: { tenantId, active: true }, orderBy: { name: "asc" } })) ??
    tx.operatory.create({
      data: {
        tenantId,
        name: "Gabinete 1",
        kind: "General"
      }
    })
  );
}

async function ensureTreatments(tx: Prisma.TransactionClient, tenantId: string) {
  const treatmentDefinitions = [
    { name: "Revision dental", durationMinutes: 30, priceCents: 0, requiresAssessment: true, rules: "Primera visita y triaje administrativo completo." },
    { name: "Higiene", durationMinutes: 45, priceCents: 5500, requiresAssessment: false, rules: "Recordatorio 24h y consentimiento previo." },
    { name: "Ortodoncia invisible", durationMinutes: 45, priceCents: null, requiresAssessment: true, rules: "Valoracion obligatoria antes de presupuesto cerrado." },
    { name: "Implante unitario", durationMinutes: 45, priceCents: 120000, requiresAssessment: true, rules: "Requiere estudio y plan de financiacion si aplica." },
    { name: "Urgencia dental", durationMinutes: 30, priceCents: 7000, requiresAssessment: false, rules: "Dolor agudo: priorizar hueco en menos de 24h." },
    { name: "Periodoncia", durationMinutes: 45, priceCents: 78000, requiresAssessment: true, rules: "Mantenimiento y seguimiento semestral." }
  ];
  const treatments = [];
  for (const treatment of treatmentDefinitions) {
    treatments.push(
      await tx.treatment.upsert({
        where: { tenantId_name: { tenantId, name: treatment.name } },
        update: treatment,
        create: { tenantId, ...treatment }
      })
    );
  }
  return treatments;
}

async function getNextInvoiceSequence(tx: Prisma.TransactionClient, tenantId: string, series: string, year: number) {
  const prefix = `${series}-${year}-`;
  const latest = await tx.invoice.findFirst({
    where: { tenantId, series, number: { startsWith: prefix } },
    orderBy: [{ sequence: "desc" }, { issuedAt: "desc" }],
    select: { sequence: true, number: true }
  });
  if (latest?.sequence) return latest.sequence + 1;
  const suffix = latest?.number?.slice(prefix.length);
  const parsed = suffix ? Number.parseInt(suffix, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed + 1 : 1;
}

function pickTreatment(treatments: Array<{ id: string; name: string }>, need: string) {
  const lowerNeed = need.toLowerCase();
  return (
    treatments.find(treatment => lowerNeed.includes(treatment.name.toLowerCase().split(" ")[0])) ??
    treatments.find(treatment => treatment.name === "Revision dental") ??
    treatments[0]
  );
}

function normalizeInvoiceSeries(series: string | null | undefined) {
  const normalized = (series || "F").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return normalized || "F";
}

function daysFromNow(offset: number, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function buildAccessCode(index: number) {
  return `DEMO-${new Date().getFullYear()}-${String(index + 1).padStart(2, "0")}`;
}
