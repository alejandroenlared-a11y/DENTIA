import Link from "next/link";
import { AppointmentStatus, InvoiceStatus, PatientIntakeStatus, PatientStatus, TaskPriority } from "@prisma/client";
import { createPatientAction, createTaskFromPatientIntakeAction, updatePatientIntakeStatusAction, updatePatientStatusAction } from "@/app/actions";
import { EmptyState, Field, MiniPipeline, PanelHead, Pill } from "@/components/clinical-ui";
import { Icon } from "@/components/icon";
import type { getDashboardData } from "@/lib/dashboard";
import {
  appointmentStatusLabel,
  formatAppointmentAuditAction,
  normalizeSearch,
  patientIntakeStatusLabel,
  patientIntakeStatusTone,
  patientStatusLabel,
  patientStatusTone
} from "@/lib/dashboard-view-format";
import { formatDateTime, formatMoney, formatTime, getInitials } from "@/lib/format";

export function PatientsView({
  data,
  selectedPatientId,
  query,
  filters = {}
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  selectedPatientId?: string;
  query?: string;
  filters?: { status?: string; debt?: string; provider?: string };
}) {
  const appointmentsByPatientId = new Map<string, typeof data.appointments>();
  for (const appointment of data.appointments) {
    const current = appointmentsByPatientId.get(appointment.patientId) ?? [];
    current.push(appointment);
    appointmentsByPatientId.set(appointment.patientId, current);
  }

  const invoicesByPatientId = new Map<string, typeof data.invoices>();
  for (const invoice of data.invoices) {
    const current = invoicesByPatientId.get(invoice.patientId) ?? [];
    current.push(invoice);
    invoicesByPatientId.set(invoice.patientId, current);
  }

  const appointmentLogsByAppointmentId = new Map<string, typeof data.auditLogs>();
  for (const log of data.auditLogs) {
    if (!log.entityId) continue;
    const current = appointmentLogsByAppointmentId.get(log.entityId) ?? [];
    current.push(log);
    appointmentLogsByAppointmentId.set(log.entityId, current);
  }

  const normalizedQuery = normalizeSearch(query ?? "");
  const statusMode = filters.status === "inactive" ? "inactive" : filters.status === "all" ? "all" : "active";
  const debtMode = filters.debt === "with" ? "with" : filters.debt === "without" ? "without" : "all";
  const providerFilter = filters.provider && filters.provider !== "all" ? filters.provider : "all";
  const providerOptions = Array.from(
    new Map(
      data.appointments
        .filter(appointment => appointment.provider)
        .map(appointment => [appointment.providerId, appointment.provider])
    ).values()
  ).filter(Boolean);

  const filteredPatients = data.patients.filter(patient => {
    const patientAppointments = appointmentsByPatientId.get(patient.id) ?? [];
    const patientInvoices = invoicesByPatientId.get(patient.id) ?? [];
    const outstandingCents = getPatientOutstandingCents(patientInvoices);
    const searchable = normalizeSearch([
      patient.name,
      patient.phone,
      patient.email,
      patient.taxId,
      patient.treatmentNeed,
      patient.source,
      patient.status
    ].filter(Boolean).join(" "));

    if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
    if (statusMode === "active" && patient.status === PatientStatus.INACTIVE) return false;
    if (statusMode === "inactive" && patient.status !== PatientStatus.INACTIVE) return false;
    if (debtMode === "with" && outstandingCents <= 0) return false;
    if (debtMode === "without" && outstandingCents > 0) return false;
    if (providerFilter !== "all" && !patientAppointments.some(appointment => appointment.providerId === providerFilter)) return false;
    return true;
  });

  const selectedPatient =
    data.patients.find(patient => patient.id === selectedPatientId) ??
    null;

  if (selectedPatientId && selectedPatient) {
    return (
      <PatientSummaryView
        patient={selectedPatient}
        appointments={appointmentsByPatientId.get(selectedPatient.id) ?? []}
        invoices={invoicesByPatientId.get(selectedPatient.id) ?? []}
        appointmentLogsByAppointmentId={appointmentLogsByAppointmentId}
        query={query}
        filters={{ status: statusMode, debt: debtMode, provider: providerFilter }}
      />
    );
  }

  const totalOutstandingCents = data.patients.reduce((sum, patient) => {
    return sum + getPatientOutstandingCents(invoicesByPatientId.get(patient.id) ?? []);
  }, 0);

  return (
    <section className="patients-screen">
      <header className="patients-page-head">
        <div>
          <h2>Pacientes</h2>
          <p>Gestion y control de la base de datos clinica.</p>
        </div>
        <div className="patients-head-actions">
          <button className="button ghost" type="button">
            <Icon name="archive" />
            Exportar
          </button>
          <Link className="button primary" href="/?view=patients#new-patient">
            <Icon name="users" />
            Nuevo paciente
          </Link>
        </div>
      </header>
      <form className="patients-filter-bar" action="/" aria-label="Filtros de pacientes">
        <input type="hidden" name="view" value="patients" />
        <label>
          <span>Sede</span>
          <select name="site" defaultValue="all">
            <option value="all">Todas las sedes</option>
            <option value="murcia">Sede Murcia</option>
            <option value="elche">Sede Elche</option>
          </select>
        </label>
        <label>
          <span>Profesional</span>
          <select name="provider" defaultValue={providerFilter}>
            <option value="all">Todos los profesionales</option>
            {providerOptions.map(provider => provider ? (
              <option value={provider.id} key={provider.id}>{provider.name}</option>
            ) : null)}
          </select>
        </label>
        <label>
          <span>Deuda</span>
          <select name="debt" defaultValue={debtMode}>
            <option value="all">Cualquier estado</option>
            <option value="with">Con deuda</option>
            <option value="without">Sin deuda</option>
          </select>
        </label>
        <label className="patients-filter-search">
          <span>Buscar</span>
          <input name="q" defaultValue={query ?? ""} placeholder="Nombre, telefono, historia o tratamiento" />
        </label>
        <div className="patients-state-toggle" role="group" aria-label="Estado de paciente">
          <span>Estado</span>
          <div>
            <Link className={statusMode === "active" ? "active" : ""} href={patientListHref({ query, status: "active", debt: debtMode, provider: providerFilter })}>Activos</Link>
            <Link className={statusMode === "inactive" ? "active" : ""} href={patientListHref({ query, status: "inactive", debt: debtMode, provider: providerFilter })}>Inactivos</Link>
            <Link className={statusMode === "all" ? "active" : ""} href={patientListHref({ query, status: "all", debt: debtMode, provider: providerFilter })}>Todos</Link>
          </div>
        </div>
        <div className="patients-filter-meta">
          <span>Mostrando {filteredPatients.length} paciente{filteredPatients.length === 1 ? "" : "s"}</span>
          <button className="icon-button" type="submit" title="Aplicar filtros" aria-label="Aplicar filtros">
            <Icon name="filter" />
          </button>
        </div>
      </form>
      {data.patients.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavia no hay pacientes"
          hint="Crea el primer paciente con el formulario de abajo o espera a que Clara capture un lead."
        />
      ) : (
        <section className="patients-table-card">
          <div className="patients-table-scroll">
            <table className="data-table patient-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Historia</th>
                  <th>Telefono</th>
                  <th>Edad</th>
                  <th>Proxima cita</th>
                  <th>Ultima visita</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(patient => {
                  const patientAppointments = appointmentsByPatientId.get(patient.id) ?? [];
                  const patientInvoices = invoicesByPatientId.get(patient.id) ?? [];
                  const nextAppointment = patientAppointments
                    .filter(appointment => appointment.startsAt >= new Date() && appointment.status !== AppointmentStatus.CANCELLED)
                    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
                  const lastAppointment = [...patientAppointments]
                    .filter(appointment => appointment.startsAt < new Date())
                    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
                  const outstandingCents = getPatientOutstandingCents(patientInvoices);
                  return (
                    <tr key={patient.id}>
                      <td data-label="Paciente">
                        <Link className="patient-identity" href={patientDetailHref(patient.id, query, { status: statusMode, debt: debtMode, provider: providerFilter })}>
                          <span className={`patient-avatar ${patientStatusTone(patient.status)}`}>{getInitials(patient.name)}</span>
                          <span>
                            <strong>{patient.name}</strong>
                            <small>{patient.email || "Email pendiente"}</small>
                          </span>
                        </Link>
                      </td>
                      <td data-label="Historia">{patientRecordNumber(patient.id)}</td>
                      <td data-label="Telefono">{patient.phone}</td>
                      <td data-label="Edad" className="centered-cell">N/D</td>
                      <td data-label="Proxima cita">
                        {nextAppointment ? (
                          <span className={nextAppointment.status === AppointmentStatus.URGENT ? "warning-text" : "primary-text"}>
                            <strong>{formatPatientAppointmentDate(nextAppointment.startsAt)}</strong>
                            <small>{nextAppointment.title}</small>
                          </span>
                        ) : (
                          <span className="muted-text">Sin cita</span>
                        )}
                      </td>
                      <td data-label="Ultima visita">{lastAppointment ? formatPatientShortDate(lastAppointment.startsAt) : formatPatientShortDate(patient.lastVisitAt)}</td>
                      <td data-label="Saldo" className={`money-cell ${outstandingCents > 0 ? "debt" : ""}`}>{outstandingCents > 0 ? `-${formatMoney(outstandingCents)}` : formatMoney(0)}</td>
                      <td data-label="Estado"><PatientStatusTag status={patient.status} /></td>
                      <td data-label="Acciones">
                        <div className="table-actions">
                          <Link className="icon-button" href={patientDetailHref(patient.id, query, { status: statusMode, debt: debtMode, provider: providerFilter })} title="Abrir ficha" aria-label={`Abrir ficha de ${patient.name}`}>
                            <Icon name="file" />
                          </Link>
                          {patient.status === PatientStatus.INACTIVE ? (
                            <PatientStatusButton patientId={patient.id} status={PatientStatus.ACTIVE} label="Activar" />
                          ) : (
                            <PatientStatusButton patientId={patient.id} status={PatientStatus.INACTIVE} label="Baja" danger />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredPatients.length === 0 ? (
            <p className="empty-note">No hay pacientes que coincidan con la busqueda.</p>
          ) : null}
        </section>
      )}
      <PatientForm />
      <div className="patients-floating-summary" aria-label="Resumen de pacientes">
        <div>
          <Icon name="users" />
          <span>Total pacientes</span>
          <strong>{data.patients.length}</strong>
        </div>
        <div>
          <Icon name="card" />
          <span>Deuda total</span>
          <strong className={totalOutstandingCents > 0 ? "debt" : ""}>{totalOutstandingCents > 0 ? `-${formatMoney(totalOutstandingCents)}` : formatMoney(0)}</strong>
        </div>
      </div>
    </section>
  );
}

function PatientSummaryView({
  patient,
  appointments,
  invoices,
  appointmentLogsByAppointmentId,
  query,
  filters
}: {
  patient: Awaited<ReturnType<typeof getDashboardData>>["patients"][number];
  appointments: Awaited<ReturnType<typeof getDashboardData>>["appointments"];
  invoices: Awaited<ReturnType<typeof getDashboardData>>["invoices"];
  appointmentLogsByAppointmentId: Map<string, Awaited<ReturnType<typeof getDashboardData>>["auditLogs"]>;
  query?: string;
  filters: { status: string; debt: string; provider: string };
}) {
  const now = new Date();
  const sortedAppointments = [...appointments].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const pastAppointments = appointments.filter(appointment => appointment.startsAt < now).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const nextAppointment = sortedAppointments.find(appointment => appointment.startsAt >= now && appointment.status !== AppointmentStatus.CANCELLED);
  const latestAppointment = pastAppointments[0] ?? sortedAppointments[0];
  const outstandingCents = getPatientOutstandingCents(invoices);
  const paidCents = invoices.filter(invoice => invoice.status === InvoiceStatus.PAID).reduce((sum, invoice) => sum + invoice.amountCents, 0);
  const totalBudgetCents = Math.max(patient.estimatedValue, invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0));
  const progress = totalBudgetCents > 0 ? Math.min(100, Math.round((paidCents / totalBudgetCents) * 100)) : 0;
  const clinicalAlert = patient.status === PatientStatus.URGENT
    ? "ALERTA MEDICA: revisar prioridad clinica antes de la cita"
    : "Sin alertas medicas registradas";
  const recentActivity = buildPatientRecentActivity(appointments, invoices, appointmentLogsByAppointmentId);

  return (
    <section className="patient-profile-screen">
      <header className="patient-profile-banner">
        <div className="patient-profile-id">
          <span className={`patient-avatar large ${patientStatusTone(patient.status)}`}>
            {getInitials(patient.name)}
          </span>
          <div>
            <h2>{patient.name}</h2>
            <p>{patientRecordNumber(patient.id)} <span /> <strong>{patientStatusLabel(patient.status)}</strong></p>
          </div>
        </div>
        <div className={`patient-alert-banner ${patient.status === PatientStatus.URGENT ? "danger" : "neutral"}`}>
          <Icon name={patient.status === PatientStatus.URGENT ? "activity" : "checkCircle"} />
          <strong>{clinicalAlert}</strong>
        </div>
        <div className="patient-balance-badge">
          <span>Saldo pendiente</span>
          <strong className={outstandingCents > 0 ? "debt" : ""}>{formatMoney(outstandingCents)}</strong>
        </div>
        <div className="patient-profile-actions">
          <Link className="icon-button" href={patientListHref({ query, status: filters.status, debt: filters.debt, provider: filters.provider })} title="Volver al listado" aria-label="Volver al listado de pacientes">
            <Icon name="users" />
          </Link>
          <Link className="icon-button" href="/?view=billing" title="Facturacion" aria-label="Abrir facturacion">
            <Icon name="card" />
          </Link>
          <Link className="icon-button" href="/?view=documents" title="Documentos" aria-label="Abrir documentos">
            <Icon name="file" />
          </Link>
        </div>
      </header>
      <div className="patient-profile-quick-actions">
        <Link className="button primary" href={`/?view=calendar#new-appointment`}>
          <Icon name="plus" />
          Nueva cita
        </Link>
        <Link className="button ghost" href="/?view=clinic">
          <Icon name="file" />
          Abrir encuentro
        </Link>
        <Link className="button ghost" href="/?view=documents">
          <Icon name="file" />
          Nueva nota
        </Link>
      </div>
      <div className="patient-profile-grid">
        <div className="patient-profile-main">
          <section className="patient-summary-card">
            <header>
              <h3><Icon name="calendar" /> Proxima cita</h3>
              {nextAppointment ? <span>{formatRelativeAppointmentDay(nextAppointment.startsAt)}</span> : null}
            </header>
            {nextAppointment ? (
              <div className="next-appointment-card">
                <time>
                  <span>{formatAppointmentMonth(nextAppointment.startsAt)}</span>
                  <strong>{nextAppointment.startsAt.getDate()}</strong>
                </time>
                <div>
                  <strong>{formatTime(nextAppointment.startsAt)} — {nextAppointment.title}</strong>
                  <p>{nextAppointment.operatory?.name ?? "Gabinete pendiente"} · {nextAppointment.provider?.name ?? "Profesional pendiente"}</p>
                  <small>Duracion estimada: {nextAppointment.durationMinutes} min</small>
                </div>
                <Link href="/?view=calendar">Ver detalles</Link>
              </div>
            ) : (
              <p className="empty-note">No hay proxima cita registrada.</p>
            )}
          </section>
          <section className="patient-summary-card treatment-card">
            <header>
              <h3>Tratamiento activo</h3>
              <Link href="/?view=treatments">Ver plan completo</Link>
            </header>
            <div className="treatment-progress-head">
              <strong>{patient.treatmentNeed || "Tratamiento pendiente"}</strong>
              <span>{progress}% Completado</span>
            </div>
            <div className="treatment-progress-bar" aria-label={`Progreso estimado ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="treatment-milestones">
              <div>
                <span>Ultima fase</span>
                <strong>{latestAppointment?.title ?? "Sin actividad previa"}</strong>
                <small>{latestAppointment ? formatPatientShortDate(latestAppointment.startsAt) : "Pendiente"}</small>
              </div>
              <div>
                <span>Siguiente hito</span>
                <strong>{nextAppointment?.title ?? "Planificacion pendiente"}</strong>
                <small>{nextAppointment ? formatPatientShortDate(nextAppointment.startsAt) : "Sin fecha"}</small>
              </div>
            </div>
          </section>
          <section className="patient-summary-card">
            <header>
              <h3>Actividad reciente</h3>
            </header>
            <div className="patient-activity-table">
              <table>
                <thead>
                  <tr><th>Fecha</th><th>Accion</th><th>Profesional</th><th>Estado</th></tr>
                </thead>
                <tbody>
                  {recentActivity.map(item => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.action}</td>
                      <td>{item.actor}</td>
                      <td><PatientActivityStatus tone={item.tone}>{item.status}</PatientActivityStatus></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside className="patient-profile-side">
          <section className="patient-side-card medical-card">
            <div>
              <h4><Icon name="activity" /> Alergias</h4>
              <div className="patient-tags">
                <span>No registradas</span>
              </div>
            </div>
            <div>
              <h4><Icon name="checkCircle" /> Medicacion actual</h4>
              <ul>
                <li><span />Sin medicacion registrada</li>
                {patient.status === PatientStatus.URGENT ? <li><span />Revisar triaje antes de sillón</li> : null}
              </ul>
            </div>
          </section>
          <section className="patient-side-card contact-card">
            <h4>Informacion de contacto</h4>
            <dl>
              <div><dt>Telefono movil</dt><dd>{patient.phone}</dd></div>
              <div><dt>Correo electronico</dt><dd>{patient.email || "No registrado"}</dd></div>
              <div><dt>Nombre fiscal</dt><dd>{patient.fiscalName || patient.name}</dd></div>
              <div><dt>NIF/CIF</dt><dd>{patient.taxId || "No registrado"}</dd></div>
              <div><dt>Domicilio fiscal</dt><dd>{patient.fiscalAddress || "No registrado"}</dd></div>
            </dl>
            <div className="emergency-contact">
              <span>Contacto de emergencia</span>
              <strong>No registrado</strong>
              <small>Campo pendiente de modelo clinico</small>
            </div>
          </section>
          <section className="patient-side-card financial-card">
            <h4>Resumen financiero</h4>
            <dl>
              <div><dt>Total presupuestado</dt><dd>{formatMoney(totalBudgetCents)}</dd></div>
              <div><dt>Pagado hasta hoy</dt><dd className="success">{formatMoney(paidCents)}</dd></div>
              <div><dt>Saldo restante</dt><dd className={outstandingCents > 0 ? "debt" : ""}>{formatMoney(outstandingCents)}</dd></div>
            </dl>
            <Link className="button subtle" href="/?view=billing">Generar factura</Link>
          </section>
        </aside>
      </div>
      <Link className="patient-floating-action" href={`/?view=calendar#new-appointment`} aria-label="Crear accion para paciente">
        <Icon name="plus" />
      </Link>
    </section>
  );
}

function PatientStatusButton({
  patientId,
  status,
  label,
  danger = false
}: {
  patientId: string;
  status: PatientStatus;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updatePatientStatusAction}>
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="status" value={status} />
      <button className={`button ${danger ? "danger" : "ghost"}`} type="submit">{label}</button>
    </form>
  );
}

function PatientStatusTag({ status }: { status: PatientStatus }) {
  return <span className={`patient-status-tag ${patientStatusTone(status)}`}>{patientStatusLabel(status)}</span>;
}

function PatientActivityStatus({ children, tone }: { children: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`patient-activity-status ${tone}`}>{children}</span>;
}

function getPatientOutstandingCents(invoices: Awaited<ReturnType<typeof getDashboardData>>["invoices"]) {
  return invoices
    .filter(invoice => invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED)
    .reduce((sum, invoice) => sum + invoice.amountCents, 0);
}

function patientListHref({
  query,
  status,
  debt,
  provider
}: {
  query?: string;
  status?: string;
  debt?: string;
  provider?: string;
}) {
  const params = new URLSearchParams({ view: "patients" });
  if (query) params.set("q", query);
  if (status && status !== "active") params.set("patientStatus", status);
  if (debt && debt !== "all") params.set("debt", debt);
  if (provider && provider !== "all") params.set("provider", provider);
  return `/?${params.toString()}`;
}

function patientDetailHref(
  patientId: string,
  query?: string,
  filters: { status?: string; debt?: string; provider?: string } = {}
) {
  const href = patientListHref(filters.status || filters.debt || filters.provider || query ? { query, ...filters } : {});
  return `${href}&patient=${encodeURIComponent(patientId)}`;
}

function patientRecordNumber(id: string) {
  const hash = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `H-${String(82000 + (hash % 7000)).padStart(5, "0")}`;
}

function formatPatientShortDate(date?: Date | null) {
  if (!date) return "No consta";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatPatientAppointmentDate(date: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const time = formatTime(date);
  if (sameCalendarDate(date, today)) return `Hoy, ${time}`;
  if (sameCalendarDate(date, tomorrow)) return `Manana, ${time}`;
  return `${new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(date)}, ${time}`;
}

function formatRelativeAppointmentDay(date: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (sameCalendarDate(date, today)) return "Hoy";
  if (sameCalendarDate(date, tomorrow)) return "Manana";
  return formatPatientShortDate(date);
}

function formatAppointmentMonth(date: Date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "").toUpperCase();
}

function sameCalendarDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildPatientRecentActivity(
  appointments: Awaited<ReturnType<typeof getDashboardData>>["appointments"],
  invoices: Awaited<ReturnType<typeof getDashboardData>>["invoices"],
  appointmentLogsByAppointmentId: Map<string, Awaited<ReturnType<typeof getDashboardData>>["auditLogs"]>
) {
  const appointmentItems = appointments.map(appointment => ({
    id: `appointment-${appointment.id}`,
    rawDate: appointment.startsAt,
    date: formatPatientAppointmentDate(appointment.startsAt),
    action: appointment.title,
    actor: appointment.provider?.name ?? "Recepcion",
    status: appointmentStatusLabel(appointment.status),
    tone: appointment.status === AppointmentStatus.CANCELLED || appointment.status === AppointmentStatus.NO_SHOW
      ? "danger" as const
      : appointment.status === AppointmentStatus.CONFIRMED || appointment.status === AppointmentStatus.COMPLETED
        ? "success" as const
        : appointment.status === AppointmentStatus.URGENT
          ? "warning" as const
          : "info" as const
  }));
  const invoiceItems = invoices.map(invoice => ({
    id: `invoice-${invoice.id}`,
    rawDate: invoice.issuedAt,
    date: formatPatientShortDate(invoice.issuedAt),
    action: `Factura ${invoice.number} · ${invoice.treatmentName}`,
    actor: "Administracion",
    status: invoiceStatusLabel(invoice.status),
    tone: invoice.status === InvoiceStatus.PAID
      ? "success" as const
      : invoice.status === InvoiceStatus.OVERDUE
        ? "danger" as const
        : "neutral" as const
  }));
  const auditItems = appointments.flatMap(appointment => {
    const logs = appointmentLogsByAppointmentId.get(appointment.id) ?? [];
    return logs.map(log => ({
      id: `audit-${log.id}`,
      rawDate: log.createdAt,
      date: formatPatientAppointmentDate(log.createdAt),
      action: formatAppointmentAuditAction(log.action, log.metadata),
      actor: "Sistema",
      status: "Guardado",
      tone: "neutral" as const
    }));
  });
  const activity = [...appointmentItems, ...invoiceItems, ...auditItems]
    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
    .slice(0, 5);

  if (activity.length) return activity;

  return [{
    id: "empty-activity",
    rawDate: new Date(0),
    date: "Sin fecha",
    action: "Sin actividad registrada",
    actor: "Clinica",
    status: "Pendiente",
    tone: "neutral" as const
  }];
}

function invoiceStatusLabel(status: InvoiceStatus) {
  switch (status) {
    case InvoiceStatus.PAID:
      return "Pagado";
    case InvoiceStatus.OVERDUE:
      return "Vencido";
    case InvoiceStatus.CANCELLED:
      return "Cancelado";
    case InvoiceStatus.SENT:
    default:
      return "Emitido";
  }
}

export function PatientIntakesPanel({
  data,
  patientById,
  appointmentsByPatientId
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  patientById: Map<string, Awaited<ReturnType<typeof getDashboardData>>["patients"][number]>;
  appointmentsByPatientId: Map<string, Awaited<ReturnType<typeof getDashboardData>>["appointments"]>;
}) {
  const captured = data.patientIntakes.filter(intake => intake.status === PatientIntakeStatus.CAPTURED).length;
  const duplicateReview = data.patientIntakes.filter(intake => intake.status === PatientIntakeStatus.DUPLICATE_REVIEW).length;
  const linked = data.patientIntakes.filter(intake => intake.status === PatientIntakeStatus.LINKED).length;
  const discarded = data.patientIntakes.filter(intake => intake.status === PatientIntakeStatus.DISCARDED).length;

  return (
    <section className="card pad patient-intake-panel">
      <PanelHead
        icon="users"
        title="Pre-fichas del chat"
        subtitle="Datos introducidos por el paciente antes de validar, fusionar o completar su ficha."
      />
      <div className="patient-intake-summary" aria-label="Resumen de pre-fichas">
        <MiniPipeline label="Nuevas" value={captured} accent="accent-blue" />
        <MiniPipeline label="Duplicados" value={duplicateReview} accent="accent-orange" />
        <MiniPipeline label="Vinculadas" value={linked} accent="accent-green" />
        <MiniPipeline label="Descartadas" value={discarded} accent="accent-red" />
      </div>
      {data.patientIntakes.length === 0 ? (
        <p className="empty-note">Todavia no hay pre-fichas capturadas por Clara.</p>
      ) : (
        <div className="patient-intake-grid">
          {data.patientIntakes.slice(0, 12).map(intake => {
            const duplicateIds = Array.isArray(intake.duplicatePatientIds)
              ? intake.duplicatePatientIds.filter((id): id is string => typeof id === "string")
              : [];
            const duplicates = duplicateIds.map(id => patientById.get(id)).filter(Boolean);
            const patientAppointments = intake.patientId ? appointmentsByPatientId.get(intake.patientId) ?? [] : [];
            const recentMessages = intake.conversation?.messages ?? [];
            return (
              <article className="patient-intake-card" key={intake.id}>
                <header>
                  <div>
                    <strong>{intake.name || "Nombre pendiente"}</strong>
                    <span>{intake.treatmentNeed || "Motivo pendiente"}</span>
                  </div>
                  <Pill tone={patientIntakeStatusTone(intake.status)}>{patientIntakeStatusLabel(intake.status)}</Pill>
                </header>
                <dl>
                  <div><dt>Codigo</dt><dd>{intake.accessCode}</dd></div>
                  <div><dt>Email</dt><dd>{intake.email || "Pendiente"}</dd></div>
                  <div><dt>Telefono</dt><dd>{intake.phone || "Pendiente"}</dd></div>
                  <div><dt>Sede</dt><dd>{intake.location || "Pendiente"}</dd></div>
                  <div><dt>Origen</dt><dd>{intake.source} · {intake.channel ?? "Canal pendiente"}</dd></div>
                  <div><dt>Consentimiento</dt><dd>{intake.consent ? "Aceptado" : "Pendiente"}</dd></div>
                  <div><dt>Actualizada</dt><dd>{formatDateTime(intake.updatedAt)}</dd></div>
                </dl>
                {duplicates.length > 0 ? (
                  <p className="patient-intake-warning">
                    Posible duplicado: {duplicates.map(patient => patient?.name).join(", ")}
                  </p>
                ) : intake.patient ? (
                  <p className="patient-intake-linked">Vinculada a {intake.patient.name}</p>
                ) : null}
                {patientAppointments.length > 0 ? (
                  <div className="patient-intake-subsection">
                    <strong>Citas asociadas</strong>
                    {patientAppointments.slice(0, 3).map(appointment => (
                      <span key={appointment.id}>
                        {formatDateTime(appointment.startsAt)} · {appointment.status}
                      </span>
                    ))}
                  </div>
                ) : null}
                {recentMessages.length > 0 ? (
                  <div className="patient-intake-conversation">
                    <strong>Conversacion interna</strong>
                    {recentMessages.slice(-4).map(message => (
                      <p key={message.id} className={message.direction === "INBOUND" ? "inbound" : "outbound"}>
                        <span>{message.senderName}</span>
                        {message.body}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="empty-note small">Sin conversacion vinculada.</p>
                )}
                <div className="patient-intake-actions">
                  <Link className="button ghost" href={`/ficha/${intake.accessCode}`}>
                    Acceso paciente
                  </Link>
                  <form action={createTaskFromPatientIntakeAction}>
                    <input type="hidden" name="intakeId" value={intake.id} />
                    <input type="hidden" name="priority" value={TaskPriority.HIGH} />
                    <input
                      type="hidden"
                      name="title"
                      value={`Revisar pre-ficha de ${intake.name || intake.phone || intake.email || intake.accessCode}`}
                    />
                    <button className="button" type="submit">Crear tarea</button>
                  </form>
                  {intake.status !== PatientIntakeStatus.DUPLICATE_REVIEW ? (
                    <PatientIntakeStatusButton intakeId={intake.id} status={PatientIntakeStatus.DUPLICATE_REVIEW} label="Revisar duplicado" />
                  ) : null}
                  {intake.patientId && intake.status !== PatientIntakeStatus.LINKED ? (
                    <PatientIntakeStatusButton intakeId={intake.id} status={PatientIntakeStatus.LINKED} label="Marcar vinculada" />
                  ) : null}
                  {intake.status !== PatientIntakeStatus.DISCARDED ? (
                    <PatientIntakeStatusButton intakeId={intake.id} status={PatientIntakeStatus.DISCARDED} label="Descartar" danger />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PatientIntakeStatusButton({
  intakeId,
  status,
  label,
  danger = false
}: {
  intakeId: string;
  status: PatientIntakeStatus;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updatePatientIntakeStatusAction}>
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="targetStatus" value={status} />
      <button className={`button ${danger ? "danger" : "ghost"}`} type="submit">{label}</button>
    </form>
  );
}

function PatientForm() {
  return (
    <section id="new-patient" className="card pad form-card">
      <h2>Nuevo paciente</h2>
      <form action={createPatientAction} className="form-grid two">
        <Field label="Nombre" name="name" required />
        <Field label="Telefono" name="phone" required />
        <Field label="Email" name="email" type="email" />
        <Field label="Nombre fiscal" name="fiscalName" />
        <Field label="NIF/CIF" name="taxId" />
        <Field label="Direccion fiscal" name="fiscalAddress" />
        <Field label="Necesidad" name="treatmentNeed" defaultValue="Revision dental" />
        <Field label="Fuente" name="source" defaultValue="WhatsApp" />
        <Field label="Valor estimado EUR" name="estimatedValue" type="number" defaultValue="350" />
        <button className="button primary" type="submit">Crear paciente</button>
      </form>
    </section>
  );
}
