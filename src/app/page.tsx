import { Fragment } from "react";
import Link from "next/link";
import { AppointmentStatus, CalendarEventType, ConversationChannel, ElectronicInvoiceStatus, PatientIntakeStatus, PatientStatus, TaskPriority } from "@prisma/client";
import {
  EmptyState,
  Field,
  MiniPipeline,
  PanelHead,
  Pill,
  TextArea,
  Tile,
  ViewHead,
  type Tone
} from "@/components/clinical-ui";
import {
  cancelAppointmentAction,
  cancelCalendarEventAction,
  completeTaskAction,
  createAppointmentAction,
  createCalendarEventAction,
  createInvoiceAction,
  createPatientAction,
  createTaskFromConversationAction,
  createTaskFromPatientIntakeAction,
  createTaskAction,
  createTreatmentAction,
  generateRemindersAction,
  inviteUserAction,
  markConversationReadAction,
  replyConversationAction,
  rescheduleAppointmentAction,
  runAgentDemoAction,
  saveInteractiveDemoAction,
  toggleAssistantAction,
  updatePatientStatusAction,
  updatePatientIntakeStatusAction,
  updateInvoiceElectronicStatusAction,
  updateSettingsAction
} from "@/app/actions";
import { Icon, type IconName } from "@/components/icon";
import { InvoiceFiscalForm } from "@/components/invoice-fiscal-form";
import { InteractiveAgentDemo } from "@/components/interactive-agent-demo";
import { SaasAppShell } from "@/components/saas-app-shell";
import { demoKnowledge, demoScenarios } from "@/lib/agent/demo-data";
import { isView } from "@/lib/app-navigation";
import { formatLongDate, formatMonthLabel, formatWeekRange, getBusinessWeekDays, getGreeting, getMonthDays } from "@/lib/calendar";
import { type AppView, getDashboardData } from "@/lib/dashboard";
import { formatDate, formatDateTime, formatMoney, formatTime, getInitials } from "@/lib/format";
import { CLINIC_CLOSE_HOUR, CLINIC_OPEN_HOUR } from "@/lib/scheduling";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedView = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const selectedConversationId = Array.isArray(params?.conversation) ? params?.conversation[0] : params?.conversation;
  const selectedPatientId = Array.isArray(params?.patient) ? params?.patient[0] : params?.patient;
  const patientQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const errorNotice = Array.isArray(params?.error) ? params?.error[0] : params?.error;
  const okNotice = Array.isArray(params?.ok) ? params?.ok[0] : params?.ok;
  const weekParam = Array.isArray(params?.week) ? params?.week[0] : params?.week;
  const weekOffset = Number.isFinite(Number(weekParam)) ? Math.trunc(Number(weekParam)) : 0;
  const monthParam = Array.isArray(params?.month) ? params?.month[0] : params?.month;
  const monthOffset = Number.isFinite(Number(monthParam)) ? Math.trunc(Number(monthParam)) : 0;
  const modeParam = Array.isArray(params?.mode) ? params?.mode[0] : params?.mode;
  const calendarMode = modeParam === "month" ? "month" : "week";
  const view = isView(requestedView) ? requestedView : "home";
  const data = await getDashboardData(view);

  return (
    <SaasAppShell
      data={data}
      view={view}
      patientQuery={patientQuery}
      notices={
        <>
          {errorNotice ? <Notice tone="error" message={errorNotice} view={view} /> : null}
          {okNotice ? <Notice tone="ok" message={okNotice} view={view} /> : null}
        </>
      }
    >
      {renderView(view, data, { selectedConversationId, selectedPatientId, patientQuery, weekOffset, monthOffset, calendarMode })}
    </SaasAppShell>
  );
}

function renderView(
  view: AppView,
  data: Awaited<ReturnType<typeof getDashboardData>>,
  options: {
    selectedConversationId?: string;
    selectedPatientId?: string;
    patientQuery?: string;
    weekOffset?: number;
    monthOffset?: number;
    calendarMode?: "week" | "month";
  } = {}
) {
  switch (view) {
    case "calendar":
      return (
        <CalendarView
          data={data}
          weekOffset={options.weekOffset ?? 0}
          monthOffset={options.monthOffset ?? 0}
          mode={options.calendarMode ?? "week"}
        />
      );
    case "inbox":
      return <InboxView data={data} selectedConversationId={options.selectedConversationId} />;
    case "agent":
      return <AgentView data={data} />;
    case "aiReview":
      return <AiReviewView data={data} />;
    case "patients":
      return <PatientsView data={data} selectedPatientId={options.selectedPatientId} query={options.patientQuery} />;
    case "clinic":
      return <ClinicView data={data} />;
    case "treatments":
      return <TreatmentsView data={data} />;
    case "tasks":
      return <TasksView data={data} />;
    case "crm":
      return <CrmView data={data} />;
    case "billing":
      return <BillingView data={data} />;
    case "documents":
      return <DocumentsView data={data} />;
    case "inventory":
      return <InventoryView data={data} />;
    case "lab":
      return <LabView data={data} />;
    case "team":
      return <TeamView data={data} />;
    case "analytics":
      return <AnalyticsView data={data} />;
    case "automations":
      return <AutomationsView data={data} />;
    case "imaging":
      return <ImagingView data={data} />;
    case "settings":
      return <SettingsView data={data} />;
    default:
      return <HomeView data={data} />;
  }
}

function HomeView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <div className="home-overview">
      <div className="home-intro">
        <h1>{getGreeting()}, {data.currentUser.name}</h1>
        <p>Espacio de trabajo de {data.tenant.name} · {formatLongDate()}</p>
        <div className="toolbar">
          <form action={toggleAssistantAction} className="form-inline">
            <input type="hidden" name="view" value="home" />
            <button className="button dark" type="submit">
              <Icon name="bot" />
              {data.tenant.assistantEnabled ? "Pausar Clara" : "Activar Clara"}
            </button>
          </form>
          <Link className="button" href="/?view=calendar#new-event">
            <Icon name="calendar" />
            Nuevo evento
          </Link>
          <Link className="button" href="/?view=patients#new-patient">
            <Icon name="users" />
            Nuevo paciente
          </Link>
          <Link className="button" href="/?view=treatments#new-treatment">
            <Icon name="tooth" />
            Nuevo tratamiento
          </Link>
        </div>
      </div>
      <aside className="home-agenda">
        <AgendaCard data={data} compact />
      </aside>
      <div className="home-kpis">
        <Tile icon="inbox" label="Conversaciones sin leer" value={data.metrics.unreadConversations} note="pendientes de revisar" accent="accent-blue" />
        <Tile icon="calendar" label="Eventos proximos" value={data.metrics.appointmentCount} note="citas en agenda" accent="accent-purple" />
        <Tile icon="task" label="Tareas pendientes" value={data.metrics.openTasks} note="colas de trabajo" accent="accent-red" />
        <Tile icon="users" label="Pacientes activos" value={data.metrics.activePatients} note="base operativa" accent="accent-green" />
        <Tile icon="euro" label="Ingresos recuperados" value={formatMoney(data.metrics.recoveredCents)} note="pipeline IA" accent="accent-orange" />
      </div>
      <div className="widget-board">
        <section className="card pad upcoming-panel">
                <PanelHead icon="calendar" title="Proxima agenda" subtitle="Los siguientes eventos de la cuenta activa." href="/?view=calendar" />
                {data.appointments.length === 0 ? (
                  <p className="empty-note">No hay citas en agenda. Crea la primera desde Calendario.</p>
                ) : (
                  data.appointments.slice(0, 3).map(appointment => (
                    <div className="compact-row" key={appointment.id}>
                      <strong>{appointment.title}</strong>
                      <span>
                        {appointment.patient.name} · {formatDateTime(appointment.startsAt)}
                      </span>
                    </div>
                  ))
                )}
        </section>
        <section className="card pad queue-panel">
                <PanelHead icon="task" title="Colas de trabajo" href="/?view=tasks" />
                <h4>Tareas vencidas</h4>
                <p>{data.tasks.some(task => task.status === "OVERDUE") ? "Hay tareas que requieren revision de recepcion." : "Ahora mismo no hay nada esperando en esta cola."}</p>
                <hr />
                <h4>Conversaciones recientes sin leer</h4>
                <p>{data.metrics.unreadConversations ? `${data.metrics.unreadConversations} conversaciones pendientes de revisar.` : "No hay mensajes sin leer por revisar."}</p>
        </section>
        <section className="card pad pipeline-panel">
                <PanelHead icon="users" title="Pipeline de pacientes" subtitle="Estado actual y proximas acciones." href="/?view=patients" />
                <div className="pipeline-mini">
                  <MiniPipeline label="Nuevo" value={data.patients.filter(patient => patient.status === "NEW_LEAD").length} accent="accent-blue" />
                  <MiniPipeline label="Presupuesto" value={data.patients.filter(patient => patient.status === "OPEN_BUDGET").length} accent="accent-purple" />
                  <MiniPipeline label="Urgencia" value={data.patients.filter(patient => patient.status === "URGENT").length} accent="accent-red" />
                  <MiniPipeline label="Activo" value={data.patients.filter(patient => patient.status === "ACTIVE").length} accent="accent-green" />
                </div>
                <h4>Proximas a vencer</h4>
                {data.tasks.length === 0 ? (
                  <p className="empty-note">Sin tareas pendientes en las colas de trabajo.</p>
                ) : (
                  data.tasks.slice(0, 5).map(task => (
                    <div className="compact-row" key={task.id}>
                      <strong>{task.title}</strong>
                      <span>
                        {task.type} · {task.dueAt ? formatDate(task.dueAt) : "sin fecha"}
                      </span>
                    </div>
                  ))
                )}
        </section>
        <section className="card pad recent-panel">
                <PanelHead icon="inbox" title="Trabajo reciente" href="/?view=inbox" />
                <h4>Conversaciones</h4>
                {data.conversations.length === 0 ? (
                  <p className="empty-note">Sin conversaciones registradas todavia.</p>
                ) : (
                  data.conversations.slice(0, 3).map(conversation => (
                    <div className="compact-row" key={conversation.id}>
                      <strong>{conversation.patient?.name ?? "Paciente sin ficha"}</strong>
                      <span>
                        {conversation.result} · {formatDateTime(conversation.startedAt)}
                      </span>
                    </div>
                  ))
                )}
        </section>
        <section className="card pad finance-panel">
                <PanelHead icon="euro" title="Resumen financiero" subtitle="Una vista ligera de facturacion y ROI." href="/?view=billing" />
                <div className="finance-grid">
                  <div>
                    <span>Cobros pendientes</span>
                    <strong>0,00 €</strong>
                  </div>
                  <div>
                    <span>Facturas vencidas</span>
                    <strong>0</strong>
                  </div>
                  <div>
                    <span>Pagos pendientes</span>
                    <strong>0,00 €</strong>
                  </div>
                </div>
        </section>
      </div>
    </div>
  );
}

function CalendarView({
  data,
  weekOffset,
  monthOffset,
  mode
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  weekOffset: number;
  monthOffset: number;
  mode: "week" | "month";
}) {
  const hours = Array.from({ length: CLINIC_CLOSE_HOUR - CLINIC_OPEN_HOUR }, (_, index) =>
    String(CLINIC_OPEN_HOUR + index).padStart(2, "0")
  );
  const days = getBusinessWeekDays(new Date(), weekOffset);
  const today = new Date().toISOString().slice(0, 10);
  const activeAppointments = data.appointments.filter(appointment => appointment.status !== "CANCELLED");
  const todaysAppointments = activeAppointments.filter(appointment => appointment.startsAt.toISOString().startsWith(today));
  const urgentAppointments = activeAppointments.filter(appointment => appointment.status === "URGENT");
  const confirmedAppointments = activeAppointments.filter(appointment => appointment.status === AppointmentStatus.CONFIRMED);
  const proposedAppointments = activeAppointments.filter(appointment => appointment.status === AppointmentStatus.PROPOSED || appointment.status === AppointmentStatus.REQUESTED);
  const weekIsoSet = new Set(days.map(day => day.iso));
  const visibleAppointments = activeAppointments.filter(appointment => weekIsoSet.has(appointment.startsAt.toISOString().slice(0, 10)));
  const totalSlots = Math.max(1, data.operatories.length * days.length * hours.length);
  const occupancy = Math.min(100, Math.round((visibleAppointments.length / totalSlots) * 100));
  const providerLoad = data.providers.slice(0, 4).map(provider => ({
    provider,
    count: visibleAppointments.filter(appointment => appointment.providerId === provider.id).length
  }));

  return (
    <>
      <div className="calendar-page-head">
        <ViewHead
          title="Calendario"
          subtitle={`${mode === "month" ? formatMonthLabel(new Date(), monthOffset) : formatWeekRange(days)} · agenda unica de la clinica.`}
        />
        <div className="calendar-head-actions">
          <a className="button" href="#new-event">
            <Icon name="calendar" />
            Bloquear agenda
          </a>
          <a className="button primary" href="#new-appointment">
            <Icon name="plus" />
            Nueva cita
          </a>
        </div>
      </div>
      <section className="calendar-command-strip" aria-label="Resumen operativo de agenda">
        <div>
          <span>Ocupacion visible</span>
          <strong>{occupancy}%</strong>
          <i style={{ width: `${occupancy}%` }} />
        </div>
        <div>
          <span>Confirmadas</span>
          <strong>{confirmedAppointments.length}</strong>
          <small>{proposedAppointments.length} por confirmar</small>
        </div>
        <div>
          <span>Gabinetes activos</span>
          <strong>{data.operatories.length}</strong>
          <small>{data.providers.length} profesionales disponibles</small>
        </div>
        <div>
          <span>Riesgo recepcion</span>
          <strong>{urgentAppointments.length}</strong>
          <small>{todaysAppointments.length} visitas hoy</small>
        </div>
      </section>
      <section className="calendar-layout calendar-pro">
        <aside className="calendar-side calendar-pro-side">
          <div className="calendar-side-block">
            <div>
              <span className="calendar-side-kicker">Hoy</span>
              <strong>{todaysAppointments.length} citas</strong>
            </div>
            <div>
              <span className="calendar-side-kicker">Urgencias</span>
              <strong>{urgentAppointments.length}</strong>
            </div>
          </div>
          <section className="calendar-load-panel" aria-label="Carga por profesional">
            <span className="calendar-side-kicker">Carga semanal</span>
            {providerLoad.length === 0 ? (
              <p className="empty-note small">Sin profesionales activos.</p>
            ) : (
              providerLoad.map(({ provider, count }) => (
                <div className="load-row" key={provider.id}>
                  <span>{provider.name}</span>
                  <strong>{count}</strong>
                  <i style={{ width: `${Math.min(100, Math.max(8, (count / Math.max(1, visibleAppointments.length)) * 100))}%` }} />
                </div>
              ))
            )}
          </section>
          <CalendarAgendaPanel appointments={activeAppointments} />
          <div className="calendar-side-actions">
            <a className="button primary" href="#new-appointment">
              <Icon name="plus" />
              Nueva cita
            </a>
            <a className="button" href="#new-event">
              <Icon name="calendar" />
              Bloquear agenda
            </a>
            <form action={generateRemindersAction}>
              <button className="button" type="submit">
                <Icon name="task" />
                Recordatorios 48h
              </button>
            </form>
          </div>
        </aside>
        <div className="calendar-main-panel">
          <div className="calendar-nav">
            <div className="calendar-segment" aria-label="Vista del calendario">
              <Link className={mode === "week" ? "active" : ""} href={`/?view=calendar&mode=week&week=${weekOffset}`}>Semana</Link>
              <Link className={mode === "month" ? "active" : ""} href={`/?view=calendar&mode=month&month=${monthOffset}`}>Mes</Link>
            </div>
            <div className="calendar-range-actions">
              {mode === "week" ? (
                <>
                  <Link className="button" href={`/?view=calendar&mode=week&week=${weekOffset - 1}`}>&larr; Anterior</Link>
                  <Link className="button subtle" href="/?view=calendar&mode=week&week=0">Hoy</Link>
                  <Link className="button" href={`/?view=calendar&mode=week&week=${weekOffset + 1}`}>Siguiente &rarr;</Link>
                </>
              ) : (
                <>
                  <Link className="button" href={`/?view=calendar&mode=month&month=${monthOffset - 1}`}>&larr; Anterior</Link>
                  <Link className="button subtle" href="/?view=calendar&mode=month&month=0">Hoy</Link>
                  <Link className="button" href={`/?view=calendar&mode=month&month=${monthOffset + 1}`}>Siguiente &rarr;</Link>
                </>
              )}
            </div>
          </div>
          {mode === "month" ? (
            <MonthView data={data} monthOffset={monthOffset} today={today} />
          ) : (
          <div className="week-grid">
            <div className="week-cell head" />
            {days.map(day => (
              <div className={`week-cell head ${day.iso === today ? "today" : ""}`} key={day.iso}>
                {day.label}
                <br />
                <strong>{day.dayNumber}</strong>
              </div>
            ))}
            {hours.map(hour => (
              <Fragment key={hour}>
                <div className="week-cell time">
                  {hour}:00
                </div>
                {days.map(day => {
                  const datePrefix = `${day.iso}T${hour}`;
                  const appts = data.appointments.filter(
                    appointment => appointment.status !== "CANCELLED" && appointment.startsAt.toISOString().startsWith(datePrefix)
                  );
                  const events = data.calendarEvents.filter(event => event.startsAt.toISOString().startsWith(datePrefix));
                  return (
                    <div className="week-cell" key={`${day.iso}-${hour}`}>
                      {appts.map(appointment => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))}
                      {events.map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
          )}
        </div>
      </section>
      <AppointmentForm data={data} />
      <EventForm data={data} />
    </>
  );
}

function CalendarAgendaPanel({
  appointments
}: {
  appointments: Awaited<ReturnType<typeof getDashboardData>>["appointments"];
}) {
  return (
    <section className="calendar-agenda-panel" aria-label="Proximas citas">
      <div className="calendar-panel-head">
        <div>
          <span>Agenda</span>
          <strong>Proximas visitas</strong>
        </div>
        <Link href="/?view=calendar">Ver todo</Link>
      </div>
      {appointments.length === 0 ? (
        <p className="empty-note">No hay citas programadas todavia.</p>
      ) : (
        <div className="calendar-agenda-list">
          {appointments.slice(0, 5).map(appointment => (
            <div className="calendar-agenda-row" key={appointment.id}>
              <div>
                <strong>{appointment.title}</strong>
                <span>{appointment.patient.name}</span>
              </div>
              <time>
                {formatTime(appointment.startsAt)}
                <span>{formatDate(appointment.startsAt)}</span>
              </time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MonthView({
  data,
  monthOffset,
  today
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  monthOffset: number;
  today: string;
}) {
  const days = getMonthDays(new Date(), monthOffset);
  const weekLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  return (
    <div className="month-grid">
      {weekLabels.map(label => (
        <div className="month-cell head" key={label}>{label}</div>
      ))}
      {days.map(day => {
        const apptCount = data.appointments.filter(
          appointment => appointment.status !== "CANCELLED" && appointment.startsAt.toISOString().startsWith(day.iso)
        ).length;
        const eventCount = data.calendarEvents.filter(event => event.startsAt.toISOString().startsWith(day.iso)).length;
        return (
          <Link
            className={`month-cell ${day.iso === today ? "today" : ""} ${day.inCurrentMonth ? "" : "muted"}`}
            href={`/?view=calendar&mode=week&week=${day.weekOffsetFromToday}`}
            key={day.iso}
          >
            <strong>{day.dayNumber}</strong>
            {apptCount > 0 ? <span className="month-count appt-count">{apptCount} cita{apptCount > 1 ? "s" : ""}</span> : null}
            {eventCount > 0 ? <span className="month-count event-count">{eventCount} evento{eventCount > 1 ? "s" : ""}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}

function AppointmentCard({
  appointment
}: {
  appointment: Awaited<ReturnType<typeof getDashboardData>>["appointments"][number];
}) {
  const dateValue = appointment.startsAt.toISOString().slice(0, 10);
  const timeValue = appointment.startsAt.toISOString().slice(11, 16);

  return (
    <article className={`appt ${appointment.status === "URGENT" ? "urgent" : appointment.status === "CONFIRMED" ? "confirmed" : "risk"}`}>
      <div className="appt-topline">
        <span>{formatTime(appointment.startsAt)}</span>
        <span>{appointment.status === "URGENT" ? "Urgente" : appointment.status === "CONFIRMED" ? "Confirmada" : "IA"}</span>
      </div>
      <strong>{appointment.title}</strong>
      <span className="appt-patient">{appointment.patient.name}</span>
      <span className="appt-meta">{appointment.operatory?.name ?? "Gabinete pendiente"}</span>
      <div className="appt-actions">
        <details>
          <summary>Reprogramar</summary>
          <form action={rescheduleAppointmentAction} className="form-grid appt-reschedule">
            <input type="hidden" name="appointmentId" value={appointment.id} />
            <label className="field"><span>Fecha</span><input name="date" type="date" defaultValue={dateValue} required /></label>
            <label className="field"><span>Hora</span><input name="time" type="time" defaultValue={timeValue} required /></label>
            <button className="button primary tiny" type="submit">Confirmar</button>
          </form>
        </details>
        <form action={cancelAppointmentAction}>
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <button className="button ghost tiny" type="submit">Cancelar</button>
        </form>
      </div>
    </article>
  );
}

function EventCard({ event }: { event: Awaited<ReturnType<typeof getDashboardData>>["calendarEvents"][number] }) {
  return (
    <article className="appt event">
      <div className="appt-topline">
        <span>{formatTime(event.startsAt)}</span>
        <span>{event.type}</span>
      </div>
      <strong>{event.title}</strong>
      <span className="appt-meta">{event.operatory?.name ?? "Sin gabinete"}</span>
      <div className="appt-actions">
        <form action={cancelCalendarEventAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <button className="button ghost tiny" type="submit">Eliminar</button>
        </form>
      </div>
    </article>
  );
}

function EventForm({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section id="new-event" className="calendar-drawer" aria-label="Nuevo evento">
      <Link className="calendar-drawer-backdrop" href="/?view=calendar" aria-label="Cerrar nuevo evento" />
      <div className="calendar-drawer-panel">
        <header className="calendar-drawer-head">
          <div>
            <span>Agenda clinica</span>
            <h2>Bloquear agenda</h2>
          </div>
          <Link className="icon-button" href="/?view=calendar" aria-label="Cerrar">x</Link>
        </header>
        <form action={createCalendarEventAction} className="calendar-drawer-body form-grid">
          <label className="field">
            <span>Profesional</span>
            <select name="providerId">
              <option value="">Sin asignar</option>
              {data.providers.map(provider => (
                <option value={provider.id} key={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Sala</span>
            <select name="operatoryId">
              <option value="">Sin asignar</option>
              {data.operatories.map(operatory => (
                <option value={operatory.id} key={operatory.id}>{operatory.name}</option>
              ))}
            </select>
          </label>
          <Field label="Titulo" name="title" defaultValue="Reunion de equipo" required />
          <label className="field">
            <span>Tipo</span>
            <select name="type" defaultValue={CalendarEventType.MEETING}>
              <option value={CalendarEventType.MEETING}>Reunion</option>
              <option value={CalendarEventType.BLOCK}>Bloqueo de agenda</option>
              <option value={CalendarEventType.ABSENCE}>Ausencia</option>
              <option value={CalendarEventType.OTHER}>Otro</option>
            </select>
          </label>
          <div className="form-grid two">
            <Field label="Fecha" name="date" type="date" defaultValue={today} required />
            <Field label="Hora" name="time" type="time" defaultValue="09:00" required />
          </div>
          <Field label="Duracion minutos" name="durationMinutes" type="number" defaultValue="30" required />
          <footer className="calendar-drawer-foot">
            <Link className="button" href="/?view=calendar">Cancelar</Link>
            <button className="button primary" type="submit">Crear evento</button>
          </footer>
        </form>
      </div>
    </section>
  );
}

function InboxView({
  data,
  selectedConversationId
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  selectedConversationId?: string;
}) {
  const selectedConversation =
    data.conversations.find(conversation => conversation.id === selectedConversationId) ?? data.conversations[0];
  const patientById = new Map(data.patients.map(patient => [patient.id, patient]));
  const appointmentsByPatientId = new Map<string, typeof data.appointments>();
  for (const appointment of data.appointments) {
    const current = appointmentsByPatientId.get(appointment.patientId) ?? [];
    current.push(appointment);
    appointmentsByPatientId.set(appointment.patientId, current);
  }

  return (
    <>
      <ViewHead title="Conversaciones" subtitle="Recepcion IA: conversaciones, pre-fichas y trabajo pendiente de Clara." />
      <PatientIntakesPanel data={data} patientById={patientById} appointmentsByPatientId={appointmentsByPatientId} />
      {selectedConversation ? (
        <section className="inbox-layout">
          <aside className="card inbox-list" aria-label="Lista de conversaciones">
            <div className="inbox-list-head">
              <div>
                <h2>Bandeja de entrada</h2>
                <p>{data.metrics.unreadConversations} sin leer</p>
              </div>
              <Pill tone="blue">{data.conversations.length}</Pill>
            </div>
            <div className="conversation-list">
              {data.conversations.map(conversation => (
                <Link
                  className={`conversation-item ${conversation.id === selectedConversation.id ? "active" : ""} ${conversation.unread ? "unread" : ""}`}
                  href={`/?view=inbox&conversation=${conversation.id}`}
                  key={conversation.id}
                >
                  <span className="conversation-avatar">{getInitials(conversation.patient?.name ?? "Paciente")}</span>
                  <span className="conversation-main">
                    <span className="conversation-top">
                      <strong>{conversation.patient?.name ?? "Paciente sin ficha"}</strong>
                      <small>{formatTime(conversation.updatedAt)}</small>
                    </span>
                    <span>{conversation.messages.at(-1)?.body ?? conversation.intent ?? "Sin mensajes"}</span>
                    <span className="conversation-tags">
                      <Pill>{conversation.channel}</Pill>
                      <Pill tone={conversation.status === "HUMAN_REQUIRED" ? "red" : conversation.status === "COMPLETED" ? "orange" : "green"}>
                        {conversation.status}
                      </Pill>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </aside>

          <section className="card conversation-detail">
            <header className="conversation-header">
              <div>
                <p className="eyebrow">{selectedConversation.channel} · {formatDateTime(selectedConversation.startedAt)}</p>
                <h2>{selectedConversation.patient?.name ?? "Paciente sin ficha"}</h2>
                <p>{selectedConversation.patient?.phone ?? "Telefono no registrado"} · {selectedConversation.intent ?? "Intencion pendiente"}</p>
              </div>
              <div className="conversation-actions">
                <Pill tone={selectedConversation.status === "HUMAN_REQUIRED" ? "red" : selectedConversation.status === "COMPLETED" ? "orange" : "green"}>
                  {selectedConversation.status}
                </Pill>
                {selectedConversation.unread ? (
                  <form action={markConversationReadAction}>
                    <input type="hidden" name="conversationId" value={selectedConversation.id} />
                    <button className="button" type="submit">Marcar leido</button>
                  </form>
                ) : null}
              </div>
            </header>

            <div className="conversation-body">
              <div className="messages" aria-label="Mensajes del hilo">
                {selectedConversation.messages.map(message => (
                  <article className={`message ${message.direction.toLowerCase()}`} key={message.id}>
                    <strong>{message.senderName}</strong>
                    <p>{message.body}</p>
                    <span>{formatDateTime(message.createdAt)}</span>
                  </article>
                ))}
              </div>
            </div>

            <footer className="conversation-footer">
              <form action={replyConversationAction} className="reply-form">
                <input type="hidden" name="conversationId" value={selectedConversation.id} />
                <label className="field">
                  <span>Respuesta manual</span>
                  <textarea name="body" placeholder="Escribe una respuesta validada por recepcion..." required />
                </label>
                <button className="button primary" type="submit">Enviar respuesta</button>
              </form>
              <form action={createTaskFromConversationAction} className="task-inline-form">
                <input type="hidden" name="conversationId" value={selectedConversation.id} />
                <input type="hidden" name="priority" value={TaskPriority.HIGH} />
                <label className="field">
                  <span>Derivar a cola</span>
                  <input name="title" defaultValue={`Revisar conversacion de ${selectedConversation.patient?.name ?? "paciente"}`} required />
                </label>
                <button className="button" type="submit">Crear tarea</button>
              </form>
            </footer>
          </section>
        </section>
      ) : (
        <EmptyState
          icon="inbox"
          title="No hay conversaciones todavia"
          hint="Cuando Clara atienda un canal (voz, WhatsApp, SMS o web) los hilos apareceran aqui."
        />
      )}
    </>
  );
}

function PatientsView({
  data,
  selectedPatientId,
  query
}: {
  data: Awaited<ReturnType<typeof getDashboardData>>;
  selectedPatientId?: string;
  query?: string;
}) {
  const appointmentLogsByAppointmentId = new Map<string, typeof data.auditLogs>();
  for (const log of data.auditLogs) {
    if (!log.entityId) continue;
    const current = appointmentLogsByAppointmentId.get(log.entityId) ?? [];
    current.push(log);
    appointmentLogsByAppointmentId.set(log.entityId, current);
  }

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

  const normalizedQuery = normalizeSearch(query ?? "");
  const filteredPatients = normalizedQuery
    ? data.patients.filter(patient => {
        const searchable = normalizeSearch([
          patient.name,
          patient.phone,
          patient.email,
          patient.taxId,
          patient.treatmentNeed,
          patient.source,
          patient.status
        ].filter(Boolean).join(" "));
        return searchable.includes(normalizedQuery);
      })
    : data.patients;
  const selectedPatient =
    filteredPatients.find(patient => patient.id === selectedPatientId) ??
    data.patients.find(patient => patient.id === selectedPatientId) ??
    filteredPatients[0] ??
    data.patients[0];
  const activePatients = data.patients.filter(patient => patient.status === PatientStatus.ACTIVE);
  const fiscalPending = data.patients.filter(patient => !patient.taxId || !patient.fiscalName || !patient.fiscalAddress).length;
  const contactPending = data.patients.filter(patient => !patient.email).length;
  const patientsWithFutureAppointment = new Set(
    data.appointments
      .filter(appointment => appointment.startsAt >= new Date() && appointment.status !== AppointmentStatus.CANCELLED)
      .map(appointment => appointment.patientId)
  );
  const openPipelineCents = data.patients
    .filter(patient => patient.status === PatientStatus.NEW_LEAD || patient.status === PatientStatus.OPEN_BUDGET)
    .reduce((sum, patient) => sum + patient.estimatedValue, 0);

  return (
    <>
      <ViewHead title="Pacientes" subtitle="Registro maestro: altas, bajas, modificaciones y ficha 360 del paciente." />
      <section className="patient-registry-hero">
        <MiniPipeline label="Activos" value={data.patients.filter(patient => patient.status === PatientStatus.ACTIVE).length} accent="accent-green" />
        <MiniPipeline label="Nuevos" value={data.patients.filter(patient => patient.status === PatientStatus.NEW_LEAD).length} accent="accent-blue" />
        <MiniPipeline label="Presupuesto" value={data.patients.filter(patient => patient.status === PatientStatus.OPEN_BUDGET).length} accent="accent-purple" />
        <MiniPipeline label="Baja/Inactivos" value={data.patients.filter(patient => patient.status === PatientStatus.INACTIVE).length} accent="accent-red" />
      </section>
      <section className="patient-command-strip" aria-label="Calidad del registro de pacientes">
        <div>
          <span>Ficha saneada</span>
          <strong>{Math.max(0, data.patients.length - fiscalPending)}</strong>
          <small>{fiscalPending} con fiscal pendiente</small>
        </div>
        <div>
          <span>Con cita futura</span>
          <strong>{patientsWithFutureAppointment.size}</strong>
          <small>{Math.max(0, activePatients.length - patientsWithFutureAppointment.size)} activos sin agenda</small>
        </div>
        <div>
          <span>Contacto incompleto</span>
          <strong>{contactPending}</strong>
          <small>Email o canal pendiente</small>
        </div>
        <div>
          <span>Pipeline paciente</span>
          <strong>{formatMoney(openPipelineCents)}</strong>
          <small>leads y presupuestos abiertos</small>
        </div>
      </section>
      <section className="card pad patient-registry-toolbar">
        <form className="patient-search" action="/">
          <input type="hidden" name="view" value="patients" />
          <label className="field">
            <span>Buscar paciente</span>
            <input name="q" defaultValue={query ?? ""} placeholder="Nombre, telefono, email, DNI, tratamiento..." />
          </label>
          <button className="button" type="submit">Buscar</button>
          {query ? <Link className="button ghost" href="/?view=patients">Limpiar</Link> : null}
        </form>
        <Link className="button primary" href="/?view=patients#new-patient">
          <Icon name="plus" />
          Alta paciente
        </Link>
      </section>
      {data.patients.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavia no hay pacientes"
          hint="Crea el primer paciente con el formulario de abajo o espera a que Clara capture un lead."
        />
      ) : (
        <section className="patient-registry-layout">
          <div className="card table-card patient-master-list">
            <div style={{ overflow: "auto" }}>
              <table className="data-table patient-table">
                <thead>
                  <tr><th>Paciente</th><th>Contacto</th><th>Estado</th><th>Proxima cita</th><th>Tratamiento</th><th>Valor</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {filteredPatients.map(patient => {
                    const patientAppointments = appointmentsByPatientId.get(patient.id) ?? [];
                    const nextAppointment = patientAppointments
                      .filter(appointment => appointment.startsAt >= new Date() && appointment.status !== AppointmentStatus.CANCELLED)
                      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
                    return (
                      <tr key={patient.id} className={selectedPatient?.id === patient.id ? "selected-row" : undefined}>
                        <td data-label="Paciente">
                          <strong>{patient.name}</strong>
                          <br />
                          <span className="muted-text">{patient.taxId || "Fiscal pendiente"}</span>
                        </td>
                        <td data-label="Contacto">{patient.phone}<br /><span className="muted-text">{patient.email || "Email pendiente"}</span></td>
                        <td data-label="Estado"><Pill tone={patientStatusTone(patient.status)}>{patientStatusLabel(patient.status)}</Pill></td>
                        <td data-label="Proxima cita">{nextAppointment ? formatDateTime(nextAppointment.startsAt) : "Sin cita futura"}</td>
                        <td data-label="Tratamiento">{patient.treatmentNeed || "Pendiente"}</td>
                        <td data-label="Valor">{formatMoney(patient.estimatedValue)}</td>
                        <td data-label="Acciones">
                          <div className="table-actions">
                            <Link className="button ghost" href={`/?view=patients&patient=${patient.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>
                              Abrir ficha
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
          </div>
          {selectedPatient ? (
            <PatientRecordPanel
              patient={selectedPatient}
              appointments={appointmentsByPatientId.get(selectedPatient.id) ?? []}
              invoices={invoicesByPatientId.get(selectedPatient.id) ?? []}
            />
          ) : null}
        </section>
      )}
      <section className="card pad appointment-history-panel">
        <PanelHead
          icon="calendar"
          title="Historial de citas"
          subtitle="Altas, modificaciones, cancelaciones y emails registrados en el SaaS."
        />
        {data.appointments.length === 0 ? (
          <p className="empty-note">Todavia no hay citas registradas.</p>
        ) : (
          <div className="appointment-history-list">
            {data.patients.map(patient => {
              const patientAppointments = (appointmentsByPatientId.get(patient.id) ?? []).sort(
                (a, b) => b.startsAt.getTime() - a.startsAt.getTime()
              );
              if (patientAppointments.length === 0) return null;

              return (
                <article className="appointment-history-patient" key={patient.id}>
                  <header>
                    <div>
                      <strong>{patient.name}</strong>
                      <span>{patient.phone}{patient.email ? ` · ${patient.email}` : ""}</span>
                    </div>
                    <Pill tone="purple">{patientAppointments.length} cita{patientAppointments.length === 1 ? "" : "s"}</Pill>
                  </header>
                  <div className="appointment-history-items">
                    {patientAppointments.map(appointment => {
                      const logs = appointmentLogsByAppointmentId.get(appointment.id) ?? [];
                      return (
                        <div className="appointment-history-item" key={appointment.id}>
                          <div className="appointment-history-main">
                            <div>
                              <strong>{appointment.title}</strong>
                              <span>{formatDateTime(appointment.startsAt)} · {appointment.durationMinutes} min</span>
                              <span>
                                {appointment.provider?.name ?? "Doctor pendiente"} · {appointment.operatory?.name ?? "Gabinete pendiente"}
                              </span>
                            </div>
                            <div className="appointment-history-status">
                              <Pill tone={appointmentStatusTone(appointment.status)}>{appointmentStatusLabel(appointment.status)}</Pill>
                              {appointment.createdByAi ? <Pill tone="blue">Clara</Pill> : <Pill tone="green">Recepcion</Pill>}
                            </div>
                          </div>
                          {logs.length > 0 ? (
                            <div className="appointment-history-events">
                              {logs.map(log => (
                                <div className="appointment-history-event" key={log.id}>
                                  <span>{formatAppointmentAuditAction(log.action, log.metadata)}</span>
                                  <time>{formatDateTime(log.createdAt)}</time>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="empty-note small">Sin eventos de auditoria asociados a esta cita.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <PatientForm />
    </>
  );
}

function PatientRecordPanel({
  patient,
  appointments,
  invoices
}: {
  patient: Awaited<ReturnType<typeof getDashboardData>>["patients"][number];
  appointments: Awaited<ReturnType<typeof getDashboardData>>["appointments"];
  invoices: Awaited<ReturnType<typeof getDashboardData>>["invoices"];
}) {
  const sortedAppointments = [...appointments].sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const activeAppointments = appointments.filter(appointment => appointment.status !== AppointmentStatus.CANCELLED);
  const lastAppointment = sortedAppointments[0];

  return (
    <aside className="card pad patient-record-panel">
      <header className="patient-record-header">
        <div className="avatar large">{getInitials(patient.name)}</div>
        <div>
          <p className="eyebrow">Ficha 360</p>
          <h2>{patient.name}</h2>
          <p>{patient.phone}{patient.email ? ` · ${patient.email}` : ""}</p>
        </div>
        <Pill tone={patientStatusTone(patient.status)}>{patientStatusLabel(patient.status)}</Pill>
      </header>
      <nav className="patient-record-tabs" aria-label="Secciones de ficha">
        <span className="active">Resumen</span>
        <span>Citas</span>
        <span>Tratamientos</span>
        <span>Presupuestos</span>
        <span>Facturas</span>
        <span>Clinico</span>
        <span>Documentos</span>
      </nav>
      <div className="patient-record-grid">
        <div><span>Ultima cita</span><strong>{lastAppointment ? formatDateTime(lastAppointment.startsAt) : "Sin citas"}</strong></div>
        <div><span>Citas activas</span><strong>{activeAppointments.length}</strong></div>
        <div><span>Valor estimado</span><strong>{formatMoney(patient.estimatedValue)}</strong></div>
        <div><span>Facturas</span><strong>{invoices.length}</strong></div>
      </div>
      <section className="patient-record-section">
        <h3>Datos personales</h3>
        <dl>
          <div><dt>Nombre fiscal</dt><dd>{patient.fiscalName || "Pendiente"}</dd></div>
          <div><dt>NIF/CIF</dt><dd>{patient.taxId || "Pendiente"}</dd></div>
          <div><dt>Direccion fiscal</dt><dd>{patient.fiscalAddress || "Pendiente"}</dd></div>
          <div><dt>Fuente</dt><dd>{patient.source || "Pendiente"}</dd></div>
        </dl>
      </section>
      <section className="patient-record-section">
        <h3>Vida clinica</h3>
        <dl>
          <div><dt>Tratamiento activo</dt><dd>{patient.treatmentNeed || "Pendiente"}</dd></div>
          <div><dt>Alergias</dt><dd>Pendiente de registrar</dd></div>
          <div><dt>Enfermedades</dt><dd>Pendiente de registrar</dd></div>
          <div><dt>Medicación</dt><dd>Pendiente de registrar</dd></div>
        </dl>
      </section>
      <section className="patient-record-section">
        <h3>Actividad reciente</h3>
        {sortedAppointments.length ? (
          <div className="patient-record-list">
            {sortedAppointments.slice(0, 4).map(appointment => (
              <article key={appointment.id}>
                <strong>{appointment.title}</strong>
                <span>{formatDateTime(appointment.startsAt)} · {appointment.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note small">Sin actividad clinica registrada.</p>
        )}
      </section>
      <section className="patient-record-section">
        <h3>Facturacion y documentos</h3>
        {invoices.length ? (
          <div className="patient-record-list">
            {invoices.slice(0, 3).map(invoice => (
              <article key={invoice.id}>
                <strong>{invoice.number} · {formatMoney(invoice.amountCents)}</strong>
                <span>{invoice.treatmentName} · {invoice.status}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-note small">Sin facturas ni documentos asociados.</p>
        )}
      </section>
    </aside>
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

function PatientIntakesPanel({
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

function TasksView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const groups: Array<[string, string]> = [["OVERDUE", "Vencida"], ["PENDING", "Pendiente"], ["SCHEDULED", "Programada"], ["COMPLETED", "Completada"]];
  return (
    <>
      <ViewHead title="Colas de trabajo" subtitle="Tareas que Clara crea cuando necesita recepcion, doctor o administracion." />
      <div className="board">
        {groups.map(([status, label]) => (
          <section className="board-column" key={status}>
            <h3>{label}<span>{data.tasks.filter(task => task.status === status).length}</span></h3>
            {data.tasks.filter(task => task.status === status).length === 0 ? (
              <p className="empty-note">Nada en esta cola.</p>
            ) : null}
            {data.tasks.filter(task => task.status === status).map(task => (
              <article className="work-card" key={task.id}>
                <strong>{task.title}</strong>
                <p>{task.type} · {task.dueAt ? formatDate(task.dueAt) : "sin fecha"} · {task.priority}</p>
                {task.status !== "COMPLETED" ? (
                  <form action={completeTaskAction}>
                    <input type="hidden" name="taskId" value={task.id} />
                    <button className="button" type="submit">Completar</button>
                  </form>
                ) : null}
              </article>
            ))}
          </section>
        ))}
      </div>
      <TaskForm data={data} />
    </>
  );
}

function AgentView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const sessions = data.agentSessions;
  const resolved = sessions.filter(session => !session.escalated).length;
  const resolutionRate = sessions.length > 0 ? Math.round((resolved / sessions.length) * 100) : null;
  const avgLatency =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, session) => sum + (session.latencyMs ?? 0), 0) / sessions.length)
      : null;

  return (
    <>
      <ViewHead title="Recepcionista IA" subtitle={`${data.tenant.assistantName} atiende voz, WhatsApp, SMS y web con protocolos dentales.`} />
      <section className="card pad assistant-control">
        <div className="card-title">
          <span className="tile-icon accent-green"><Icon name="bot" /></span>
          <div><h2>Estado del asistente</h2><p>{data.tenant.assistantEnabled ? "Activo 24/7" : "Pausado"}</p></div>
        </div>
        <form action={toggleAssistantAction}>
          <input type="hidden" name="view" value="agent" />
          <button className="button primary" type="submit">{data.tenant.assistantEnabled ? "Pausar asistente" : "Activar asistente"}</button>
        </form>
      </section>
      <div className="grid three" style={{ marginTop: 14 }}>
        <Tile
          icon="task"
          label="Resolucion sin humano"
          value={resolutionRate === null ? "—" : `${resolutionRate}%`}
          note={`${sessions.length} sesiones registradas`}
          accent="accent-green"
        />
        <Tile
          icon="bot"
          label="Latencia media"
          value={avgLatency === null ? "—" : `${avgLatency} ms`}
          note="respuesta del agente"
          accent="accent-purple"
        />
        <Tile
          icon="inbox"
          label="Escaladas a humano"
          value={sessions.filter(session => session.escalated).length}
          note="urgencias y derivaciones"
          accent="accent-orange"
        />
      </div>
      <section className="card pad agent-demo" style={{ marginTop: 14 }}>
        <PanelHead
          icon="bot"
          title="Demo de recepcionista entrenada"
          subtitle="Simula WhatsApp con conocimiento de sedes, tratamientos, precios, financiacion, RGPD y escalado clinico."
        />
        <InteractiveAgentDemo saveAction={saveInteractiveDemoAction} />
        <div className="agent-demo-grid agent-demo-reference">
          <div className="knowledge-panel">
            <h3>Base de conocimiento cargada</h3>
            <div className="knowledge-list">
              <div>
                <strong>Sedes</strong>
                <span>{demoKnowledge.clinic.locations.join(" · ")}</span>
              </div>
              <div>
                <strong>Horario</strong>
                <span>{demoKnowledge.clinic.hours}</span>
              </div>
              <div>
                <strong>Financiacion</strong>
                <span>{demoKnowledge.financing.join(" ")}</span>
              </div>
              <div>
                <strong>Guardrails</strong>
                <span>{demoKnowledge.guardrails.join(" ")}</span>
              </div>
            </div>
            <div className="treatment-chips" aria-label="Tratamientos de demo">
              {demoKnowledge.treatments.map(treatment => (
                <span key={treatment.name}>
                  <strong>{treatment.name}</strong>
                  {treatment.price}
                </span>
              ))}
            </div>
          </div>
          <div className="scenario-grid">
            <div className="scenario-grid-title">
              <h3>Demos cerradas para CRM</h3>
              <p>Crean directamente conversacion, cita propuesta o tarea de urgencia.</p>
            </div>
            {demoScenarios.map(scenario => (
              <form action={runAgentDemoAction} className="scenario-card" key={scenario.id}>
                <input type="hidden" name="scenario" value={scenario.id} />
                <div>
                  <span className={scenario.escalated ? "scenario-badge urgent" : "scenario-badge"}>{scenario.intent}</span>
                  <h3>{scenario.title}</h3>
                  <p>{scenario.prompt}</p>
                </div>
                <div className="scenario-result">
                  <strong>{scenario.outcome}</strong>
                  <span>{scenario.impact}</span>
                </div>
                <button className="button primary" type="submit">
                  <Icon name="bot" />
                  Registrar caso
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>
      <section className="card pad" style={{ marginTop: 14 }}>
        <PanelHead icon="inbox" title="Canal web en vivo" subtitle="Widget publico conectado al agente. Compartelo o incrustalo en la web de la clinica." />
        <p>
          <a href={`/widget/${data.tenant.slug}`} target="_blank" rel="noreferrer">
            /widget/{data.tenant.slug}
          </a>
        </p>
        <p style={{ color: "var(--muted)" }}>
          Webhooks entrantes por canal: /api/webhooks/{data.tenant.slug}/whatsapp · sms · voice · web
        </p>
        <p>
          <a href={`/demo-whatsapp/${data.tenant.slug}`} target="_blank" rel="noreferrer">
            Abrir demo tipo WhatsApp
          </a>
        </p>
        <p style={{ color: "var(--muted)" }}>
          WhatsApp Cloud API real: /api/whatsapp/meta · usa WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN,
          WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_DEMO_TENANT_SLUG.
        </p>
      </section>
      {sessions.length > 0 ? (
        <section className="card pad" style={{ marginTop: 14 }}>
          <PanelHead icon="bot" title="Ultimas decisiones del agente" subtitle="Log de sesiones con intencion detectada y resultado." />
          {sessions.slice(0, 6).map(session => (
            <div className="compact-row" key={session.id}>
              <strong>{session.intent}</strong>
              <span>
                {session.outcome} · {session.latencyMs ?? 0} ms · {formatDateTime(session.createdAt)}
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

function AiReviewView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const escalatedSessions = data.agentSessions.filter(session => session.escalated);
  const pendingIntakes = data.patientIntakes.filter(intake => intake.status === PatientIntakeStatus.DUPLICATE_REVIEW || intake.status === PatientIntakeStatus.CAPTURED);

  return (
    <>
      <ViewHead title="Revision humana de IA" subtitle="Bandeja de validacion para sugerencias, escalados y pre-fichas capturadas por Clara." />
      <section className="module-grid review-grid">
        <div className="card pad">
          <PanelHead icon="aiReview" title="Sugerencias pendientes" subtitle="Casos donde la IA pide validacion antes de cerrar el circuito." />
          <div className="review-list">
            {(escalatedSessions.length ? escalatedSessions : data.agentSessions.slice(0, 4)).map(session => (
              <article className="review-item" key={session.id}>
                <div>
                  <Pill tone={session.escalated ? "red" : "orange"}>{session.escalated ? "Escalado" : "Validar"}</Pill>
                  <h3>{session.intent}</h3>
                  <p>{session.outcome}</p>
                </div>
                <div className="review-actions">
                  <button className="button ghost" type="button" disabled>Editar</button>
                  <button className="button primary" type="button" disabled>Aceptar</button>
                </div>
              </article>
            ))}
            {data.agentSessions.length === 0 ? (
              <p className="empty-note">Sin sesiones para revisar.</p>
            ) : null}
          </div>
        </div>
        <aside className="card pad clinical-editor">
          <PanelHead icon="file" title="Nota sugerida" subtitle="Formato editable antes de guardar en historia clinica." />
          <div className="editor-toolbar" aria-label="Herramientas de texto">
            <button className="icon-button" type="button" aria-label="Negrita" disabled>B</button>
            <button className="icon-button" type="button" aria-label="Cursiva" disabled>I</button>
            <button className="icon-button" type="button" aria-label="Lista" disabled><Icon name="task" /></button>
          </div>
          <div className="note-preview">
            <strong>Motivo de consulta</strong>
            <p>Paciente solicita valoracion inicial. Clara detecta interes comercial y recomienda confirmacion humana antes de propuesta economica.</p>
            <strong>Accion recomendada</strong>
            <p>Contactar por WhatsApp, verificar disponibilidad y asociar tratamiento tentativo.</p>
          </div>
          <div className="review-actions">
            <button className="button ghost" type="button" disabled>Rechazar con motivo</button>
            <button className="button primary" type="button" disabled>Aceptar sugerencia</button>
          </div>
        </aside>
      </section>
      <section className="card pad">
        <PanelHead icon="users" title="Pre-fichas para validar" subtitle="Pacientes creados desde canales digitales antes de fusionar con el registro maestro." />
        <div className="dense-list">
          {pendingIntakes.slice(0, 6).map(intake => (
            <div className="dense-row" key={intake.id}>
              <div>
                <strong>{intake.name || "Nombre pendiente"}</strong>
                <span>{intake.phone || intake.email || intake.accessCode}</span>
              </div>
              <span>{intake.treatmentNeed || "Motivo pendiente"}</span>
              <Pill tone={patientIntakeStatusTone(intake.status)}>{patientIntakeStatusLabel(intake.status)}</Pill>
            </div>
          ))}
          {pendingIntakes.length === 0 ? <p className="empty-note">No hay pre-fichas pendientes de revision.</p> : null}
        </div>
      </section>
    </>
  );
}

function ClinicView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const today = new Date().toISOString().slice(0, 10);
  const todaysAppointments = data.appointments.filter(appointment => appointment.startsAt.toISOString().startsWith(today));
  const activeEncounters = todaysAppointments.length ? todaysAppointments : data.appointments.slice(0, 5);
  const urgentTasks = data.tasks.filter(task => task.priority === TaskPriority.HIGH || task.priority === TaskPriority.CRITICAL);

  return (
    <>
      <ViewHead title="Clinica" subtitle="Encuentros del dia, workspace medico y alertas operativas." />
      <div className="clinical-strip">
        <MiniPipeline label="Citas hoy" value={todaysAppointments.length} accent="accent-blue" />
        <MiniPipeline label="En espera" value={Math.max(0, activeEncounters.length - 1)} accent="accent-orange" />
        <MiniPipeline label="Gabinetes" value={data.operatories.length} accent="accent-green" />
        <MiniPipeline label="Alertas" value={urgentTasks.length} accent="accent-red" />
      </div>
      <section className="module-grid clinic-layout">
        <div className="card table-card">
          <div className="list-header">
            <div>
              <h2>Encuentros del dia</h2>
              <p>Recepcion, gabinete, doctor y salida en una tabla compacta.</p>
            </div>
            <button className="button primary" type="button" disabled>Crear</button>
          </div>
          <div style={{ overflow: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>Hora</th><th>Paciente</th><th>Procedimiento</th><th>Doctor</th><th>Gabinete</th><th>Estado</th><th /></tr>
              </thead>
              <tbody>
                {activeEncounters.map(appointment => (
                  <tr key={appointment.id}>
                    <td>{formatTime(appointment.startsAt)}</td>
                    <td><strong>{appointment.patient.name}</strong><br /><span className="muted-text">{appointment.patient.phone}</span></td>
                    <td>{appointment.treatment?.name ?? appointment.title}</td>
                    <td>{appointment.provider?.name ?? "Pendiente"}</td>
                    <td>{appointment.operatory?.name ?? "Sin gabinete"}</td>
                    <td><Pill tone={appointmentStatusTone(appointment.status)}>{appointmentStatusLabel(appointment.status)}</Pill></td>
                    <td><button className="button ghost" type="button" disabled>Abrir encuentro</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card pad workspace-preview">
          <PanelHead icon="clinic" title="Workspace clinico" subtitle="Base visual para evolucion, procedimientos y cierre firmado." />
          <div className="patient-alert">
            <Icon name="activity" />
            <div>
              <strong>Alerta medica</strong>
              <span>Hipertension, alergias y medicacion pendientes de registrar.</span>
            </div>
          </div>
          <div className="clinical-note-grid">
            <section>
              <h3>Motivo de consulta</h3>
              <p>Dolor agudo en molar inferior derecho desde hace 48h.</p>
            </section>
            <section>
              <h3>Exploracion</h3>
              <p>Campos preparados para evolucion clinica, hallazgos y pruebas.</p>
            </section>
          </div>
          <div className="toolbar">
            <button className="button" type="button" disabled>Guardar borrador</button>
            <button className="button primary" type="button" disabled>Firmar y cerrar</button>
          </div>
        </aside>
      </section>
    </>
  );
}

function CrmView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const leadPatients = data.patients.filter(patient => patient.status === PatientStatus.NEW_LEAD || patient.status === PatientStatus.OPEN_BUDGET);
  const proposedAppointments = data.appointments.filter(appointment => appointment.status === AppointmentStatus.PROPOSED || appointment.status === AppointmentStatus.REQUESTED);
  const humanRequired = data.conversations.filter(conversation => conversation.status === "HUMAN_REQUIRED" || conversation.unread);
  const highestLead = [...leadPatients].sort((a, b) => b.estimatedValue - a.estimatedValue)[0];
  const conversionRate = data.patients.length > 0
    ? Math.round((data.patients.filter(patient => patient.status === PatientStatus.ACTIVE).length / data.patients.length) * 100)
    : 0;
  const columns = [
    { label: "Nuevo", status: PatientStatus.NEW_LEAD },
    { label: "Contactado", status: PatientStatus.OPEN_BUDGET },
    { label: "Cita reservada", status: PatientStatus.ACTIVE },
    { label: "Urgente", status: PatientStatus.URGENT }
  ];

  return (
    <>
      <ViewHead title="CRM" subtitle="Bandeja omnicanal, leads, pipeline comercial y campanas de comunicacion." />
      <div className="grid kpis">
        <Tile icon="crm" label="Leads abiertos" value={leadPatients.length} note="nuevos y presupuestos" accent="accent-blue" />
        <Tile icon="inbox" label="Mensajes sin leer" value={data.metrics.unreadConversations} note="requieren respuesta" accent="accent-orange" />
        <Tile icon="calendar" label="Citas propuestas" value={proposedAppointments.length} note="desde canales digitales" accent="accent-purple" />
        <Tile icon="euro" label="Valor en pipeline" value={formatMoney(leadPatients.reduce((sum, patient) => sum + patient.estimatedValue, 0))} note="estimacion comercial" accent="accent-green" />
      </div>
      <section className="crm-command-center">
        <div className="crm-command-main">
          <PanelHead icon="activity" title="Sala comercial" subtitle="Priorizacion de llamadas, presupuestos y conversaciones humanas." />
          <div className="crm-action-list">
            <div>
              <span>Primera accion</span>
              <strong>{humanRequired[0]?.patient?.name ?? highestLead?.name ?? "Sin bloqueo comercial"}</strong>
              <small>{humanRequired[0]?.messages.at(-1)?.body ?? highestLead?.treatmentNeed ?? "La bandeja comercial esta al dia."}</small>
            </div>
            <div>
              <span>Mayor oportunidad</span>
              <strong>{highestLead ? formatMoney(highestLead.estimatedValue) : "0,00 €"}</strong>
              <small>{highestLead?.name ?? "No hay leads abiertos"}</small>
            </div>
            <div>
              <span>Citas a confirmar</span>
              <strong>{proposedAppointments.length}</strong>
              <small>coordinar disponibilidad y gabinete</small>
            </div>
          </div>
        </div>
        <div className="crm-conversion-panel">
          <span>Conversion global</span>
          <strong>{conversionRate}%</strong>
          <i style={{ width: `${conversionRate}%` }} />
          <small>{data.patients.filter(patient => patient.status === PatientStatus.ACTIVE).length} activos de {data.patients.length} registros</small>
        </div>
      </section>
      <section className="crm-board">
        {columns.map(column => {
          const patients = data.patients.filter(patient => patient.status === column.status).slice(0, 5);
          return (
            <div className="kanban-column" key={column.label}>
              <header>
                <span>{column.label}</span>
                <strong>{patients.length}</strong>
              </header>
              {patients.map(patient => (
                <article className="lead-card" key={patient.id}>
                  <div>
                    <strong>{patient.name}</strong>
                    <span>{patient.treatmentNeed || "Tratamiento pendiente"}</span>
                  </div>
                  <footer>
                    <span>{formatMoney(patient.estimatedValue)}</span>
                    <span>{patient.source || "Manual"}</span>
                  </footer>
                </article>
              ))}
              {patients.length === 0 ? <p className="empty-note">Arrastrar aqui para clasificar.</p> : null}
            </div>
          );
        })}
      </section>
      <section className="module-grid crm-omni">
        <div className="card pad">
          <PanelHead icon="inbox" title="Mensajes" subtitle="Resumen de bandeja omnicanal." />
          {data.conversations.slice(0, 5).map(conversation => (
            <div className="compact-row" key={conversation.id}>
              <div>
                <strong>{conversation.patient?.name ?? "Paciente sin ficha"}</strong>
                <span>{conversation.messages.at(-1)?.body ?? conversation.intent ?? "Sin mensajes"}</span>
              </div>
              <Pill tone={conversation.status === "HUMAN_REQUIRED" ? "red" : "green"}>{conversation.channel}</Pill>
            </div>
          ))}
        </div>
        <div className="card pad">
          <PanelHead icon="radio" title="Campanas de comunicacion" subtitle="Recordatorios, post-tratamiento y pagos." />
          <div className="dense-list">
            {["Recordatorio de cita 24h", "Recuperacion de presupuesto", "Post-tratamiento", "Pago pendiente"].map((campaign, index) => (
              <div className="dense-row" key={campaign}>
                <div><strong>{campaign}</strong><span>{index % 2 === 0 ? "WhatsApp" : "Email"}</span></div>
                <span>{[68, 42, 31, 19][index]}% conversion</span>
                <Pill tone={index === 0 ? "green" : "blue"}>{index === 0 ? "Activa" : "Lista"}</Pill>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function DocumentsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const unsignedPatients = data.patients.filter(patient => patient.consents.length === 0);
  const fiscalDocuments = data.invoices.length;
  const clinicalDocuments = data.patients.length;
  const pendingSignatureRate = data.patients.length > 0 ? Math.round((unsignedPatients.length / data.patients.length) * 100) : 0;

  return (
    <>
      <ViewHead title="Documentos" subtitle="Biblioteca documental, consentimientos, lotes de firma y documentos fiscales." />
      <div className="grid kpis">
        <Tile icon="documents" label="Documentos activos" value={data.patients.length + data.invoices.length} note="historias, facturas y consentimientos" accent="accent-blue" />
        <Tile icon="aiReview" label="Pendientes de firma" value={unsignedPatients.length} note="requieren accion" accent="accent-orange" />
        <Tile icon="file" label="Plantillas" value="24" note="biblioteca clinica" accent="accent-purple" />
      </div>
      <section className="module-command-strip document-command-strip" aria-label="Control documental">
        <div>
          <span>Historias clinicas</span>
          <strong>{clinicalDocuments}</strong>
          <small>registros vinculados</small>
        </div>
        <div>
          <span>Fiscal</span>
          <strong>{fiscalDocuments}</strong>
          <small>facturas y justificantes</small>
        </div>
        <div>
          <span>Firma pendiente</span>
          <strong>{pendingSignatureRate}%</strong>
          <small>{unsignedPatients.length} pacientes sin consentimiento</small>
        </div>
        <div>
          <span>Lotes listos</span>
          <strong>{unsignedPatients.length > 0 ? Math.ceil(unsignedPatients.length / 4) : 0}</strong>
          <small>envio agrupado preparado</small>
        </div>
      </section>
      <section className="module-workbench documents-workbench">
        <div className="card table-card">
          <div className="list-header">
            <div><h2>Biblioteca documental</h2><p>Documentos vinculados a paciente, tratamiento y facturacion.</p></div>
            <button className="button primary" type="button" disabled>Generar documento</button>
          </div>
          <div className="responsive-table-wrap">
            <table className="data-table responsive-table document-table">
              <thead>
                <tr><th>Documento</th><th>Paciente</th><th>Tipo</th><th>Estado</th><th>Fecha</th><th /></tr>
              </thead>
              <tbody>
                {data.patients.slice(0, 8).map((patient, index) => (
                  <tr key={patient.id}>
                    <td data-label="Documento"><strong>{index % 2 === 0 ? "Consentimiento informado" : "Presupuesto clinico"}</strong><br /><span className="muted-text">Historia clinica v2.1</span></td>
                    <td data-label="Paciente">{patient.name}</td>
                    <td data-label="Tipo">{index % 2 === 0 ? "Consentimiento" : "Presupuesto"}</td>
                    <td data-label="Estado"><Pill tone={patient.consents.length ? "green" : "orange"}>{patient.consents.length ? "Firmado" : "Pendiente"}</Pill></td>
                    <td data-label="Fecha">{formatDate(patient.createdAt)}</td>
                    <td data-label="Accion"><button className="button ghost" type="button" disabled>Enviar a firmar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card pad operation-panel">
          <PanelHead icon="file" title="Circuito de firma" subtitle="Preparado para consentimiento, RGPD y presupuesto." />
          <div className="step-list">
            <div><span>01</span><strong>Generar documento</strong><small>Plantilla clinica o fiscal</small></div>
            <div><span>02</span><strong>Enviar a paciente</strong><small>WhatsApp, email o tablet</small></div>
            <div><span>03</span><strong>Archivar evidencia</strong><small>Fecha, canal y version</small></div>
          </div>
          <button className="button primary" type="button" disabled>Preparar lote de firma</button>
        </aside>
      </section>
    </>
  );
}

function InventoryView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const rows = [
    { name: "Guantes nitrilo M", category: "Clinico", units: 12, minimum: 6, state: "Optimo", supplier: "Dental Stock" },
    { name: "Composite A2", category: "Operatoria", units: 8, minimum: 8, state: "Vigilar", supplier: "Deposito Dental Murcia" },
    { name: "Anestesia artocaina", category: "Cirugia", units: 5, minimum: 10, state: "Bajo", supplier: "Dental Stock" },
    { name: "Cubetas impresion", category: "Protesis", units: 21, minimum: 6, state: "Optimo", supplier: "ProLab" },
    { name: "Mascarillas FFP2", category: "General", units: 18, minimum: 10, state: "Optimo", supplier: "Clinica Supply" }
  ];
  const lowRows = rows.filter(row => row.units <= row.minimum);
  const consumptionRisk = Math.min(100, Math.round((data.appointments.length / Math.max(1, rows.reduce((sum, row) => sum + row.units, 0))) * 100));

  return (
    <>
      <ViewHead title="Inventario" subtitle="Resumen de stock, alertas, pedidos y materiales criticos de la clinica." />
      <div className="grid kpis">
        <Tile icon="inventory" label="Referencias" value={rows.length} note="inventario visible" accent="accent-blue" />
        <Tile icon="activity" label="Stock bajo" value={lowRows.length} note="requiere pedido" accent="accent-orange" />
        <Tile icon="calendar" label="Consumo previsto" value={data.appointments.length} note="segun agenda activa" accent="accent-green" />
      </div>
      <section className="module-command-strip inventory-command-strip" aria-label="Control de inventario">
        <div>
          <span>Reposicion</span>
          <strong>{lowRows.length}</strong>
          <small>referencias bajo minimo</small>
        </div>
        <div>
          <span>Riesgo consumo</span>
          <strong>{consumptionRisk}%</strong>
          <small>segun agenda y stock visible</small>
        </div>
        <div>
          <span>Proveedor critico</span>
          <strong>{lowRows[0]?.supplier ?? "Ninguno"}</strong>
          <small>{lowRows[0]?.name ?? "Stock estable"}</small>
        </div>
        <div>
          <span>Pedido sugerido</span>
          <strong>{lowRows.reduce((sum, row) => sum + Math.max(0, row.minimum * 2 - row.units), 0)}</strong>
          <small>unidades estimadas</small>
        </div>
      </section>
      <section className="module-grid inventory-layout">
        <div className="card table-card">
          <div className="list-header">
            <div><h2>Inventario detallado</h2><p>Vista compacta para recepcion y responsable de compras.</p></div>
            <button className="button primary" type="button" disabled>Crear pedido</button>
          </div>
          <div className="responsive-table-wrap">
            <table className="data-table responsive-table inventory-table">
              <thead><tr><th>Producto</th><th>Categoria</th><th>Unidades</th><th>Minimo</th><th>Proveedor</th><th>Estado</th><th /></tr></thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.name}>
                    <td data-label="Producto"><strong>{row.name}</strong></td>
                    <td data-label="Categoria">{row.category}</td>
                    <td data-label="Unidades">{row.units}</td>
                    <td data-label="Minimo">{row.minimum}</td>
                    <td data-label="Proveedor">{row.supplier}</td>
                    <td data-label="Estado"><Pill tone={row.state === "Bajo" ? "red" : row.state === "Vigilar" ? "orange" : "green"}>{row.state}</Pill></td>
                    <td data-label="Accion"><button className="button ghost" type="button" disabled>Historial</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="card pad">
          <PanelHead icon="archive" title="Pedido recomendado" subtitle="Modulo preparado para automatizar reposicion." />
          <div className="order-box">
            <strong>{lowRows[0]?.name ?? "Sin pedido urgente"}</strong>
            <span>{lowRows[0] ? `Solicitar ${Math.max(1, lowRows[0].minimum * 2 - lowRows[0].units)} unidades a ${lowRows[0].supplier}.` : "Stock dentro del umbral definido."}</span>
            <button className="button primary" type="button" disabled>Gestionar pedido</button>
          </div>
          <div className="supplier-list">
            {rows.slice(0, 4).map(row => (
              <div key={`${row.supplier}-${row.name}`}>
                <span>{row.supplier}</span>
                <strong>{row.name}</strong>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}

function LabView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const labRows = data.appointments.slice(0, 8);
  const delayedCount = labRows.filter((_, index) => index % 3 === 0).length;
  const inProgressCount = labRows.filter((_, index) => index % 3 !== 0 && index % 2 === 0).length;
  const receivedCount = Math.max(0, labRows.length - delayedCount - inProgressCount);
  const nextDelivery = [...labRows].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];

  return (
    <>
      <ViewHead title="Laboratorio" subtitle="Trabajos de laboratorio, protesis, fases, fechas comprometidas e incidencias." />
      <section className="module-command-strip lab-command-strip" aria-label="Control de laboratorio">
        <div>
          <span>En curso</span>
          <strong>{inProgressCount}</strong>
          <small>trabajos activos</small>
        </div>
        <div>
          <span>Demorados</span>
          <strong>{delayedCount}</strong>
          <small>requieren llamada a laboratorio</small>
        </div>
        <div>
          <span>Recibidos</span>
          <strong>{receivedCount}</strong>
          <small>listos para gabinete</small>
        </div>
        <div>
          <span>Proxima entrega</span>
          <strong>{nextDelivery ? formatDate(nextDelivery.startsAt) : "Sin fecha"}</strong>
          <small>{nextDelivery?.patient.name ?? "sin trabajos abiertos"}</small>
        </div>
      </section>
      <section className="lab-status-board" aria-label="Flujo de laboratorio">
        {["Prescripcion", "Enviado", "Fabricacion", "Recibido"].map((step, index) => (
          <div key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            <small>{[labRows.length, Math.max(0, labRows.length - delayedCount), inProgressCount, receivedCount][index]} casos</small>
          </div>
        ))}
      </section>
      <section className="card table-card">
        <div className="list-header">
          <div><h2>Trabajos de laboratorio</h2><p>Seguimiento por paciente, doctor y fase.</p></div>
          <button className="button primary" type="button" disabled>Nuevo trabajo</button>
        </div>
        <div className="responsive-table-wrap">
          <table className="data-table responsive-table lab-table">
            <thead><tr><th>ID</th><th>Paciente</th><th>Trabajo</th><th>Doctor</th><th>Entrega</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {labRows.map((appointment, index) => (
                <tr key={appointment.id}>
                  <td data-label="ID">LAB-{String(index + 24).padStart(3, "0")}</td>
                  <td data-label="Paciente"><strong>{appointment.patient.name}</strong></td>
                  <td data-label="Trabajo">{appointment.treatment?.name ?? "Trabajo protesico"}</td>
                  <td data-label="Doctor">{appointment.provider?.name ?? "Dr. pendiente"}</td>
                  <td data-label="Entrega">{formatDate(appointment.startsAt)}</td>
                  <td data-label="Estado"><Pill tone={index % 3 === 0 ? "red" : index % 2 === 0 ? "orange" : "green"}>{index % 3 === 0 ? "Demorado" : index % 2 === 0 ? "En curso" : "Recibido"}</Pill></td>
                  <td data-label="Accion"><button className="button ghost" type="button" disabled>Gestionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {labRows.length === 0 ? <p className="empty-note">Sin citas suficientes para generar seguimiento de laboratorio.</p> : null}
      </section>
    </>
  );
}

function TeamView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const activeProviders = data.providers.length;
  const activeOperatories = data.operatories.length;
  const appointmentLoad = data.appointments.filter(appointment => appointment.status !== AppointmentStatus.CANCELLED).length;
  const capacityScore = Math.min(100, Math.round((appointmentLoad / Math.max(1, activeProviders * 12)) * 100));

  return (
    <>
      <ViewHead title="Equipo" subtitle="Directorio, horarios, sedes y capacidad clinica disponible." />
      <section className="module-command-strip team-command-strip" aria-label="Capacidad de equipo">
        <div>
          <span>Profesionales</span>
          <strong>{activeProviders}</strong>
          <small>activos en agenda</small>
        </div>
        <div>
          <span>Gabinetes</span>
          <strong>{activeOperatories}</strong>
          <small>operativos</small>
        </div>
        <div>
          <span>Carga asistencial</span>
          <strong>{capacityScore}%</strong>
          <small>agenda sobre capacidad base</small>
        </div>
        <div>
          <span>Usuarios SaaS</span>
          <strong>{data.users.length}</strong>
          <small>perfiles con acceso</small>
        </div>
      </section>
      <section className="module-grid team-layout">
        <div className="card pad">
          <PanelHead icon="team" title="Directorio del equipo" subtitle="Usuarios y perfiles operativos." />
          <div className="staff-grid">
            {data.users.map(member => (
              <article className="staff-card" key={member.id}>
                <div className="avatar">{getInitials(member.name)}</div>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                <Pill tone={member.role === "OWNER" ? "purple" : "blue"}>{member.role}</Pill>
              </article>
            ))}
          </div>
        </div>
        <div className="card pad">
          <PanelHead icon="calendar" title="Horarios del equipo" subtitle="Base visual para disponibilidad por sede." />
          <div className="schedule-grid">
            {data.providers.map(provider => (
              <div className="schedule-row" key={provider.id}>
                <strong>{provider.name}</strong>
                <span>{provider.specialty}</span>
                <div><i style={{ width: `${Math.min(100, Math.max(18, capacityScore))}%` }} /></div>
              </div>
            ))}
            {data.providers.length === 0 ? <p className="empty-note">Sin profesionales activos configurados.</p> : null}
          </div>
          <div className="operatory-stack">
            {data.operatories.map(operatory => (
              <div key={operatory.id}>
                <span>{operatory.kind}</span>
                <strong>{operatory.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function AnalyticsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const conversion = data.patients.length > 0
    ? Math.round((data.patients.filter(patient => patient.status === PatientStatus.ACTIVE).length / data.patients.length) * 100)
    : 0;
  const unreadRate = data.conversations.length > 0 ? Math.round((data.metrics.unreadConversations / data.conversations.length) * 100) : 0;
  const recoveredRate = data.billing.pendingProductionCents > 0
    ? Math.round((data.metrics.recoveredCents / data.billing.pendingProductionCents) * 100)
    : 0;
  const openPipeline = data.patients
    .filter(patient => patient.status === PatientStatus.NEW_LEAD || patient.status === PatientStatus.OPEN_BUDGET)
    .reduce((sum, patient) => sum + patient.estimatedValue, 0);
  const executiveSignals = [
    { label: "Conversion", value: `${conversion}%`, width: conversion, tone: "green" as Tone },
    { label: "Bandeja pendiente", value: `${unreadRate}%`, width: unreadRate, tone: unreadRate > 25 ? "orange" as Tone : "blue" as Tone },
    { label: "Recuperacion IA", value: `${recoveredRate}%`, width: Math.min(100, recoveredRate), tone: "purple" as Tone }
  ];

  return (
    <>
      <ViewHead title="Analitica" subtitle="Cuadro ejecutivo de produccion, conversion, agenda y rendimiento por modulo." />
      <div className="grid kpis">
        <Tile icon="analytics" label="Conversion" value={`${conversion}%`} note="pacientes activos sobre base" accent="accent-green" />
        <Tile icon="calendar" label="Carga de agenda" value={data.appointments.length} note="citas registradas" accent="accent-blue" />
        <Tile icon="euro" label="Cobrado este mes" value={formatMoney(data.billing.collectedThisMonthCents)} note="facturacion real" accent="accent-purple" />
        <Tile icon="task" label="Pendiente" value={data.metrics.openTasks} note="colas abiertas" accent="accent-orange" />
      </div>
      <section className="analytics-command-center">
        <div className="card pad">
          <PanelHead icon="analytics" title="Senales ejecutivas" subtitle="Lectura rapida para direccion de clinica." />
          <div className="signal-list">
            {executiveSignals.map(signal => (
              <div className="signal-row" key={signal.label}>
                <div>
                  <strong>{signal.label}</strong>
                  <span>{signal.value}</span>
                </div>
                <i style={{ width: `${Math.max(4, signal.width)}%` }} />
                <Pill tone={signal.tone}>{signal.value}</Pill>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <PanelHead icon="crm" title="Embudo economico" subtitle="Valor pendiente por cerrar." />
          <div className="funnel-stack">
            <div><span>Pipeline</span><strong>{formatMoney(openPipeline)}</strong></div>
            <div><span>Pendiente cobro</span><strong>{formatMoney(data.billing.pendingCents)}</strong></div>
            <div><span>Produccion sin facturar</span><strong>{formatMoney(data.billing.pendingProductionCents)}</strong></div>
          </div>
        </div>
      </section>
      <section className="module-grid analytics-layout">
        <div className="card pad">
          <PanelHead icon="analytics" title="Ingresos y produccion" subtitle="Grafica compacta preparada para informes." />
          <div className="billing-bars tall">
            {data.billing.monthBuckets.map(bucket => {
              const max = Math.max(1, data.billing.maxTreatmentCents, bucket.emitidoCents, bucket.cobradoCents);
              return (
                <div className="billing-bar-col" key={bucket.key}>
                  <div className="billing-bar-pair">
                    <span className="billing-bar emitido" style={{ height: `${Math.max(8, (bucket.emitidoCents / max) * 100)}%` }} />
                    <span className="billing-bar cobrado" style={{ height: `${Math.max(8, (bucket.cobradoCents / max) * 100)}%` }} />
                  </div>
                  <span className="billing-bar-label">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card pad">
          <PanelHead icon="file" title="Constructor de informe" subtitle="Plantilla visual para reportes ANA-11." />
          <div className="report-builder">
            {["Agenda", "Pacientes", "Finanzas", "CRM", "Inventario"].map((module, index) => (
              <label key={module}>
                <input type="checkbox" defaultChecked={index < 3} disabled />
                <span>{module}</span>
              </label>
            ))}
            <button className="button primary" type="button" disabled>Guardar informe</button>
          </div>
        </div>
      </section>
    </>
  );
}

function AutomationsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const automationRows = [
    ["Recordatorio de cita 24h", "Cuando hay cita confirmada", "WhatsApp", data.tenant.assistantEnabled],
    ["Recuperar presupuesto", "Paciente con presupuesto abierto", "Email", true],
    ["Escalar urgencia", "Dolor agudo o traumatismo", "Tarea critica", true]
  ];
  const activeAutomationCount = automationRows.filter(([, , , active]) => Boolean(active)).length;
  const automationQueue = data.tasks.filter(task => task.status !== "COMPLETED").slice(0, 4);

  return (
    <>
      <ViewHead title="Automatizaciones" subtitle="Constructor visual de reglas para agenda, CRM, pagos y comunicacion." />
      <section className="module-command-strip automation-command-strip" aria-label="Estado de automatizaciones">
        <div>
          <span>Reglas activas</span>
          <strong>{activeAutomationCount}</strong>
          <small>de {automationRows.length} configuradas</small>
        </div>
        <div>
          <span>Cola interna</span>
          <strong>{automationQueue.length}</strong>
          <small>tareas abiertas enlazadas</small>
        </div>
        <div>
          <span>Canales</span>
          <strong>3</strong>
          <small>WhatsApp, email y tarea</small>
        </div>
        <div>
          <span>Clara</span>
          <strong>{data.tenant.assistantEnabled ? "Activa" : "Pausada"}</strong>
          <small>estado del asistente</small>
        </div>
      </section>
      <section className="automation-canvas">
        <div className="automation-list">
          {automationRows.map(([name, trigger, action, active]) => (
            <article className="automation-card" key={String(name)}>
              <header>
                <Icon name="automations" />
                <Pill tone={active ? "green" : "orange"}>{active ? "Activa" : "Pausada"}</Pill>
              </header>
              <h2>{name}</h2>
              <p>{trigger}</p>
              <footer>{action}</footer>
            </article>
          ))}
          <section className="card pad automation-log">
            <PanelHead icon="task" title="Ejecuciones recientes" subtitle="Auditoria visual de reglas y tareas." />
            {automationQueue.length === 0 ? (
              <p className="empty-note">No hay ejecuciones pendientes.</p>
            ) : (
              automationQueue.map(task => (
                <div className="compact-row" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.patient?.name ?? "Sin paciente"} · {task.type}</span>
                  </div>
                  <Pill tone={task.priority === TaskPriority.HIGH ? "red" : task.priority === TaskPriority.MEDIUM ? "orange" : "blue"}>{task.priority}</Pill>
                </div>
              ))
            )}
          </section>
        </div>
        <aside className="card pad automation-builder">
          <PanelHead icon="automations" title="Configurar accion" subtitle="Patron del constructor de automatizacion de referencia." />
          <Field label="Nombre de regla" name="automationName" defaultValue="Recordatorio de cita 24h" disabled />
          <label className="field"><span>Canal</span><select name="automationChannel" defaultValue="whatsapp" disabled><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="task">Tarea interna</option></select></label>
          <TextArea label="Mensaje" name="automationMessage" defaultValue="Hola, te recordamos tu cita de manana en la clinica." disabled />
          <div className="rule-flow" aria-label="Flujo de automatizacion">
            <div><span>Trigger</span><strong>Cita confirmada</strong></div>
            <div><span>Condicion</span><strong>24h antes</strong></div>
            <div><span>Accion</span><strong>WhatsApp</strong></div>
          </div>
          <button className="button primary" type="button" disabled>Guardar cambios del bloque</button>
        </aside>
      </section>
    </>
  );
}

function ImagingView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const selectedPatient = data.patients[0];
  return (
    <section className="radiology-view">
      <aside className="radiology-tools" aria-label="Herramientas de radiologia">
        {(["search", "filter", "activity", "plus", "file"] as IconName[]).map(icon => (
          <button className="icon-button" key={icon} type="button" aria-label={icon} disabled><Icon name={icon} /></button>
        ))}
      </aside>
      <div className="radiology-canvas">
        <div className="xray-frame">
          <div className="xray-screen">
            <span>RX</span>
            <strong>{selectedPatient?.name ?? "Paciente sin seleccionar"}</strong>
          </div>
          <div className="xray-thumbs">
            {[1, 2, 3, 4].map(item => <span key={item} />)}
          </div>
        </div>
      </div>
      <aside className="radiology-panel">
        <PanelHead icon="imaging" title="Visor radiologico" subtitle="Plantilla visual para DICOM, observaciones y diagnostico." />
        <div className="dense-list">
          <div className="dense-row"><div><strong>Paciente</strong><span>{selectedPatient?.name ?? "Pendiente"}</span></div><Pill>Activo</Pill></div>
          <div className="dense-row"><div><strong>Prueba</strong><span>Radiografia panoramica</span></div><span>20/10/23</span></div>
          <div className="dense-row"><div><strong>Informe</strong><span>Sin hallazgos bloqueantes</span></div><Pill tone="green">Optimo</Pill></div>
        </div>
        <button className="button primary" type="button" disabled>Anadir observacion</button>
      </aside>
    </section>
  );
}

function TreatmentsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <>
      <ViewHead title="Tratamientos" subtitle="Catalogo operativo que Clara puede explicar y agendar sin inventar precios." />
      {data.treatments.length === 0 ? (
        <EmptyState
          icon="tooth"
          title="Sin tratamientos configurados"
          hint="Anade el catalogo de tratamientos para que Clara pueda informar y agendar sin inventar precios."
        />
      ) : null}
      <div className="grid three">
        {data.treatments.map(treatment => (
          <article className="card pad" key={treatment.id}>
            <div className="card-head"><div className="card-title"><span className="tile-icon accent-green"><Icon name="tooth" /></span><div><h2>{treatment.name}</h2><p>{treatment.durationMinutes} min</p></div></div></div>
            <p><strong>Precio:</strong> {treatment.priceCents === null ? "Valoracion previa" : formatMoney(treatment.priceCents)}</p>
            <p style={{ color: "var(--muted)" }}>{treatment.rules}</p>
          </article>
        ))}
      </div>
      <TreatmentForm />
    </>
  );
}

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  LABORATORIO: "Laboratorio protesico",
  SUMINISTROS: "Suministros",
  NOMINAS: "Nominas",
  ALQUILER: "Alquiler",
  MARKETING: "Marketing",
  FORMACION: "Formacion",
  MANTENIMIENTO: "Mantenimiento",
  OTROS: "Otros"
};

const ELECTRONIC_STATUS_LABEL: Record<string, string> = {
  NOT_REQUIRED: "No aplica",
  READY: "Lista",
  PENDING: "Pendiente",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  PAID: "Pagada",
  FAILED: "Fallida"
};

const ELECTRONIC_STATUS_TONE: Record<string, Tone> = {
  NOT_REQUIRED: "blue",
  READY: "orange",
  PENDING: "orange",
  SENT: "purple",
  ACCEPTED: "green",
  REJECTED: "red",
  PAID: "green",
  FAILED: "red"
};

function BillingView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const { billing } = data;
  const maxMonthCents = Math.max(1, ...billing.monthBuckets.map(bucket => Math.max(bucket.emitidoCents, bucket.cobradoCents)));
  const maxForecastCents = Math.max(1, ...billing.forecastBuckets.map(bucket => bucket.amountCents));
  const invoiceStatusTone: Record<string, Tone> = {
    DRAFT: "blue",
    ISSUED: "purple",
    SENT: "blue",
    PAID: "green",
    OVERDUE: "red",
    CANCELLED: "red"
  };

  return (
    <>
      <ViewHead title="Facturacion" subtitle="Gestion financiera integral de la clinica." />

      <div className="grid kpis billing-kpis">
        <Tile icon="euro" label="Cobros pendientes" value={formatMoney(billing.pendingCents)} note={`${billing.pendingCount} factura(s) en circulacion`} accent="accent-blue" />
        <Tile icon="euro" label="Facturas vencidas" value={billing.overdueCount} note={billing.overdueCount > 0 ? "Requieren accion inmediata" : "Al dia"} accent="accent-red" />
        <Tile icon="euro" label="Cobrado este mes" value={formatMoney(billing.collectedThisMonthCents)} note="ultimos 30 dias" accent="accent-green" />
        <Tile icon="euro" label="Factura electronica" value={billing.electronicReadyCount} note={`${billing.electronicAcceptedCount} aceptadas · ${billing.electronicRejectedCount} incidencias`} accent="accent-purple" />
        <Tile icon="euro" label="Presupuestos pendientes" value={billing.openBudgetCount} note={`${formatMoney(billing.openBudgetCents)} en juego`} accent="accent-purple" />
        <Tile icon="euro" label="Gastos del periodo" value={formatMoney(billing.expensesThisMonthCents)} note="pagados este mes" accent="accent-orange" />
        <Tile icon="euro" label="Produccion sin facturar" value={formatMoney(billing.pendingProductionCents)} note="tratamientos presupuestados" accent="accent-blue" />
      </div>

      <section className="card pad billing-compliance">
        <PanelHead icon="euro" title="Cumplimiento fiscal" subtitle="Base preparada para factura electronica B2B y registros SIF/VERI*FACTU." />
        <div className="compliance-grid">
          <div className="status-chip ready">
            <span>Emisor</span>
            <strong>{data.tenant.legalName || data.tenant.name}</strong>
            <small>{data.tenant.taxId || "NIF/CIF pendiente en Configuracion"}</small>
          </div>
          <div className={`status-chip ${data.tenant.sifMode === "NOT_CONFIGURED" ? "warning" : "ready"}`}>
            <span>SIF</span>
            <strong>{data.tenant.sifMode === "VERIFACTU" ? "VERI*FACTU" : data.tenant.sifMode === "NO_VERIFACTU" ? "NO VERI*FACTU" : "Sin configurar"}</strong>
            <small>Hash, QR y trazabilidad activados en nuevas facturas</small>
          </div>
          <div className="status-chip">
            <span>Serie</span>
            <strong>{data.tenant.invoiceSeries}</strong>
            <small>Numeracion anual correlativa</small>
          </div>
          <div className="status-chip">
            <span>Proveedor</span>
            <strong>{data.tenant.electronicInvoiceProvider || "Pendiente"}</strong>
            <small>Integracion oficial en fase posterior</small>
          </div>
        </div>
      </section>

      <section className="card table-card billing-ledger">
        <div className="list-header">
          <div>
            <h2>Libro de facturas</h2>
            <p>Ultimas emisiones, vencimientos y estado de cobro.</p>
          </div>
          <a className="button primary" href="#new-invoice">
            <Icon name="plus" />
            Emitir factura
          </a>
        </div>
        {data.invoices.length === 0 ? (
          <p className="empty-note ledger-empty">Sin facturas registradas todavia.</p>
        ) : (
          <div style={{ overflow: "auto" }}>
            <table className="data-table invoice-table">
              <thead>
                <tr><th>Factura</th><th>Paciente</th><th>Tratamiento</th><th>Emision</th><th>Vencimiento</th><th>Importe</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {data.invoices.slice(0, 8).map(invoice => (
                  <tr key={invoice.id}>
                    <td data-label="Factura"><strong>{invoice.number}</strong><br /><span className="muted-text">{invoice.receiverTaxId || "NIF pendiente"}</span></td>
                    <td data-label="Paciente">{invoice.receiverName || invoice.patient.name}</td>
                    <td data-label="Tratamiento">{invoice.treatmentName}</td>
                    <td data-label="Emision">{formatDate(invoice.issuedAt)}</td>
                    <td data-label="Vencimiento">{formatDate(invoice.dueAt)}</td>
                    <td data-label="Importe"><strong>{formatMoney(invoice.amountCents)}</strong></td>
                    <td data-label="Estado"><Pill tone={invoiceStatusTone[invoice.status] ?? "blue"}>{invoice.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="billing-grid">
        <section className="card pad">
          <PanelHead icon="euro" title="Emitido vs. cobrado" subtitle="Comparativa mensual, ultimos 6 meses" />
          <div className="billing-bars">
            {billing.monthBuckets.map(bucket => (
              <div className="billing-bar-col" key={bucket.key}>
                <div className="billing-bar-pair">
                  <span className="billing-bar emitido" style={{ height: `${Math.max(4, (bucket.emitidoCents / maxMonthCents) * 100)}%` }} title={formatMoney(bucket.emitidoCents)} />
                  <span className="billing-bar cobrado" style={{ height: `${Math.max(4, (bucket.cobradoCents / maxMonthCents) * 100)}%` }} title={formatMoney(bucket.cobradoCents)} />
                </div>
                <span className="billing-bar-label">{bucket.label}</span>
              </div>
            ))}
          </div>
          <div className="billing-legend">
            <span><i className="dot emitido" /> Emitido</span>
            <span><i className="dot cobrado" /> Cobrado</span>
          </div>
        </section>

        <section className="card pad">
          <PanelHead icon="euro" title="Produccion por tratamiento" subtitle="Facturado historico por tipo" />
          {billing.treatmentRanking.length === 0 ? (
            <p className="empty-note">Sin facturas todavia.</p>
          ) : (
            <div className="rank-list">
              {billing.treatmentRanking.map(item => (
                <div className="rank-row" key={item.name}>
                  <span className="rank-label">{item.name}</span>
                  <div className="rank-track">
                    <div className="rank-fill" style={{ width: `${Math.max(6, (item.amountCents / billing.maxTreatmentCents) * 100)}%` }} />
                  </div>
                  <span className="rank-value">{formatMoney(item.amountCents)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card pad">
          <PanelHead icon="euro" title="Prevision de caja" subtitle="Proximos 3 meses estimados" />
          <div className="rank-list">
            {billing.forecastBuckets.map(bucket => (
              <div className="rank-row" key={bucket.key}>
                <span className="rank-label">{bucket.label}</span>
                <div className="rank-track">
                  <div className="rank-fill purple" style={{ width: `${Math.max(6, (bucket.amountCents / maxForecastCents) * 100)}%` }} />
                </div>
                <span className="rank-value">{formatMoney(bucket.amountCents)}</span>
              </div>
            ))}
          </div>
          <p className="empty-note">Basado en facturas emitidas y pendientes de cobro.</p>
        </section>
      </div>

      <div className="billing-grid">
        <section id="new-invoice" className="card pad invoice-form-card">
          <PanelHead icon="euro" title="Nueva factura fiscal" subtitle="Emision con destinatario, impuestos, QR y hash fiscal." />
          <InvoiceFiscalForm
            action={createInvoiceAction}
            patients={data.patients.map(patient => ({
              id: patient.id,
              name: patient.name,
              email: patient.email,
              fiscalName: patient.fiscalName,
              taxId: patient.taxId,
              fiscalAddress: patient.fiscalAddress,
              treatmentNeed: patient.treatmentNeed,
              estimatedValue: patient.estimatedValue
            }))}
          />
        </section>

        <section className="card pad">
          <PanelHead icon="euro" title="Factura electronica B2B" subtitle={`${billing.electronicCount} factura(s) con circuito electronico`} />
          {billing.electronicInvoices.length === 0 ? (
            <p className="empty-note">Las facturas a pacientes particulares no necesitan circuito B2B.</p>
          ) : (
            <div className="invoice-list">
              {billing.electronicInvoices.map(invoice => (
                <article className="invoice-row" key={invoice.id}>
                  <div>
                    <strong>{invoice.number}</strong>
                    <span>{invoice.receiverName || invoice.patient.name} · {invoice.treatmentName}</span>
                    <small>{formatMoney(invoice.amountCents)} · {invoice.receiverTaxId || "NIF pendiente"}</small>
                  </div>
                  <div className="invoice-row-actions">
                    <Pill tone={ELECTRONIC_STATUS_TONE[invoice.electronicStatus] ?? "blue"}>{ELECTRONIC_STATUS_LABEL[invoice.electronicStatus] ?? invoice.electronicStatus}</Pill>
                    {invoice.electronicStatus === "READY" || invoice.electronicStatus === "PENDING" ? (
                      <InvoiceStatusForm invoiceId={invoice.id} status={ElectronicInvoiceStatus.SENT} label="Marcar enviada" />
                    ) : null}
                    {invoice.electronicStatus === "SENT" ? (
                      <InvoiceStatusForm invoiceId={invoice.id} status={ElectronicInvoiceStatus.ACCEPTED} label="Aceptar" />
                    ) : null}
                    {invoice.electronicStatus === "ACCEPTED" ? (
                      <InvoiceStatusForm invoiceId={invoice.id} status={ElectronicInvoiceStatus.PAID} label="Pagada" />
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="billing-grid three">
        <section className="card pad">
          <PanelHead icon="euro" title="Cobros pendientes" subtitle={`${billing.pendingCount} factura(s) en circulacion`} />
          {billing.pendingInvoices.length === 0 ? (
            <p className="empty-note">Todo cobrado.</p>
          ) : (
            billing.pendingInvoices.map(invoice => (
              <div className="compact-row" key={invoice.id}>
                <div>
                  <strong>{invoice.patient.name}</strong>
                  <span>{invoice.number} · {invoice.treatmentName}</span>
                </div>
                <div className="compact-row-end">
                  <strong>{formatMoney(invoice.amountCents)}</strong>
                  <span className={invoice.status === "OVERDUE" ? "overdue-tag" : ""}>
                    {invoice.status === "OVERDUE" ? "Vencida" : `Vence ${formatDate(invoice.dueAt)}`}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card pad">
          <PanelHead icon="euro" title="Presupuestos pendientes" subtitle="Esperando aceptacion o cierre del paciente" />
          {billing.openBudgetPatients.length === 0 ? (
            <p className="empty-note">Sin presupuestos abiertos.</p>
          ) : (
            billing.openBudgetPatients.map(patient => (
              <div className="compact-row" key={patient.id}>
                <div>
                  <strong>{patient.name}</strong>
                  <span>{patient.treatmentNeed ?? "Tratamiento por definir"}</span>
                </div>
                <div className="compact-row-end">
                  <strong>{formatMoney(patient.estimatedValue)}</strong>
                  <span>{patient.phone}</span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="card pad">
          <PanelHead icon="euro" title="Gastos sin pagar" subtitle="Pendientes de liquidacion" />
          {billing.unpaidExpenseList.length === 0 ? (
            <p className="empty-note">Sin gastos pendientes.</p>
          ) : (
            billing.unpaidExpenseList.map(expense => (
              <div className="compact-row" key={expense.id}>
                <div>
                  <strong>{expense.supplier}</strong>
                  <span>{EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category}</span>
                </div>
                <div className="compact-row-end">
                  <strong>{formatMoney(expense.amountCents)}</strong>
                  <span>{expense.dueAt ? formatDate(expense.dueAt) : "Sin vencimiento"}</span>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </>
  );
}

function InvoiceStatusForm({ invoiceId, status, label }: { invoiceId: string; status: ElectronicInvoiceStatus; label: string }) {
  return (
    <form action={updateInvoiceElectronicStatusAction}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="electronicStatus" value={status} />
      <button className="button ghost compact-button" type="submit">{label}</button>
    </form>
  );
}

function SettingsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <>
      <ViewHead title="Configuracion" subtitle="Conocimiento autorizado por la clinica, integraciones y cumplimiento." />
      <section className="card pad">
        <form action={updateSettingsAction} className="form-grid two">
          <Field label="Nombre de clinica" name="name" defaultValue={data.tenant.name} />
          <Field label="Razon social" name="legalName" defaultValue={data.tenant.legalName ?? ""} />
          <Field label="NIF/CIF" name="taxId" defaultValue={data.tenant.taxId ?? ""} />
          <Field label="Domicilio fiscal" name="fiscalAddress" defaultValue={data.tenant.fiscalAddress ?? ""} />
          <Field label="Serie de factura" name="invoiceSeries" defaultValue={data.tenant.invoiceSeries} required />
          <Field label="Proveedor factura electronica" name="electronicInvoiceProvider" defaultValue={data.tenant.electronicInvoiceProvider ?? ""} />
          <label className="field">
            <span>Modo SIF</span>
            <select name="sifMode" defaultValue={data.tenant.sifMode}>
              <option value="NOT_CONFIGURED">Sin configurar</option>
              <option value="NO_VERIFACTU">NO VERI*FACTU</option>
              <option value="VERIFACTU">VERI*FACTU</option>
            </select>
          </label>
          <Field label="Nombre del asistente" name="assistantName" defaultValue={data.tenant.assistantName} />
          <Field label="Telefono desviado" name="phone" defaultValue={data.tenant.phone ?? ""} />
          <Field label="PMS conectado" name="pmsProvider" defaultValue={data.tenant.pmsProvider} />
          <Field label="Retencion transcripciones" name="retentionDays" defaultValue={String(data.tenant.retentionDays)} type="number" />
          <Field label="Tono" name="tone" defaultValue={data.tenant.settings?.tone ?? ""} />
          <TextArea label="Reglas de escalado" name="escalationRules" defaultValue={data.tenant.settings?.escalationRules ?? ""} />
          <TextArea label="RGPD / AI Act" name="rgpdNotes" defaultValue={data.tenant.settings?.rgpdNotes ?? ""} />
          <TextArea
            label="Base de conocimiento de la clinica"
            name="knowledgeNotes"
            defaultValue={data.tenant.settings?.knowledgeNotes ?? ""}
            hint="Equipo, especialidades, enrutado de citas, programas (PADI, etc.), diferenciadores. Se envia al agente IA como contexto adicional."
          />
          <button className="button primary" type="submit">Guardar configuracion</button>
        </form>
      </section>

      <section className="card pad" style={{ marginTop: 14 }}>
        <PanelHead icon="settings" title="API publica" subtitle="Clave para integraciones PMS y automatizaciones. Cabecera x-api-key." />
        <p><code className="api-key">{data.tenant.apiKey ?? "Sin clave generada"}</code></p>
        <p style={{ color: "var(--muted)" }}>
          Endpoints: GET/POST /api/v1/patients · GET/POST /api/v1/appointments · Plan {data.tenant.plan}
        </p>
      </section>

      <section className="card pad" style={{ marginTop: 14 }}>
        <PanelHead icon="users" title="Equipo" subtitle="Usuarios con acceso a este espacio. Invitar requiere rol OWNER o MANAGER." />
        <div style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Alta</th></tr>
            </thead>
            <tbody>
              {data.users.map(member => (
                <tr key={member.id}>
                  <td><strong>{member.name}</strong></td>
                  <td>{member.email}</td>
                  <td><Pill tone={member.role === "OWNER" ? "purple" : "blue"}>{member.role}</Pill></td>
                  <td>{formatDate(member.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form id="invite-user" action={inviteUserAction} className="form-grid two" style={{ marginTop: 12 }}>
          <Field label="Nombre" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Contrasena temporal" name="password" type="password" required />
          <label className="field">
            <span>Rol</span>
            <select name="role" defaultValue="RECEPTION">
              <option value="MANAGER">Manager</option>
              <option value="RECEPTION">Recepcion</option>
              <option value="DOCTOR">Doctor</option>
              <option value="READ_ONLY">Solo lectura</option>
            </select>
          </label>
          <button className="button primary" type="submit">Invitar usuario</button>
        </form>
      </section>

      <section className="card pad" style={{ marginTop: 14 }}>
        <PanelHead icon="task" title="Auditoria" subtitle="Ultimos eventos registrados en este espacio (RGPD)." />
        {data.auditLogs.length === 0 ? (
          <p className="empty-note">Sin eventos de auditoria todavia.</p>
        ) : (
          data.auditLogs.map(log => (
            <div className="compact-row" key={log.id}>
              <strong>{log.action}</strong>
              <span>
                {log.entityType} · {formatDateTime(log.createdAt)}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function AgendaCard({ data, compact = false }: { data: Awaited<ReturnType<typeof getDashboardData>>; compact?: boolean }) {
  return (
    <section className="card pad">
      <PanelHead icon="calendar" title="Agenda" subtitle="Proximas visitas y reuniones" href={compact ? undefined : "/?view=calendar"} />
      {data.appointments.length === 0 ? (
        <p className="empty-note">No hay citas programadas todavia.</p>
      ) : null}
      <div className={compact ? "home-agenda-list" : "grid"}>
        {data.appointments.slice(0, compact ? 2 : 4).map(appointment => (
          <div className={compact ? "home-agenda-item" : "work-card"} key={appointment.id}>
            <div><strong>{appointment.title}</strong><span>{appointment.patient.name}</span></div>
            <div><strong>{formatTime(appointment.startsAt)}</strong><span>{formatDate(appointment.startsAt)}</span></div>
          </div>
        ))}
      </div>
      <Link className="button" style={{ width: "100%", marginTop: 12 }} href="/?view=calendar">Ver calendario completo &rarr;</Link>
    </section>
  );
}

function AppointmentForm({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  if (data.patients.length === 0) {
    return (
      <section id="new-appointment" className="calendar-drawer" aria-label="Nueva cita">
        <Link className="calendar-drawer-backdrop" href="/?view=calendar" aria-label="Cerrar nueva cita" />
        <div className="calendar-drawer-panel">
          <header className="calendar-drawer-head">
            <div>
              <span>Agenda clinica</span>
              <h2>Nueva cita</h2>
            </div>
            <Link className="icon-button" href="/?view=calendar" aria-label="Cerrar">x</Link>
          </header>
          <div className="calendar-drawer-body">
            <p className="empty-note">Necesitas al menos un paciente para crear citas. <Link href="/?view=patients#new-patient">Crear paciente</Link>.</p>
          </div>
        </div>
      </section>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <section id="new-appointment" className="calendar-drawer" aria-label="Nueva cita">
      <Link className="calendar-drawer-backdrop" href="/?view=calendar" aria-label="Cerrar nueva cita" />
      <div className="calendar-drawer-panel">
        <header className="calendar-drawer-head">
          <div>
            <span>Agenda clinica</span>
            <h2>Nueva cita</h2>
          </div>
          <Link className="icon-button" href="/?view=calendar" aria-label="Cerrar">x</Link>
        </header>
        <form action={createAppointmentAction} className="calendar-drawer-body form-grid">
          <label className="field"><span>Paciente</span><select name="patientId" required>{data.patients.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
          <label className="field"><span>Tratamiento</span><select name="treatmentId">{data.treatments.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
          <input type="hidden" name="providerId" value={data.providers[0]?.id ?? ""} />
          <input type="hidden" name="operatoryId" value={data.operatories[0]?.id ?? ""} />
          <Field label="Titulo" name="title" defaultValue="Primera visita" required />
          <div className="form-grid two">
            <Field label="Fecha" name="date" type="date" defaultValue={today} required />
            <Field label="Hora" name="time" type="time" defaultValue="10:30" required />
          </div>
          <div className="form-grid two">
            <label className="field"><span>Estado</span><select name="status" defaultValue={AppointmentStatus.REQUESTED}><option value={AppointmentStatus.REQUESTED}>Solicitada</option><option value={AppointmentStatus.CONFIRMED}>Confirmada</option><option value={AppointmentStatus.URGENT}>Urgente</option></select></label>
            <label className="field"><span>Canal</span><select name="channel" defaultValue={ConversationChannel.WHATSAPP}><option value={ConversationChannel.WHATSAPP}>WhatsApp</option><option value={ConversationChannel.VOICE}>Voz</option><option value={ConversationChannel.SMS}>SMS</option><option value={ConversationChannel.WEB}>Web</option></select></label>
          </div>
          <footer className="calendar-drawer-foot">
            <Link className="button" href="/?view=calendar">Cancelar</Link>
            <button className="button primary" type="submit">Crear cita</button>
          </footer>
        </form>
      </div>
    </section>
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

function TaskForm({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <section id="new-task" className="card pad form-card">
      <h2>Nueva tarea</h2>
      <form action={createTaskAction} className="form-grid two">
        <Field label="Titulo" name="title" required />
        <Field label="Tipo" name="type" defaultValue="Recepcion" required />
        <label className="field"><span>Paciente</span><select name="patientId"><option value="">Sin paciente</option>{data.patients.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <Field label="Vencimiento" name="dueAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        <label className="field"><span>Prioridad</span><select name="priority" defaultValue={TaskPriority.MEDIUM}><option value={TaskPriority.LOW}>Baja</option><option value={TaskPriority.MEDIUM}>Media</option><option value={TaskPriority.HIGH}>Alta</option><option value={TaskPriority.CRITICAL}>Critica</option></select></label>
        <button className="button primary" type="submit">Crear tarea</button>
      </form>
    </section>
  );
}

function TreatmentForm() {
  return (
    <section id="new-treatment" className="card pad form-card">
      <h2>Nuevo tratamiento</h2>
      <form action={createTreatmentAction} className="form-grid two">
        <Field label="Nombre" name="name" required />
        <Field label="Duracion minutos" name="durationMinutes" type="number" defaultValue="30" required />
        <Field label="Precio EUR" name="price" type="number" />
        <label className="field"><span>Requiere valoracion</span><input name="requiresAssessment" type="checkbox" /></label>
        <TextArea label="Reglas" name="rules" defaultValue="Clara puede orientar y agendar, no diagnosticar." />
        <button className="button primary" type="submit">Crear tratamiento</button>
      </form>
    </section>
  );
}

function patientStatusTone(status: PatientStatus): Tone {
  switch (status) {
    case PatientStatus.ACTIVE:
      return "green";
    case PatientStatus.OPEN_BUDGET:
      return "purple";
    case PatientStatus.URGENT:
      return "red";
    case PatientStatus.INACTIVE:
      return "orange";
    case PatientStatus.NEW_LEAD:
    default:
      return "blue";
  }
}

function patientStatusLabel(status: PatientStatus) {
  switch (status) {
    case PatientStatus.NEW_LEAD:
      return "Nuevo";
    case PatientStatus.ACTIVE:
      return "Activo";
    case PatientStatus.INACTIVE:
      return "Baja";
    case PatientStatus.OPEN_BUDGET:
      return "Presupuesto";
    case PatientStatus.URGENT:
      return "Urgente";
    default:
      return status;
  }
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function appointmentStatusTone(status: AppointmentStatus): Tone {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case AppointmentStatus.COMPLETED:
      return "green";
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NO_SHOW:
      return "red";
    case AppointmentStatus.URGENT:
      return "orange";
    case AppointmentStatus.PROPOSED:
      return "purple";
    default:
      return "blue";
  }
}

function patientIntakeStatusTone(status: PatientIntakeStatus): Tone {
  switch (status) {
    case PatientIntakeStatus.LINKED:
      return "green";
    case PatientIntakeStatus.DUPLICATE_REVIEW:
      return "orange";
    case PatientIntakeStatus.DISCARDED:
      return "red";
    default:
      return "purple";
  }
}

function patientIntakeStatusLabel(status: PatientIntakeStatus) {
  switch (status) {
    case PatientIntakeStatus.CAPTURED:
      return "Capturada";
    case PatientIntakeStatus.LINKED:
      return "Vinculada";
    case PatientIntakeStatus.DUPLICATE_REVIEW:
      return "Revisar duplicado";
    case PatientIntakeStatus.DISCARDED:
      return "Descartada";
    default:
      return status;
  }
}

function appointmentStatusLabel(status: AppointmentStatus) {
  switch (status) {
    case AppointmentStatus.REQUESTED:
      return "Solicitada";
    case AppointmentStatus.PROPOSED:
      return "Propuesta";
    case AppointmentStatus.CONFIRMED:
      return "Confirmada";
    case AppointmentStatus.COMPLETED:
      return "Completada";
    case AppointmentStatus.NO_SHOW:
      return "No asistio";
    case AppointmentStatus.CANCELLED:
      return "Cancelada";
    case AppointmentStatus.URGENT:
      return "Urgente";
    default:
      return status;
  }
}

function formatAppointmentAuditAction(action: string, metadata: unknown) {
  const previousStartsAt = metadataDate(metadata, "previousStartsAt");
  const newStartsAt = metadataDate(metadata, "newStartsAt");

  switch (action) {
    case "appointment.created":
    case "api.appointment.created":
      return "Cita creada por recepcion/API";
    case "agent.appointment_proposed":
      return "Cita propuesta por Clara";
    case "agent.appointment_slot_selected":
      return "Paciente eligio un hueco propuesto por Clara";
    case "agent.urgent_slot_confirmed":
      return "Urgencia confirmada por Clara";
    case "appointment.rescheduled":
    case "agent.appointment_rescheduled":
      return previousStartsAt && newStartsAt
        ? `Cita modificada: de ${previousStartsAt} a ${newStartsAt}`
        : "Cita modificada";
    case "appointment.cancelled":
    case "agent.appointment_cancelled":
      return "Cita cancelada";
    case "notification.appointment_webhook_sent":
      return "Email enviado a traves de Make";
    case "notification.appointment_webhook_failed":
      return "Fallo enviando email a Make";
    case "notification.appointment_webhook_error":
      return "Error tecnico enviando email a Make";
    default:
      return action;
  }
}

function metadataDate(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateTime(date);
}

function Notice({ tone, message, view }: { tone: "error" | "ok"; message: string; view: AppView }) {
  return (
    <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "task" : "bot"} />
      <span>{message}</span>
      <Link href={`/?view=${view}`} aria-label="Cerrar aviso">&times;</Link>
    </div>
  );
}
