const STORAGE_KEY = "dentia-ai-saas-v1";

const nav = [
  { id: "home", label: "Inicio", icon: "i-home" },
  { id: "calendar", label: "Calendario", icon: "i-calendar" },
  { id: "inbox", label: "Conversaciones", icon: "i-inbox", count: () => unreadCount() },
  { id: "agent", label: "Recepcionista IA", icon: "i-bot" },
  { id: "patients", label: "Pacientes", icon: "i-users" },
  { id: "treatments", label: "Tratamientos", icon: "i-tooth" },
  { id: "tasks", label: "Colas de trabajo", icon: "i-task" },
  { id: "billing", label: "Facturacion", icon: "i-euro" },
  { id: "settings", label: "Configuracion", icon: "i-settings" }
];

const today = "2026-07-08";

const seed = {
  view: "home",
  clinic: {
    name: "Clinica Sonrisa Madrid",
    user: "Alejandro Marti",
    email: "alejandro@dentia.ai",
    assistantName: "Clara",
    assistantEnabled: true,
    pms: "Klinikare API",
    phone: "+34 910 245 880",
    address: "Calle Serrano 84, Madrid",
    retentionDays: 90
  },
  patients: [
    { id: "p1", name: "Maria Lopez Gonzalez", phone: "+34 612 456 890", email: "maria.lopez@mail.com", status: "Nuevo lead", treatment: "Ortodoncia invisible", source: "WhatsApp", value: 1800, consent: false, lastVisit: "Sin visita", risk: "Alta intencion" },
    { id: "p2", name: "Javier Ruiz Moreno", phone: "+34 666 102 488", email: "javier.ruiz@mail.com", status: "Urgencia", treatment: "Dolor agudo", source: "Llamada", value: 220, consent: true, lastVisit: "2026-03-14", risk: "Prioritario" },
    { id: "p3", name: "Ana Serrano Prieto", phone: "+34 600 331 987", email: "ana.serrano@mail.com", status: "Presupuesto abierto", treatment: "Implante unitario", source: "WhatsApp", value: 1200, consent: true, lastVisit: "2026-05-28", risk: "Financiacion" },
    { id: "p4", name: "Carlos Vega Martin", phone: "+34 689 220 187", email: "carlos.vega@mail.com", status: "Activo", treatment: "Higiene", source: "SMS", value: 55, consent: true, lastVisit: "2025-02-10", risk: "Lista espera" },
    { id: "p5", name: "Lucia Rivas Fernandez", phone: "+34 622 109 823", email: "lucia.rivas@mail.com", status: "Inactivo +12m", treatment: "Revision anual", source: "Campana", value: 350, consent: true, lastVisit: "2025-01-09", risk: "Reactivacion" }
  ],
  appointments: [
    { id: "a1", patientId: "p1", date: "2026-07-09", time: "09:30", duration: 30, doctor: "Dra. Laura Vidal", room: "Gabinete 2", type: "Valoracion ortodoncia", status: "Pendiente", channel: "WhatsApp", ai: true },
    { id: "a2", patientId: "p2", date: "2026-07-08", time: "18:15", duration: 30, doctor: "Dr. Sergio Marin", room: "Urgencias", type: "Dolor agudo", status: "Urgente", channel: "Voz", ai: true },
    { id: "a3", patientId: "p4", date: "2026-07-10", time: "12:00", duration: 45, doctor: "Higienista Marta", room: "Gabinete 1", type: "Higiene", status: "Confirmada", channel: "Lista espera", ai: true },
    { id: "a4", patientId: "p3", date: "2026-07-11", time: "10:30", duration: 20, doctor: "Dra. Laura Vidal", room: "Despacho", type: "Cierre presupuesto", status: "Confirmada", channel: "WhatsApp", ai: true }
  ],
  conversations: [
    {
      id: "c1", patientId: "p1", channel: "WhatsApp", started: "2026-07-08 10:41", result: "Cita propuesta", status: "Activa", unread: true,
      messages: [
        { from: "patient", text: "Hola, queria saber si haceis Invisalign y cuanto dura la primera visita.", at: "10:39" },
        { from: "ai", text: "Si, trabajamos alineadores invisibles. La primera valoracion dura unos 30 minutos.", at: "10:39" },
        { from: "system", text: "Agenda verificada: jueves 09:30 o viernes 10:30.", at: "10:40" },
        { from: "ai", text: "Tengo jueves 09:30 o viernes 10:30. Cual te viene mejor?", at: "10:41" }
      ]
    },
    {
      id: "c2", patientId: "p2", channel: "Llamada", started: "2026-07-08 10:36", result: "Escalado urgencia", status: "Humano requerido", unread: true,
      messages: [
        { from: "patient", text: "Me duele mucho una muela y tengo la cara algo inflamada desde anoche.", at: "10:36" },
        { from: "ai", text: "Lo siento. Por lo que cuentas es prioritario. Voy a buscar el primer hueco disponible y avisar a recepcion.", at: "10:36" },
        { from: "system", text: "Triaje: prioritaria. Hueco disponible hoy 18:15.", at: "10:37" }
      ]
    },
    {
      id: "c3", patientId: "p3", channel: "WhatsApp", started: "2026-07-08 09:58", result: "Presupuesto", status: "Activa", unread: false,
      messages: [
        { from: "ai", text: "Hola Ana, soy Clara. Te escribo por si quieres resolver alguna duda del presupuesto del implante.", at: "09:56" },
        { from: "patient", text: "Queria saber si puedo financiarlo y cuanto tardaria.", at: "09:57" },
        { from: "ai", text: "Tenemos financiacion hasta 12 meses. Puedo reservarte una cita corta para resolverlo con el doctor.", at: "09:58" }
      ]
    },
    {
      id: "c4", patientId: "p4", channel: "SMS", started: "2026-07-08 09:12", result: "Cita creada", status: "Completada", unread: false,
      messages: [
        { from: "system", text: "Se libera hueco de higiene hoy 12:00.", at: "09:10" },
        { from: "ai", text: "Carlos, se ha liberado una higiene hoy a las 12:00. Quieres que te la reserve?", at: "09:10" },
        { from: "patient", text: "Si, perfecto.", at: "09:12" },
        { from: "ai", text: "Confirmado. Te esperamos hoy a las 12:00.", at: "09:12" }
      ]
    }
  ],
  tasks: [
    { id: "t1", title: "Confirmar urgencia de Javier Ruiz", type: "Recepcion", due: "2026-07-08", status: "Vencida", priority: "Alta", linked: "c2" },
    { id: "t2", title: "Llamar a Ana por financiacion", type: "Presupuesto", due: "2026-07-09", status: "Pendiente", priority: "Media", linked: "p3" },
    { id: "t3", title: "Enviar consentimientos previos", type: "RGPD", due: "2026-07-09", status: "Pendiente", priority: "Media", linked: "p1" },
    { id: "t4", title: "Reactivar pacientes sin higiene anual", type: "Campana", due: "2026-07-12", status: "Programada", priority: "Baja", linked: "p5" }
  ],
  treatments: [
    { id: "tr1", name: "Revision dental", duration: 30, price: 0, doctor: "Cualquier doctor", room: "Gabinete", rules: "Primera visita con consentimiento previo." },
    { id: "tr2", name: "Higiene", duration: 45, price: 55, doctor: "Higienista", room: "Gabinete 1", rules: "Recordatorio 24h. Lista de espera activa." },
    { id: "tr3", name: "Ortodoncia invisible", duration: 30, price: null, doctor: "Dra. Laura Vidal", room: "Gabinete 2", rules: "Valoracion obligatoria antes de precio cerrado." },
    { id: "tr4", name: "Implante unitario", duration: 20, price: 1200, doctor: "Dr. Sergio Marin", room: "Despacho", rules: "Permite financiacion 12 meses." },
    { id: "tr5", name: "Urgencia dental", duration: 30, price: 70, doctor: "Doctor de guardia", room: "Urgencias", rules: "Dolor agudo o inflamacion: hueco en menos de 24h." }
  ],
  settings: {
    voice: true,
    whatsapp: true,
    sms: true,
    web: true,
    tone: "Cercano, profesional y empatico",
    escalation: "Urgencia real, enfado, pagos, peticion explicita de humano, dos fallos de comprension.",
    rgpd: "Locucion previa, consentimiento explicito, retencion 90 dias, residencia UE."
  }
};

let state = loadState();
let selectedConversation = null;
let selectedPatient = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetState() {
  state = structuredClone(seed);
  saveState();
  render();
  toast("Datos reiniciados");
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function icon(id) {
  return `<svg class="icon"><use href="#${id}"></use></svg>`;
}

function money(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);
}

function patient(id) {
  return state.patients.find(item => item.id === id) || {};
}

function unreadCount() {
  return state.conversations.filter(item => item.unread).length;
}

function countAppointments(status) {
  return state.appointments.filter(item => !status || item.status === status).length;
}

function recoveredRevenue() {
  return state.appointments.filter(item => item.ai).reduce((sum, item) => sum + (patient(item.patientId).value || 0), 0);
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
}

function setView(view) {
  state.view = view;
  saveState();
  render();
}

function render() {
  document.getElementById("app").innerHTML = `
    <aside class="sidebar">${renderSidebar()}</aside>
    <main class="main">
      <div class="mobile-switch">
        <select aria-label="Cambiar modulo" onchange="setView(this.value)">
          ${nav.map(item => `<option value="${item.id}" ${state.view === item.id ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>
      </div>
      <header class="topbar">
        <div class="page-kicker">${viewLabel(state.view)}</div>
        <div class="top-actions">
          <button class="icon-button" title="Buscar">${icon("i-search")}</button>
          <button class="icon-button" title="Notificaciones">${icon("i-inbox")}</button>
          <button class="button primary" onclick="openAppointmentModal()">${icon("i-plus")} Nueva cita</button>
        </div>
      </header>
      <section class="content">${renderView()}</section>
    </main>
    <aside class="drawer" id="drawer"></aside>
  `;
  bindSearches();
}

function renderSidebar() {
  const main = nav.slice(0, 6);
  const admin = nav.slice(6);
  return `
    <div class="brand">
      <div class="brand-badge">${icon("i-tooth")}</div>
      <div class="brand-title"><strong>Dentia AI</strong><span>Dental management</span></div>
    </div>
    <nav class="nav-section">
      ${main.map(renderNavItem).join("")}
    </nav>
    <div class="nav-label">Gestion</div>
    <nav class="nav-section">
      ${admin.map(renderNavItem).join("")}
    </nav>
    <div class="sidebar-bottom">
      <button class="nav-item" onclick="toast('Centro de ayuda preparado')">${icon("i-task")} Centro de ayuda</button>
      <button class="nav-item" onclick="setView('settings')">${icon("i-settings")} Configuracion</button>
      <div class="account">
        <div class="avatar">AM</div>
        <div><strong>${escapeHtml(state.clinic.user)}</strong><br><span style="color:var(--muted)">${escapeHtml(state.clinic.email)}</span></div>
      </div>
    </div>
  `;
}

function renderNavItem(item) {
  const count = typeof item.count === "function" ? item.count() : null;
  return `
    <button class="nav-item ${state.view === item.id ? "active" : ""}" onclick="setView('${item.id}')">
      ${icon(item.icon)} ${item.label}
      ${count ? `<span class="count">${count}</span>` : ""}
    </button>
  `;
}

function viewLabel(view) {
  return {
    home: "Vision general del espacio",
    calendar: "Calendario",
    inbox: "Conversaciones",
    agent: "Recepcionista IA",
    patients: "Pacientes",
    treatments: "Tratamientos",
    tasks: "Colas de trabajo",
    billing: "Facturacion",
    settings: "Configuracion"
  }[view] || "Dentia AI";
}

function renderView() {
  return {
    home: renderHome,
    calendar: renderCalendar,
    inbox: renderInbox,
    agent: renderAgent,
    patients: renderPatients,
    treatments: renderTreatments,
    tasks: renderTasks,
    billing: renderBilling,
    settings: renderSettings
  }[state.view]();
}

function renderHome() {
  const pendingTasks = state.tasks.filter(item => item.status !== "Completada").length;
  return `
    <div class="home-overview">
      <div class="home-intro">
        <div>
          <h1>Buenos dias, ${escapeHtml(state.clinic.user)}</h1>
          <p>Espacio de trabajo de ${escapeHtml(state.clinic.name)} · miercoles, 8 de julio</p>
        </div>
        <div class="toolbar">
          <button class="button dark" onclick="setView('agent')">${icon("i-bot")} Abrir Clara</button>
          <button class="button" onclick="openAppointmentModal()">${icon("i-calendar")} Nuevo evento</button>
          <button class="button" onclick="openPatientModal()">${icon("i-users")} Nuevo paciente</button>
          <button class="button" onclick="setView('treatments')">${icon("i-tooth")} Nuevo tratamiento</button>
        </div>
      </div>

      <aside class="home-agenda">
        ${renderHomeAgendaPanel()}
      </aside>

      <div class="home-kpis">
        ${tile("i-inbox", "Conversaciones sin leer", unreadCount(), "pendientes de revisar", "accent-blue")}
        ${tile("i-calendar", "Eventos proximos", countAppointments(), "citas en agenda", "accent-purple")}
        ${tile("i-task", "Tareas pendientes", pendingTasks, "colas de trabajo", "accent-red")}
        ${tile("i-users", "Pacientes activos", state.patients.filter(p => p.status !== "Inactivo +12m").length, "base operativa", "accent-green")}
        ${tile("i-euro", "Ingresos recuperados", money(recoveredRevenue()), "pipeline IA", "accent-orange")}
      </div>

      <div class="home-main">
        <section class="card pad upcoming-panel">
          <div class="card-head">
            <div class="card-title"><span class="tile-icon accent-blue">${icon("i-calendar")}</span><div><h2>Proxima agenda</h2><p>Los siguientes eventos de la cuenta activa.</p></div></div>
            <button class="button ghost" onclick="setView('calendar')">Ver todo</button>
          </div>
          ${state.appointments.length ? state.appointments.slice(0, 3).map(appt => {
            const p = patient(appt.patientId);
            return `<div class="compact-row"><strong>${escapeHtml(appt.type)}</strong><span>${escapeHtml(p.name)} · ${escapeHtml(appt.date)} ${escapeHtml(appt.time)}</span></div>`;
          }).join("") : `<div class="empty slim">No hay eventos proximos en los siguientes 7 dias.</div>`}
        </section>

        <section class="card pad queue-panel">
          <div class="card-head">
            <div class="card-title"><span class="tile-icon accent-red">${icon("i-task")}</span><div><h2>Colas de trabajo</h2></div></div>
            <button class="button ghost" onclick="setView('tasks')">Ver todo</button>
          </div>
          <h4>Tareas vencidas</h4>
          <p>${state.tasks.some(t => t.status === "Vencida") ? "Hay tareas que requieren revision de recepcion." : "Ahora mismo no hay nada esperando en esta cola."}</p>
          <hr>
          <h4>Conversaciones recientes sin leer</h4>
          <p>${unreadCount() ? `${unreadCount()} conversaciones pendientes de revisar.` : "No hay mensajes sin leer por revisar."}</p>
        </section>

        <section class="card pad pipeline-panel">
          <div class="card-head">
            <div class="card-title"><span class="tile-icon accent-green">${icon("i-users")}</span><div><h2>Pipeline de pacientes</h2><p>Estado actual y proximas acciones.</p></div></div>
            <button class="button ghost" onclick="setView('patients')">Ver todo</button>
          </div>
          <div class="pipeline-mini">
            <div><span>Nuevo</span><strong>${state.patients.filter(p => p.status === "Nuevo lead").length}</strong><i class="accent-blue"></i></div>
            <div><span>Presupuesto</span><strong>${state.patients.filter(p => p.status === "Presupuesto abierto").length}</strong><i class="accent-purple"></i></div>
            <div><span>Urgencia</span><strong>${state.patients.filter(p => p.status === "Urgencia").length}</strong><i class="accent-red"></i></div>
            <div><span>Activo</span><strong>${state.patients.filter(p => p.status === "Activo").length}</strong><i class="accent-green"></i></div>
          </div>
          <h4>Proximas a vencer</h4>
          ${state.tasks.slice(0, 3).map(task => `<div class="compact-row"><strong>${escapeHtml(task.title)}</strong><span>${escapeHtml(task.type)} · ${escapeHtml(task.due)}</span></div>`).join("")}
        </section>

        <section class="card pad recent-panel">
          <div class="card-head">
            <div class="card-title"><span class="tile-icon accent-purple">${icon("i-inbox")}</span><div><h2>Trabajo reciente</h2></div></div>
            <button class="button ghost" onclick="setView('inbox')">Ver todo</button>
          </div>
          <h4>Conversaciones</h4>
          ${state.conversations.slice(0, 3).map(conv => {
            const p = patient(conv.patientId);
            return `<div class="compact-row"><strong>${escapeHtml(p.name)}</strong><span>${escapeHtml(conv.result)} · ${escapeHtml(conv.started)}</span></div>`;
          }).join("")}
        </section>

        <section class="card pad finance-panel">
          <div class="card-head">
            <div class="card-title"><span class="tile-icon accent-orange">${icon("i-euro")}</span><div><h2>Resumen financiero</h2><p>Una vista ligera de facturacion y ROI.</p></div></div>
            <button class="button ghost" onclick="setView('billing')">Ver todo</button>
          </div>
          <div class="finance-grid">
            <div><span>Cobros pendientes</span><strong>0,00 EUR</strong></div>
            <div><span>Facturas vencidas</span><strong>0</strong></div>
            <div><span>Pagos pendientes</span><strong>0,00 EUR</strong></div>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderHomeAgendaPanel() {
  return `
    <section class="card pad">
      <div class="card-head">
        <div class="card-title"><span class="tile-icon accent-blue">${icon("i-calendar")}</span><div><h3>Agenda</h3><p>Proximas visitas y reuniones</p></div></div>
      </div>
      <div class="home-agenda-list">
        ${state.appointments.slice(0, 2).map(appt => {
          const p = patient(appt.patientId);
          return `
            <div class="home-agenda-item">
              <div><strong>${escapeHtml(appt.type)}</strong><span>${escapeHtml(p.name)}</span></div>
              <div><strong>${escapeHtml(appt.time)}</strong><span>${appt.date === today ? "Hoy" : appt.date}</span></div>
            </div>
          `;
        }).join("")}
      </div>
      <button class="button" style="width:100%;margin-top:12px" onclick="setView('calendar')">Ver calendario completo -></button>
    </section>
  `;
}

function tile(iconId, label, value, note, accent) {
  return `
    <div class="card tile ${accent}">
      <div class="tile-icon">${icon(iconId)}</div>
      <div>
        <div class="tile-label">${label}</div>
        <div class="tile-value">${value}</div>
        <div class="tile-note">${note}</div>
      </div>
    </div>
  `;
}

function renderConversationChart() {
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const calls = [42, 58, 39, 71, 52, 36, 48];
  const whats = [55, 61, 43, 66, 68, 41, 59];
  return `
    <section class="card pad">
      <div class="card-head">
        <div class="card-title"><h2>Conversaciones (semana)</h2></div>
        <span class="pill green">+10% incremento</span>
      </div>
      <div class="bars">
        ${days.map((day, i) => `
          <div class="bar-pair">
            <div class="bar-stack">
              <div class="bar" style="height:${calls[i] * 2}px"></div>
              <div class="bar dark" style="height:${whats[i] * 2}px"></div>
            </div>
            <small>${day}</small>
          </div>
        `).join("")}
      </div>
      <div class="legend"><span><i></i>Llamadas</span><span><i class="dark"></i>WhatsApp</span></div>
    </section>
  `;
}

function renderRecentConversations() {
  return `
    <section class="card pad">
      <div class="card-head">
        <div class="card-title"><h2>Conversaciones recientes</h2></div>
        <button class="button ghost" onclick="setView('inbox')">Ver todas</button>
      </div>
      <div class="grid">
        ${state.conversations.slice(0, 4).map(conv => {
          const p = patient(conv.patientId);
          return `
            <div class="work-card">
              <strong>${escapeHtml(p.name)}</strong>
              <p>${escapeHtml(conv.channel)} · ${escapeHtml(conv.result)} · ${escapeHtml(conv.started)}</p>
              <button class="button" onclick="openConversation('${conv.id}')">Abrir conversacion</button>
            </div>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderMiniCalendar() {
  const days = ["L", "M", "X", "J", "V", "S", "D"];
  const numbers = Array.from({ length: 31 }, (_, i) => i + 1);
  return `
    <section class="card mini-calendar">
      <div class="calendar-month"><button class="icon-button">${"<"}</button><span>Julio 2026</span><button class="icon-button">${">"}</button></div>
      <div class="month-grid">
        ${days.map(d => `<div class="day-name">${d}</div>`).join("")}
        ${numbers.map(n => `<div class="day-dot ${n === 8 ? "today" : ""} ${[9,10,11,15,18].includes(n) ? "has" : ""} ${[8,14].includes(n) ? "risk" : ""}">${n}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderAgendaPanel() {
  return `
    <section class="card pad">
      <div class="card-head">
        <div class="card-title"><span class="tile-icon accent-blue">${icon("i-calendar")}</span><div><h3>Agenda</h3><p>Proximas visitas y reuniones</p></div></div>
      </div>
      <div class="grid">
        ${state.appointments.slice(0, 4).map(appt => {
          const p = patient(appt.patientId);
          return `<div class="work-card"><strong>${escapeHtml(appt.type)} <span class="pill blue">${escapeHtml(appt.date)}</span></strong><p>${escapeHtml(p.name)} · ${escapeHtml(appt.time)} · ${escapeHtml(appt.doctor)}</p></div>`;
        }).join("")}
      </div>
      <button class="button" style="width:100%;margin-top:12px" onclick="setView('calendar')">Ver calendario completo -></button>
    </section>
  `;
}

function renderInbox() {
  return `
    <div class="view-head">
      <div><h1>Conversaciones</h1><p>Historial de conversaciones gestionadas por el sistema.</p></div>
      <div class="toolbar">
        <label class="search">${icon("i-search")}<input id="conversationSearch" placeholder="Buscar paciente, telefono o canal"></label>
        <button class="button" onclick="filterConversations('Urgente')">Filtros</button>
        <button class="button primary" onclick="simulateInbound()">Simular entrada</button>
      </div>
    </div>
    <section class="card table-card">
      <div style="overflow:auto">
        <table class="data-table" id="conversationTable">
          <thead><tr><th>Telefono</th><th>Canal</th><th>Paciente</th><th>Inicio</th><th>Resultado</th><th>Estado</th><th>Mas</th></tr></thead>
          <tbody>${state.conversations.map(renderConversationRow).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderConversationRow(conv) {
  const p = patient(conv.patientId);
  return `
    <tr data-search="${escapeHtml(`${p.name} ${p.phone} ${conv.channel} ${conv.result}`.toLowerCase())}">
      <td>${escapeHtml(p.phone)}</td>
      <td><span class="pill ${conv.channel === "WhatsApp" ? "aqua" : conv.channel === "Llamada" ? "green" : "blue"}">${conv.channel}</span></td>
      <td><a href="#" class="link-row" onclick="openConversation('${conv.id}');return false">${escapeHtml(p.name)}</a></td>
      <td>${escapeHtml(conv.started)}</td>
      <td><span class="pill purple">${escapeHtml(conv.result)}</span></td>
      <td><span class="pill ${conv.status.includes("Humano") ? "red" : conv.status === "Completada" ? "orange" : "green"}">${escapeHtml(conv.status)}</span></td>
      <td><button class="icon-button" onclick="openConversation('${conv.id}')">${">"}</button></td>
    </tr>
  `;
}

function renderCalendar() {
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00"];
  const week = [
    ["Lun", "6"], ["Mar", "7"], ["Mie", "8"], ["Jue", "9"], ["Vie", "10"], ["Sab", "11"], ["Dom", "12"]
  ];
  return `
    <div class="view-head">
      <div><h1>Calendario</h1><p>Semana del 6 al 12 de julio de 2026 · sincronizado con ${escapeHtml(state.clinic.pms)}.</p></div>
      <div class="toolbar"><button class="button" onclick="toast('Vista semanal activa')">Semana</button><button class="button primary" onclick="openAppointmentModal()">${icon("i-plus")} Nuevo</button></div>
    </div>
    <section class="calendar-layout">
      <aside class="calendar-side">
        ${renderMiniCalendar()}
        <button class="button primary" style="width:100%;margin-top:14px" onclick="openAppointmentModal()">${icon("i-plus")} Nuevo evento</button>
        <div style="margin-top:18px">
          <div class="nav-label" style="padding-left:0">Doctores</div>
          <label><input type="checkbox" checked> Dra. Laura Vidal</label><br>
          <label><input type="checkbox" checked> Dr. Sergio Marin</label><br>
          <label><input type="checkbox" checked> Higienista Marta</label>
        </div>
      </aside>
      <div class="week-grid">
        <div class="week-cell head"></div>
        ${week.map(day => `<div class="week-cell head">${day[0]}<br><strong>${day[1]}</strong></div>`).join("")}
        ${hours.map(hour => `
          <div class="week-cell time">${hour}</div>
          ${week.map(day => `<div class="week-cell">${renderApptAt(day[1], hour)}</div>`).join("")}
        `).join("")}
      </div>
    </section>
  `;
}

function renderApptAt(day, hour) {
  const date = `2026-07-${day.padStart(2, "0")}`;
  return state.appointments.filter(a => a.date === date && a.time.startsWith(hour.slice(0, 2))).map(appt => {
    const p = patient(appt.patientId);
    const cls = appt.status === "Urgente" ? "urgent" : appt.status === "Confirmada" ? "confirmed" : "risk";
    return `<div class="appt ${cls}"><strong>${escapeHtml(appt.type)}</strong><br>${escapeHtml(p.name)}<br>${escapeHtml(appt.time)} · ${escapeHtml(appt.room)}</div>`;
  }).join("");
}

function renderPatients() {
  return `
    <div class="view-head">
      <div><h1>Pacientes</h1><p>Ficha 360 con conversaciones, consentimientos, citas y valor recuperable.</p></div>
      <div class="toolbar"><label class="search">${icon("i-search")}<input id="patientSearch" placeholder="Buscar paciente"></label><button class="button primary" onclick="openPatientModal()">${icon("i-plus")} Nuevo paciente</button></div>
    </div>
    <section class="card table-card">
      <div style="overflow:auto">
        <table class="data-table" id="patientTable">
          <thead><tr><th>Paciente</th><th>Telefono</th><th>Estado</th><th>Tratamiento</th><th>Fuente</th><th>Valor</th><th>Consentimiento</th></tr></thead>
          <tbody>${state.patients.map(p => `
            <tr data-search="${escapeHtml(`${p.name} ${p.phone} ${p.status} ${p.treatment}`.toLowerCase())}">
              <td><a href="#" class="link-row" onclick="openPatient('${p.id}');return false">${escapeHtml(p.name)}</a></td>
              <td>${escapeHtml(p.phone)}</td>
              <td><span class="pill ${p.status.includes("Urgencia") ? "red" : p.status.includes("Presupuesto") ? "orange" : "green"}">${escapeHtml(p.status)}</span></td>
              <td>${escapeHtml(p.treatment)}</td>
              <td>${escapeHtml(p.source)}</td>
              <td>${money(p.value)}</td>
              <td><span class="pill ${p.consent ? "green" : "red"}">${p.consent ? "Firmado" : "Pendiente"}</span></td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTasks() {
  const groups = ["Vencida", "Pendiente", "Programada", "Completada"];
  return `
    <div class="view-head">
      <div><h1>Colas de trabajo</h1><p>Tareas que Clara crea cuando necesita recepcion, doctor o administracion.</p></div>
      <button class="button primary" onclick="openTaskModal()">${icon("i-plus")} Nueva tarea</button>
    </div>
    <div class="board">
      ${groups.map(group => `
        <section class="board-column">
          <h3>${group}<span>${state.tasks.filter(t => t.status === group).length}</span></h3>
          ${state.tasks.filter(t => t.status === group).map(t => `
            <article class="work-card">
              <strong>${escapeHtml(t.title)}</strong>
              <p>${escapeHtml(t.type)} · vence ${escapeHtml(t.due)} · prioridad ${escapeHtml(t.priority)}</p>
              <div class="toolbar"><button class="button" onclick="completeTask('${t.id}')">Completar</button></div>
            </article>
          `).join("") || `<div class="empty">No hay tareas en esta cola.</div>`}
        </section>
      `).join("")}
    </div>
  `;
}

function renderAgent() {
  return `
    <div class="view-head">
      <div><h1>Recepcionista IA</h1><p>${escapeHtml(state.clinic.assistantName)} atiende voz, WhatsApp, SMS y web con protocolos dentales.</p></div>
      <button class="button primary" onclick="toggleAssistant()">${state.clinic.assistantEnabled ? "Pausar asistente" : "Activar asistente"}</button>
    </div>
    <div class="grid two">
      <section class="card pad">
        <div class="card-head"><div class="card-title"><span class="tile-icon accent-green">${icon("i-bot")}</span><div><h2>Canales activos</h2><p>Entrada y fallback por paciente</p></div></div></div>
        <div class="grid two">
          ${channelToggle("voice", "Voz", "i-phone")}
          ${channelToggle("whatsapp", "WhatsApp", "i-wa")}
          ${channelToggle("sms", "SMS", "i-inbox")}
          ${channelToggle("web", "Widget web", "i-home")}
        </div>
      </section>
      <section class="card pad">
        <div class="card-head"><div class="card-title"><span class="tile-icon accent-red">${icon("i-tooth")}</span><div><h2>Triaje dental</h2><p>Regla de oro: ante duda, escalar</p></div></div></div>
        <div class="grid">
          <div class="work-card"><strong>Urgencia real</strong><p>Avulsion, sangrado que no cesa, inflamacion con fiebre o dificultad para tragar. Escalado inmediato.</p><span class="pill red">Humano ahora</span></div>
          <div class="work-card"><strong>Prioritaria</strong><p>Dolor agudo, flemon, corona o empaste caido con dolor. Hueco en menos de 24h.</p><span class="pill orange">Marcar urgencia</span></div>
          <div class="work-card"><strong>Ordinaria</strong><p>Revision, higiene, estetica, sensibilidad leve. Agenda normal con 2-3 huecos.</p><span class="pill green">IA resuelve</span></div>
        </div>
      </section>
    </div>
    <div class="grid three" style="margin-top:16px">
      ${tile("i-task", "Resolucion sin humano", "68%", "objetivo >65%", "accent-green")}
      ${tile("i-calendar", "Tasa de agendado", "55%", "intencion -> cita", "accent-purple")}
      ${tile("i-euro", "Coste estimado", "96 EUR", "variable mensual", "accent-orange")}
    </div>
  `;
}

function channelToggle(key, label, iconId) {
  return `
    <div class="work-card">
      <strong>${icon(iconId)} ${label}</strong>
      <p>${state.settings[key] ? "Canal activo y monitorizado." : "Canal desactivado."}</p>
      <button class="button ${state.settings[key] ? "" : "primary"}" onclick="toggleChannel('${key}')">${state.settings[key] ? "Desactivar" : "Activar"}</button>
    </div>
  `;
}

function renderTreatments() {
  return `
    <div class="view-head">
      <div><h1>Tratamientos</h1><p>Catalogo operativo que Clara puede explicar y agendar sin inventar precios.</p></div>
      <button class="button primary" onclick="openTreatmentModal()">${icon("i-plus")} Nuevo tratamiento</button>
    </div>
    <div class="grid three">
      ${state.treatments.map(t => `
        <article class="card pad">
          <div class="card-head"><div class="card-title"><span class="tile-icon accent-green">${icon("i-tooth")}</span><div><h2>${escapeHtml(t.name)}</h2><p>${escapeHtml(t.doctor)}</p></div></div></div>
          <p><strong>Duracion:</strong> ${t.duration} min · <strong>Precio:</strong> ${t.price === null ? "Valoracion previa" : money(t.price)}</p>
          <p style="color:var(--muted)">${escapeHtml(t.rules)}</p>
          <span class="pill blue">${escapeHtml(t.room)}</span>
        </article>
      `).join("")}
    </div>
  `;
}

function renderBilling() {
  const invoices = [
    ["Plan Pro", "299 EUR", "Pagada", "2026-07-01"],
    ["Minutos voz extra", "42 EUR", "Pendiente", "2026-07-08"],
    ["Setup Klinikare", "250 EUR", "Pagada", "2026-06-20"]
  ];
  return `
    <div class="view-head"><div><h1>Facturacion</h1><p>Resumen financiero y ROI operativo del asistente.</p></div></div>
    <div class="grid kpis">
      ${tile("i-euro", "MRR sede", "299 EUR", "Plan Pro", "accent-blue")}
      ${tile("i-euro", "Coste variable", "96 EUR", "LLM + voz + WA", "accent-orange")}
      ${tile("i-euro", "Margen bruto", "68%", "estimado", "accent-green")}
      ${tile("i-users", "Pacientes salvados", "31", "mes actual", "accent-purple")}
      ${tile("i-euro", "ROI cliente", "x62", money(recoveredRevenue()), "accent-green")}
    </div>
    <section class="card table-card" style="margin-top:16px">
      <div class="table-toolbar"><h2>Facturas</h2><button class="button">Exportar CSV</button></div>
      <div style="overflow:auto"><table class="data-table"><thead><tr><th>Concepto</th><th>Importe</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
        ${invoices.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td><span class="pill ${row[2] === "Pagada" ? "green" : "orange"}">${row[2]}</span></td><td>${row[3]}</td></tr>`).join("")}
      </tbody></table></div>
    </section>
  `;
}

function renderSettings() {
  return `
    <div class="view-head">
      <div><h1>Configuracion</h1><p>Conocimiento autorizado por la clinica, integraciones y cumplimiento.</p></div>
      <div class="toolbar"><button class="button danger" onclick="resetState()">Reiniciar datos</button><button class="button primary" onclick="saveSettings()">Guardar</button></div>
    </div>
    <section class="card pad">
      <form class="form-grid two" id="settingsForm">
        <div class="field"><label>Nombre de clinica</label><input name="name" value="${escapeAttr(state.clinic.name)}"></div>
        <div class="field"><label>Nombre del asistente</label><input name="assistantName" value="${escapeAttr(state.clinic.assistantName)}"></div>
        <div class="field"><label>PMS conectado</label><select name="pms"><option ${state.clinic.pms === "Klinikare API" ? "selected" : ""}>Klinikare API</option><option ${state.clinic.pms === "Gesden G5 conector local" ? "selected" : ""}>Gesden G5 conector local</option><option ${state.clinic.pms === "Clinic Cloud API" ? "selected" : ""}>Clinic Cloud API</option><option ${state.clinic.pms === "Agenda standalone" ? "selected" : ""}>Agenda standalone</option></select></div>
        <div class="field"><label>Telefono desviado</label><input name="phone" value="${escapeAttr(state.clinic.phone)}"></div>
        <div class="field"><label>Retencion transcripciones</label><input type="number" name="retentionDays" value="${state.clinic.retentionDays}"></div>
        <div class="field"><label>Tono</label><input name="tone" value="${escapeAttr(state.settings.tone)}"></div>
        <div class="field" style="grid-column:1/-1"><label>Reglas de escalado</label><textarea name="escalation">${escapeHtml(state.settings.escalation)}</textarea></div>
        <div class="field" style="grid-column:1/-1"><label>RGPD / AI Act</label><textarea name="rgpd">${escapeHtml(state.settings.rgpd)}</textarea><small>Dato de salud: minimo necesario, auditoria y residencia UE.</small></div>
      </form>
    </section>
  `;
}

function bindSearches() {
  const conversationSearch = document.getElementById("conversationSearch");
  if (conversationSearch) conversationSearch.addEventListener("input", () => filterTable("conversationTable", conversationSearch.value));
  const patientSearch = document.getElementById("patientSearch");
  if (patientSearch) patientSearch.addEventListener("input", () => filterTable("patientTable", patientSearch.value));
}

function filterTable(tableId, value) {
  const q = value.toLowerCase();
  document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
    row.style.display = row.dataset.search.includes(q) ? "" : "none";
  });
}

function openConversation(id) {
  const conv = state.conversations.find(item => item.id === id);
  if (!conv) return;
  conv.unread = false;
  saveState();
  selectedConversation = id;
  const p = patient(conv.patientId);
  const drawer = document.getElementById("drawer");
  drawer.innerHTML = `
    <div class="drawer-head">
      <div><h2>Detalles de la conversacion</h2><p>${escapeHtml(p.name)} · ${escapeHtml(p.phone)}</p></div>
      <button class="icon-button" onclick="closeDrawer()">x</button>
    </div>
    <div class="drawer-body">
      <div class="toolbar"><span class="pill ${conv.status.includes("Humano") ? "red" : "green"}">${escapeHtml(conv.status)}</span><span class="pill blue">${escapeHtml(conv.channel)}</span><span class="pill purple">${escapeHtml(conv.result)}</span></div>
      <div class="messages">
        ${conv.messages.map(msg => `<div class="message ${msg.from === "patient" ? "patient" : msg.from === "system" ? "system" : ""}">${escapeHtml(msg.text)}<span>${escapeHtml(msg.from)} · ${escapeHtml(msg.at)}</span></div>`).join("")}
      </div>
    </div>
    <form class="drawer-foot" onsubmit="replyConversation(event)">
      <input name="reply" placeholder="Responder o anadir nota..." style="flex:1;border:1px solid var(--line);border-radius:8px;padding:10px">
      <button class="button" type="button" onclick="createAppointmentFromConversation()">Agendar</button>
      <button class="button primary" type="submit">Enviar</button>
    </form>
  `;
  drawer.classList.add("open");
}

function openPatient(id) {
  const p = state.patients.find(item => item.id === id);
  if (!p) return;
  selectedPatient = id;
  const patientAppointments = state.appointments.filter(item => item.patientId === id);
  const drawer = document.getElementById("drawer");
  drawer.innerHTML = `
    <div class="drawer-head">
      <div><h2>${escapeHtml(p.name)}</h2><p>${escapeHtml(p.phone)} · ${escapeHtml(p.email)}</p></div>
      <button class="icon-button" onclick="closeDrawer()">x</button>
    </div>
    <div class="drawer-body">
      <div class="grid two">
        <div class="work-card"><strong>Estado</strong><p>${escapeHtml(p.status)}</p><span class="pill green">${escapeHtml(p.risk)}</span></div>
        <div class="work-card"><strong>Valor estimado</strong><p>${money(p.value)}</p><span class="pill ${p.consent ? "green" : "red"}">${p.consent ? "Consentimiento firmado" : "Consentimiento pendiente"}</span></div>
      </div>
      <h3>Citas</h3>
      <div class="grid">${patientAppointments.map(a => `<div class="work-card"><strong>${escapeHtml(a.type)}</strong><p>${escapeHtml(a.date)} · ${escapeHtml(a.time)} · ${escapeHtml(a.doctor)}</p></div>`).join("") || `<div class="empty">Sin citas todavia.</div>`}</div>
    </div>
    <div class="drawer-foot"><button class="button" onclick="toggleConsent('${p.id}')">Cambiar consentimiento</button><button class="button primary" onclick="openAppointmentModal('${p.id}')">Nueva cita</button></div>
  `;
  drawer.classList.add("open");
}

function closeDrawer() {
  const drawer = document.getElementById("drawer");
  if (drawer) drawer.classList.remove("open");
  render();
}

function replyConversation(event) {
  event.preventDefault();
  const text = new FormData(event.target).get("reply").trim();
  if (!text || !selectedConversation) return;
  const conv = state.conversations.find(item => item.id === selectedConversation);
  conv.messages.push({ from: "ai", text, at: "ahora" });
  conv.status = "Activa";
  saveState();
  openConversation(selectedConversation);
  toast("Respuesta enviada");
}

function createAppointmentFromConversation() {
  const conv = state.conversations.find(item => item.id === selectedConversation);
  if (!conv) return;
  openAppointmentModal(conv.patientId);
}

function toggleAssistant() {
  state.clinic.assistantEnabled = !state.clinic.assistantEnabled;
  saveState();
  render();
  toast(state.clinic.assistantEnabled ? "Recepcionista IA activada" : "Recepcionista IA pausada");
}

function toggleChannel(key) {
  state.settings[key] = !state.settings[key];
  saveState();
  render();
  toast("Canal actualizado");
}

function toggleConsent(id) {
  const p = state.patients.find(item => item.id === id);
  p.consent = !p.consent;
  saveState();
  openPatient(id);
}

function completeTask(id) {
  const task = state.tasks.find(item => item.id === id);
  task.status = "Completada";
  saveState();
  render();
  toast("Tarea completada");
}

function simulateInbound() {
  const p = { id: uid("p"), name: "Paciente nuevo web", phone: "+34 611 000 392", email: "lead@web.es", status: "Nuevo lead", treatment: "Blanqueamiento", source: "Widget web", value: 240, consent: false, lastVisit: "Sin visita", risk: "Respuesta inmediata" };
  state.patients.unshift(p);
  state.conversations.unshift({ id: uid("c"), patientId: p.id, channel: "Web", started: "ahora", result: "Lead capturado", status: "Activa", unread: true, messages: [
    { from: "patient", text: "Hola, quiero informacion sobre blanqueamiento.", at: "ahora" },
    { from: "ai", text: "Claro. Puedo explicarte opciones y reservar una valoracion breve.", at: "ahora" }
  ] });
  saveState();
  render();
  toast("Nueva conversacion entrante");
}

function saveSettings() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  const data = new FormData(form);
  state.clinic.name = data.get("name");
  state.clinic.assistantName = data.get("assistantName");
  state.clinic.pms = data.get("pms");
  state.clinic.phone = data.get("phone");
  state.clinic.retentionDays = Number(data.get("retentionDays"));
  state.settings.tone = data.get("tone");
  state.settings.escalation = data.get("escalation");
  state.settings.rgpd = data.get("rgpd");
  saveState();
  render();
  toast("Configuracion guardada");
}

function openAppointmentModal(patientId = "") {
  openModal("Nueva cita", `
    <form id="appointmentForm" class="form-grid two">
      <div class="field"><label>Paciente</label><select name="patientId" required>${state.patients.map(p => `<option value="${p.id}" ${p.id === patientId ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Tipo</label><select name="type">${state.treatments.map(t => `<option>${escapeHtml(t.name)}</option>`).join("")}</select></div>
      <div class="field"><label>Fecha</label><input type="date" name="date" value="2026-07-09" required></div>
      <div class="field"><label>Hora</label><input type="time" name="time" value="10:30" required></div>
      <div class="field"><label>Doctor</label><input name="doctor" value="Dra. Laura Vidal"></div>
      <div class="field"><label>Gabinete</label><input name="room" value="Gabinete 2"></div>
      <div class="field"><label>Estado</label><select name="status"><option>Pendiente</option><option>Confirmada</option><option>Urgente</option></select></div>
      <div class="field"><label>Canal</label><select name="channel"><option>WhatsApp</option><option>Voz</option><option>SMS</option><option>Web</option></select></div>
    </form>
  `, "Crear cita", () => {
    const data = Object.fromEntries(new FormData(document.getElementById("appointmentForm")));
    state.appointments.push({ id: uid("a"), duration: 30, ai: true, ...data });
    saveState();
    closeModal();
    render();
    toast("Cita creada");
  });
}

function openPatientModal() {
  openModal("Nuevo paciente", `
    <form id="patientForm" class="form-grid two">
      <div class="field"><label>Nombre</label><input name="name" required></div>
      <div class="field"><label>Telefono</label><input name="phone" required></div>
      <div class="field"><label>Email</label><input name="email" type="email"></div>
      <div class="field"><label>Tratamiento</label><input name="treatment" value="Revision dental"></div>
      <div class="field"><label>Fuente</label><select name="source"><option>WhatsApp</option><option>Llamada</option><option>Widget web</option><option>Campana</option></select></div>
      <div class="field"><label>Valor estimado</label><input name="value" type="number" value="350"></div>
    </form>
  `, "Crear paciente", () => {
    const data = Object.fromEntries(new FormData(document.getElementById("patientForm")));
    state.patients.unshift({ id: uid("p"), status: "Nuevo lead", consent: false, lastVisit: "Sin visita", risk: "Sin clasificar", value: Number(data.value || 0), ...data });
    saveState();
    closeModal();
    render();
    toast("Paciente creado");
  });
}

function openTaskModal() {
  openModal("Nueva tarea", `
    <form id="taskForm" class="form-grid">
      <div class="field"><label>Titulo</label><input name="title" required></div>
      <div class="field"><label>Tipo</label><select name="type"><option>Recepcion</option><option>Presupuesto</option><option>RGPD</option><option>Campana</option></select></div>
      <div class="field"><label>Vencimiento</label><input type="date" name="due" value="${today}"></div>
      <div class="field"><label>Prioridad</label><select name="priority"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
    </form>
  `, "Crear tarea", () => {
    const data = Object.fromEntries(new FormData(document.getElementById("taskForm")));
    state.tasks.unshift({ id: uid("t"), status: "Pendiente", linked: "", ...data });
    saveState();
    closeModal();
    render();
    toast("Tarea creada");
  });
}

function openTreatmentModal() {
  openModal("Nuevo tratamiento", `
    <form id="treatmentForm" class="form-grid two">
      <div class="field"><label>Nombre</label><input name="name" required></div>
      <div class="field"><label>Duracion</label><input name="duration" type="number" value="30"></div>
      <div class="field"><label>Precio autorizado</label><input name="price" type="number" placeholder="Dejar vacio si requiere valoracion"></div>
      <div class="field"><label>Doctor</label><input name="doctor" value="Cualquier doctor"></div>
      <div class="field"><label>Gabinete</label><input name="room" value="Gabinete"></div>
      <div class="field" style="grid-column:1/-1"><label>Reglas</label><textarea name="rules">Clara puede orientar y agendar, no diagnosticar.</textarea></div>
    </form>
  `, "Crear tratamiento", () => {
    const data = Object.fromEntries(new FormData(document.getElementById("treatmentForm")));
    state.treatments.push({ id: uid("tr"), duration: Number(data.duration), price: data.price ? Number(data.price) : null, name: data.name, doctor: data.doctor, room: data.room, rules: data.rules });
    saveState();
    closeModal();
    render();
    toast("Tratamiento creado");
  });
}

function openModal(title, body, actionLabel, onConfirm) {
  const modal = document.getElementById("modal");
  modal.innerHTML = `
    <div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-button" onclick="closeModal()">x</button></div>
    <div class="modal-body">${body}</div>
    <div class="modal-foot"><button class="button" onclick="closeModal()">Cancelar</button><button class="button primary" id="modalConfirm">${escapeHtml(actionLabel)}</button></div>
  `;
  modal.showModal();
  document.getElementById("modalConfirm").onclick = onConfirm;
}

function closeModal() {
  document.getElementById("modal").close();
}

function filterConversations() {
  const rows = document.querySelectorAll("#conversationTable tbody tr");
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes("urgencia") || row.textContent.toLowerCase().includes("humano") ? "" : "none";
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

render();
