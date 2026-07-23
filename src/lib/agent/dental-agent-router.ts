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
  isSimpleGreeting
} from "@/lib/agent/guardrails";
import {
  asksAppointmentManagement,
  jumpsToBookingOptions,
  mentionsPrice,
  normalize,
  resolveSelectedAvailabilityOption,
  type DentalAgentState
} from "@/lib/agent/dental-senior-agent";
import { mapConversationIntent, normalizeDentalAgentState } from "@/lib/agent/dental-agent-migration";
import type { BookingStatus, ConversationIntent, ConversationStatus, TreatmentTopic } from "@/lib/agent/dental-agent-types";

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
  bookingStatus: BookingStatus;
  conversationStatus: ConversationStatus;
};

const BOOKED_STATUSES = new Set<BookingStatus>(["PREBOOKED", "CONFIRMED"]);
const CLOSING_CONVERSATION_INTENTS = new Set<ConversationIntent>(["thanks", "confirm"]);

// conversationStatus ahora es un campo REAL y persistido de DentalAgentState
// (antes solo se derivaba fresco cada turno, sin memoria - ver corrección de
// arquitectura). state.conversationStatus que llega aqui es el valor ANTERIOR
// (dental-senior-agent.ts no lo toca, solo lo deja pasar), asi que esta
// funcion puede implementar la reapertura de verdad:
//   - Una conversacion ya CLOSED se mantiene cerrada mientras el paciente solo
//     conteste con un acto de cortesia puro (gracias/perfecto/vale/hasta
//     luego, que clasifican como "thanks"/"confirm") - nunca se reabre por
//     eso.
//   - Cualquier otra intencion con contenido real (cambiar/cancelar cita,
//     sintoma nuevo, pregunta, otra duda...) reabre la conversacion a ACTIVE
//     ese mismo turno.
//   - Si no estaba cerrada, una reserva ya hecha (bookingStatus PREBOOKED/
//     CONFIRMED) mas un acto de cierre puro es lo unico que cierra.
function deriveConversationStatus(
  state: DentalAgentState,
  bookingStatus: BookingStatus,
  conversationIntent: ConversationIntent
): ConversationStatus {
  if (state.requiresGuardian || state.escalated) {
    return "ESCALATED";
  }
  if (state.conversationStatus === "CLOSED") {
    return CLOSING_CONVERSATION_INTENTS.has(conversationIntent) ? "CLOSED" : "ACTIVE";
  }
  if (BOOKED_STATUSES.has(bookingStatus) && CLOSING_CONVERSATION_INTENTS.has(conversationIntent)) {
    return "CLOSED";
  }
  return "ACTIVE";
}

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
 *
 * Bug real (revision PR #11, "Route slot picks before clearing offered
 * options"): antes se pasaba un unico `state` = turn.state, es decir, el
 * estado YA procesado por el motor local. Al elegir un hueco ("1"), el motor
 * local ya selecciono la opcion, copio la disponibilidad y VACIO
 * offeredAvailabilityOptions antes de que este enrutador viera el turno - asi
 * que la deteccion de seleccion de hueco (extractSelectedAvailabilityOption)
 * ya no encontraba nada que seleccionar, y el turno caia al ultimo recurso
 * (mapConversationIntent), clasificando "confirm" en vez de "select_slot".
 * Fix arquitectonico: se reciben AMBOS estados por separado.
 *   - previousState (antes de procesar este mensaje): unica fuente valida
 *     para señales que dependen de "que habia ofrecido/pendiente ANTES de
 *     este mensaje" - aqui, exclusivamente la seleccion de hueco.
 *   - nextState (turn.state, ya procesado): fuente para todo lo demas -
 *     treatmentTopic/bookingStatus (deben reflejar el resultado de ESTE
 *     turno, p.ej. bookingStatus ya PREBOOKED tras seleccionar), el borrado
 *     de datos (debe detectarse en el mismo turno en que se pide, no un turno
 *     tarde) y el ultimo recurso mapConversationIntent (debe ver el
 *     consent/ready ya actualizados por este mismo mensaje).
 * No se reconstruyen artificialmente las opciones tras vaciarlas: se lee el
 * estado de antes, intacto, en vez de intentar deshacer la limpieza.
 *
 * Fix real (revision PR #11, "la tercera" no seleccionaba de verdad): antes
 * un ordinal en texto libre solo servia para clasificar conversationIntent
 * como select_slot (via ORDINAL_SLOT_PATTERN aqui mismo), pero el motor local
 * (dental-senior-agent.ts) no sabia resolver ordinales, asi que nunca se
 * seleccionaba availability de verdad - el paciente quedaba clasificado
 * correctamente pero sin cita elegida. Fix: resolveSelectedAvailabilityOption
 * (dental-senior-agent.ts) es ahora la UNICA funcion que resuelve una
 * seleccion (numero/opcion N/ordinal) contra offeredAvailabilityOptions, y la
 * usan tanto el motor local (que hace la seleccion real) como este router
 * (que solo clasifica) - nunca pueden divergir en que cuenta como seleccion.
 */
export function routeDentalConversationTurn(input: {
  latestPatientText: string;
  previousState: DentalAgentState;
  nextState: DentalAgentState;
  lastAssistantMessage?: string;
}): RoutedConversationFields {
  const normalizedNextState = normalizeDentalAgentState(input.nextState);
  const treatmentTopic = normalizedNextState.treatmentTopic;
  const bookingStatus = normalizedNextState.bookingStatus;
  const conversationIntent = resolveConversationIntent(input);
  const conversationStatus = deriveConversationStatus(input.nextState, bookingStatus, conversationIntent);

  return { conversationIntent, treatmentTopic, bookingStatus, conversationStatus };
}

function resolveConversationIntent(input: {
  latestPatientText: string;
  previousState: DentalAgentState;
  nextState: DentalAgentState;
  lastAssistantMessage?: string;
}): ConversationIntent {
  const normalizedText = normalize(input.latestPatientText);

  // nextState: si ESTE mensaje pide el borrado, debe detectarse ya en este
  // turno (dental-senior-agent.ts ya lo refleja en nextState.dataErasureRequested).
  if (input.nextState.dataErasureRequested) {
    return "data_erasure";
  }

  if (asksAppointmentManagement(normalizedText)) {
    return /(cancel|anular)/.test(normalizedText) ? "cancel_appointment" : "reschedule_appointment";
  }

  // previousState: las opciones ofrecidas ya estan vacias en nextState (el
  // motor local las consumio al seleccionar) - solo previousState conserva lo
  // que de verdad se ofrecio antes de este mensaje.
  const assistantOfferedSlots = Boolean(input.lastAssistantMessage && jumpsToBookingOptions(input.lastAssistantMessage));
  const selectedSlot = resolveSelectedAvailabilityOption(
    input.previousState.offeredAvailabilityOptions,
    normalizedText,
    assistantOfferedSlots
  );
  if (selectedSlot) {
    return "select_slot";
  }

  const textIntent = routeConversationIntent(input.latestPatientText);
  if (textIntent !== "unknown") {
    return textIntent;
  }

  // nextState: el ultimo recurso debe ver el consent/ready/intent ya
  // actualizados por este mismo mensaje (p.ej. una aceptacion de consentimiento
  // en este turno debe clasificar ya como provide_data, no un turno tarde).
  return mapConversationIntent(input.nextState);
}
