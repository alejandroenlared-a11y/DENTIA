import {
  AppointmentStatus,
  CalendarEventType,
  ConversationChannel,
  ElectronicInvoiceStatus,
  InvoiceDocumentType,
  InvoiceReceiverType,
  PatientStatus,
  PatientSex,
  PatientIntakeStatus,
  TaskPriority
} from "@prisma/client";
import { z } from "zod";

const requiredString = z.string().trim().min(1, "es obligatorio");
const clinicLocationSchema = z.enum(["MURCIA", "ELCHE"]).default("MURCIA");
const checkboxSchema = z
  .string()
  .optional()
  .transform(value => value === "on");

export const patientInputSchema = z.object({
  primaryLocation: clinicLocationSchema,
  name: requiredString,
  lastName: z.string().trim().optional(),
  sex: z.nativeEnum(PatientSex).optional().or(z.literal("")),
  birthDate: z.string().trim().optional(),
  idDocument: z.string().trim().optional(),
  phone: requiredString,
  email: z.string().trim().email("no es valido").optional().or(z.literal("")),
  addressStreet: z.string().trim().optional(),
  addressPostalCode: z.string().trim().optional(),
  addressCity: z.string().trim().optional(),
  addressProvince: z.string().trim().optional(),
  guardianName: z.string().trim().optional(),
  guardianRelationship: z.string().trim().optional(),
  guardianIdDocument: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  currentMedication: z.string().trim().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  fiscalName: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  fiscalAddress: z.string().trim().optional(),
  referredByProvider: z.string().trim().optional(),
  treatmentNeed: z.string().trim().optional(),
  source: z.string().trim().optional(),
  estimatedValue: z.coerce.number().int("debe ser un numero entero").min(0, "no puede ser negativo").default(0),
  consentDataProcessing: checkboxSchema,
  consentMarketing: checkboxSchema
});

export const patientStatusSchema = z.object({
  patientId: requiredString,
  status: z.nativeEnum(PatientStatus)
});

export const appointmentInputSchema = z.object({
  location: clinicLocationSchema,
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

export const calendarEventInputSchema = z.object({
  location: clinicLocationSchema,
  providerId: z.string().trim().optional(),
  operatoryId: z.string().trim().optional(),
  title: requiredString,
  type: z.nativeEnum(CalendarEventType).default(CalendarEventType.MEETING),
  date: requiredString,
  time: requiredString,
  durationMinutes: z.coerce.number().int().min(15).max(480).default(30),
  notes: z.string().trim().optional()
});

export const calendarEventIdSchema = z.object({
  eventId: requiredString
});

export const appointmentIdSchema = z.object({
  appointmentId: requiredString
});

export const appointmentRescheduleSchema = z.object({
  appointmentId: requiredString,
  date: requiredString,
  time: requiredString
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

export const patientIntakeStatusSchema = z.object({
  intakeId: requiredString,
  targetStatus: z.nativeEnum(PatientIntakeStatus)
});

export const taskFromPatientIntakeSchema = z.object({
  intakeId: requiredString,
  title: requiredString,
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.HIGH)
});

export const interactiveDemoSchema = z.object({
  transcript: z.string().trim().min(2, "es obligatorio").max(12000, "es demasiado largo"),
  intent: requiredString,
  patientName: requiredString,
  phone: requiredString,
  treatmentNeed: requiredString,
  estimatedValue: z.coerce.number().int("debe ser un numero entero").min(0, "no puede ser negativo").default(0),
  budget: z.string().trim().optional(),
  location: z.string().trim().optional(),
  availability: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  escalated: z.string().optional()
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
  legalName: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  fiscalAddress: z.string().trim().optional(),
  invoiceSeries: z.string().trim().min(1, "es obligatorio").max(8, "maximo 8 caracteres"),
  electronicInvoiceProvider: z.string().trim().optional(),
  sifMode: z.enum(["NOT_CONFIGURED", "NO_VERIFACTU", "VERIFACTU"]),
  pmsProvider: requiredString,
  retentionDays: z.coerce
    .number()
    .int("debe ser un numero entero")
    .min(1, "minimo 1 dia")
    .max(3650, "maximo 3650 dias"),
  tone: requiredString,
  escalationRules: requiredString,
  rgpdNotes: requiredString,
  knowledgeNotes: z.string().trim().optional()
});

export const invoiceInputSchema = z
  .object({
    patientId: requiredString,
    treatmentName: requiredString,
    amount: z.coerce.number().min(0.01, "debe ser mayor que cero"),
    taxRate: z.coerce.number().min(0, "no puede ser negativo").max(100, "no puede superar el 100").default(0),
    receiverType: z.nativeEnum(InvoiceReceiverType).default(InvoiceReceiverType.PATIENT),
    documentType: z.nativeEnum(InvoiceDocumentType).default(InvoiceDocumentType.COMPLETE),
    receiverName: z.string().trim().optional(),
    receiverTaxId: z.string().trim().optional(),
    receiverAddress: z.string().trim().optional(),
    receiverEmail: z.string().trim().email("no es valido").optional().or(z.literal("")),
    taxExemptionReason: z.string().trim().optional(),
    dueAt: requiredString,
    notes: z.string().trim().optional()
  })
  .superRefine((value, ctx) => {
    if (value.receiverType !== InvoiceReceiverType.PATIENT) {
      if (!value.receiverName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["receiverName"], message: "es obligatorio para factura B2B" });
      }
      if (!value.receiverTaxId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["receiverTaxId"], message: "es obligatorio para factura B2B" });
      }
    }
  });

export const invoiceElectronicStatusSchema = z.object({
  invoiceId: requiredString,
  electronicStatus: z.nativeEnum(ElectronicInvoiceStatus),
  rejectReason: z.string().trim().optional()
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
  body: z.string().trim().min(1, "es obligatorio").max(3000, "es demasiado largo")
});

const fieldLabels: Record<string, string> = {
  name: "Nombre",
  phone: "Telefono",
  email: "Email",
  fiscalName: "Nombre fiscal",
  taxId: "NIF/CIF",
  fiscalAddress: "Direccion fiscal",
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
  intakeId: "Pre-ficha",
  targetStatus: "Estado de pre-ficha",
  body: "Respuesta",
  durationMinutes: "Duracion",
  price: "Precio",
  rules: "Reglas",
  transcript: "Conversacion",
  intent: "Intencion",
  patientName: "Paciente",
  budget: "Presupuesto",
  location: "Sede",
  availability: "Disponibilidad",
  summary: "Resumen",
  escalated: "Escalado",
  assistantName: "Nombre del asistente",
  pmsProvider: "PMS conectado",
  retentionDays: "Retencion",
  tone: "Tono",
  escalationRules: "Reglas de escalado",
  rgpdNotes: "Notas RGPD",
  legalName: "Razon social",
  invoiceSeries: "Serie de factura",
  electronicInvoiceProvider: "Proveedor factura electronica",
  sifMode: "Modo SIF",
  password: "Contrasena",
  clinicName: "Nombre de clinica",
  slug: "Identificador",
  userName: "Nombre de usuario",
  role: "Rol",
  from: "Remitente",
  kind: "Tipo de consentimiento",
  amount: "Importe",
  taxRate: "IVA",
  receiverType: "Destinatario",
  documentType: "Tipo de factura",
  receiverName: "Nombre fiscal destinatario",
  receiverTaxId: "NIF/CIF destinatario",
  receiverAddress: "Direccion fiscal destinatario",
  receiverEmail: "Email destinatario",
  taxExemptionReason: "Motivo de exencion",
  invoiceId: "Factura",
  electronicStatus: "Estado electronico",
  rejectReason: "Motivo de rechazo"
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
