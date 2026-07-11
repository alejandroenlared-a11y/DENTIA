import { getCurrentContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type AppView =
  | "home"
  | "calendar"
  | "inbox"
  | "agent"
  | "patients"
  | "treatments"
  | "tasks"
  | "billing"
  | "settings";

export async function getDashboardData() {
  const { user: currentUser, tenant } = await getCurrentContext();

  const [
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
    invoices,
    expenses
  ] = await Promise.all([
    prisma.patient.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      include: { consents: true }
    }),
    prisma.appointment.findMany({
      where: { tenantId: tenant.id },
      orderBy: { startsAt: "asc" },
      include: { patient: true, provider: true, operatory: true, treatment: true }
    }),
    prisma.calendarEvent.findMany({
      where: { tenantId: tenant.id },
      orderBy: { startsAt: "asc" },
      include: { provider: true, operatory: true }
    }),
    prisma.conversation.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: "desc" },
      include: { patient: true, messages: { orderBy: { createdAt: "asc" } } }
    }),
    prisma.task.findMany({
      where: { tenantId: tenant.id },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: { patient: true }
    }),
    prisma.treatment.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: "asc" }
    }),
    prisma.provider.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.operatory.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { name: "asc" }
    }),
    prisma.agentSession.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.user.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    }),
    prisma.auditLog.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 15
    }),
    prisma.invoice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { issuedAt: "desc" },
      include: { patient: true }
    }),
    prisma.expense.findMany({
      where: { tenantId: tenant.id },
      orderBy: { incurredAt: "desc" }
    })
  ]);

  const unreadConversations = conversations.filter(conversation => conversation.unread).length;
  const openTasks = tasks.filter(task => task.status !== "COMPLETED").length;
  const activePatients = patients.filter(patient => patient.status !== "INACTIVE").length;
  const recoveredCents = appointments
    .filter(appointment => appointment.createdByAi)
    .reduce((sum, appointment) => sum + appointment.patient.estimatedValue, 0);

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
    invoices,
    expenses,
    metrics: {
      unreadConversations,
      appointmentCount: appointments.length,
      openTasks,
      activePatients,
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
    pendingInvoices: pending.slice().sort((a, b) => b.amountCents - a.amountCents).slice(0, 5),
    openBudgetPatients: openBudgetPatients.slice(0, 5),
    unpaidExpenseList: unpaidExpenses.slice().sort((a, b) => b.amountCents - a.amountCents).slice(0, 5)
  };
}
