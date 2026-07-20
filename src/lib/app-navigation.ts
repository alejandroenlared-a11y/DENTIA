import type { AppView } from "@/lib/dashboard";
import type { IconName } from "@/components/icon";

export type NavBadge = "unread" | "tasks";

export type NavItem = {
  id: AppView;
  label: string;
  shortLabel?: string;
  icon: IconName;
  badge?: NavBadge;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type ViewMeta = {
  eyebrow: string;
  title: string;
  search: string;
  action: string;
  actionView: AppView;
};

export const navGroups: NavGroup[] = [
  {
    label: "Operacion",
    items: [
      { id: "home", label: "Inicio", shortLabel: "Inicio", icon: "home" },
      { id: "calendar", label: "Agenda", shortLabel: "Citas", icon: "calendar" },
      { id: "patients", label: "Pacientes", shortLabel: "Pac.", icon: "users" },
      { id: "clinic", label: "Clinica", shortLabel: "Clin.", icon: "clinic" },
      { id: "treatments", label: "Tratamientos", shortLabel: "Planes", icon: "tooth" }
    ]
  },
  {
    label: "Crecimiento",
    items: [
      { id: "inbox", label: "Bandeja omnicanal", shortLabel: "Chat", icon: "inbox", badge: "unread" },
      { id: "agent", label: "Recepcionista IA", shortLabel: "Clara", icon: "bot" },
      { id: "aiReview", label: "Revision IA", icon: "aiReview" },
      { id: "crm", label: "CRM", icon: "crm" },
      { id: "automations", label: "Automatizaciones", shortLabel: "Reglas", icon: "automations" }
    ]
  },
  {
    label: "Gestion",
    items: [
      { id: "billing", label: "Finanzas", icon: "euro" },
      { id: "documents", label: "Documentos", shortLabel: "Docs", icon: "documents" },
      { id: "inventory", label: "Inventario", shortLabel: "Stock", icon: "inventory" },
      { id: "lab", label: "Laboratorio", shortLabel: "Lab", icon: "lab" },
      { id: "team", label: "Equipo", icon: "team" },
      { id: "analytics", label: "Analitica", shortLabel: "Datos", icon: "analytics" },
      { id: "imaging", label: "Radiologia", shortLabel: "RX", icon: "imaging" },
      { id: "tasks", label: "Colas de trabajo", shortLabel: "Tareas", icon: "task", badge: "tasks" },
      { id: "settings", label: "Configuracion", shortLabel: "Config", icon: "settings" }
    ]
  }
];

export const navItems = navGroups.flatMap(group => group.items);

export const viewMeta: Record<AppView, ViewMeta> = {
  home: { eyebrow: "Centro de control", title: "Inicio", search: "Buscar paciente, cita...", action: "Crear cita", actionView: "calendar" },
  calendar: { eyebrow: "Agenda diaria", title: "Agenda", search: "Buscar paciente o cita...", action: "Nueva cita", actionView: "calendar" },
  inbox: { eyebrow: "CRM omnicanal", title: "Bandeja omnicanal", search: "Buscar paciente o mensaje...", action: "Crear tarea", actionView: "tasks" },
  agent: { eyebrow: "IA operativa", title: "Recepcionista IA", search: "Buscar sesion o escenario...", action: "Crear cita", actionView: "calendar" },
  aiReview: { eyebrow: "Revision humana", title: "Revision IA", search: "Buscar paciente o registro...", action: "Crear tarea", actionView: "tasks" },
  patients: { eyebrow: "Historia clinica", title: "Pacientes", search: "Buscar paciente, historia o DNI...", action: "Nuevo paciente", actionView: "patients" },
  clinic: { eyebrow: "Encuentros del dia", title: "Clinica", search: "Buscar paciente o cita...", action: "Abrir encuentro", actionView: "clinic" },
  treatments: { eyebrow: "Planes", title: "Tratamientos", search: "Buscar tratamiento o codigo...", action: "Nuevo plan", actionView: "treatments" },
  tasks: { eyebrow: "Trabajo pendiente", title: "Colas de trabajo", search: "Buscar tarea o paciente...", action: "Crear tarea", actionView: "tasks" },
  crm: { eyebrow: "Pipeline comercial", title: "CRM", search: "Buscar lead o tratamiento...", action: "Crear lead", actionView: "crm" },
  billing: { eyebrow: "Finanzas", title: "Finanzas", search: "Buscar paciente o factura...", action: "Nueva factura", actionView: "billing" },
  documents: { eyebrow: "Biblioteca", title: "Documentos", search: "Buscar paciente o documento...", action: "Generar doc.", actionView: "documents" },
  inventory: { eyebrow: "Stock clinico", title: "Inventario", search: "Buscar producto, lote o proveedor...", action: "Crear pedido", actionView: "inventory" },
  lab: { eyebrow: "Protesis", title: "Laboratorio", search: "Buscar paciente, ID o trabajo...", action: "Nuevo trabajo", actionView: "lab" },
  team: { eyebrow: "Sedes y equipo", title: "Equipo", search: "Buscar profesional o sede...", action: "Invitar usuario", actionView: "settings" },
  analytics: { eyebrow: "Cuadro ejecutivo", title: "Analitica", search: "Buscar reporte o metrica...", action: "Crear reporte", actionView: "analytics" },
  automations: { eyebrow: "Reglas", title: "Automatizaciones", search: "Buscar automatizacion...", action: "Nueva regla", actionView: "automations" },
  imaging: { eyebrow: "Visor radiologico", title: "Radiologia", search: "Buscar paciente o imagen...", action: "Adjuntar RX", actionView: "imaging" },
  settings: { eyebrow: "Configuracion", title: "Configuracion", search: "Buscar en configuracion...", action: "Guardar", actionView: "settings" }
};

export function isView(value: unknown): value is AppView {
  return typeof value === "string" && navItems.some(item => item.id === value);
}

export function primaryActionHref(view: AppView, actionView: AppView) {
  if (view === "calendar") return "/?view=calendar#new-appointment";
  if (view === "patients") return "/?view=patients#new-patient";
  if (view === "treatments") return "/?view=treatments#new-treatment";
  if (view === "billing") return "/?view=billing#new-invoice";
  if (view === "settings" || actionView === "settings") return "/?view=settings";
  return `/?view=${actionView}`;
}
