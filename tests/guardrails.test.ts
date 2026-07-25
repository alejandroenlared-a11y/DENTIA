import { describe, expect, it } from "vitest";
import { initialDentalAgentState, runDentalSeniorTurn, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import {
  asksForPersonalData,
  asksGenericSymptomMenu,
  isBookingClosingAcknowledgment,
  isSimpleGreeting,
  jumpsToBookingOptions,
  mentionsHealthCard,
  mentionsUnauthorizedTraumaHypothesis,
  mentionsUrgentCareGuidance,
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

  it("overrides a reply that skips the pending safety-screen question and jumps ahead", () => {
    // Bug real (produccion): "me duele una muela y sangra" generaba
    // correctamente missingClinicalData (sangrado leve/abundante, golpe?),
    // pero el LLM diagnosticaba gingivitis/periodontitis y saltaba directo al
    // siguiente paso, sin preguntar nunca la de seguridad. Consent ya
    // aceptado en el propio mensaje para que ningun otro guardrail (que
    // exige !state.consent) enmascare el fallo de este en concreto.
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "me duele una muela y sangra, acepto que guardeis mis datos"
    );
    const result = preparePatientReply(
      "Por lo que me cuentas podria ser gingivitis o periodontitis; te lo confirmara el doctor al verte. Genial, gracias. Y tu nombre y apellidos?",
      turn.state,
      turn.reply,
      "me duele una muela y sangra, acepto que guardeis mis datos"
    );
    expect(result).toContain("sangrado es leve o abundante");
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

  it("mentionsUnauthorizedTraumaHypothesis detects fractura/luxacion/traumatismo hypotheses", () => {
    expect(mentionsUnauthorizedTraumaHypothesis("Podria ser una fractura o luxacion.")).toBe(true);
    expect(mentionsUnauthorizedTraumaHypothesis("Puede ser caries o filtracion de empaste.")).toBe(false);
  });

  it("CASO 6 (hotfix dental-negation-context): bloquea la hipotesis de fractura/luxacion de la IA cuando el motor local no considera trauma", () => {
    const state = runDentalSeniorTurn(initialDentalAgentState, "No, ningun golpe.").state;
    const localReply = runDentalSeniorTurn(initialDentalAgentState, "No, ningun golpe.").reply;
    expect(localReply.toLowerCase()).not.toContain("golpe");

    const result = preparePatientReply("Podria ser una fractura o luxacion.", state, localReply, "No, ningun golpe.");
    expect(result).not.toContain("fractura");
    expect(result).not.toContain("luxacion");
    expect(result).toBe(localReply);
  });
});

// PR #13 (Codex): short-circuit obligatorio para EMERGENCY - cualquier
// aiReply que pida consentimiento/datos u ofrezca cita/huecos se descarta
// integramente a favor de la respuesta determinista de emergencia.
describe("preparePatientReply - EMERGENCY short-circuit", () => {
  function emergencyTurn() {
    return runDentalSeniorTurn(initialDentalAgentState, "Tengo la cara muy hinchada y me cuesta respirar");
  }

  it("descarta un aiReply que pide consentimiento durante EMERGENCY - gana localReply sin consentimiento", () => {
    const { state, reply: localReply } = emergencyTurn();
    expect(state.triageLevel).toBe("EMERGENCY");

    const result = preparePatientReply(
      "Acude a urgencias. ¿Aceptas que guardemos tus datos para priorizarte?",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toBe(localReply);
    expect(result.toLowerCase()).not.toContain("aceptas");
  });

  it("bloquea un aiReply que intenta ofrecer cita/disponibilidad durante EMERGENCY", () => {
    const { state, reply: localReply } = emergencyTurn();

    const result = preparePatientReply(
      "Te propongo estos huecos:\n\n1. jueves, 10:00\n2. viernes, 11:00",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toBe(localReply);
    expect(result.toLowerCase()).not.toContain("huecos");
  });

  it("no bloquea un aiReply normal (parafraseado) durante EMERGENCY que no pide datos ni ofrece cita", () => {
    const { state, reply: localReply } = emergencyTurn();

    const result = preparePatientReply(
      "Esto es serio, ve a urgencias sin esperar.",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toContain("urgencias");
  });

  // Codex (revision sobre 77a41cc - "Require urgent guidance in every
  // emergency reply"): un aiReply que ni pide datos ni ofrece cita PERO
  // tampoco dice explicitamente que acudir a urgencias tambien debe
  // descartarse - reconocer la gravedad sin decir que hacer no es
  // suficiente en EMERGENCY.
  it("descarta un aiReply EMERGENCY benigno que no menciona la indicacion obligatoria de urgencias", () => {
    const { state, reply: localReply } = emergencyTurn();

    const result = preparePatientReply(
      "Entiendo. Descansa y observa cómo evolucionas.",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toBe(localReply);
    expect(result.toLowerCase()).toContain("urgencias");
  });

  // Codex (P1, revision sobre c7c9e1a - "Reject negated emergency
  // guidance"): la palabra suelta "urgencias" no bastaba - un aiReply que
  // dice explicitamente NO acudir tambien pasaba el guardrail.
  it("descarta un aiReply EMERGENCY que niega explicitamente la indicacion de acudir a urgencias", () => {
    const { state, reply: localReply } = emergencyTurn();

    const result = preparePatientReply(
      "No acudas a urgencias; descansa y observa.",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toBe(localReply);
  });

  // Codex (P1, revision sobre c7c9e1a, hardening solicitado): matriz
  // completa - la funcion debe resolver POLARIDAD (instruccion afirmativa
  // e inmediata), no solo detectar la palabra suelta "urgencias".
  it.each([
    ["Acude a urgencias ahora mismo.", true],
    ["Ve a un servicio de urgencias.", true],
    ["Busca atención urgente inmediatamente.", true],
    ["Llama al 112.", true],
    ["Contacta con emergencias.", true],
    ["No esperes y ve a urgencias.", true],
    ["No acudas a urgencias.", false],
    ["No hace falta ir a urgencias.", false],
    ["No es necesario acudir a urgencias.", false],
    ["Evita las urgencias.", false],
    ["Puedes esperar antes de ir a urgencias.", false],
    ["Descansa y observa cómo evolucionas.", false],
    ["Consulta urgencias solo si empeora.", false]
  ])("mentionsUrgentCareGuidance('%s') -> %s", (reply, expected) => {
    expect(mentionsUrgentCareGuidance(reply)).toBe(expected);
  });

  it("no rompe el caso ya cubierto: el texto canonico de EMERGENCY (con 'no esperes' lejos de 'urgencias') sigue reconociendose como indicacion valida", () => {
    const { reply: localReply } = emergencyTurn();
    expect(mentionsUrgentCareGuidance(localReply)).toBe(true);
  });

  it("no rompe el caso ya cubierto: 've a urgencias sin esperar' sigue reconociendose como indicacion valida", () => {
    expect(mentionsUrgentCareGuidance("Esto es serio, ve a urgencias sin esperar.")).toBe(true);
  });

  it("no rompe el caso ya cubierto: 'No esperes; descansa y observa.' sigue sin considerarse guia valida (nunca menciona urgencias/112/emergencias)", () => {
    expect(mentionsUrgentCareGuidance("No esperes; descansa y observa.")).toBe(false);
  });

  // Codex (P1, revision sobre 87ce2be, "'tampoco' debe conservar la
  // negacion de urgencias"): matriz completa.
  it.each([
    ["No llames al 112 y tampoco acudas a urgencias.", false],
    ["Tampoco acudas a urgencias.", false],
    ["No vayas a urgencias.", false],
    ["Nunca llames a emergencias.", false],
    ["Ni llames al 112 ni acudas a urgencias.", false],
    ["No es necesario acudir a urgencias.", false],
    ["Evita ir a urgencias.", false],
    ["Puedes esperar antes de ir a urgencias.", false],
    ["Acude a urgencias solo si mañana empeoras.", false],
    ["Acude a urgencias ahora mismo.", true],
    ["Ve directamente a urgencias.", true],
    ["Llama al 112.", true],
    ["Contacta con emergencias inmediatamente.", true],
    ["No esperes y acude a urgencias.", true],
    ["Busca atención urgente ahora.", true]
  ])("mentionsUrgentCareGuidance('%s') -> %s", (reply, expected) => {
    expect(mentionsUrgentCareGuidance(reply)).toBe(expected);
  });

  it("no rompe el caso ya cubierto: 'No acudas a urgencias.' sigue descartandose", () => {
    expect(mentionsUrgentCareGuidance("No acudas a urgencias.")).toBe(false);
  });

  // Casos de integracion del Bloque 2 (preparePatientReply completo).
  it.each([
    ["No llames al 112 y tampoco acudas a urgencias.", false],
    ["Tampoco acudas a urgencias.", false],
    ["Ni llames al 112 ni acudas a urgencias.", false]
  ])("preparePatientReply descarta aiReply EMERGENCY negado con 'tampoco'/'ni': '%s'", aiReply => {
    const { state, reply: localReply } = emergencyTurn();
    const result = preparePatientReply(aiReply, state, localReply, "Tengo la cara muy hinchada y me cuesta respirar");
    expect(result).toBe(localReply);
  });

  it.each([["Acude a urgencias ahora mismo.", true], ["No esperes y acude a urgencias.", true]])(
    "preparePatientReply conserva aiReply EMERGENCY afirmativo: '%s'",
    aiReply => {
      const { state, reply: localReply } = emergencyTurn();
      const result = preparePatientReply(aiReply, state, localReply, "Tengo la cara muy hinchada y me cuesta respirar");
      expect(result).toContain("urgencias");
    }
  );

  it("preparePatientReply descarta aiReply EMERGENCY condicional: 'Acude a urgencias solo si mañana empeoras.'", () => {
    const { state, reply: localReply } = emergencyTurn();
    const result = preparePatientReply(
      "Acude a urgencias solo si mañana empeoras.",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toBe(localReply);
  });

  // Casos de integracion del P1 (preparePatientReply completo, no solo la
  // funcion unitaria).
  it.each([
    ["No acudas a urgencias; descansa.", false],
    ["No es necesario acudir a urgencias.", false],
    ["Consulta urgencias si mañana empeoras.", false]
  ])("preparePatientReply descarta aiReply EMERGENCY no afirmativo: '%s'", aiReply => {
    const { state, reply: localReply } = emergencyTurn();
    const result = preparePatientReply(aiReply, state, localReply, "Tengo la cara muy hinchada y me cuesta respirar");
    expect(result).toBe(localReply);
  });

  it("preparePatientReply conserva un aiReply EMERGENCY afirmativo si cumple el resto de guardrails", () => {
    const { state, reply: localReply } = emergencyTurn();
    const result = preparePatientReply(
      "Acude a urgencias ahora mismo.",
      state,
      localReply,
      "Tengo la cara muy hinchada y me cuesta respirar"
    );
    expect(result).toContain("urgencias");
  });

  it("un caso ROUTINE tras completar el triaje sigue ofreciendo ayuda para la cita - el guardrail de emergencia no lo bloquea", () => {
    const t1 = runDentalSeniorTurn(initialDentalAgentState, "Me duele al morder.");
    const t2 = runDentalSeniorTurn(t1.state, "No, nada de eso.");
    expect(t2.state.triageLevel).not.toBe("EMERGENCY");

    const result = preparePatientReply(t2.reply, t2.state, t2.reply, "No, nada de eso.");
    expect(result).toContain("Quieres que te ayude a solicitar una cita");
  });
});
