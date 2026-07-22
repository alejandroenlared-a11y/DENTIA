// Fase 3 del refactor de arquitectura. Enrutador determinista del acto
// conversacional (saludo, gracias, precio, ubicacion, equipo, cierre) — una dimension
// ortogonal al tema clinico, que ya clasifica inferIntent en dental-senior-agent.ts y
// que normalizeDentalAgentState (fase 1) refleja en treatmentTopic. Reusa los
// detectores ya existentes en vez de duplicar sus regex, para que un cambio en el
// criterio de "es un saludo"/"pregunta precio"/etc. solo se edite en un sitio.
// Aditivo: no sustituye todavia a inferIntent/buildDentalReply en produccion.
import {
  asksClinicAddress,
  asksTeamOrSpecialties,
  isBookingClosingAcknowledgment,
  isSimpleGreeting,
  jumpsToBookingOptions
} from "@/lib/agent/guardrails";
import {
  asksAppointmentManagement,
  extractSelectedAvailabilityOption,
  mentionsPrice,
  normalize,
  type DentalAgentState
} from "@/lib/agent/dental-senior-agent";
import { mapConversationIntent, normalizeDentalAgentState } from "@/lib/agent/dental-agent-migration";
import type { ConversationIntent, TreatmentTopic } from "@/lib/agent/dental-agent-types";

// Mismo patron que el "gracias" suelto ya usado en dental-senior-agent.ts (nextStep/
// buildCourtesyReply) para distinguir un agradecimiento de cierre de una confirmacion
// generica ("vale", "perfecto"), que isBookingClosingAcknowledgment agrupa junto.
const BARE_THANKS_PATTERN = /^(gracias|muchas gracias|ok gracias|vale gracias)[!.? ]*$/;

export function routeConversationIntent(latestPatientText: string): ConversationIntent {
  const bareText = normalize(latestPatientText).replace(/[!¡¿?.,\s]+/g, " ").trim();

  if (isSimpleGreeting(latestPatientText)) return "greeting";
  if (BARE_THANKS_PATTERN.test(bareText)) return "thanks";
  if (asksClinicAddress(latestPatientText)) return "ask_location";
  if (asksTeamOrSpecialties(latestPatientText)) return "ask_team";
  if (mentionsPrice(latestPatientText)) return "ask_price";
  if (isBookingClosingAcknowledgment(latestPatientText)) return "confirm";
  return "unknown";
}

export type RoutedConversationFields = {
  conversationIntent: ConversationIntent;
  treatmentTopic: TreatmentTopic;
};

// Ordinal/numero de opcion en texto libre ("la primera", "opcion 2"), para
// complementar extractSelectedAvailabilityOption (que solo reconoce un "1"/"2"/"3"
// suelto). Solo se usa si el ULTIMO mensaje del asistente realmente ofrecio huecos
// (jumpsToBookingOptions) - si no, "la primera vez que vine..." no es una seleccion.
const ORDINAL_SLOT_PATTERN = /(la primera|la segunda|la tercera|el primero|el segundo|el tercero|opcion\s*[123])/;

/**
 * Fase 4: fuente de verdad REAL para conversationIntent/treatmentTopic en el
 * pipeline (ver attachConversationFields en openai-dental-agent.ts). Sustituye a
 * "derivar todo de state.intent" por una cascada de señales deterministas, en
 * orden de prioridad:
 *   1. Solicitud de borrado de datos (siempre gana, es una obligacion legal).
 *   2. Gestion de una cita YA existente (cancelar/cambiar) - nunca se confunde con
 *      pedir una cita nueva.
 *   3. Seleccion de un hueco ya ofrecido (numero suelto, u ordinal en texto libre
 *      si el asistente realmente ofrecio huecos en su ultimo mensaje).
 *   4. Acto conversacional detectado en el TEXTO del paciente (saludo, gracias,
 *      pregunta de precio/ubicacion/equipo, cierre) - routeConversationIntent.
 *   5. Solo si nada de lo anterior aplica: heuristica de estado (mapConversationIntent),
 *      que set state.intent para decidir entre "book_appointment"/"symptom"/
 *      "provide_data"/"confirm". Este es el UNICO nivel que todavia mira el intent
 *      clinico, y es el ultimo recurso, no la fuente primaria.
 * treatmentTopic siempre sale del tema clinico real (normalizeDentalAgentState),
 * que es su fuente legitima - lo que se corrige aqui es conversationIntent, no eso.
 */
export function routeDentalConversationTurn(input: {
  latestPatientText: string;
  state: DentalAgentState;
  lastAssistantMessage?: string;
}): RoutedConversationFields {
  const normalizedState = normalizeDentalAgentState(input.state);
  const treatmentTopic = normalizedState.treatmentTopic;
  const normalizedText = normalize(input.latestPatientText);

  if (input.state.dataErasureRequested) {
    return { conversationIntent: "data_erasure", treatmentTopic };
  }

  if (asksAppointmentManagement(normalizedText)) {
    const conversationIntent: ConversationIntent = /(cancel|anular)/.test(normalizedText)
      ? "cancel_appointment"
      : "reschedule_appointment";
    return { conversationIntent, treatmentTopic };
  }

  const assistantOfferedSlots = Boolean(input.lastAssistantMessage && jumpsToBookingOptions(input.lastAssistantMessage));
  const selectedSlot = extractSelectedAvailabilityOption(input.state, normalizedText);
  if (selectedSlot || (assistantOfferedSlots && ORDINAL_SLOT_PATTERN.test(normalizedText))) {
    return { conversationIntent: "select_slot", treatmentTopic };
  }

  const textIntent = routeConversationIntent(input.latestPatientText);
  if (textIntent !== "unknown") {
    return { conversationIntent: textIntent, treatmentTopic };
  }

  return { conversationIntent: mapConversationIntent(input.state), treatmentTopic };
}
