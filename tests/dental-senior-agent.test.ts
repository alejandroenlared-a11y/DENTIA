import { describe, expect, it } from "vitest";
import {
  buildDentalSummary,
  computeBookingStatus,
  extractAffirmedAndNegatedClinicalSignals,
  hasSlotOfferPrerequisites,
  initialDentalAgentState,
  resolveAnswerToLastClinicalQuestion,
  resolveAppointmentHelpDecision,
  runDentalSeniorTurn,
  type DentalAgentState
} from "@/lib/agent/dental-senior-agent";

describe("runDentalSeniorTurn", () => {
  it("answers clinic address questions directly without opening triage", () => {
    const general = runDentalSeniorTurn(initialDentalAgentState, "donde estais?");
    expect(general.reply).toContain("Paseo Duques de Lugo, 16");
    expect(general.reply).toContain("Carrer Reina Victoria, 49");
    expect(general.reply).toContain("servicios");
    expect(general.reply).toContain("cita");
    expect(general.reply.toLowerCase()).not.toContain("dolor, encias");
    expect(general.reply.toLowerCase()).not.toContain("pieza rota");
    expect(general.state.intent).toBeUndefined();

    const elche = runDentalSeniorTurn(initialDentalAgentState, "donde teneis vuestra clinica de Elche??");
    expect(elche.reply).toContain("Carrer Reina Victoria, 49");
    expect(elche.reply).toContain("Elche");
    expect(elche.reply).toContain("miremos una cita en Elche");
    expect(elche.reply.toLowerCase()).not.toContain("dolor, encias");
    expect(elche.reply.toLowerCase()).not.toContain("pieza rota");
    expect(elche.state.intent).toBeUndefined();

    const murcia = runDentalSeniorTurn(initialDentalAgentState, "cual es la direccion de Murcia?");
    expect(murcia.reply).toContain("Paseo Duques de Lugo, 16");
    expect(murcia.reply).toContain("miremos una cita en Murcia");
    expect(murcia.reply.toLowerCase()).not.toContain("cuentame");
  });

  it("answers doctor and specialty questions before guiding the next step", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "que doctores y especialidades teneis?");

    expect(turn.reply).toContain("Dr. Ernesto Ruiz Chumilla");
    expect(turn.reply).toContain("Periodoncia, implantes y cirugía oral");
    expect(turn.reply).toContain("Dra. Esther Estrada Mallada");
    expect(turn.reply).toContain("Ortodoncia");
    expect(turn.reply).toContain("Dra. Laura Herencia Lizaran");
    expect(turn.reply).toContain("Endodoncia y odontopediatría");
    expect(turn.reply).toContain("cita con algun doctor en concreto");
    expect(turn.reply.toLowerCase()).toContain("urgencia");
    expect(turn.reply.toLowerCase()).not.toContain("dolor, encias");
    expect(turn.reply.toLowerCase()).not.toContain("pieza rota");
    expect(turn.state.intent).toBeUndefined();
  });

  it("detects emergency red flags without waiting for a normal booking flow", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Tengo la cara muy hinchada y me cuesta tragar. Acepto. Soy Urgencia Senior y mi telefono es 611999222."
    );

    expect(turn.state.triageLevel).toBe("EMERGENCY");
    expect(turn.state.escalated).toBe(true);
    expect(turn.state.ready).toBe(false);
    expect(turn.state.name).toBe("Urgencia Senior");
    expect(turn.reply).toContain("urgencias");
    expect(buildDentalSummary(turn.state)).toContain("Senales de alarma");
  });

  it("does not treat negated fever and swelling as red flags", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me duele una muela con frio y al morder, no tengo fiebre ni hinchazon."
    );

    expect(turn.state.intent).toBe("caries_restoration");
    expect(turn.state.triageLevel).toBe("PRIORITY_72H");
    expect(turn.state.redFlags).toEqual([]);
    expect(turn.state.detectedSignals).toContain("sensibilidad al frio/calor");
    expect(turn.state.detectedSignals).toContain("dolor al morder");
    expect(turn.reply).toContain("empaste");
  });

  it("does not mark an urgent inflamed moving tooth as ready without clinic, day and time", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "se me mueve un diente");
    const second = runDentalSeniorTurn(first.state, "noto inflamacion");
    const third = runDentalSeniorTurn(second.state, "si");
    const fourth = runDentalSeniorTurn(third.state, "Alejandro Marti 654718663");

    expect(fourth.state.intent).toBe("periodontics");
    expect(fourth.state.consent).toBe(true);
    expect(fourth.state.name).toBe("Alejandro Marti");
    expect(fourth.state.phone).toBe("654718663");
    expect(fourth.state.ready).toBe(false);
    expect(fourth.reply).not.toContain("reservado");
    expect(fourth.reply).not.toContain("confirmado");
  });

  it("asks a safety question before consent when a tooth is moving", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "se me mueve una muela");

    expect(turn.state.intent).toBe("periodontics");
    expect(turn.state.detectedSignals).toContain("movilidad dental");
    expect(turn.state.ready).toBe(false);
    expect(turn.reply.toLowerCase()).toContain("conviene revisarlo pronto");
    expect(turn.reply).toContain("Te duele, notas inflamación, sangrado o ha sido por un golpe?");
    expect(turn.reply.toLowerCase()).not.toContain("gingivitis");
    expect(turn.reply.toLowerCase()).not.toContain("periodontitis");
    expect(turn.reply.toLowerCase()).not.toContain("aceptas que guardemos");
  });

  it("keeps context when the patient answers a symptom with one word", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "se me mueve una muela");
    const second = runDentalSeniorTurn(first.state, "sangrado");

    expect(second.state.intent).toBe("periodontics");
    expect(second.state.detectedSignals).toContain("movilidad dental");
    expect(second.state.detectedSignals).toContain("sangrado de encias");
    expect(second.reply.toLowerCase()).not.toContain("pieza rota");
    expect(second.reply.toLowerCase()).not.toContain("implante, ortodoncia");
    expect(second.reply).toContain("El sangrado es leve o abundante");

    // Hotfix dental-negation-context (Problema 2): descartar sangrado/golpe
    // ya no completa el cribado por si solo - todavia falta la pregunta
    // general de fiebre/hinchazon/pus/dificultad antes de ofrecer la cita.
    const third = runDentalSeniorTurn(second.state, "leve, sin golpe");
    expect(third.state.safetyScreened).toBe(false);
    expect(third.state.bleedingDifferentialResolved).toBe(true);
    expect(third.reply).toContain("fiebre");
    expect(third.reply).not.toContain("Aceptas que guardemos tus datos");

    const fourth = runDentalSeniorTurn(third.state, "no tengo fiebre, hinchazon ni pus y puedo abrir la boca y tragar bien");
    expect(fourth.state.safetyScreened).toBe(true);
    expect(fourth.reply).toContain("Quieres que te ayude a solicitar una cita");
    expect(fourth.reply).not.toContain("Aceptas que guardemos tus datos");
  });

  it("uses natural wording when asking about a dental trauma", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Me he dado un golpe en una muela y se mueve");

    expect(turn.state.intent).toBe("trauma");
    expect(turn.reply).toContain("Cuando te diste el golpe");
    expect(turn.reply).toContain("cuanto te duele del 0 al 10");
    expect(turn.reply).toContain("Puedes abrir la boca y tragar bien");
    expect(turn.reply.toLowerCase()).not.toContain("desde cuando ocurrio el golpe");
  });

  it("keeps trauma context after pain intensity follow-up", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me he dado un golpe en una muela y se mueve");
    const second = runDentalSeniorTurn(first.state, "ayer y me duele un 7. si puedo tragar");

    expect(second.state.intent).toBe("trauma");
    expect(second.state.safetyScreened).toBe(false);
    expect(second.reply).toContain("Y puedes abrir la boca bien?");
    expect(second.reply.toLowerCase()).not.toContain("pulpitis");
    expect(second.reply.toLowerCase()).not.toContain("absceso");
    expect(second.reply.toLowerCase()).not.toContain("frio/calor");

    const third = runDentalSeniorTurn(first.state, "ayer y me duele un 7. puedo tragar y abrir la boca bien");
    expect(third.state.intent).toBe("trauma");
    expect(third.state.safetyScreened).toBe(true);
    expect(third.reply).toContain("Aceptas que guardemos tus datos");
    expect(third.reply.toLowerCase()).not.toContain("frio/calor");
  });

  it("recognizes periodontal symptoms and only gives the price band when asked", () => {
    const withoutPriceAsk = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me sangran las encias al cepillarme y noto mal aliento desde hace meses."
    );

    expect(withoutPriceAsk.state.intent).toBe("periodontics");
    expect(withoutPriceAsk.state.treatmentNeed).toBe("Periodoncia");
    expect(withoutPriceAsk.state.budget).toBe("desde 90 EUR");
    expect(withoutPriceAsk.state.triageLabel).toBe("Prioridad 48-72h");
    // Bug real corregido: antes de la pregunta de seguridad (sangrado leve/
    // abundante, golpe) no debe adelantarse un diagnostico como "gingivitis".
    expect(withoutPriceAsk.reply).not.toContain("gingivitis");
    expect(withoutPriceAsk.reply).toContain("El sangrado es leve o abundante");
    expect(withoutPriceAsk.reply).not.toContain("90 EUR");

    const withPriceAsk = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me sangran las encias al cepillarme, cuanto me costaria arreglarlo?"
    );
    expect(withPriceAsk.reply).toContain("90 EUR");
  });

  it("can complete a high-value implant pre-booking when the patient gives consent and contact data", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero valorar implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111, email ana@example.com. Prefiero Murcia el viernes por la tarde."
    );

    expect(turn.state.intent).toBe("implant_price");
    expect(turn.state.ready).toBe(true);
    expect(turn.state.escalated).toBe(false);
    expect(turn.state.location).toBe("Murcia centro");
    expect(turn.state.availability).toContain("tarde");
    expect(turn.state.budget).toBe("desde 1.200 EUR");
    expect(turn.reply).toContain("pre-reserva lista");
  });

  it("understands plural morning and afternoon replies after asking for availability", () => {
    const waitingForAvailability = {
      ...initialDentalAgentState,
      intent: "implant_price" as const,
      intentCode: "IMPLANTE_PROTESIS_VALORACION",
      treatmentNeed: "Implante unitario",
      budget: "desde 1.200 EUR",
      estimatedValue: 120000,
      consent: true,
      name: "Alex Demo",
      phone: "612345678",
      email: "alex@example.com",
      location: "Murcia centro",
      clinicalReading: "Pendiente de valoracion para implante.",
      likelyCauses: ["ausencia de pieza"],
      safetyScreened: true
    };

    const mornings = runDentalSeniorTurn(waitingForAvailability, "viernes por las mañanas");
    const afternoons = runDentalSeniorTurn(waitingForAvailability, "viernes por las tardes");

    expect(mornings.state.availability).toBe("viernes manana");
    expect(mornings.state.ready).toBe(true);
    expect(mornings.reply).not.toContain("Que dia y hora");

    expect(afternoons.state.availability).toBe("viernes tarde");
    expect(afternoons.state.ready).toBe(true);
    expect(afternoons.reply).not.toContain("Que dia y hora");
  });

  it("understands short day and hour replies after asking for availability", () => {
    const waitingForAvailability = {
      ...initialDentalAgentState,
      intent: "implant_price" as const,
      intentCode: "IMPLANTE_PROTESIS_VALORACION",
      treatmentNeed: "Implante unitario",
      budget: "desde 1.200 EUR",
      estimatedValue: 120000,
      consent: true,
      name: "Alex Demo",
      phone: "612345678",
      email: "alex@example.com",
      location: "Murcia centro",
      clinicalReading: "Pendiente de valoracion para implante.",
      likelyCauses: ["ausencia de pieza"],
      safetyScreened: true
    };

    const turn = runDentalSeniorTurn(waitingForAvailability, "lunes 10");

    expect(turn.state.availability).toBe("lunes 10:00");
    expect(turn.state.ready).toBe(true);
    expect(turn.reply).not.toContain("Que dia y hora");
  });

  it("understands tomorrow afternoon as a concrete availability", () => {
    const waitingForAvailability = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Paquito Demo",
      phone: "654718663",
      email: "paquito@example.com",
      location: "Murcia centro",
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const turn = runDentalSeniorTurn(waitingForAvailability, "manana por la tarde");

    expect(turn.state.availability).toBe("manana tarde");
    expect(turn.state.ready).toBe(true);
    expect(turn.reply).not.toContain("Que dia y hora");
  });

  it("offers afternoon slot options when the patient asks what days are available", () => {
    const waitingForAvailability = {
      ...initialDentalAgentState,
      intent: "trauma" as const,
      intentCode: "TRAUMA_DENTAL",
      treatmentNeed: "Urgencia dental",
      budget: "desde 70 EUR",
      estimatedValue: 30000,
      escalated: true,
      consent: true,
      name: "Alejandro Marti",
      phone: "654718663",
      email: "alejandro@example.com",
      location: "Murcia centro",
      triageLevel: "URGENT_24H" as const,
      triageLabel: "Urgencia 24h",
      clinicalReading: "Golpe dental con movilidad a valorar.",
      likelyCauses: ["luxacion", "fractura dental"],
      detectedSignals: ["movilidad dental"],
      confidence: "Media" as const,
      safetyScreened: true
    };

    const turn = runDentalSeniorTurn(waitingForAvailability, "que dias tienes por la tarde??");

    expect(turn.state.availability).toBe("");
    expect(turn.reply).toContain("Te puedo proponer estos huecos de tarde en Murcia centro");
    expect(turn.reply).toContain("1.");
    expect(turn.reply).toContain("2.");
    expect(turn.reply).toContain("Responde con 1, 2 o 3");
    expect(turn.reply).not.toContain("Que dia y hora o franja te encaja");
  });

  it("does not repeat the price note and does not ask for consent on a pure price question", () => {
    // Bug real corregido (CASO 5): una consulta de precio de implante pedia
    // consentimiento en el mismo turno, antes de que el paciente aceptara
    // nada. Ahora solo da el precio + aclara que el presupuesto definitivo
    // requiere valoracion + pregunta si quiere ayuda para pedir cita.
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero saber el precio de un implante y si se puede financiar."
    );

    const priceNote = "El implante unitario parte desde 1.200 EUR";
    const occurrences = turn.reply.split(priceNote).length - 1;
    expect(occurrences).toBe(1);
    expect(turn.reply).not.toContain("Aceptas que guardemos tus datos");
    expect(turn.reply).toContain("ayude a solicitar una cita");

    // La continuacion natural (aceptar) SI avanza al flujo de datos.
    const accepted = runDentalSeniorTurn(turn.state, "Vale, ayudame.");
    expect(accepted.reply).toContain("nombre");
  });

  it("does not repeat orientation or price on later turns and asks one thing at a time", () => {
    const first = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero saber el precio de un implante."
    );
    expect(first.reply).toContain("1.200 EUR");

    const second = runDentalSeniorTurn(first.state, "Vale, acepto.");
    expect(second.reply).not.toContain("1.200 EUR");
    expect(second.reply).not.toContain("podria ser");
    expect(second.reply).toContain("nombre");
    expect(second.reply.length).toBeLessThan(160);
  });

  it("asks for the treatment, not pain options, when the patient wants a quote", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Quiero un presupuesto");
    expect(first.reply.toLowerCase()).toContain("implantes");
    expect(first.reply.toLowerCase()).toContain("sin coste");
    expect(first.reply.toLowerCase()).not.toContain("dolor");

    const second = runDentalSeniorTurn(first.state, "Para una corona");
    expect(second.state.intent).toBe("prosthetics");
    expect(second.reply).toContain("450 EUR");
    expect(second.reply).not.toContain("podria ser");
  });

  it("treats aesthetic options as a category, not only whitening", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Quiero un presupuesto");
    const second = runDentalSeniorTurn(first.state, "Estetica, que opciones tienes?");

    expect(second.state.intent).toBe("cosmetic_dentistry");
    expect(second.state.treatmentNeed).toBe("Estética dental");
    expect(second.reply.toLowerCase()).toContain("blanqueamiento");
    expect(second.reply.toLowerCase()).toContain("carillas");
    expect(second.reply.toLowerCase()).toContain("digital smile design");
    expect(second.reply.toLowerCase()).toContain("cual te interesa mas");
    expect(second.reply.toLowerCase()).not.toContain("no es solo");
    expect(second.reply.toLowerCase()).not.toContain("aceptas que guardemos");
    expect(second.state.budget).toBe("valoración sin coste");
  });

  it("keeps whitening as its own treatment when the patient asks specifically for it", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Quiero presupuesto para blanqueamiento");

    expect(turn.state.intent).toBe("whitening");
    expect(turn.state.treatmentNeed).toBe("Blanqueamiento");
    expect(turn.reply).toContain("280 EUR");
  });

  it("answers cleaning price as hygiene, not as a generic first visit", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Cuanto vale una limpieza de boca?");

    expect(turn.state.intent).toBe("reactivation");
    expect(turn.state.treatmentNeed).toBe("Higiene dental");
    expect(turn.reply).toContain("55 EUR");
    expect(turn.reply.toLowerCase()).toContain("encia inflamada");
    expect(turn.reply.toLowerCase()).not.toContain("primera visita");
  });

  it("books a routine cleaning without inventing a periodontal diagnosis", () => {
    // Bug real (produccion): "cita para una limpieza" (sin sintomas ni
    // dolor) caia en el guion generico de diagnostico ("podria ser
    // mantenimiento periodontal o sarro; te lo confirmara el doctor"),
    // inventando una causa clinica para una simple peticion de cita.
    const turn = runDentalSeniorTurn(initialDentalAgentState, "hola. cita para una limpieza??");

    expect(turn.state.intent).toBe("reactivation");
    expect(turn.reply.toLowerCase()).not.toContain("podria ser");
    expect(turn.reply.toLowerCase()).not.toContain("confirmara el doctor");
  });

  it("keeps gum symptoms in periodontics even if the patient mentions cleaning", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Creo que necesito limpieza, me sangran las encias y tengo mal aliento"
    );

    expect(turn.state.intent).toBe("periodontics");
    expect(turn.state.treatmentNeed).toBe("Periodoncia");
    // Bug real corregido: con la pregunta de seguridad (sangrado leve/abundante,
    // golpe) todavia pendiente, no debe adelantarse un diagnostico como "gingivitis".
    expect(turn.reply.toLowerCase()).not.toContain("gingivitis");
    expect(turn.reply.toLowerCase()).toContain("el sangrado es leve o abundante");
  });

  it("does not reduce orthodontics to invisible aligners when the patient asks for brackets", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Cuanto cuestan los brackets o el aparato?");

    expect(turn.state.intent).toBe("orthodontics");
    expect(turn.state.treatmentNeed).toBe("Ortodoncia");
    expect(turn.reply).toContain("brackets");
    expect(turn.reply).toContain("1.800 EUR");
    expect(turn.reply.toLowerCase()).toContain("estudio digital");
  });

  it("uses the commercial copy when quote and treatment arrive in one message", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Quiero presupuesto para un implante");
    expect(turn.state.intent).toBe("implant_price");
    expect(turn.reply).toContain("1.200 EUR");
    expect(turn.reply).not.toContain("podria ser");
    expect(turn.reply.toLowerCase()).not.toContain("dolor");
  });

  it("includes the price when the treatment and all booking data arrive in one turn", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Quiero un presupuesto");
    const second = runDentalSeniorTurn(
      first.state,
      "Para un implante. Acepto que guardeis mis datos. Soy Rosa Gil, telefono 622333444, email rosa@example.com. Murcia el viernes por la tarde."
    );
    expect(second.state.ready).toBe(true);
    expect(second.reply).toContain("pre-reserva lista");
    expect(second.reply).toContain("1.200 EUR");
  });

  it("accepts a bare name reply when the agent just asked for the name (non-emergency flow)", () => {
    const turn1 = runDentalSeniorTurn(initialDentalAgentState, "Me duele mucho una muela");
    const turn2 = runDentalSeniorTurn(turn1.state, "No, nada de eso");
    const consented = runDentalSeniorTurn(turn2.state, "Acepto");
    expect(consented.state.consent).toBe(true);
    expect(consented.reply.toLowerCase()).toContain("nombre");
    expect(consented.reply.toLowerCase()).not.toContain("telefono");

    const named = runDentalSeniorTurn(consented.state, "Alejandro Marti");
    expect(named.state.name).toBe("Alejandro Marti");
    expect(named.reply).not.toContain("Como te llamas");
    expect(named.reply.toLowerCase()).toContain("teléfono");
  });

  // PR #13 (Codex): EMERGENCY corta el flujo por completo - la respuesta
  // siempre es la misma indicacion de seguridad, sin importar que responda
  // el paciente despues (nunca progresa a pedir consentimiento/nombre/telefono).
  it("EMERGENCY never progresses to consent/name/phone regardless of what the patient replies afterwards", () => {
    const emergency = runDentalSeniorTurn(
      initialDentalAgentState,
      "Tengo fiebre y me cuesta tragar y el dolor un 6"
    );
    expect(emergency.state.triageLevel).toBe("EMERGENCY");
    expect(emergency.state.escalated).toBe(true);
    expect(emergency.state.consent).toBe(false);
    expect(emergency.state.bookingStatus).toBe("IDLE");
    expect(emergency.reply.toLowerCase()).not.toContain("frio/calor");
    expect(emergency.reply.toLowerCase()).not.toContain("aceptas");
    expect(emergency.reply.toLowerCase()).not.toContain("nombre");
    expect(emergency.reply).toContain("urgencias");

    const afterSi = runDentalSeniorTurn(emergency.state, "Si");
    expect(afterSi.state.triageLevel).toBe("EMERGENCY");
    expect(afterSi.state.consent).toBe(false);
    expect(afterSi.state.bookingStatus).toBe("IDLE");
    expect(afterSi.reply.toLowerCase()).not.toContain("como te llamas");
    expect(afterSi.reply.toLowerCase()).not.toContain("nombre");
    expect(afterSi.reply).toContain("urgencias");
  });

  it("never surfaces more than one pending clinical question at a time", () => {
    // Bug real (produccion): "me duele una muela" dispara a la vez la
    // pregunta frio/calor/morder Y la de desde-cuando/intensidad, y el LLM
    // las hacia ambas en el mismo turno (dos burbujas, dos preguntas),
    // violando "una pregunta, una respuesta".
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Me duele una muela");
    expect(turn.state.missingClinicalData.length).toBeLessThanOrEqual(1);
  });

  it("thanks the patient distinctly instead of repeating the same closing after a booking is confirmed", () => {
    // Bug real (produccion): tras "perfecto" (que ya cerro con "Aqui sigo si
    // necesitas algo mas..."), el paciente dijo "gracias" y pickVariant hasheo
    // al MISMO texto otra vez, mandando el mismo cierre dos veces seguidas.
    const readyState: DentalAgentState = {
      ...initialDentalAgentState,
      intent: "prosthetics",
      intentCode: "PROTESIS_CORONA_DESCEMENTADA",
      treatmentNeed: "Corona / prótesis fija",
      consent: true,
      name: "Alex Test",
      phone: "611222333",
      email: "alex@example.com",
      location: "Elche - Altabix",
      availability: "viernes, 24/07, 10:45",
      ready: true,
      // El comentario de arriba describe un "perfecto" YA respondido antes:
      // ese cierre ya se envio, asi que este "gracias" es el agradecimiento
      // posterior, no el primer cierre (que ahora usa un mensaje distinto,
      // ver "confirms the real booking status...").
      closureAcknowledged: true
    };
    const turn = runDentalSeniorTurn(readyState, "gracias");
    expect(turn.reply).toContain("Gracias a ti");
    expect(turn.reply).not.toContain("Aquí sigo");
  });

  it("still asks the general alarm safety-screen question when a pain intent narrows to caries_restoration", () => {
    // Bug real (produccion): "me duele una muela" (urgent_pain) + "al morder"
    // reclasifica a caries_restoration, que no estaba en la lista de intents
    // que exigen la pregunta general de alarma (fiebre/hinchazon/pus). Sin
    // missingClinicalData pendiente tampoco, el motor local saltaba directo
    // de diagnostico a pedir consentimiento sin descartar absceso/infeccion.
    const first = runDentalSeniorTurn(initialDentalAgentState, "me duele una muela");
    const second = runDentalSeniorTurn(first.state, "al morder");
    expect(second.state.intent).toBe("caries_restoration");
    expect(second.state.safetyScreened).toBe(false);
    expect(second.reply.toLowerCase()).toContain("fiebre");
  });

  it("captures name and phone from a single bare reply", () => {
    const first = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero implante. Acepto que guardeis mis datos."
    );
    const second = runDentalSeniorTurn(first.state, "Alejandro Marti, 655444333");
    expect(second.state.name).toBe("Alejandro Marti");
    expect(second.state.phone).toBe("655444333");
  });

  it("asks booking data one field at a time after consent", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me falta una muela y quiero implante");
    const consented = runDentalSeniorTurn(first.state, "acepto");
    expect(consented.reply).toContain("Y tu nombre y apellidos?");
    expect(consented.reply.toLowerCase()).not.toContain("telefono");
    expect(consented.reply.toLowerCase()).not.toContain("murcia");
    expect(consented.reply.toLowerCase()).not.toContain("disponibilidad");

    const named = runDentalSeniorTurn(consented.state, "Alejandro Marti");
    expect(named.reply).toContain("Y tu email");
    expect(named.reply.toLowerCase()).not.toContain("telefono");
    expect(named.reply.toLowerCase()).not.toContain("murcia");
    expect(named.reply.toLowerCase()).not.toContain("disponibilidad");

    const emailed = runDentalSeniorTurn(named.state, "alejandro@example.com");
    expect(emailed.state.email).toBe("alejandro@example.com");
    expect(emailed.reply).toContain("Y un teléfono de contacto");
    expect(emailed.reply.toLowerCase()).not.toContain("murcia");
    expect(emailed.reply.toLowerCase()).not.toContain("disponibilidad");

    const phoned = runDentalSeniorTurn(emailed.state, "654718663");
    expect(phoned.state.phone).toBe("654718663");
    expect(phoned.reply).toContain("Te viene mejor");
    expect(phoned.reply).toContain("Murcia centro");
    expect(phoned.reply.toLowerCase()).not.toContain("disponibilidad");

    const located = runDentalSeniorTurn(phoned.state, "Murcia");
    expect(located.reply).toContain("Te puedo proponer estos huecos");
    expect(located.reply).toContain("1.");
    expect(located.reply).toContain("2.");
    expect(located.reply).toContain("Responde con 1, 2 o 3");
    expect(located.reply).not.toContain("Que dia y hora");
    expect(located.state.offeredAvailabilityOptions).toHaveLength(3);
    expect(located.state.ready).toBe(false);
  });

  it("does not advance to phone when the email is malformed", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me falta una muela y quiero implante");
    const consented = runDentalSeniorTurn(first.state, "acepto");
    const named = runDentalSeniorTurn(consented.state, "Alejandro Marti");
    const invalidEmail = runDentalSeniorTurn(named.state, "alejandro@");

    expect(invalidEmail.state.email).toBe("");
    expect(invalidEmail.reply).toContain("Ese email no me encaja");
    expect(invalidEmail.reply.toLowerCase()).not.toContain("telefono");
    expect(invalidEmail.state.ready).toBe(false);
  });

  it("captures uppercase name separated from phone with a dash", () => {
    const waitingForContact = {
      ...initialDentalAgentState,
      intent: "orthodontics" as const,
      intentCode: "ORTODONCIA_ESTUDIO",
      treatmentNeed: "Ortodoncia",
      budget: "desde 1.800 EUR",
      estimatedValue: 180000,
      consent: true,
      missingClinicalData: ["Es para ti o para un nino?"],
      clinicalReading: "Pendiente de estudio digital.",
      likelyCauses: ["apinamiento"]
    };

    const turn = runDentalSeniorTurn(waitingForContact, "ALEX JANDER - 654718663");

    expect(turn.state.name).toBe("ALEX JANDER");
    expect(turn.state.phone).toBe("654718663");
    expect(turn.reply.toLowerCase()).not.toContain("nombre");
    expect(turn.reply.toLowerCase()).not.toContain("apellidos");
  });

  it("does not store a clinical answer as the name when the pending question is clinical", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Creo que tengo una caries en una muela");
    const second = runDentalSeniorTurn(first.state, "acepto");
    // La pregunta pendiente sigue siendo clinica (frio/morder), no el nombre.
    const third = runDentalSeniorTurn(second.state, "desde ayer");
    expect(third.state.name).toBe("");
  });

  it("does not store time expressions as a name in an escalated flow", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele mucho una muela");
    const second = runDentalSeniorTurn(first.state, "no tengo fiebre ni hinchazon, acepto");
    const third = runDentalSeniorTurn(second.state, "desde ayer");
    expect(third.state.name).toBe("");
  });

  it("does not mistake short non-name replies for a name", () => {
    const first = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero implante. Acepto que guardeis mis datos."
    );
    const second = runDentalSeniorTurn(first.state, "vale, perfecto");
    expect(second.state.name).toBe("");
  });

  it("does not repeat the booking confirmation once the pre-booking is done", () => {
    const ready = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111, email ana@example.com. Prefiero Murcia el viernes por la tarde."
    );
    expect(ready.state.ready).toBe(true);
    expect(ready.reply).toContain("pre-reserva lista");

    const followup = runDentalSeniorTurn(ready.state, "Genial, muchas gracias");
    expect(followup.reply).not.toContain("pre-reserva lista");
    expect(followup.reply.length).toBeLessThan(120);
  });

  it("does not drag urgency signals into a new unrelated topic", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele mucho una muela");
    expect(first.state.escalated).toBe(true);

    const second = runDentalSeniorTurn(
      first.state,
      "Ya estoy mejor de eso. Ahora queria informarme sobre ortodoncia invisible"
    );
    expect(second.state.intent).toBe("orthodontics");
    expect(second.state.escalated).toBe(false);
    expect(second.state.detectedSignals).not.toContain("dolor intenso");
  });

  it("does not let a past 'dolor intenso' signal force urgent_pain on a later unrelated reply", () => {
    // Bug real: tras "me duele mucho" (endodontics + signal dolor intenso),
    // una respuesta de seguridad sin sintomas nuevos ("no tengo fiebre ni
    // hinchazon") se reclasificaba como urgent_pain solo porque el signal
    // "dolor intenso" seguia acumulado del turno anterior.
    const first = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me duele mucho al frio y creo que es del nervio, desde hace dias"
    );
    expect(first.state.intent).toBe("endodontics");

    const second = runDentalSeniorTurn(first.state, "No tengo fiebre ni hinchazon");
    expect(second.state.intent).toBe("endodontics");
    expect(second.reply).not.toContain("absceso dental");
  });

  it("does not escalate to urgency when the patient denies strong pain", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Se me ha caido una funda y noto sensibilidad");
    expect(first.state.intent).toBe("prosthetics");

    const second = runDentalSeniorTurn(first.state, "No hay dolor fuerte ni sangrado, la conservo entera");
    expect(second.state.intent).toBe("prosthetics");
    expect(second.state.escalated).toBe(false);
    expect(second.state.detectedSignals).not.toContain("dolor intenso");
  });

  it("discloses it is an AI assistant when asked directly, without altering the conversation state", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me sangran las encias al cepillarme");
    expect(first.state.intent).toBe("periodontics");

    const asksIdentity = runDentalSeniorTurn(first.state, "Perdona, eres humana o eres un bot?");
    expect(asksIdentity.reply).toContain("No, no soy humana");
    expect(asksIdentity.reply.toLowerCase()).toContain("inteligencia artificial");
    expect(asksIdentity.state).toEqual(first.state);

    const resumed = runDentalSeniorTurn(
      asksIdentity.state,
      "Vale, acepto que guardeis mis datos. Soy Marta Ruiz, telefono 622111333."
    );
    expect(resumed.state.consent).toBe(true);
    expect(resumed.state.name).toBe("Marta Ruiz");
    expect(resumed.state.phone).toBe("622111333");
  });

  it("never implies it is human even at the very first message", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Hola, con quien hablo? eres real?");
    expect(turn.reply.toLowerCase()).toContain("no soy humana");
    expect(turn.state.intent).toBeUndefined();
    expect(turn.state.consent).toBe(false);
    expect(turn.state.name).toBe("");
  });

  it("still escalates a real emergency even when the same message also asks if it is human", () => {
    // Bug real (P1) detectado en revision: el aviso de identidad devolvia el
    // estado sin tocar y se saltaba el triaje, asi que una emergencia real
    // combinada con la pregunta de identidad no escalaba ni pedia la
    // pregunta de seguridad si el LLM no estaba disponible.
    const turn = runDentalSeniorTurn(initialDentalAgentState, "No puedo respirar bien, eres humana o un bot?");
    expect(turn.state.triageLevel).toBe("EMERGENCY");
    expect(turn.state.escalated).toBe(true);
    expect(turn.reply.toLowerCase()).toContain("no soy humana");
    expect(turn.reply.toLowerCase()).toContain("urgencias");
  });

  it("does not cancel out a literal 'no puedo respirar/tragar/abrir' as if it were the negation", () => {
    // Bug real: el filtro de negacion buscaba "puedo respirar" como
    // substring, y esa cadena tambien aparece dentro de "no puedo
    // respirar", asi que la frase de emergencia se anulaba a si misma.
    const breathing = runDentalSeniorTurn(initialDentalAgentState, "No puedo respirar bien");
    expect(breathing.state.redFlags).toContain("dificultad para respirar");
    expect(breathing.state.triageLevel).toBe("EMERGENCY");

    const swallowing = runDentalSeniorTurn(initialDentalAgentState, "No puedo tragar nada");
    expect(swallowing.state.redFlags).toContain("dificultad para tragar o hablar");

    const opening = runDentalSeniorTurn(initialDentalAgentState, "No puedo abrir la boca");
    expect(opening.state.redFlags).toContain("dificultad para abrir la boca");

    const reallyFine = runDentalSeniorTurn(initialDentalAgentState, "Puedo respirar bien, tranquilo");
    expect(reallyFine.state.redFlags).not.toContain("dificultad para respirar");
  });

  it("answers a clinical suitability question instead of overriding it with the price script", () => {
    // Bug real detectado en QA: con el intent ya fijado, el segundo turno
    // solo pasaba por buildAck + nextStep (pide el siguiente dato), asi que
    // una pregunta de idoneidad clinica (edad, embarazo...) quedaba sin
    // respuesta, tapada por el guion de presupuesto/siguiente paso.
    const first = runDentalSeniorTurn(initialDentalAgentState, "quiero presupuesto para ortodoncia invisible");
    const second = runDentalSeniorTurn(first.state, "tengo 60 años, es eso un problema para poder ponerme la ortodoncia?");
    expect(second.reply).toContain("La edad no suele ser impedimento");

    const pregnancy = runDentalSeniorTurn(first.state, "estoy embarazada, puedo hacerme la ortodoncia igualmente?");
    expect(pregnancy.reply).toContain("En el embarazo se puede tratar");

    const noFalsePositive = runDentalSeniorTurn(first.state, "acepto, me llamo Juan Perez");
    expect(noFalsePositive.reply).not.toContain("edad no suele ser impedimento");
  });

  it("asks for a guardian instead of collecting consent/booking data from a self-reported minor", () => {
    // Bug real detectado en pruebas de estres: un menor que dice su edad y
    // pide gestionar la cita "sin mis padres" recibia el mismo guion de
    // consentimiento/reserva que un adulto.
    const minor = runDentalSeniorTurn(initialDentalAgentState, "tengo 15 años, puedo ponerme brackets sin que vengan mis padres?");
    expect(minor.reply).toContain("padre, madre o tutor legal");
    expect(minor.reply.toLowerCase()).not.toContain("aceptas que guardemos tus datos");
    expect(minor.state.requiresGuardian).toBe(true);
    expect(minor.state.ready).toBe(false);

    // No debe dispararse con menciones de duracion ("llevo X anos con esto"),
    // solo con una declaracion de edad propia ("tengo X anos").
    const notAMinor = runDentalSeniorTurn(initialDentalAgentState, "llevo 15 años con este dolor de vez en cuando");
    expect(notAMinor.state.requiresGuardian).toBe(false);

    // Un padre/madre que retoma la conversacion puede seguir con la cita.
    const parentTakesOver = runDentalSeniorTurn(
      minor.state,
      "hola, soy la madre, seguimos con la cita: acepto, soy Maria Lopez, 612345678, maria@x.com, Murcia, viernes tarde"
    );
    expect(parentTakesOver.state.requiresGuardian).toBe(false);
    expect(parentTakesOver.state.name).toBe("Maria Lopez");
  });

  it("escalates to a human and stops the booking flow on a data erasure / consent withdrawal request", () => {
    // Bug real detectado en pruebas de estres: "borra mis datos"/"retiro el
    // consentimiento" no tenia ningun manejo, Clara seguia como si nada.
    const booked = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111, email ana@example.com. Prefiero Murcia el viernes por la tarde."
    );
    expect(booked.state.ready).toBe(true);

    const erasure = runDentalSeniorTurn(booked.state, "en realidad borra todos mis datos, retiro el consentimiento y no quiero seguir");
    expect(erasure.reply).not.toContain("pre-reserva lista");
    expect(erasure.state.dataErasureRequested).toBe(true);
    expect(erasure.state.escalated).toBe(true);
    expect(erasure.state.ready).toBe(false);
  });

  it("warns instead of proceeding when a payment card number is pasted into the chat", () => {
    // Bug real detectado en pruebas de estres: un numero de tarjeta completo
    // pegado en el chat se ignoraba, Clara seguia con el guion de precio/cita.
    const cardPasted = runDentalSeniorTurn(
      initialDentalAgentState,
      "te paso el numero de mi tarjeta de credito para pagar el implante ya, es 4111 1111 1111 1111"
    );
    expect(cardPasted.reply).toContain("no nos mandes");
    expect(cardPasted.reply).not.toContain("1.200 EUR");

    // Un telefono normal de 9 digitos no debe disparar el aviso.
    const normalPhone = runDentalSeniorTurn(initialDentalAgentState, "quiero implante, acepto, soy Ana Ruiz, 612345678, ana@x.com, Murcia, viernes tarde");
    expect(normalPhone.reply).not.toContain("no nos mandes");
  });

  it("answers both parts of a double question instead of dropping the price one", () => {
    // Bug real detectado en pruebas de estres: "cuanto cuesta un implante y
    // si aceptais Sanitas" perdia la parte del precio por completo.
    const turn = runDentalSeniorTurn(initialDentalAgentState, "tengo dos preguntas: cuanto cuesta un implante y si aceptais Sanitas");
    expect(turn.reply.toLowerCase()).toContain("seguros o mutuas");
    expect(turn.reply.toLowerCase()).toContain("sobre el precio");
  });

  it("answers bisphosphonates/osteoporosis and anesthesia allergy suitability questions", () => {
    // Bug real: el detector de idoneidad clinica cubria edad/embarazo/diabetes
    // pero no bifosfonatos (riesgo real en implantes) ni alergia a anestesia.
    const bisphosphonates = runDentalSeniorTurn(initialDentalAgentState, "tomo bifosfonatos para la osteoporosis, puedo ponerme un implante?");
    expect(bisphosphonates.reply).toContain("bifosfonatos u osteoporosis");

    const allergy = runDentalSeniorTurn(initialDentalAgentState, "soy alergica a la anestesia local, me podeis hacer una limpieza igualmente?");
    expect(allergy.reply).toContain("alergia a la anestesia");
  });

  it("flags an obviously invalid phone number instead of silently accepting it", () => {
    // Bug real: "mi telefono es 123" se descartaba en silencio, sin avisar.
    const invalidPhone = runDentalSeniorTurn(
      initialDentalAgentState,
      "quiero implante, acepto, soy Ana Ruiz, mi telefono es 123, ana@x.com, Murcia, viernes tarde"
    );
    expect(invalidPhone.reply.toLowerCase()).toContain("ese teléfono no me encaja");
    expect(invalidPhone.state.phone).toBe("");
  });

  it("does not repeat the identical safety question verbatim after the patient de-escalates urgency", () => {
    // Bug real: "dolor 10/10, no aguanto" -> "puede esperar a la semana que
    // viene" recibia la misma pregunta de seguridad tal cual.
    const urgent = runDentalSeniorTurn(initialDentalAgentState, "me duele mucho la muela");
    expect(urgent.state.triageLevel).toBe("URGENT_24H");
    expect(urgent.state.redFlags).toEqual([]);

    const deescalated = runDentalSeniorTurn(urgent.state, "bueno pensandolo bien no es para tanto, puede esperar a la semana que viene");
    expect(deescalated.reply).not.toContain(urgent.reply.split("\n\n").at(-1));
    expect(deescalated.state.safetyScreened).toBe(true);
  });

  it("gives an honest fallback and escalates for a message it cannot understand in Spanish", () => {
    // Bug real: un mensaje integramente en inglés o valenciano/catalán
    // recibia el mismo menu generico en español como si fuera ruido.
    const english = runDentalSeniorTurn(initialDentalAgentState, "Hi, I have a terrible toothache since yesterday, can you help me get an appointment?");
    expect(english.reply.toLowerCase()).toContain("solo puedo atenderte en español");
    expect(english.state.escalated).toBe(true);

    const catalan = runDentalSeniorTurn(initialDentalAgentState, "Bon dia, tinc mal de queixal des d'ahir, em podeu donar hora?");
    expect(catalan.reply.toLowerCase()).toContain("solo puedo atenderte en español");

    // Un mensaje con alguna palabra en ingles pero intencion clara en espanol
    // no debe disparar el aviso de idioma (ya cubierto por el motor normal).
    const mixed = runDentalSeniorTurn(initialDentalAgentState, "hello quiero i want cita por favor pleaaase tooth hurts mucho");
    expect(mixed.reply.toLowerCase()).not.toContain("solo puedo atenderte en español");
  });
});

describe("hasSlotOfferPrerequisites / computeBookingStatus", () => {
  // Fix real (revision PR #11, "Keep location-only states in data collection"):
  // computeBookingStatus devolvia READY_TO_OFFER_SLOTS solo porque existia
  // state.location, aunque siguieran faltando consent/nombre/email/telefono.
  const withOnlyLocation: DentalAgentState = {
    ...initialDentalAgentState,
    intent: "prosthetics",
    location: "Murcia centro"
  };

  it("no considera listo para ofrecer huecos solo por tener la sede", () => {
    expect(hasSlotOfferPrerequisites(withOnlyLocation)).toBe(false);
    expect(computeBookingStatus(withOnlyLocation)).not.toBe("READY_TO_OFFER_SLOTS");
    expect(computeBookingStatus(withOnlyLocation)).toBe("COLLECTING_CONSENT");
  });

  it("tampoco esta listo si falta solo un dato administrativo (nombre, telefono o email)", () => {
    const missingName = { ...withOnlyLocation, consent: true, phone: "611222333", email: "juan@example.com" };
    expect(hasSlotOfferPrerequisites(missingName)).toBe(false);
    expect(computeBookingStatus(missingName)).toBe("COLLECTING_PATIENT_DATA");

    const missingPhone = { ...missingName, name: "Juan Perez", phone: "" };
    expect(hasSlotOfferPrerequisites(missingPhone)).toBe(false);
    expect(computeBookingStatus(missingPhone)).toBe("COLLECTING_PATIENT_DATA");

    const missingEmail = { ...missingPhone, phone: "611222333", email: "" };
    expect(hasSlotOfferPrerequisites(missingEmail)).toBe(false);
    expect(computeBookingStatus(missingEmail)).toBe("COLLECTING_PATIENT_DATA");
  });

  it("esta listo para ofrecer huecos solo con consent + nombre completo + telefono + email + sede", () => {
    const complete: DentalAgentState = {
      ...withOnlyLocation,
      consent: true,
      name: "Juan Perez",
      phone: "611222333",
      email: "juan@example.com"
    };
    expect(hasSlotOfferPrerequisites(complete)).toBe(true);
    expect(computeBookingStatus(complete)).toBe("READY_TO_OFFER_SLOTS");
  });
});

describe("hotfix dental-negation-context: extractAffirmedAndNegatedClinicalSignals", () => {
  it('CASO3: "No tengo fiebre, pero si tengo hinchazon" niega fiebre y afirma hinchazon por separado', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre, pero si tengo hinchazon");
    expect(result.negated).toContain("fever");
    expect(result.affirmed).toContain("swelling");
    expect(result.affirmed).not.toContain("fever");
    expect(result.negated).not.toContain("swelling");
  });

  it('CASO4: "No tengo dificultad para respirar ni para tragar" niega ambas, nunca las afirma', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo dificultad para respirar ni para tragar");
    expect(result.negated).toContain("breathingDifficulty");
    expect(result.negated).toContain("swallowingDifficulty");
    expect(result.affirmed).not.toContain("breathingDifficulty");
    expect(result.affirmed).not.toContain("swallowingDifficulty");
  });

  it('CASO5: "Si, recibi un golpe ayer" afirma trauma - una negacion vecina no debe romper una afirmacion real', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Si, recibi un golpe ayer");
    expect(result.affirmed).toContain("trauma");
    expect(result.negated).not.toContain("trauma");
  });

  it('CASO6: "No, ningun golpe" niega trauma', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No, ningun golpe");
    expect(result.negated).toContain("trauma");
    expect(result.affirmed).not.toContain("trauma");
  });

  it('"es poco y no he recibido ningun golpe" niega trauma sin depender de una frase cerrada', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Es poco y no he recibido ningun golpe");
    expect(result.negated).toContain("trauma");
  });

  it('"no puedo tragar nada" AFIRMA dificultad para tragar (no se cancela a si misma pese al "no")', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No puedo tragar nada");
    expect(result.affirmed).toContain("swallowingDifficulty");
    expect(result.negated).not.toContain("swallowingDifficulty");
  });

  it('"puedo tragar bien" niega dificultad para tragar', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Puedo tragar bien");
    expect(result.negated).toContain("swallowingDifficulty");
    expect(result.affirmed).not.toContain("swallowingDifficulty");
  });
});

describe("hotfix dental-negation-context: resolveAnswerToLastClinicalQuestion", () => {
  it('CASO1: "No, nada de eso" tras safety_screen_general niega las 5 señales y resuelve el cribado', () => {
    const result = resolveAnswerToLastClinicalQuestion({
      patientMessage: "No, nada de eso",
      lastQuestionKey: "safety_screen_general"
    });
    expect(result.negated).toEqual(
      expect.arrayContaining(["fever", "swelling", "pus", "swallowingDifficulty", "openingDifficulty"])
    );
    expect(result.resolvesSafetyScreen).toBe(true);
  });

  it('CASO2: "Es poco y no he recibido ningun golpe" tras bleeding_severity_or_impact niega sangrado incontrolado y trauma, pero NO resuelve el cribado general (Problema 2)', () => {
    const result = resolveAnswerToLastClinicalQuestion({
      patientMessage: "Es poco y no he recibido ningun golpe",
      lastQuestionKey: "bleeding_severity_or_impact"
    });
    expect(result.negated).toEqual(expect.arrayContaining(["bleedingUncontrolled", "trauma"]));
    // Resolver sangrado/golpe cierra su propia diferencial, no el cribado
    // general (todavia falta fiebre/hinchazon/pus/dificultad).
    expect(result.resolvesBleedingDifferential).toBe(true);
    expect(result.resolvesSafetyScreen).toBe(false);
  });

  it("sin lastQuestionKey, una negacion global no resuelve nada (no hay pregunta que interpretar)", () => {
    const result = resolveAnswerToLastClinicalQuestion({ patientMessage: "No, nada de eso", lastQuestionKey: "" });
    expect(result.resolvesSafetyScreen).toBe(false);
  });

  // PR #13 (comentario P2 de Codex): un lastQuestionKey desconocido/corrupto
  // (persistido por error, o un estado antiguo) no debe lanzar excepcion.
  it('lastQuestionKey="valor-invalido" no lanza excepcion y se trata como "sin pregunta pendiente"', () => {
    expect(() =>
      resolveAnswerToLastClinicalQuestion({
        patientMessage: "No tengo fiebre",
        lastQuestionKey: "valor-invalido" as never
      })
    ).not.toThrow();
    const result = resolveAnswerToLastClinicalQuestion({
      patientMessage: "No tengo fiebre",
      lastQuestionKey: "valor-invalido" as never
    });
    expect(result.resolvesSafetyScreen).toBe(false);
    expect(result.resolvesBleedingDifferential).toBe(false);
  });
});

// PR #13 (comentario P1 de Codex - "Do not negate red flags from unrelated
// no"): la negacion debe tener alcance LOCAL por señal, no por clausula
// completa. Cubre los 8 casos exigidos en el comentario.
describe("PR #13 P1: negacion de alcance local (extractAffirmedAndNegatedClinicalSignals)", () => {
  it("1. 'No tengo fiebre y tengo hinchazón en el ojo' -> fever negada, swelling afirmada (NO se contamina entre señales)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre y tengo hinchazón en el ojo");
    expect(result.negated).toContain("fever");
    expect(result.affirmed).toContain("swelling");
    expect(result.negated).not.toContain("swelling");
  });

  it("2. 'No tengo fiebre ni hinchazón' -> ambas negadas", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre ni hinchazón");
    expect(result.negated).toEqual(expect.arrayContaining(["fever", "swelling"]));
  });

  it("3. 'Tengo fiebre pero no tengo hinchazón' -> fever afirmada, swelling negada", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Tengo fiebre pero no tengo hinchazón");
    expect(result.affirmed).toContain("fever");
    expect(result.negated).toContain("swelling");
    expect(result.negated).not.toContain("fever");
  });

  it("4. 'No tengo fiebre, pero sí tengo pus' -> fever negada, pus afirmada", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre, pero sí tengo pus");
    expect(result.negated).toContain("fever");
    expect(result.affirmed).toContain("pus");
    expect(result.negated).not.toContain("pus");
  });

  it("5. 'No he recibido ningún golpe pero el sangrado es abundante' -> trauma negado, sangrado afirmado", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No he recibido ningún golpe pero el sangrado es abundante");
    expect(result.negated).toContain("trauma");
    expect(result.affirmed).toContain("bleedingUncontrolled");
  });

  it("6. 'No tengo dificultad para respirar ni para tragar' -> ambas dificultades negadas", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo dificultad para respirar ni para tragar");
    expect(result.negated).toEqual(expect.arrayContaining(["breathingDifficulty", "swallowingDifficulty"]));
  });

  it('7. "No puedo respirar bien" -> dificultad respiratoria AFIRMADA (el "no" de "no puedo" no es una negacion)', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No puedo respirar bien");
    expect(result.affirmed).toContain("breathingDifficulty");
    expect(result.negated).not.toContain("breathingDifficulty");
  });

  it('8. "No puedo tragar" -> dificultad para tragar AFIRMADA', () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No puedo tragar");
    expect(result.affirmed).toContain("swallowingDifficulty");
    expect(result.negated).not.toContain("swallowingDifficulty");
  });

  it("'Ni fiebre ni hinchazón' (sin verbo 'tengo') niega ambas señales", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Ni fiebre ni hinchazón");
    expect(result.negated).toEqual(expect.arrayContaining(["fever", "swelling"]));
    expect(result.affirmed).not.toContain("fever");
    expect(result.affirmed).not.toContain("swelling");
  });
});

// PR #13 (Codex, revision sobre 6511e78): "Preserve red flags after unrelated
// denial" (P1) y "Don't drop pain intents after unrelated denials" (P2) - la
// negacion/afirmacion sigue sin alcance local cuando el marcador afirmativo
// es "con X" (no reconocido) o cuando la señal es "dolor"/"duele" (resuelta
// por un regex de negacion de CLAUSULA COMPLETA independiente en
// mentionsUrgentAlarmWithoutNegation, en vez de reutilizar el mismo motor de
// marcadores por señal). Los 11 casos numerados de la ficha se cubren aqui.
describe("PR #13 P1/P2 (revision sobre 6511e78): polaridad por señal reutilizada para dolor y para 'con X'", () => {
  it("1. 'Sin fiebre y con hinchazón en el ojo' -> fever negada, swelling afirmada ('con' es marcador afirmativo)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Sin fiebre y con hinchazón en el ojo");
    expect(result.negated).toContain("fever");
    expect(result.affirmed).toContain("swelling");
    expect(result.negated).not.toContain("swelling");
  });

  it("2. 'No tengo fiebre y tengo hinchazón en el ojo' -> fever negada, swelling afirmada (regresion P1 original)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre y tengo hinchazón en el ojo");
    expect(result.negated).toContain("fever");
    expect(result.affirmed).toContain("swelling");
  });

  it("3. 'Me duele una muela y no tengo fiebre' -> dolor afirmado, fiebre negada (la negacion de fiebre no anula el dolor)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Me duele una muela y no tengo fiebre");
    expect(result.affirmed).toContain("pain");
    expect(result.negated).toContain("fever");
    expect(result.negated).not.toContain("pain");
  });

  it("4. 'No tengo fiebre y me duele una muela' -> mismo resultado que el caso 3 (orden invertido)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre y me duele una muela");
    expect(result.affirmed).toContain("pain");
    expect(result.negated).toContain("fever");
    expect(result.negated).not.toContain("pain");
  });

  it("5. 'No me duele la muela y tengo fiebre' -> pain negado, fever afirmada ('me duele' negado no activa dolor)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No me duele la muela y tengo fiebre");
    expect(result.negated).toContain("pain");
    expect(result.affirmed).toContain("fever");
    expect(result.affirmed).not.toContain("pain");
  });

  it("6. 'Sin dolor pero con hinchazón' -> pain negado, swelling afirmada", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Sin dolor pero con hinchazón");
    expect(result.negated).toContain("pain");
    expect(result.affirmed).toContain("swelling");
  });

  it("7. 'No tengo fiebre ni hinchazón' -> ambas negadas (regresion)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo fiebre ni hinchazón");
    expect(result.negated).toEqual(expect.arrayContaining(["fever", "swelling"]));
  });

  it("8. 'Tengo fiebre pero no tengo hinchazón' -> fever afirmada, swelling negada (regresion)", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("Tengo fiebre pero no tengo hinchazón");
    expect(result.affirmed).toContain("fever");
    expect(result.negated).toContain("swelling");
  });

  it("9. 'No he recibido ningún golpe pero sangro mucho' -> trauma negado, sangrado afirmado", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No he recibido ningún golpe pero sangro mucho");
    expect(result.negated).toContain("trauma");
    expect(result.affirmed).toContain("bleedingUncontrolled");
  });

  it("10. 'No puedo respirar' -> breathingDifficulty afirmada, no negada", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No puedo respirar");
    expect(result.affirmed).toContain("breathingDifficulty");
    expect(result.negated).not.toContain("breathingDifficulty");
  });

  it("11. 'No tengo dificultad para respirar' -> breathingDifficulty negada", () => {
    const result = extractAffirmedAndNegatedClinicalSignals("No tengo dificultad para respirar");
    expect(result.negated).toContain("breathingDifficulty");
  });

  it("end-to-end: 'Sin fiebre y con hinchazón en el ojo' -> EMERGENCY, respuesta de urgencias, sin consentimiento ni reserva", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Sin fiebre y con hinchazón en el ojo");
    expect(turn.state.redFlags).toContain("hinchazon en cuello, boca u ojo");
    expect(turn.state.triageLevel).toBe("EMERGENCY");
    expect(turn.state.escalated).toBe(true);
    expect(turn.reply).toContain("urgencias");
    expect(turn.reply.toLowerCase()).not.toContain("aceptas");
    expect(turn.state.consent).toBe(false);
    expect(turn.state.bookingStatus).toBe("IDLE");
    expect(turn.state.ready).toBe(false);
  });

  it("end-to-end: 'Me duele una muela y no tengo fiebre' -> comienza el triaje de dolor, no diagnostica, no pide consentimiento", () => {
    const turn = runDentalSeniorTurn(initialDentalAgentState, "Me duele una muela y no tengo fiebre");
    expect(turn.state.intent).toBe("urgent_pain");
    expect(turn.reply.toLowerCase()).not.toContain("que necesitas");
    expect(turn.reply.toLowerCase()).not.toContain("podria ser");
    expect(turn.reply.toLowerCase()).not.toContain("pulpitis");
    expect(turn.reply.toLowerCase()).not.toContain("absceso");
    expect(turn.reply.toLowerCase()).not.toContain("aceptas");
    expect(turn.reply).toContain("fiebre");
    expect(extractAffirmedAndNegatedClinicalSignals("Me duele una muela y no tengo fiebre").negated).toContain("fever");
  });
});

// PR #13 (Codex, revision sobre f334ecb - "Swap the trauma follow-up
// question keys"): la clave persistida debe describir la pregunta que
// nextStep ACABA DE MOSTRAR este turno, no la que el paciente acaba de
// responder. Antes del fix, responder tragar hacia que se preguntara por
// abrir la boca pero se persistiera trauma_swallowing_only (la pregunta ya
// respondida), asi que "Si, puedo abrir bien" se interpretaba como
// respuesta a tragar en vez de a abrir, y el flujo podia alternar
// indefinidamente.
describe("PR #13 P2 (revision sobre f334ecb): claves opening/swallowing de trauma no intercambiadas", () => {
  it("Caso A: tras responder tragar, Clara pregunta por abrir - lastQuestionKey representa opening, no vuelve a preguntar ninguna de las dos", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me he dado un golpe en una muela y se mueve");
    expect(first.state.intent).toBe("trauma");

    const second = runDentalSeniorTurn(first.state, "Puedo tragar bien");
    expect(second.reply).toContain("abrir la boca");
    expect(second.reply).not.toContain("tragar");
    expect(second.state.lastQuestionKey).toBe("trauma_opening_only");

    const third = runDentalSeniorTurn(second.state, "Si, puedo abrir bien");
    expect(third.state.safetyScreened).toBe(true);
    expect(third.reply).not.toContain("Y puedes abrir la boca bien?");
    expect(third.reply).not.toContain("Y puedes tragar bien?");
  });

  it("Caso B: tras responder abrir, Clara pregunta por tragar - lastQuestionKey representa swallowing", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me he dado un golpe en una muela y se mueve");
    const second = runDentalSeniorTurn(first.state, "Puedo abrir bien");
    expect(second.reply).toContain("tragar");
    expect(second.reply).not.toContain("abrir la boca");
    expect(second.state.lastQuestionKey).toBe("trauma_swallowing_only");

    const third = runDentalSeniorTurn(second.state, "Si, puedo tragar bien");
    expect(third.state.safetyScreened).toBe(true);
  });
});

// PR #13 (Codex, revision sobre f334ecb - "Persist clinical keys only for
// displayed questions"): lastQuestionKey solo puede persistirse si la
// pregunta clinica candidata aparece REALMENTE en la respuesta final -
// buildDentalReply tiene ramas administrativas (direccion, equipo, precio,
// tarjeta sanitaria...) que pueden ganar y devolver un texto totalmente
// distinto en el mismo turno donde, en teoria, tocaria preguntar seguridad.
describe("PR #13 P2 (revision sobre f334ecb): lastQuestionKey solo representa preguntas realmente mostradas", () => {
  it("Caso C: 'Me duele una muela, donde estais?' solo muestra la direccion - no persiste safety_screen_general, un 'no, nada de eso' posterior no lo resuelve", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele una muela, ¿dónde estáis?");
    expect(first.reply).toContain("Murcia");
    expect(first.reply.toLowerCase()).not.toContain("fiebre");
    expect(first.state.intent).toBe("urgent_pain");
    expect(first.state.safetyScreened).toBe(false);
    expect(first.state.lastQuestionKey).toBe("");

    const second = runDentalSeniorTurn(first.state, "No, nada de eso");
    expect(second.state.safetyScreened).toBe(false);
    // Retoma la pregunta clinica real este turno (coherente, no la da por
    // resuelta de un cribado que nunca se mostro).
    expect(second.reply.toLowerCase()).toContain("fiebre");
    expect(second.state.lastQuestionKey).toBe("safety_screen_general");
  });

  it("Caso D: 'Me duele una muela' SI muestra la pregunta de seguridad real - 'No, nada de eso' la resuelve con normalidad (no rompe el caso legitimo)", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele una muela");
    expect(first.reply.toLowerCase()).toContain("fiebre");
    expect(first.state.lastQuestionKey).toBe("safety_screen_general");

    const second = runDentalSeniorTurn(first.state, "No, nada de eso");
    expect(second.state.safetyScreened).toBe(true);
  });
});

// PR #13 (Codex, revision sobre f334ecb - "Treat unrelated negations as
// appointment acceptance"): distingue aceptacion explicita, rechazo directo,
// y negacion de una condicion distinta ("Si, pero no puedo esta semana" no
// es un rechazo).
describe("PR #13 P2 (revision sobre f334ecb): resolveAppointmentHelpDecision", () => {
  it.each([
    ["Sí", "ACCEPTED"],
    ["Sí, ayúdame", "ACCEPTED"],
    ["Sí, pero no puedo esta semana", "ACCEPTED"],
    ["Vale, aunque no puedo por las mañanas", "ACCEPTED"],
    ["Quiero cita, pero no el lunes", "ACCEPTED"],
    ["Sí, no tengo preferencia de hora", "ACCEPTED"],
    ["No", "DECLINED"],
    ["No, gracias", "DECLINED"],
    ["Prefiero que no", "DECLINED"],
    ["No quiero cita", "DECLINED"],
    ["Ahora no", "DECLINED"],
    ["No necesito que me ayudes", "DECLINED"],
    ["No, si ya llamaré yo", "DECLINED"]
  ])("%s -> %s", (message, expected) => {
    expect(resolveAppointmentHelpDecision(message)).toBe(expected);
  });

  it("Caso E: 'Si, pero no puedo esta semana' tras la oferta - acepta la ayuda, solo pide consentimiento, no cierra la conversacion", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele al morder.");
    const second = runDentalSeniorTurn(first.state, "No, nada de eso.");
    expect(second.state.lastAssistantAction).toBe("OFFER_APPOINTMENT_HELP");

    const third = runDentalSeniorTurn(second.state, "Si, pero no puedo esta semana");
    expect(third.state.appointmentHelpAccepted).toBe(true);
    expect(third.state.appointmentHelpDeclined).toBe(false);
    expect(third.reply).toContain("Aceptas");
    expect(third.reply).not.toContain("Quieres que te ayude a solicitar una cita");
  });

  it("Caso F: 'No, gracias' tras la oferta - rechaza, no pide consentimiento, cierre breve", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele al morder.");
    const second = runDentalSeniorTurn(first.state, "No, nada de eso.");

    const third = runDentalSeniorTurn(second.state, "No, gracias");
    expect(third.state.appointmentHelpDeclined).toBe(true);
    expect(third.reply.toLowerCase()).not.toContain("aceptas");
  });

  it("Caso G: 'Quiero cita, pero no el lunes' - acepta, la restriccion de lunes no se interpreta como rechazo", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele al morder.");
    const second = runDentalSeniorTurn(first.state, "No, nada de eso.");

    const third = runDentalSeniorTurn(second.state, "Quiero cita, pero no el lunes");
    expect(third.state.appointmentHelpAccepted).toBe(true);
    expect(third.state.appointmentHelpDeclined).toBe(false);
  });

  it("Caso H: 'No, si ya llamare yo' - rechaza", () => {
    const first = runDentalSeniorTurn(initialDentalAgentState, "Me duele al morder.");
    const second = runDentalSeniorTurn(first.state, "No, nada de eso.");

    const third = runDentalSeniorTurn(second.state, "No, si ya llamaré yo");
    expect(third.state.appointmentHelpDeclined).toBe(true);
    expect(third.state.appointmentHelpAccepted).toBe(false);
  });
});

// PR #13 (Codex, revision sobre 3ace5b8 - "Treat contextual 'no' as
// answering the impact part"): la pregunta de sangrado/golpe es compuesta
// (intensidad + golpe). Un "no" al principio junto con una intensidad valida
// responde tambien a la parte del golpe, aunque el texto nunca mencione la
// palabra "golpe".
describe("PR #13 P2 (revision sobre 3ace5b8): 'no' contextual resuelve la parte del golpe en bleeding_severity_or_impact", () => {
  function bleedingQuestionState() {
    const t1 = runDentalSeniorTurn(initialDentalAgentState, "se me mueve una muela");
    const t2 = runDentalSeniorTurn(t1.state, "sangrado");
    expect(t2.state.lastQuestionKey).toBe("bleeding_severity_or_impact");
    return t2.state;
  }

  it("Caso A: 'No, es poco' -> leve, trauma=false, avanza al cribado general, no diagnostica ni ofrece cita", () => {
    const base = bleedingQuestionState();
    const result = runDentalSeniorTurn(base, "No, es poco");
    expect(result.state.bleedingDifferentialResolved).toBe(true);
    expect(result.reply).not.toContain("ha empezado tras un golpe");
    expect(result.reply.toLowerCase()).toContain("fiebre");
    expect(result.reply.toLowerCase()).not.toContain("podria ser");
    expect(result.reply.toLowerCase()).not.toContain("aceptas");
  });

  it("Caso B: 'No, es abundante' -> abundante, trauma=false, no repite la pregunta de golpe", () => {
    const base = bleedingQuestionState();
    const result = runDentalSeniorTurn(base, "No, es abundante");
    expect(result.state.bleedingDifferentialResolved).toBe(true);
    expect(result.reply).not.toContain("ha empezado tras un golpe");
  });

  it("Caso C: 'Es poco' (sin 'no') -> trauma sigue sin resolver, conserva la pregunta pendiente, no inventa una negacion", () => {
    const base = bleedingQuestionState();
    const result = runDentalSeniorTurn(base, "Es poco");
    expect(result.state.bleedingDifferentialResolved).toBe(false);
  });

  it("Caso D: 'No me he dado ningún golpe, sangra poco' -> trauma=false, leve, diferencial completo", () => {
    const base = bleedingQuestionState();
    const result = runDentalSeniorTurn(base, "No me he dado ningún golpe, sangra poco");
    expect(result.state.bleedingDifferentialResolved).toBe(true);
  });

  it("'Leve' y 'Es abundante' solos (sin 'no') tampoco resuelven trauma", () => {
    const base = bleedingQuestionState();
    expect(runDentalSeniorTurn(base, "Leve").state.bleedingDifferentialResolved).toBe(false);
    expect(runDentalSeniorTurn(base, "Es abundante").state.bleedingDifferentialResolved).toBe(false);
  });
});

// PR #13 (Codex, revision sobre 3ace5b8 - "Persist actions only after the
// shown reply is known"): lastAssistantAction debe derivarse de la respuesta
// final realmente mostrada, igual que lastQuestionKey - una rama
// administrativa (aparcamiento, direccion...) puede ganar sobre la accion
// nominal (OFFER_APPOINTMENT_HELP/ASK_PRIVACY_CONSENT/etc calculada solo a
// partir del estado).
describe("PR #13 P2 (revision sobre 3ace5b8): lastAssistantAction solo representa acciones realmente mostradas", () => {
  function screenedReadyForOfferState() {
    const t1 = runDentalSeniorTurn(initialDentalAgentState, "se me mueve una muela");
    const t2 = runDentalSeniorTurn(t1.state, "sangrado");
    const t3 = runDentalSeniorTurn(t2.state, "leve, sin golpe");
    const t4 = runDentalSeniorTurn(t3.state, "no tengo fiebre, hinchazon ni pus y puedo abrir la boca y tragar bien");
    expect(t4.state.lastAssistantAction).toBe("OFFER_APPOINTMENT_HELP");
    return t4.state;
  }

  it("Caso E: una pregunta de aparcamiento gana sobre la oferta de cita nominal - lastAssistantAction refleja ASK_LOCATION, 'Si, en Murcia' elige sede sin saltar al consentimiento", () => {
    const screened = screenedReadyForOfferState();
    const parking = runDentalSeniorTurn(screened, "¿Tenéis aparcamiento?");
    expect(parking.state.lastAssistantAction).not.toBe("OFFER_APPOINTMENT_HELP");
    expect(parking.state.lastAssistantAction).not.toBe("ASK_PRIVACY_CONSENT");
    expect(parking.state.lastAssistantAction).toBe("ASK_LOCATION");

    const chosen = runDentalSeniorTurn(parking.state, "Si, en Murcia");
    expect(chosen.state.location).toBe("Murcia centro");
    expect(chosen.state.appointmentHelpAccepted).toBe(false);
    expect(chosen.state.consent).toBe(false);
  });

  it("Caso F: la oferta de cita SI mostrada de verdad conserva OFFER_APPOINTMENT_HELP - 'Si' avanza a consentimiento", () => {
    const screened = screenedReadyForOfferState();
    const accepted = runDentalSeniorTurn(screened, "Si");
    expect(accepted.state.lastAssistantAction).toBe("ASK_PRIVACY_CONSENT");
    expect(accepted.state.appointmentHelpAccepted).toBe(true);
  });

  it("Caso G: la pregunta de consentimiento SI mostrada de verdad - 'Acepto' cambia consent a true", () => {
    const screened = screenedReadyForOfferState();
    const accepted = runDentalSeniorTurn(screened, "Si");
    expect(accepted.state.lastAssistantAction).toBe("ASK_PRIVACY_CONSENT");
    const consented = runDentalSeniorTurn(accepted.state, "Acepto");
    expect(consented.state.consent).toBe(true);
  });

  it("Caso H: direcciones sin ninguna pregunta - no persiste una accion clinica o de reserva nunca mostrada", () => {
    const result = runDentalSeniorTurn(initialDentalAgentState, "¿Dónde estáis?");
    expect(result.state.lastAssistantAction).toBe("");
    expect(result.state.lastQuestionKey).toBe("");
  });
});
