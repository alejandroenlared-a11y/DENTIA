import { describe, expect, it } from "vitest";
import { routeConversationIntent, routeDentalConversationTurn } from "@/lib/agent/dental-agent-router";
import { initialDentalAgentState, type DentalAgentState } from "@/lib/agent/dental-senior-agent";

describe("routeConversationIntent", () => {
  it("routes a bare greeting", () => {
    expect(routeConversationIntent("hola")).toBe("greeting");
    expect(routeConversationIntent("Buenas tardes!")).toBe("greeting");
  });

  it("routes a bare thanks distinctly from a generic closing acknowledgment", () => {
    expect(routeConversationIntent("gracias")).toBe("thanks");
    expect(routeConversationIntent("muchas gracias!!")).toBe("thanks");
    expect(routeConversationIntent("perfecto")).toBe("confirm");
    expect(routeConversationIntent("vale")).toBe("confirm");
  });

  it("routes a location question", () => {
    expect(routeConversationIntent("hola, donde estais?")).toBe("ask_location");
  });

  it("routes a team/specialty question", () => {
    expect(routeConversationIntent("que especialidades teneis?")).toBe("ask_team");
  });

  it("routes a price question", () => {
    expect(routeConversationIntent("cuanto cuesta una limpieza?")).toBe("ask_price");
  });

  it("falls back to unknown for a clinical/symptom message", () => {
    expect(routeConversationIntent("me duele una muela y sangra")).toBe("unknown");
  });

  it("prioritizes greeting over any other match when the message is only a greeting", () => {
    expect(routeConversationIntent("hola")).not.toBe("ask_location");
  });
});

describe("routeDentalConversationTurn", () => {
  function offeredState(overrides: Partial<DentalAgentState> = {}): DentalAgentState {
    return {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Juan Perez",
      phone: "611222333",
      email: "juan@example.com",
      location: "Murcia centro",
      availability: "",
      offeredAvailabilityOptions: ["jueves, 23/07, 10:00", "viernes, 24/07, 11:00", "lunes, 27/07, 10:00"],
      ready: false,
      ...overrides
    };
  }

  it("gives data erasure absolute priority over any other signal", () => {
    const result = routeDentalConversationTurn({
      latestPatientText: "hola",
      previousState: { ...initialDentalAgentState, dataErasureRequested: true },
      nextState: { ...initialDentalAgentState, dataErasureRequested: true }
    });
    expect(result.conversationIntent).toBe("data_erasure");
  });

  it("classifies managing an existing appointment as reschedule or cancel, never as a new booking", () => {
    const cancel = routeDentalConversationTurn({
      latestPatientText: "quiero cancelar mi cita",
      previousState: initialDentalAgentState,
      nextState: initialDentalAgentState
    });
    expect(cancel.conversationIntent).toBe("cancel_appointment");

    const reschedule = routeDentalConversationTurn({
      latestPatientText: "puedo cambiar mi cita para otro dia?",
      previousState: initialDentalAgentState,
      nextState: initialDentalAgentState
    });
    expect(reschedule.conversationIntent).toBe("reschedule_appointment");
  });

  it("classifies picking a bare number from offered slots as select_slot", () => {
    const result = routeDentalConversationTurn({
      latestPatientText: "2",
      previousState: offeredState(),
      nextState: offeredState()
    });
    expect(result.conversationIntent).toBe("select_slot");
  });

  it("classifies an ordinal slot pick as select_slot only when the assistant actually offered slots last turn", () => {
    const withContext = routeDentalConversationTurn({
      latestPatientText: "la segunda me viene bien",
      previousState: offeredState(),
      nextState: offeredState(),
      lastAssistantMessage: "Te puedo proponer estos huecos: 1. jueves 10:00 2. viernes 11:00 3. lunes 10:00"
    });
    expect(withContext.conversationIntent).toBe("select_slot");

    const withoutContext = routeDentalConversationTurn({
      latestPatientText: "la segunda vez que vine me trataron genial",
      previousState: offeredState(),
      nextState: offeredState(),
      lastAssistantMessage: "Perfecto, cuentame que necesitas."
    });
    expect(withoutContext.conversationIntent).not.toBe("select_slot");
  });

  it("prioritizes the text-based conversational act over the old state-only heuristic", () => {
    // Antes de fase 4 (correccion), esto se habria clasificado por state.intent
    // (reactivation, sin consent -> book_appointment), aunque el texto real fuera
    // un simple agradecimiento de cierre.
    const result = routeDentalConversationTurn({
      latestPatientText: "gracias",
      previousState: { ...initialDentalAgentState, intent: "reactivation" },
      nextState: { ...initialDentalAgentState, intent: "reactivation" }
    });
    expect(result.conversationIntent).toBe("thanks");
  });

  it("falls back to the state-based heuristic only when the text gives no signal", () => {
    // El texto en si ("cita para una limpieza") no matchea ningun detector de acto
    // conversacional (no es saludo/gracias/precio/ubicacion/equipo/cierre), asi que
    // cae al ultimo nivel: la heuristica de estado, con el intent ya clasificado por
    // inferIntent (dental-senior-agent.ts) en un turno previo del pipeline real.
    const result = routeDentalConversationTurn({
      latestPatientText: "cita para una limpieza",
      previousState: { ...initialDentalAgentState, intent: "reactivation" },
      nextState: { ...initialDentalAgentState, intent: "reactivation" }
    });
    expect(result.conversationIntent).toBe("book_appointment");
    expect(result.treatmentTopic).toBe("hygiene");
  });
});
