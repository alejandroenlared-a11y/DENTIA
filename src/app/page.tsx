import { Fragment } from "react";
import { AppointmentStatus, ConversationChannel, TaskPriority } from "@prisma/client";
import {
  completeTaskAction,
  createAppointmentAction,
  createPatientAction,
  createTaskFromConversationAction,
  createTaskAction,
  createTreatmentAction,
  generateRemindersAction,
  inviteUserAction,
  markConversationReadAction,
  replyConversationAction,
  toggleAssistantAction,
  toggleConsentAction,
  updateSettingsAction
} from "@/app/actions";
import { logoutAction } from "@/app/auth-actions";
import { Icon, type IconName } from "@/components/icon";
import { formatLongDate, formatWeekRange, getGreeting, getWeekDays } from "@/lib/calendar";
import { type AppView, getDashboardData } from "@/lib/dashboard";
import { formatDate, formatDateTime, formatMoney, formatTime, getInitials } from "@/lib/format";

const nav: Array<{ id: AppView; label: string; icon: IconName }> = [
  { id: "home", label: "Inicio", icon: "home" },
  { id: "calendar", label: "Calendario", icon: "calendar" },
  { id: "inbox", label: "Conversaciones", icon: "inbox" },
  { id: "agent", label: "Recepcionista IA", icon: "bot" },
  { id: "patients", label: "Pacientes", icon: "users" },
  { id: "treatments", label: "Tratamientos", icon: "tooth" },
  { id: "tasks", label: "Colas de trabajo", icon: "task" },
  { id: "billing", label: "Facturacion", icon: "euro" },
  { id: "settings", label: "Configuracion", icon: "settings" }
];

const viewLabels: Record<AppView, string> = {
  home: "Vision general del espacio",
  calendar: "Calendario",
  inbox: "Conversaciones",
  agent: "Recepcionista IA",
  patients: "Pacientes",
  treatments: "Tratamientos",
  tasks: "Colas de trabajo",
  billing: "Facturacion",
  settings: "Configuracion"
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedView = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const selectedConversationId = Array.isArray(params?.conversation) ? params?.conversation[0] : params?.conversation;
  const errorNotice = Array.isArray(params?.error) ? params?.error[0] : params?.error;
  const okNotice = Array.isArray(params?.ok) ? params?.ok[0] : params?.ok;
  const view = isView(requestedView) ? requestedView : "home";
  const data = await getDashboardData();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">
            <Icon name="tooth" />
          </div>
          <div className="brand-title">
            <strong>Dentia AI</strong>
            <span>Dental management</span>
          </div>
        </div>
        <nav className="nav-section">
          {nav.slice(0, 6).map(item => (
            <a key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} href={`/?view=${item.id}`}>
              <Icon name={item.icon} />
              {item.label}
              {item.id === "inbox" && data.metrics.unreadConversations > 0 ? (
                <span className="count">{data.metrics.unreadConversations}</span>
              ) : null}
            </a>
          ))}
        </nav>
        <div className="nav-label">Gestion</div>
        <nav className="nav-section">
          {nav.slice(6).map(item => (
            <a key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} href={`/?view=${item.id}`}>
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="/?view=tasks">
            <Icon name="task" />
            Centro de ayuda
          </a>
          <a className="nav-item" href="/?view=settings">
            <Icon name="settings" />
            Configuracion
          </a>
          <div className="account">
            <div className="avatar">{getInitials(data.currentUser.name)}</div>
            <div>
              <strong>{data.currentUser.name}</strong>
              <br />
              <span style={{ color: "var(--muted)" }}>{data.currentUser.role}</span>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="button" type="submit" style={{ width: "100%" }}>Cerrar sesion</button>
          </form>
        </div>
      </aside>
      <nav className="mobile-switch" aria-label="Navegacion principal">
        {nav.map(item => (
          <a key={item.id} className={`mobile-nav-item ${view === item.id ? "active" : ""}`} href={`/?view=${item.id}`}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.id === "inbox" && data.metrics.unreadConversations > 0 ? (
              <span className="count">{data.metrics.unreadConversations}</span>
            ) : null}
          </a>
        ))}
      </nav>
      <main className="main">
        <header className="topbar">
          <div className="page-kicker">{viewLabels[view]}</div>
          <div className="top-actions">
            <a className="icon-button" href="/?view=inbox" title="Buscar">
              <Icon name="inbox" />
            </a>
            <a className="button primary" href="/?view=calendar#new-appointment">
              <Icon name="plus" />
              Nueva cita
            </a>
          </div>
        </header>
        <section className="content">
          {errorNotice ? <Notice tone="error" message={errorNotice} view={view} /> : null}
          {okNotice ? <Notice tone="ok" message={okNotice} view={view} /> : null}
          {renderView(view, data, { selectedConversationId })}
        </section>
      </main>
    </div>
  );
}

function renderView(
  view: AppView,
  data: Awaited<ReturnType<typeof getDashboardData>>,
  options: { selectedConversationId?: string } = {}
) {
  switch (view) {
    case "calendar":
      return <CalendarView data={data} />;
    case "inbox":
      return <InboxView data={data} selectedConversationId={options.selectedConversationId} />;
    case "agent":
      return <AgentView data={data} />;
    case "patients":
      return <PatientsView data={data} />;
    case "treatments":
      return <TreatmentsView data={data} />;
    case "tasks":
      return <TasksView data={data} />;
    case "billing":
      return <BillingView data={data} />;
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
          <a className="button" href="/?view=calendar#new-appointment">
            <Icon name="calendar" />
            Nuevo evento
          </a>
          <a className="button" href="/?view=patients#new-patient">
            <Icon name="users" />
            Nuevo paciente
          </a>
          <a className="button" href="/?view=treatments#new-treatment">
            <Icon name="tooth" />
            Nuevo tratamiento
          </a>
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
      <div className="home-main">
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
            data.tasks.slice(0, 3).map(task => (
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
              <strong>0,00 EUR</strong>
            </div>
            <div>
              <span>Facturas vencidas</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Pagos pendientes</span>
              <strong>0,00 EUR</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CalendarView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const hours = ["09", "10", "11", "12", "13", "16", "17", "18", "19"];
  const days = getWeekDays();

  return (
    <>
      <ViewHead title="Calendario" subtitle={`${formatWeekRange(days)} · sincronizado con ${data.tenant.pmsProvider}.`} />
      <section className="calendar-layout">
        <aside className="calendar-side">
          <AgendaCard data={data} />
          <form action={generateRemindersAction}>
            <button className="button" type="submit" style={{ width: "100%" }}>
              <Icon name="task" />
              Generar recordatorios 48h
            </button>
          </form>
          <AppointmentForm data={data} />
        </aside>
        <div className="week-grid">
          <div className="week-cell head" />
          {days.map(day => (
            <div className="week-cell head" key={day.iso}>
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
                const appts = data.appointments.filter(appointment => appointment.startsAt.toISOString().startsWith(datePrefix));
                return (
                  <div className="week-cell" key={`${day.iso}-${hour}`}>
                    {appts.map(appointment => (
                      <div className={`appt ${appointment.status === "URGENT" ? "urgent" : appointment.status === "CONFIRMED" ? "confirmed" : "risk"}`} key={appointment.id}>
                        <strong>{appointment.title}</strong>
                        <br />
                        {appointment.patient.name}
                        <br />
                        {formatTime(appointment.startsAt)} · {appointment.operatory?.name}
                      </div>
                    ))}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </section>
    </>
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

  return (
    <>
      <ViewHead title="Conversaciones" subtitle="Bandeja omnicanal para revisar, responder y derivar trabajo a recepcion." />
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
                <a
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
                </a>
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

function PatientsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <>
      <ViewHead title="Pacientes" subtitle="Ficha 360 con conversaciones, consentimientos, citas y valor recuperable." />
      {data.patients.length === 0 ? (
        <EmptyState
          icon="users"
          title="Todavia no hay pacientes"
          hint="Crea el primer paciente con el formulario de abajo o espera a que Clara capture un lead."
        />
      ) : (
      <section className="card table-card">
        <div style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr><th>Paciente</th><th>Telefono</th><th>Estado</th><th>Tratamiento</th><th>Fuente</th><th>Valor</th><th>Consentimiento</th></tr>
            </thead>
            <tbody>
              {data.patients.map(patient => (
                <tr key={patient.id}>
                  <td><strong>{patient.name}</strong></td>
                  <td>{patient.phone}</td>
                  <td><Pill tone={patient.status === "URGENT" ? "red" : patient.status === "OPEN_BUDGET" ? "orange" : "green"}>{patient.status}</Pill></td>
                  <td>{patient.treatmentNeed}</td>
                  <td>{patient.source}</td>
                  <td>{formatMoney(patient.estimatedValue)}</td>
                  <td>
                    <form action={toggleConsentAction} className="form-inline">
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="kind" value="DATA_PROCESSING" />
                      <button
                        className={`pill-button ${patient.consents.some(consent => consent.granted) ? "green" : "red"}`}
                        type="submit"
                        title="Alternar consentimiento de tratamiento de datos"
                      >
                        {patient.consents.some(consent => consent.granted) ? "Firmado" : "Pendiente"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}
      <PatientForm />
    </>
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

function BillingView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  const { billing } = data;
  const maxMonthCents = Math.max(1, ...billing.monthBuckets.map(bucket => Math.max(bucket.emitidoCents, bucket.cobradoCents)));
  const maxForecastCents = Math.max(1, ...billing.forecastBuckets.map(bucket => bucket.amountCents));

  return (
    <>
      <ViewHead title="Facturacion" subtitle="Gestion financiera integral de la clinica." />

      <div className="grid kpis billing-kpis">
        <Tile icon="euro" label="Cobros pendientes" value={formatMoney(billing.pendingCents)} note={`${billing.pendingCount} factura(s) en circulacion`} accent="accent-blue" />
        <Tile icon="euro" label="Facturas vencidas" value={billing.overdueCount} note={billing.overdueCount > 0 ? "Requieren accion inmediata" : "Al dia"} accent="accent-red" />
        <Tile icon="euro" label="Cobrado este mes" value={formatMoney(billing.collectedThisMonthCents)} note="ultimos 30 dias" accent="accent-green" />
        <Tile icon="euro" label="Presupuestos pendientes" value={billing.openBudgetCount} note={`${formatMoney(billing.openBudgetCents)} en juego`} accent="accent-purple" />
        <Tile icon="euro" label="Gastos del periodo" value={formatMoney(billing.expensesThisMonthCents)} note="pagados este mes" accent="accent-orange" />
        <Tile icon="euro" label="Produccion sin facturar" value={formatMoney(billing.pendingProductionCents)} note="tratamientos presupuestados" accent="accent-blue" />
      </div>

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

function SettingsView({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  return (
    <>
      <ViewHead title="Configuracion" subtitle="Conocimiento autorizado por la clinica, integraciones y cumplimiento." />
      <section className="card pad">
        <form action={updateSettingsAction} className="form-grid two">
          <Field label="Nombre de clinica" name="name" defaultValue={data.tenant.name} />
          <Field label="Nombre del asistente" name="assistantName" defaultValue={data.tenant.assistantName} />
          <Field label="Telefono desviado" name="phone" defaultValue={data.tenant.phone ?? ""} />
          <Field label="PMS conectado" name="pmsProvider" defaultValue={data.tenant.pmsProvider} />
          <Field label="Retencion transcripciones" name="retentionDays" defaultValue={String(data.tenant.retentionDays)} type="number" />
          <Field label="Tono" name="tone" defaultValue={data.tenant.settings?.tone ?? ""} />
          <TextArea label="Reglas de escalado" name="escalationRules" defaultValue={data.tenant.settings?.escalationRules ?? ""} />
          <TextArea label="RGPD / AI Act" name="rgpdNotes" defaultValue={data.tenant.settings?.rgpdNotes ?? ""} />
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
        <form action={inviteUserAction} className="form-grid two" style={{ marginTop: 12 }}>
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
      <a className="button" style={{ width: "100%", marginTop: 12 }} href="/?view=calendar">Ver calendario completo &rarr;</a>
    </section>
  );
}

function AppointmentForm({ data }: { data: Awaited<ReturnType<typeof getDashboardData>> }) {
  if (data.patients.length === 0) {
    return (
      <section id="new-appointment" className="card pad form-card">
        <h2>Nueva cita</h2>
        <p className="empty-note">Necesitas al menos un paciente para crear citas. <a href="/?view=patients#new-patient">Crear paciente</a>.</p>
      </section>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return (
    <section id="new-appointment" className="card pad form-card">
      <h2>Nueva cita</h2>
      <form action={createAppointmentAction} className="form-grid">
        <label className="field"><span>Paciente</span><select name="patientId" required>{data.patients.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label className="field"><span>Tratamiento</span><select name="treatmentId">{data.treatments.map(t => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
        <input type="hidden" name="providerId" value={data.providers[0]?.id ?? ""} />
        <input type="hidden" name="operatoryId" value={data.operatories[0]?.id ?? ""} />
        <Field label="Titulo" name="title" defaultValue="Primera visita" required />
        <Field label="Fecha" name="date" type="date" defaultValue={today} required />
        <Field label="Hora" name="time" type="time" defaultValue="10:30" required />
        <label className="field"><span>Estado</span><select name="status" defaultValue={AppointmentStatus.REQUESTED}><option value={AppointmentStatus.REQUESTED}>Solicitada</option><option value={AppointmentStatus.CONFIRMED}>Confirmada</option><option value={AppointmentStatus.URGENT}>Urgente</option></select></label>
        <label className="field"><span>Canal</span><select name="channel" defaultValue={ConversationChannel.WHATSAPP}><option value={ConversationChannel.WHATSAPP}>WhatsApp</option><option value={ConversationChannel.VOICE}>Voz</option><option value={ConversationChannel.SMS}>SMS</option><option value={ConversationChannel.WEB}>Web</option></select></label>
        <button className="button primary" type="submit">Crear cita</button>
      </form>
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
    <section className="card pad form-card">
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

function ViewHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="view-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function PanelHead({ icon, title, subtitle, href }: { icon: IconName; title: string; subtitle?: string; href?: string }) {
  return (
    <div className="card-head">
      <div className="card-title">
        <span className="tile-icon accent-blue"><Icon name={icon} /></span>
        <div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      </div>
      {href ? <a className="button ghost" href={href}>Ver todo</a> : null}
    </div>
  );
}

function Tile({ icon, label, value, note, accent }: { icon: IconName; label: string; value: React.ReactNode; note: string; accent: string }) {
  return (
    <div className={`card tile ${accent}`}>
      <div className="tile-icon"><Icon name={icon} /></div>
      <div>
        <div className="tile-label">{label}</div>
        <div className="tile-value">{value}</div>
        <div className="tile-note">{note}</div>
      </div>
    </div>
  );
}

function MiniPipeline({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={accent} />
    </div>
  );
}

function Pill({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "green" | "orange" | "purple" | "red" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}{required ? <em className="required-mark">*</em> : null}</span>
      <input name={name} defaultValue={defaultValue} type={type} required={required} />
    </label>
  );
}

function Notice({ tone, message, view }: { tone: "error" | "ok"; message: string; view: AppView }) {
  return (
    <div className={`notice ${tone}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={tone === "error" ? "task" : "bot"} />
      <span>{message}</span>
      <a href={`/?view=${view}`} aria-label="Cerrar aviso">&times;</a>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint: string }) {
  return (
    <section className="card pad empty-state">
      <span className="tile-icon accent-blue"><Icon name={icon} /></span>
      <h2>{title}</h2>
      <p>{hint}</p>
    </section>
  );
}

function TextArea({ label, name, defaultValue = "" }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="field" style={{ gridColumn: "1 / -1" }}>
      <span>{label}</span>
      <textarea name={name} defaultValue={defaultValue} />
    </label>
  );
}

function isView(value: unknown): value is AppView {
  return typeof value === "string" && nav.some(item => item.id === value);
}
