// Fase 1 del refactor de arquitectura. Traduce el DentalAgentState actual (el que ya
// usan dental-senior-agent.ts/openai-dental-agent.ts/guardrails.ts/index.ts) al
// vocabulario nuevo de dental-agent-types.ts, sin cambiar el tipo que consume el resto
// del codigo todavia. Nada llama a esto hasta la fase 2 (el reductor).
import {
  hasConcreteAvailability,
  type DentalAgentState,
  type DentalIntentId
} from "@/lib/agent/dental-senior-agent";
import type {
  BookingStatus,
  ConversationIntent,
  ConversationStatus,
  TreatmentTopic
} from "@/lib/agent/dental-agent-types";

export type ExtendedDentalAgentState = DentalAgentState & {
  conversationIntent: ConversationIntent;
  treatmentTopic: TreatmentTopic;
  bookingStatus: BookingStatus;
  conversationStatus: ConversationStatus;
};

// Estado real del Appointment en Prisma, si el llamador lo conoce. La regla del
// documento de refactor es explicita: nunca inferir "confirmada" de una cadena de
// disponibilidad textual, solo de este dato real cuando existe.
export type AppointmentConfirmationContext = {
  appointmentStatus?: "REQUESTED" | "PROPOSED" | "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED" | "URGENT";
};

const TREATMENT_TOPIC_BY_INTENT: Record<DentalIntentId, TreatmentTopic> = {
  first_visit: "first_visit",
  urgent_pain: "general_dentistry",
  implant_price: "implant",
  whitening: "whitening",
  reactivation: "hygiene",
  cosmetic_dentistry: "cosmetic_dentistry",
  orthodontics: "orthodontics",
  endodontics: "endodontics",
  caries_restoration: "restoration",
  periodontics: "periodontics",
  prosthetics: "prosthetics",
  wisdom_tooth: "wisdom_tooth",
  tmj_bruxism: "tmj_bruxism",
  trauma: "trauma"
};

const TRIAGE_LEVELS = new Set(["EMERGENCY", "URGENT_24H", "PRIORITY_72H", "ROUTINE", "ESTHETIC"]);
const CONFIDENCE_LEVELS = new Set(["Baja", "Media", "Alta"]);

// Intents cuyo motivo de fondo es agendar/valorar un tratamiento programable, no un
// sintoma activo (ver PRICE_FORWARD_INTENTS en dental-senior-agent.ts, que ya trata
// estos mismos intents como "sin triaje clinico, ir directo a agenda"). Antes de dar
// consentimiento, un mensaje con uno de estos intents es una peticion de cita, no un
// sintoma: "cita para una limpieza" nunca debe clasificarse como conversationIntent
// "symptom".
const BOOKING_MOTIVATED_INTENTS = new Set<DentalIntentId>([
  "reactivation",
  "first_visit",
  "whitening",
  "cosmetic_dentistry",
  "orthodontics",
  "implant_price"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Acepta cualquier estado persistido (antiguo o ya migrado), le aplica valores por
 * defecto seguros para campos ausentes, y añade las dimensiones nuevas
 * (conversationIntent/treatmentTopic/bookingStatus/conversationStatus) derivadas del
 * estado actual. Nunca descarta datos ya validos de nombre/telefono/email/sede/
 * disponibilidad, y nunca marca una reserva como confirmada sin una señal real del
 * Appointment (ver mapBookingStatus).
 */
export function normalizeDentalAgentState(
  input: unknown,
  context: AppointmentConfirmationContext = {}
): ExtendedDentalAgentState {
  const base = isRecord(input) ? input : {};

  const intent = typeof base.intent === "string" ? (base.intent as DentalIntentId) : undefined;

  const state: DentalAgentState = {
    intent,
    intentCode: stringOrDefault(base.intentCode, "INTENCION_PENDIENTE"),
    treatmentNeed: stringOrDefault(base.treatmentNeed, "Pendiente de clasificar"),
    budget: stringOrDefault(base.budget, "Pendiente"),
    estimatedValue: typeof base.estimatedValue === "number" ? base.estimatedValue : 0,
    escalated: Boolean(base.escalated),
    consent: Boolean(base.consent),
    name: stringField(base.name),
    phone: stringField(base.phone),
    email: stringField(base.email),
    location: stringField(base.location),
    availability: stringField(base.availability),
    offeredAvailabilityOptions: stringArray(base.offeredAvailabilityOptions),
    ready: Boolean(base.ready),
    triageLevel: (TRIAGE_LEVELS.has(base.triageLevel as string) ? base.triageLevel : "ROUTINE") as DentalAgentState["triageLevel"],
    triageLabel: stringOrDefault(base.triageLabel, "Cita normal"),
    clinicalReading: stringOrDefault(base.clinicalReading, "Esperando descripción del paciente."),
    likelyCauses: stringArray(base.likelyCauses),
    detectedSignals: stringArray(base.detectedSignals),
    redFlags: stringArray(base.redFlags),
    missingClinicalData: stringArray(base.missingClinicalData),
    confidence: (CONFIDENCE_LEVELS.has(base.confidence as string) ? base.confidence : "Baja") as DentalAgentState["confidence"],
    safetyScreened: Boolean(base.safetyScreened),
    requiresGuardian: Boolean(base.requiresGuardian),
    dataErasureRequested: Boolean(base.dataErasureRequested)
  };

  return {
    ...state,
    treatmentTopic: mapTreatmentTopic(state.intent),
    conversationIntent: mapConversationIntent(state),
    bookingStatus: mapBookingStatus(state, context),
    conversationStatus: mapConversationStatus(state)
  };
}

function mapTreatmentTopic(intent: DentalIntentId | undefined): TreatmentTopic {
  if (!intent) return "unknown";
  return TREATMENT_TOPIC_BY_INTENT[intent] ?? "unknown";
}

// Exportado para que dental-agent-router.ts la reuse como ULTIMO recurso (fallback)
// cuando ninguna señal de texto (routeConversationIntent) ni de contexto de reserva
// (gestion de cita existente, seleccion de hueco) clasifica el turno - nunca como
// fuente primaria, para no volver a conflar conversationIntent con el intent clinico.
export function mapConversationIntent(state: DentalAgentState): ConversationIntent {
  if (state.dataErasureRequested) return "data_erasure";
  if (!state.intent) return "unknown";
  if (state.ready) return "confirm";
  if (state.consent) return "provide_data";
  if (BOOKING_MOTIVATED_INTENTS.has(state.intent)) return "book_appointment";
  return "symptom";
}

function mapBookingStatus(state: DentalAgentState, context: AppointmentConfirmationContext): BookingStatus {
  if (context.appointmentStatus === "CANCELLED") return "CANCELLED";
  if (context.appointmentStatus === "CONFIRMED") return "CONFIRMED";
  // Regla explicita del documento de refactor: nunca inferir CONFIRMED solo de
  // state.ready o de una cadena de disponibilidad textual. Sin una señal real del
  // Appointment, lo maximo que se infiere es PREBOOKED (pre-reserva local).
  if (state.ready && hasConcreteAvailability(state.availability)) return "PREBOOKED";
  if (state.availability) return "SLOT_SELECTED";
  if (state.offeredAvailabilityOptions.length > 0) return "SLOTS_OFFERED";
  if (state.location) return "READY_TO_OFFER_SLOTS";
  if (state.consent) return "COLLECTING_PATIENT_DATA";
  if (state.intent) return "COLLECTING_CONSENT";
  return "IDLE";
}

function mapConversationStatus(state: DentalAgentState): ConversationStatus {
  if (state.requiresGuardian || state.escalated) return "ESCALATED";
  return "ACTIVE";
}
