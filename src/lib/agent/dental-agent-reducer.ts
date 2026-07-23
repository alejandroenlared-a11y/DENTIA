// Fase 2 del refactor de arquitectura. Reductor puro sobre ExtendedDentalAgentState
// (fase 1) que hace explicitas, como transiciones de una maquina de estados, las 4
// reglas que hoy viven repartidas en condicionales sueltos de dental-senior-agent.ts/
// guardrails.ts/index.ts:
//   1. no reofrecer huecos una vez hay reserva (bookingStatus PREBOOKED/CONFIRMED)
//   2. no pasar a CONFIRMED sin una señal real de Appointment (solo APPOINTMENT_CONFIRMED)
//   3. cierre de conversacion cuando el paciente da las gracias tras una reserva
//   4. reapertura cuando el paciente vuelve a escribir tras el cierre
// Aditivo: no se rewire runDentalSeniorTurn/preparePatientReply todavia (eso es una
// fase posterior). Esto solo define y testea la maquina de estados en aislado.
import type { ExtendedDentalAgentState } from "@/lib/agent/dental-agent-migration";

export type DentalTurnEvent =
  | { type: "SLOTS_OFFERED"; options: string[] }
  | { type: "SLOT_SELECTED"; availability: string }
  | { type: "BOOKING_PREBOOKED"; availability: string }
  | { type: "APPOINTMENT_CONFIRMED" }
  | { type: "APPOINTMENT_CANCELLED" }
  | { type: "PATIENT_THANKS" }
  | { type: "PATIENT_MESSAGE" };

const BOOKED_STATUSES = new Set(["PREBOOKED", "CONFIRMED"]);
const CONFIRMABLE_STATUSES = new Set(["SLOT_SELECTED", "PREBOOKED"]);

export function reduceDentalTurn(
  state: ExtendedDentalAgentState,
  event: DentalTurnEvent
): ExtendedDentalAgentState {
  switch (event.type) {
    case "SLOTS_OFFERED":
      // Regla 1: si ya hay reserva, ofrecer huecos de nuevo es un no-op. El
      // llamador no necesita comprobar esto antes de despachar el evento.
      if (BOOKED_STATUSES.has(state.bookingStatus)) return state;
      return {
        ...state,
        offeredAvailabilityOptions: event.options,
        bookingStatus: "SLOTS_OFFERED"
      };

    case "SLOT_SELECTED":
      if (state.bookingStatus !== "SLOTS_OFFERED") return state;
      return {
        ...state,
        availability: event.availability,
        offeredAvailabilityOptions: [],
        bookingStatus: "SLOT_SELECTED"
      };

    case "BOOKING_PREBOOKED":
      return {
        ...state,
        availability: event.availability,
        offeredAvailabilityOptions: [],
        ready: true,
        bookingStatus: "PREBOOKED"
      };

    case "APPOINTMENT_CONFIRMED":
      // Regla 2: nunca se llega a CONFIRMED salvo por este evento explicito,
      // que el llamador solo despacha con un Appointment.status real de Prisma.
      if (!CONFIRMABLE_STATUSES.has(state.bookingStatus)) return state;
      return { ...state, bookingStatus: "CONFIRMED" };

    case "APPOINTMENT_CANCELLED":
      return {
        ...state,
        bookingStatus: "CANCELLED",
        ready: false,
        availability: "",
        offeredAvailabilityOptions: []
      };

    case "PATIENT_THANKS":
      // Regla 3: un "gracias" solo cierra la conversacion si ya hay reserva
      // hecha. Antes de eso es solo cortesia a mitad de flujo, no un cierre.
      if (!BOOKED_STATUSES.has(state.bookingStatus)) {
        return { ...state, conversationIntent: "thanks" };
      }
      return { ...state, conversationIntent: "thanks", conversationStatus: "CLOSED" };

    case "PATIENT_MESSAGE":
      // Regla 4: cualquier mensaje nuevo tras un cierre reabre la conversacion.
      if (state.conversationStatus === "CLOSED") {
        return { ...state, conversationStatus: "ACTIVE", conversationIntent: "unknown" };
      }
      return state;

    default:
      return state;
  }
}
