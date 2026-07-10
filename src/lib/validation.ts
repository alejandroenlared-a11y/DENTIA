import { AppointmentStatus, ConversationChannel, TaskPriority } from "@prisma/client";
import { z } from "zod";

const requiredString = z.string().trim().min(1, "es obligatorio");

export const patientInputSchema = z.object({
  name: requiredString,
  phone: requiredString,
  email: z.string().trim().email("no es valido").optional().or(z.literal("")),
  treatmentNeed: z.string().trim().optional(),
  source: z.string().trim().optional(),
  estimatedValue: z.coerce.number().int("debe ser un numero entero").min(0, "no puede ser negativo").default(0)
});

export const appointmentInputSchema = z.object({
  patientId: requiredString,
  treatmentId: z.string().trim().optional(),
  providerId: z.string().trim().optional(),
  operatoryId: z.string().trim().optional(),
  title: requiredString,
  date: requiredString,
  time: requiredString,
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.REQUESTED),
  channel: z.nativeEnum(ConversationChannel).default(ConversationChannel.WHATSAPP)
});

export const taskInputSchema = z.object({
  patientId: z.string().trim().optional(),
  title: requiredString,
  type: requiredString,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: z.string().trim().optional()
});

export const taskIdSchema = z.object({ taskId: requiredString });

export const conversationIdSchema = z.object({ conversationId: requiredString });

export const conversationReplySchema = z.object({
  conversationId: requiredString,
  body: z.string().trim().min(2, "necesita al menos 2 caracteres")
});

export const taskFromConversationSchema = z.object({
  conversationId: requiredString,
  title: requiredString,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.HIGH)
});

export const treatmentInputSchema = z.object({
  name: requiredString,
  durationMinutes: z.coerce.number().int("debe ser un numero entero").min(5, "minimo 5 minutos"),
  price: z.preprocess(
    value => (value === "" || value === null ? undefined : value),
    z.coerce.number().int("debe ser un numero entero").min(0, "no puede ser negativo").optional()
  ),
  requiresAssessment: z.string().optional(),
  rules: requiredString
});

export const settingsInputSchema = z.object({
  name: requiredString,
  assistantName: requiredString,
  phone: z.string().trim().optional(),
  pmsProvider: requiredString,
  retentionDays: z.coerce
    .number()
    .int("debe ser un numero entero")
    .min(1, "minimo 1 dia")
    .max(3650, "maximo 3650 dias"),
  tone: requiredString,
  escalationRules: requiredString,
  rgpdNotes: requiredString
});

export const loginInputSchema = z.object({
  email: z.string().trim().email("no es valido"),
  password: z.string().min(1, "es obligatorio")
});

export const signupInputSchema = z.object({
  clinicName: requiredString,
  slug: z
    .string()
    .trim()
    .min(3, "minimo 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "solo minusculas, numeros y guiones"),
  userName: requiredString,
  email: z.string().trim().email("no es valido"),
  password: z.string().min(8, "minimo 8 caracteres")
});

export const inviteUserSchema = z.object({
  name: requiredString,
  email: z.string().trim().email("no es valido"),
  password: z.string().min(8, "minimo 8 caracteres"),
  role: z.enum(["MANAGER", "RECEPTION", "DOCTOR", "READ_ONLY"])
});

export const consentToggleSchema = z.object({
  patientId: requiredString,
  kind: z.enum(["DATA_PROCESSING", "CALL_RECORDING", "MARKETING", "AI_DISCLOSURE"])
});

export const inboundMessageSchema = z.object({
  from: requiredString,
  name: z.string().trim().optional(),
  body: z.string().trim().min(1, "es obligatorio")
});

const fieldLabels: Record<string, string> = {
  name: "Nombre",
  phone: "Telefono",
  email: "Email",
  treatmentNeed: "Necesidad",
  source: "Fuente",
  estimatedValue: "Valor estimado",
  patientId: "Paciente",
  treatmentId: "Tratamiento",
  title: "Titulo",
  date: "Fecha",
  time: "Hora",
  status: "Estado",
  channel: "Canal",
  type: "Tipo",
  priority: "Prioridad",
  dueAt: "Vencimiento",
  taskId: "Tarea",
  conversationId: "Conversacion",
  body: "Respuesta",
  durationMinutes: "Duracion",
  price: "Precio",
  rules: "Reglas",
  assistantName: "Nombre del asistente",
  pmsProvider: "PMS conectado",
  retentionDays: "Retencion",
  tone: "Tono",
  escalationRules: "Reglas de escalado",
  rgpdNotes: "Notas RGPD",
  password: "Contrasena",
  clinicName: "Nombre de clinica",
  slug: "Identificador",
  userName: "Nombre de usuario",
  role: "Rol",
  from: "Remitente",
  kind: "Tipo de consentimiento"
};

export function firstErrorMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) {
    return "Los datos del formulario no son validos.";
  }
  const field = typeof issue.path[0] === "string" ? issue.path[0] : "";
  const label = fieldLabels[field] ?? field ?? "El formulario";
  const detail = issue.code === "invalid_type" ? "es obligatorio" : issue.message;
  return `${label}: ${detail}.`;
}
