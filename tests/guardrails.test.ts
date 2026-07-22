import { describe, expect, it } from "vitest";
import { initialDentalAgentState, runDentalSeniorTurn, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import {
  asksForPersonalData,
  asksGenericSymptomMenu,
  isBookingClosingAcknowledgment,
  isSimpleGreeting,
  jumpsToBookingOptions,
  mentionsHealthCard,
  preparePatientReply,
  promisesSpecificProvider
} from "@/lib/agent/guardrails";

function readyState(overrides: Partial<DentalAgentState> = {}): DentalAgentState {
  const turn = runDentalSeniorTurn(
    initialDentalAgentState,
    "Me falta una muela y quiero implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111, email ana@example.com. Prefiero Murcia el viernes por la tarde."
  );
  return { ...turn.state, ...overrides };
}

describe("preparePatientReply", () => {
  it("overrides a bare greeting reply when the patient only said hola", () => {
    const result = preparePatientReply(
      "Hola! En que puedo ayudarte hoy con tu sonrisa?",
      initialDentalAgentState,
      "local reply fallback",
      "hola"
    );
    expect(result).toContain("Para poder orientarte");
  });

  it("overrides replies that leak the health card / SIP requirement", () => {
    const state = readyState();
    const result = preparePatientReply(
      "Perfecto, trae tu tarjeta sanitaria el dia de la cita.",
      state,
      "respuesta local segura",
      "vale"
    );
    expect(result).toContain("respuesta local segura");
  });

  it("overrides replies that promise a specific provider before the patient is ready", () => {
    const result = preparePatientReply(
      "Te reservo cita con el Dr. Ruiz Chumilla para revisarte.",
      initialDentalAgentState,
      "respuesta local segura",
      "necesito una cita"
    );
    expect(result).toContain("respuesta local segura");
  });

  it("overrides replies that ask for personal data before consent is given", () => {
    const result = preparePatientReply(
      "Para continuar necesito tu nombre y telefono de contacto.",
      initialDentalAgentState,
      "respuesta local segura",
      "quiero una cita"
    );
    expect(result).toContain("respuesta local segura");
  });

  it("keeps the AI reply untouched when no guardrail is violated", () => {
    const state = readyState();
    const result = preparePatientReply("Perfecto, tu pre-reserva queda anotada.", state, "respuesta local", "gracias");
    expect(result).toContain("pre-reserva queda anotada");
  });

  it("overrides a re-offer of slots when the patient already acknowledged a confirmed booking", () => {
    // Bug real (produccion): tras pre-reservar la cita, el paciente respondio
    // "Esta bien gracias!!" y Gemini volvio a proponer 3 huecos nuevos como
    // si nada estuviera reservado.
    const state = readyState();
    const result = preparePatientReply(
      "Te propongo estos huecos:\n\n1. jueves, 10:00\n2. viernes, 11:00\n\nResponde con 1 o 2.",
      state,
      "respuesta local segura",
      "Esta bien gracias!!"
    );
    expect(result).toContain("respuesta local segura");
  });
});

describe("isBookingClosingAcknowledgment", () => {
  it("matches common Spanish acknowledgment/closing phrases", () => {
    const phrases = [
      "vale",
      "ok",
      "de acuerdo",
      "esta bien",
      "todo bien",
      "todo correcto",
      "todo ok",
      "perfecto",
      "genial",
      "gracias",
      "muchas gracias",
      "me vale asi",
      "correcto",
      "listo",
      "ya esta",
      "sin problema"
    ];
    for (const phrase of phrases) {
      expect(isBookingClosingAcknowledgment(phrase)).toBe(true);
      expect(isBookingClosingAcknowledgment(`${phrase}!!`)).toBe(true);
    }
  });

  it("does not match unrelated messages", () => {
    expect(isBookingClosingAcknowledgment("me duele una muela")).toBe(false);
    expect(isBookingClosingAcknowledgment("quiero cambiar la cita")).toBe(false);
  });
});

describe("guardrail predicates", () => {
  it("isSimpleGreeting only matches bare greetings", () => {
    expect(isSimpleGreeting("hola")).toBe(true);
    expect(isSimpleGreeting("hola, tengo dolor de muela")).toBe(false);
  });

  it("mentionsHealthCard detects SIP/tarjeta sanitaria wording", () => {
    expect(mentionsHealthCard("trae tu tarjeta sanitaria")).toBe(true);
    expect(mentionsHealthCard("trae tu documento de identidad")).toBe(false);
  });

  it("asksForPersonalData detects requests for contact data", () => {
    expect(asksForPersonalData("necesito tu telefono de contacto")).toBe(true);
    expect(asksForPersonalData("cuentame que sintomas tienes")).toBe(false);
  });

  it("promisesSpecificProvider detects a named doctor tied to booking language", () => {
    expect(promisesSpecificProvider("te cito con la Dra. Herencia")).toBe(true);
    expect(promisesSpecificProvider("cualquiera de nuestros doctores te atendera")).toBe(false);
  });

  it("jumpsToBookingOptions detects slot proposals", () => {
    expect(jumpsToBookingOptions("te propongo el miercoles a las 10:00")).toBe(true);
    expect(jumpsToBookingOptions("cuentame que necesitas")).toBe(false);
  });

  it("asksGenericSymptomMenu detects the generic symptom menu wording", () => {
    expect(asksGenericSymptomMenu("cuentame que necesitas o que te preocupa")).toBe(true);
    expect(asksGenericSymptomMenu("tu pre-reserva queda anotada")).toBe(false);
  });
});
