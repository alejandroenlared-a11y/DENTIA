// Fase 1 del refactor de arquitectura (ver PLAN_REFACTORIZACION_AGENTE_DENTAL_CLAUDE.md).
// Vocabulario nuevo, separado del `DentalIntentId` actual de dental-senior-agent.ts
// (que hoy mezcla motivo clinico + tratamiento + urgencia + estado de reserva en un
// unico campo). Estos tipos no se usan todavia en runDentalSeniorTurn/preparePatientReply
// (eso es la fase 2, el reductor) — esta fase solo define el vocabulario y la migracion.

// Arrays de valores en runtime (no solo tipos) porque fase 4 los reusa como
// z.enum(...) en el schema Zod/JSON que ve la IA (V2). El tipo se deriva del array
// para que ambos no puedan desincronizarse.
export const CONVERSATION_INTENT_VALUES = [
  "greeting",
  "symptom",
  "book_appointment",
  "reschedule_appointment",
  "cancel_appointment",
  "ask_price",
  "ask_location",
  "ask_hours",
  "ask_team",
  "ask_treatment",
  "provide_data",
  "select_slot",
  "confirm",
  "thanks",
  "goodbye",
  "complaint",
  "data_erasure",
  "unknown"
] as const;

export type ConversationIntent = (typeof CONVERSATION_INTENT_VALUES)[number];

export const TREATMENT_TOPIC_VALUES = [
  "hygiene",
  "first_visit",
  "implant",
  "whitening",
  "cosmetic_dentistry",
  "orthodontics",
  "endodontics",
  "restoration",
  "periodontics",
  "prosthetics",
  "wisdom_tooth",
  "tmj_bruxism",
  "trauma",
  "general_dentistry",
  "unknown"
] as const;

export type TreatmentTopic = (typeof TREATMENT_TOPIC_VALUES)[number];

export type BookingStatus =
  | "IDLE"
  | "COLLECTING_CONSENT"
  | "COLLECTING_PATIENT_DATA"
  | "READY_TO_OFFER_SLOTS"
  | "SLOTS_OFFERED"
  | "SLOT_SELECTED"
  | "HELD"
  | "PREBOOKED"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED"
  | "CANCELLED";

export type ConversationStatus = "ACTIVE" | "WAITING_PATIENT" | "ESCALATED" | "CLOSED";

// El proyecto todavia no tiene un slot estructurado en ningun sitio (scheduling.ts y
// slot-choice.ts trabajan con Date crudo, arrays de strings ISO y matching por indice
// - ver exploracion previa a este plan). Este tipo se define para la capa de migracion
// y para fases futuras, pero NO se propaga aun a scheduling.ts/slot-choice.ts: eso
// obligaria a rediseñar todo ese modulo en esta misma fase, cuando el objetivo aqui es
// solo introducir el vocabulario sin tocar comportamiento.
export type AvailabilityOption = {
  id: string;
  clinicId?: string;
  location: string;
  start: string;
  end?: string;
  timezone: string;
  displayText: string;
};
