import { getCurrentContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type AppView =
  | "home"
  | "calendar"
  | "inbox"
  | "agent"
  | "aiReview"
  | "patients"
  | "clinic"
  | "treatments"
  | "tasks"
  | "crm"
  | "billing"
  | "documents"
  | "inventory"
  | "lab"
  | "team"
  | "analytics"
  | "automations"
  | "imaging"
  | "settings";

export function getDashboardDataRequirements(view: AppView) {
  const needsHome = view === "home";
  const needsCalendar = view === "calendar";
  const needsInbox = view === "inbox";
  const needsPatients = view === "patients";
  const needsTasks = view === "tasks";
  const needsAgent = view === "agent" || view === "aiReview";
  const needsAiReview = view === "aiReview";
  const needsTreatments = view === "treatments";
  const needsBilling = view === "billing";
  const needsSettings = view === "settings";
  const needsClinical = view === "clinic" || view === "lab" || view === "imaging";
  const needsCrm = view === "crm" || view === "automations";
  const needsDocuments = view === "documents";
  const needsInventory = view === "inventory";
  const needsTeam = view === "team";
  const needsAnalytics = view === "analytics";

  return {
    needsCalendar,
    needsPatients,
    needsAgent,
    needsSettings,
    needsTeam,
    needsOverviewMetricCounts: needsHome,
    needsPatientRows: needsHome || needsCalendar || needsInbox || needsPatients || needsTasks || needsBilling || needsClinical || needsCrm || needsDocuments || needsAnalytics || needsTeam,
    needsAppointmentRows: needsHome || needsCalendar || needsInbox || needsPatients || needsClinical || needsCrm || needsInventory || needsTeam || needsAnalytics,
    needsConversationRows: needsHome || needsInbox || needsCrm || needsAnalytics,
    needsTaskRows: needsHome || needsTasks || needsClinical || needsCrm || needsDocuments || needsAnalytics || needsTeam,
    needsTreatmentRows: needsCalendar || needsTreatments || needsClinical || needsCrm || needsAnalytics,
    needsProviderRows: needsCalendar || needsClinical || needsTeam,
    needsOperatoryRows: needsCalendar || needsClinical || needsTeam,
    needsInvoiceRows: needsHome || needsPatients || needsBilling || needsAnalytics || needsDocuments,
    needsExpenseRows: needsHome || needsBilling || needsAnalytics,
    needsPatientIntakeRows: needsInbox || needsCrm || needsAiReview,
    needsRecoveredAppointmentRows: needsHome || needsAnalytics
  };
}

export async function getDashboardData(view: AppView = "home") {
  const { user: currentUser, tenant } = await getCurrentContext();
  const {
    needsPatientRows,
    needsAppointmentRows,
    needsConversationRows,
    needsTaskRows,
    needsTreatmentRows,
    needsProviderRows,
    needsOperatoryRows,
    needsInvoiceRows,
    needsExpenseRows,
    needsPatientIntakeRows,
    needsRecoveredAppointmentRows,
    needsOverviewMetricCounts,
    needsCalendar,
    needsAgent,
    needsSettings,
    needsTeam,
    needsPatients
  } = getDashboardDataRequirements(view);

  const [
    unreadConversationCount,
    appointmentCount,
    openTaskCount,
    activePatientCount,
    recoveredAppointments,
    patients,
    appointments,
    calendarEvents,
    conversations,
    tasks,
    treatments,
    providers,
    operatories,
    agentSessions,
    users,
    auditLogs,
    patientIntakes,
    invoices,
    expenses
  ] = await Promise.all([
    prisma.conversation.count({ where: { tenantId: tenant.id, unread: true } }),
    needsOverviewMetricCounts
      ? prisma.appointment.count({ where: { tenantId: tenant.id } })
      : Promise.resolve(0),
    prisma.task.count({ where: { tenantId: tenant.id, status: { not: "COMPLETED" } } }),
    needsOverviewMetricCounts
      ? prisma.patient.count({ where: { tenantId: tenant.id, status: { not: "INACTIVE" } } })
      : Promise.resolve(0),
    needsRecoveredAppointmentRows
      ? prisma.appointment.findMany({
          where: { tenantId: tenant.id, createdByAi: true },
          select: { patient: { select: { estimatedValue: true } } }
        })
      : Promise.resolve([]),
    needsPatientRows
      ? prisma.patient.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          include: { consents: true }
        })
      : Promise.resolve([]),
    needsAppointmentRows
      ? prisma.appointment.findMany({
          where: { tenantId: tenant.id },
          orderBy: { startsAt: "asc" },
          include: { patient: true, provider: true, operatory: true, treatment: true }
        })
      : Promise.resolve([]),
    needsCalendar
      ? prisma.calendarEvent.findMany({
          where: { tenantId: tenant.id },
          orderBy: { startsAt: "asc" },
          include: { provider: true, operatory: true }
        })
      : Promise.resolve([]),
    needsConversationRows
      ? prisma.conversation.findMany({
          where: { tenantId: tenant.id },
          orderBy: { updatedAt: "desc" },
          include: { patient: true, messages: { orderBy: { createdAt: "asc" } } }
        })
      : Promise.resolve([]),
    needsTaskRows
      ? prisma.task.findMany({
          where: { tenantId: tenant.id },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
          include: { patient: true }
        })
      : Promise.resolve([]),
    needsTreatmentRows
      ? prisma.treatment.findMany({
          where: { tenantId: tenant.id },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    needsProviderRows
      ? prisma.provider.findMany({
          where: { tenantId: tenant.id, active: true },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    needsOperatoryRows
      ? prisma.operatory.findMany({
          where: { tenantId: tenant.id, active: true },
          orderBy: { name: "asc" }
        })
      : Promise.resolve([]),
    needsAgent
      ? prisma.agentSession.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: 50
        })
      : Promise.resolve([]),
    needsSettings || needsTeam
      ? prisma.user.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, role: true, createdAt: true }
        })
      : Promise.resolve([]),
    needsSettings || needsPatients
      ? prisma.auditLog.findMany({
          where: needsPatients ? { tenantId: tenant.id, entityType: "Appointment" } : { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: needsPatients ? 300 : 15
        })
      : Promise.resolve([]),
    needsPatientIntakeRows
      ? prisma.patientIntake.findMany({
          where: { tenantId: tenant.id },
          orderBy: { updatedAt: "desc" },
          include: {
            patient: true,
            conversation: {
              include: {
                messages: {
                  orderBy: { createdAt: "asc" },
                  take: 8
                }
              }
            }
          }
        }).catch(error => {
          console.error("patientIntake dashboard query failed", error);
          return [];
        })
      : Promise.resolve([]),
    needsInvoiceRows
      ? prisma.invoice.findMany({
          where: { tenantId: tenant.id },
          orderBy: { issuedAt: "desc" },
          include: { patient: true }
        })
      : Promise.resolve([]),
    needsExpenseRows
      ? prisma.expense.findMany({
          where: { tenantId: tenant.id },
          orderBy: { incurredAt: "desc" }
        })
      : Promise.resolve([])
  ]);

  const recoveredCents = recoveredAppointments.reduce((sum, appointment) => sum + appointment.patient.estimatedValue, 0);

  return {
    tenant,
    currentUser,
    patients,
    appointments,
    calendarEvents,
    conversations,
    tasks,
    treatments,
    providers,
    operatories,
    agentSessions,
    users,
    auditLogs,
    patientIntakes,
    invoices,
    expenses,
    metrics: {
      unreadConversations: unreadConversationCount,
      appointmentCount,
      openTasks: openTaskCount,
      activePatients: activePatientCount,
      recoveredCents
    },
    billing: buildBillingMetrics(invoices, expenses, patients)
  };
}

type DashboardInvoice = Awaited<ReturnType<typeof prisma.invoice.findMany<{ include: { patient: true } }>>>[number];
type DashboardExpense = Awaited<ReturnType<typeof prisma.expense.findMany>>[number];
type DashboardPatient = Awaited<ReturnType<typeof prisma.patient.findMany<{ include: { consents: true } }>>>[number];

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function buildBillingMetrics(invoices: DashboardInvoice[], expenses: DashboardExpense[], patients: DashboardPatient[]) {
  const now = new Date();
  const currentMonthKey = monthKey(now);

  const pending = invoices.filter(invoice => invoice.status === "SENT" || invoice.status === "OVERDUE");
  const overdue = invoices.filter(invoice => invoice.status === "OVERDUE");
  const paidThisMonth = invoices.filter(invoice => invoice.paidAt && monthKey(invoice.paidAt) === currentMonthKey);
  const expensesThisMonth = expenses.filter(expense => monthKey(expense.incurredAt) === currentMonthKey);
  const unpaidExpenses = expenses.filter(expense => expense.status === "PENDING");
  const openBudgetPatients = patients.filter(patient => patient.status === "OPEN_BUDGET");
  const electronicInvoices = invoices.filter(invoice => invoice.electronicStatus !== "NOT_REQUIRED");
  const electronicReady = electronicInvoices.filter(invoice => invoice.electronicStatus === "READY" || invoice.electronicStatus === "PENDING");
  const electronicAccepted = electronicInvoices.filter(invoice => invoice.electronicStatus === "ACCEPTED" || invoice.electronicStatus === "PAID");
  const electronicRejected = electronicInvoices.filter(invoice => invoice.electronicStatus === "REJECTED" || invoice.electronicStatus === "FAILED");

  const pendingBillingByPatient = new Map<string, number>();
  for (const invoice of invoices) {
    pendingBillingByPatient.set(invoice.patientId, (pendingBillingByPatient.get(invoice.patientId) ?? 0) + invoice.amountCents);
  }
  const pendingProductionCents = patients.reduce((sum, patient) => {
    const invoiced = pendingBillingByPatient.get(patient.id) ?? 0;
    const remaining = patient.estimatedValue - invoiced;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  const monthBuckets: Array<{ key: string; label: string; emitidoCents: number; cobradoCents: number }> = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthBuckets.push({ key: monthKey(date), label: MONTH_LABELS[date.getMonth()], emitidoCents: 0, cobradoCents: 0 });
  }
  const bucketByKey = new Map(monthBuckets.map(bucket => [bucket.key, bucket]));
  for (const invoice of invoices) {
    const issuedBucket = bucketByKey.get(monthKey(invoice.issuedAt));
    if (issuedBucket) issuedBucket.emitidoCents += invoice.amountCents;
    if (invoice.paidAt) {
      const paidBucket = bucketByKey.get(monthKey(invoice.paidAt));
      if (paidBucket) paidBucket.cobradoCents += invoice.amountCents;
    }
  }

  const forecastBuckets: Array<{ key: string; label: string; amountCents: number }> = [];
  for (let offset = 0; offset <= 2; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    forecastBuckets.push({ key: monthKey(date), label: MONTH_LABELS[date.getMonth()], amountCents: 0 });
  }
  const forecastByKey = new Map(forecastBuckets.map(bucket => [bucket.key, bucket]));
  for (const invoice of pending) {
    const dueKey = monthKey(invoice.dueAt < now ? now : invoice.dueAt);
    const bucket = forecastByKey.get(dueKey) ?? forecastBuckets[0];
    bucket.amountCents += invoice.amountCents;
  }

  const treatmentTotals = new Map<string, number>();
  for (const invoice of invoices) {
    treatmentTotals.set(invoice.treatmentName, (treatmentTotals.get(invoice.treatmentName) ?? 0) + invoice.amountCents);
  }
  const treatmentRanking = [...treatmentTotals.entries()]
    .map(([name, amountCents]) => ({ name, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);
  const maxTreatmentCents = treatmentRanking[0]?.amountCents ?? 1;

  return {
    pendingCents: pending.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    pendingCount: pending.length,
    overdueCount: overdue.length,
    collectedThisMonthCents: paidThisMonth.reduce((sum, invoice) => sum + invoice.amountCents, 0),
    openBudgetCount: openBudgetPatients.length,
    openBudgetCents: openBudgetPatients.reduce((sum, patient) => sum + patient.estimatedValue, 0),
    expensesThisMonthCents: expensesThisMonth.reduce((sum, expense) => sum + expense.amountCents, 0),
    unpaidExpensesCents: unpaidExpenses.reduce((sum, expense) => sum + expense.amountCents, 0),
    pendingProductionCents,
    monthBuckets,
    forecastBuckets,
    treatmentRanking,
    maxTreatmentCents,
    electronicCount: electronicInvoices.length,
    electronicReadyCount: electronicReady.length,
    electronicAcceptedCount: electronicAccepted.length,
    electronicRejectedCount: electronicRejected.length,
    electronicInvoices: electronicInvoices.slice().sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime()).slice(0, 8),
    pendingInvoices: pending.slice().sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    openBudgetPatients: openBudgetPatients.slice(0, 5),
    unpaidExpenseList: unpaidExpenses.slice().sort((a, b) => b.amountCents - a.amountCents).slice(0, 5)
  };
}
