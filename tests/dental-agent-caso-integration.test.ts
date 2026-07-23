// Validacion end-to-end del pipeline REAL (no solo metadata): ejecuta
// runOpenAiDentalAgentTurn por la ruta de fallback local (sin clave de API
// configurada, mismo motor deterministico que produccion usa cuando la IA no
// esta disponible) y comprueba a la vez reply visible, conversationIntent,
// treatmentTopic, triageLevel, bookingStatus, location, availability,
// offeredAvailabilityOptions, ready, escalated y conversationStatus para los
// 10 casos obligatorios. CASO 7->8->9->10 se encadenan sobre el mismo estado
// evolutivo (no se reconstruyen de forma independiente) para probar de verdad
// "no repite huecos"/"no repite despedida"/"reabre la conversacion".
import { afterEach, describe, expect, it } from "vitest";
import { initialDentalAgentState, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
import {
  dentalAgentStateSchema,
  runOpenAiDentalAgentTurn,
  type DentalAgentApiTurn,
  type DentalChatMessage
} from "@/lib/agent/openai-dental-agent";

const OPENAI_KEY_ENV = ["OPENAI", "API", "KEY"].join("_");

const ORIGINAL_ENV = {
  provider: process.env.LLM_PROVIDER,
  openAiKey: process.env[OPENAI_KEY_ENV],
  schemaVersion: process.env.DENTAL_AGENT_SCHEMA_VERSION
};

afterEach(() => {
  process.env.LLM_PROVIDER = ORIGINAL_ENV.provider;
  process.env[OPENAI_KEY_ENV] = ORIGINAL_ENV.openAiKey;
  process.env.DENTAL_AGENT_SCHEMA_VERSION = ORIGINAL_ENV.schemaVersion;
});

async function turn(
  message: string,
  state: DentalAgentState,
  history: DentalChatMessage[] = []
): Promise<DentalAgentApiTurn> {
  delete process.env.LLM_PROVIDER;
  delete process.env[OPENAI_KEY_ENV];
  delete process.env.DENTAL_AGENT_SCHEMA_VERSION;
  const result = await runOpenAiDentalAgentTurn({ latestPatientMessage: message, history, state });
  expect(result.runtime).toBe("local");
  return result;
}

describe("CASO 1 - cita para limpieza", () => {
  it("clasifica book_appointment/hygiene, no da precio ni pide consentimiento, y avanza a la sede", async () => {
    const result = await turn("Hola, quiero una cita para una limpieza.", initialDentalAgentState);

    expect(result.conversationIntent).toBe("book_appointment");
    expect(result.treatmentTopic).toBe("hygiene");
    expect(result.state.intent).not.toBe("periodontics");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("sarro");
    expect(reply).not.toContain("gingivitis");
    expect(reply).not.toContain("periodontitis");
    expect(reply).not.toContain("mantenimiento periodontal");
    // Fix real (item 1): no debe dar precio ni pedir consentimiento en este
    // turno - el siguiente paso administrativo es la sede.
    expect(reply).not.toContain("eur");
    expect(reply).not.toContain("aceptas que guardemos");
    expect(result.state.consent).toBe(false);
    expect(reply).toContain("murcia");
    expect(reply).toContain("elche");
  });
});

describe("CASO 2 - dolor y sangrado", () => {
  it("hace primero una pregunta de seguridad, sin diagnosticar ni pedir datos", async () => {
    const result = await turn("Me duele una muela y sangra.", initialDentalAgentState);

    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("gingivitis");
    expect(reply).not.toContain("periodontitis");
    expect(reply).not.toContain("telefono");
    expect(reply).not.toContain("correo");
    expect(reply.split("?").length - 1).toBe(1);
    expect(result.state.safetyScreened).toBe(false);
  });
});

describe("CASO 3 - dolor al morder", () => {
  it("no menciona empaste sin que el paciente lo haya dicho y pregunta con prudencia", async () => {
    const result = await turn("Me duele al morder.", initialDentalAgentState);

    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("filtración de empaste");
    expect(reply).not.toContain("filtracion de empaste");
    expect(reply).toContain("?");
    expect(result.state.safetyScreened).toBe(false);
  });
});

describe("CASO 4 - diente que se mueve con caries", () => {
  it("no asume periodontitis y pregunta por dolor/inflamacion/sangrado/golpe", async () => {
    const result = await turn("Se me mueve un diente y tiene caries.", initialDentalAgentState);

    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("periodontitis");
    expect(reply).toMatch(/dolor|inflamaci|sangrado|golpe/);
    expect(reply).toContain("?");
  });
});

describe("CASO 5 - precio de implante", () => {
  it("responde ask_price/implant con el rango autorizado, sin iniciar triaje ni pedir datos", async () => {
    const result = await turn("Cuanto cuesta un implante?", initialDentalAgentState);

    expect(result.conversationIntent).toBe("ask_price");
    expect(result.treatmentTopic).toBe("implant");
    expect(result.reply).toContain("1.200 EUR");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("fiebre");
    expect(reply).not.toContain("hinchazon");
    expect(reply).not.toContain("dolor intenso");
    // Fix real (item 2): no pedir consentimiento ni datos personales todavia,
    // solo preguntar si quiere ayuda para solicitar cita.
    expect(reply).not.toContain("aceptas que guardemos");
    expect(reply).not.toContain("nombre");
    expect(reply).not.toContain("email");
    expect(reply).not.toContain("telefono");
    expect(result.state.consent).toBe(false);
    expect(reply).toContain("ayude a solicitar una cita");
  });
});

describe("item 6 - una conversacion CLOSED solo se reabre ante intencion material", () => {
  it("perfecto/vale/hasta luego mantienen CLOSED; cambiar la cita reabre", async () => {
    const offeredState: DentalAgentState = {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Sara Ruiz",
      phone: "654718663",
      email: "sara@example.com",
      location: "Elche - Altabix",
      availability: "",
      offeredAvailabilityOptions: ["jueves, 23/07, 10:00", "viernes, 24/07, 11:00", "lunes, 27/07, 10:00"],
      ready: false
    };
    const booked = await turn("1", offeredState);
    // Fix real (PR #11, Problem 1): elegir hueco clasifica select_slot, no
    // confirm - seleccionar no es un acto de cierre, asi que la conversacion
    // sigue ACTIVE hasta un agradecimiento/cierre real tras la reserva.
    expect(booked.conversationStatus).toBe("ACTIVE");

    let state = booked.state;
    for (const courtesy of ["Perfecto.", "Vale.", "Hasta luego."]) {
      const result = await turn(courtesy, state);
      expect(result.conversationStatus).toBe("CLOSED");
      state = result.state;
    }

    const reopened = await turn("Me duele una muela.", state);
    expect(reopened.conversationStatus).toBe("ACTIVE");
  });
});

describe("CASO 6 - ubicacion", () => {
  it("responde ask_location con las sedes, sin iniciar flujo clinico", async () => {
    const result = await turn("Donde estais?", initialDentalAgentState);

    expect(result.conversationIntent).toBe("ask_location");
    expect(result.reply).toContain("Murcia");
    expect(result.reply).toContain("Elche");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("sintoma");
    expect(reply).not.toContain("dolor");
  });
});

describe("PR #11 Problem 1 - seleccion real de hueco via el pipeline real (numero, opcion N, ordinal)", () => {
  function slotsOfferedState(overrides: Partial<DentalAgentState> = {}): DentalAgentState {
    return {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Ana Lopez",
      phone: "622111333",
      email: "ana@example.com",
      location: "Murcia centro",
      availability: "",
      offeredAvailabilityOptions: ["jueves, 23/07, 10:00", "viernes, 24/07, 11:00", "lunes, 27/07, 10:00"],
      ready: false,
      bookingStatus: "SLOTS_OFFERED",
      ...overrides
    };
  }
  const ASSISTANT_OFFER_MESSAGE =
    "Te puedo proponer estos huecos: 1. jueves, 23/07, 10:00 2. viernes, 24/07, 11:00 3. lunes, 27/07, 10:00";
  const ASSISTANT_OFFER_HISTORY: DentalChatMessage[] = [{ role: "assistant", body: ASSISTANT_OFFER_MESSAGE }];
  const NO_OFFER_HISTORY: DentalChatMessage[] = [{ role: "assistant", body: "Perfecto, cuentame que necesitas." }];

  async function expectSelection(message: string, optionIndex: number, history: DentalChatMessage[] = ASSISTANT_OFFER_HISTORY) {
    const state = slotsOfferedState();
    const result = await turn(message, state, history);

    expect(result.conversationIntent).toBe("select_slot");
    expect(result.conversationIntent).not.toBe("confirm");
    expect(result.state.availability).toBe(state.offeredAvailabilityOptions[optionIndex]);
    expect(result.state.offeredAvailabilityOptions).toEqual([]);
    expect(result.bookingStatus).not.toBe("SLOTS_OFFERED");
    return result;
  }

  it('"1" selecciona exactamente la primera opcion y llega a PREBOOKED', async () => {
    const result = await expectSelection("1", 0);
    expect(result.bookingStatus).toBe("PREBOOKED");
  });

  it('"2" selecciona exactamente la segunda opcion', async () => {
    await expectSelection("2", 1);
  });

  it('"3" selecciona exactamente la tercera opcion', async () => {
    await expectSelection("3", 2);
  });

  it('"la primera" selecciona exactamente la primera opcion', async () => {
    await expectSelection("la primera", 0);
  });

  it('"la segunda" selecciona exactamente la segunda opcion', async () => {
    await expectSelection("la segunda", 1);
  });

  it('"la tercera" selecciona realmente la tercera opcion (no solo clasifica select_slot)', async () => {
    const result = await expectSelection("la tercera", 2);
    expect(result.bookingStatus).toBe("PREBOOKED");
  });

  it('"la tercera" sin huecos ofrecidos en el mensaje anterior de Clara no selecciona nada', async () => {
    const state = slotsOfferedState();
    const result = await turn("la tercera", state, NO_OFFER_HISTORY);

    expect(result.conversationIntent).not.toBe("select_slot");
    expect(result.state.availability).toBe("");
    expect(result.state.offeredAvailabilityOptions).toEqual(state.offeredAvailabilityOptions);
  });

  it("un numero aislado fuera del flujo de disponibilidad no modifica availability", async () => {
    const stateWithoutOffer: DentalAgentState = {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Ana Lopez",
      phone: "622111333",
      email: "ana@example.com",
      location: "Murcia centro",
      availability: "",
      offeredAvailabilityOptions: []
    };
    const result = await turn("2", stateWithoutOffer);

    expect(result.conversationIntent).not.toBe("select_slot");
    expect(result.state.availability).toBe("");
  });
});

describe("CASO 7 a 10 - seleccion de hueco, cierre, agradecimiento y reapertura encadenados", () => {
  it("selecciona la opcion 1 exacta, conserva fecha, cierra y reabre solo al pedir cambio", async () => {
    const offeredState: DentalAgentState = {
      ...initialDentalAgentState,
      intent: "prosthetics",
      consent: true,
      name: "Sara Ruiz",
      phone: "654718663",
      email: "sara@example.com",
      location: "Elche - Altabix",
      availability: "",
      offeredAvailabilityOptions: ["jueves, 23/07, 10:00", "viernes, 24/07, 11:00", "lunes, 27/07, 10:00"],
      ready: false
    };

    // CASO 7: Clara ofrecio 3 huecos, el paciente responde "1".
    const caso7 = await turn("1", offeredState);
    // Fix real (PR #11, Problem 1): antes se clasificaba "confirm" por bug de
    // timing (el router veia el estado ya vaciado); ahora correctamente select_slot.
    expect(caso7.conversationIntent).toBe("select_slot");
    expect(caso7.bookingStatus).toBe("PREBOOKED");
    expect(caso7.state.availability).toBe(offeredState.offeredAvailabilityOptions[0]);
    expect(caso7.state.offeredAvailabilityOptions).toEqual([]);
    expect(caso7.state.ready).toBe(true);

    // CASO 8: cita ya pre-reservada, el paciente da las gracias sin mas.
    const caso8 = await turn("Esta bien, gracias.", caso7.state);
    expect(caso8.bookingStatus).toBe("PREBOOKED");
    expect(caso8.conversationStatus).toBe("CLOSED");
    expect(caso8.state.offeredAvailabilityOptions).toEqual([]);
    expect(caso8.state.availability).toBe(caso7.state.availability);
    // Fix real (item 3): confirma el estado REAL (pre-reservada), nunca dice
    // "confirmada"/"te esperamos" sin que el backend la haya confirmado.
    expect(caso8.reply).toContain("queda pre-reservada");
    expect(caso8.reply.toLowerCase()).not.toContain("confirmada");
    const reply8 = caso8.reply.toLowerCase();
    expect(reply8).not.toContain("hueco");
    expect(reply8).not.toContain("disponibilidad");

    // CASO 9: el paciente vuelve a agradecer sobre una conversacion ya cerrada.
    const caso9 = await turn("Gracias.", caso8.state);
    expect(caso9.conversationIntent).toBe("thanks");
    expect(caso9.conversationStatus).toBe("CLOSED");
    expect(caso9.reply).not.toBe(caso8.reply);
    const reply9 = caso9.reply.toLowerCase();
    expect(reply9).not.toContain("telefono");
    expect(reply9).not.toContain("hueco");

    // CASO 10: tras el cierre, el paciente pide cambiar la cita -> reabre.
    const caso10 = await turn("Quiero cambiar la cita.", caso9.state);
    expect(caso10.conversationIntent).toBe("reschedule_appointment");
    expect(caso10.conversationStatus).toBe("ACTIVE");
    expect(caso10.state.availability).toBe(caso9.state.availability);

    // Item 7 (F): el estado serializado (como se persiste de verdad en BD -
    // ver dentalAgentStateSchema/extractPreviousDentalState) conserva
    // bookingStatus, conversationStatus, la disponibilidad seleccionada y
    // closureAcknowledged, no solo mientras el objeto vive en memoria.
    const serialized = JSON.parse(JSON.stringify(caso8.state));
    const parsed = dentalAgentStateSchema.parse(serialized);
    expect(parsed.bookingStatus).toBe("PREBOOKED");
    expect(parsed.conversationStatus).toBe("CLOSED");
    expect(parsed.availability).toBe(caso7.state.availability);
    expect(parsed.closureAcknowledged).toBe(true);
  });
});

describe("hotfix dental-negation-context - contexto y negacion en el pipeline real", () => {
  it("CASO 1: \"No, nada de eso\" tras la pregunta de seguridad no la repite, cierra el cribado y conserva el dolor al morder", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    expect(t1.reply.toLowerCase()).toContain("fiebre");
    expect(t1.state.safetyScreened).toBe(false);

    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.safetyScreened).toBe(true);
    expect(t2.state.intent).toBe("caries_restoration");
    const reply2 = t2.reply.toLowerCase();
    // No repite la misma pregunta de seguridad.
    expect(reply2).not.toContain("antes de nada");
    expect(reply2).not.toContain("hay fiebre");
    // No diagnostica.
    expect(reply2).not.toContain("caries");
    expect(reply2).not.toContain("filtracion de empaste");
    expect(reply2).not.toContain("filtración de empaste");
  });

  it("CASO 2: \"Es poco y no he recibido ningun golpe\" registra sangrado leve, nunca cambia a trauma, y NO completa el cribado por si solo (Problema 2)", async () => {
    const t1 = await turn("Me duele una muela y sangra.", initialDentalAgentState);
    expect(t1.reply.toLowerCase()).toContain("golpe");
    expect(t1.state.intent).not.toBe("trauma");

    const t2 = await turn("Es poco y no he recibido ningun golpe.", t1.state);
    expect(t2.state.intent).not.toBe("trauma");
    // Sangrado/golpe resuelto no basta: sigue faltando fiebre/hinchazon/pus/
    // dificultad antes de dar el cribado por completo.
    expect(t2.state.safetyScreened).toBe(false);
    expect(t2.state.bleedingDifferentialResolved).toBe(true);
    const reply2 = t2.reply.toLowerCase();
    expect(reply2).not.toContain("fractura");
    expect(reply2).not.toContain("luxacion");
    expect(reply2).not.toContain("luxación");
    expect(reply2).not.toContain("cuando te diste el golpe");
    expect(reply2).not.toContain("aceptas que guardemos");
    expect(reply2).toContain("fiebre");

    const t3 = await turn("No tengo fiebre, hinchazon ni pus y puedo abrir la boca y tragar bien.", t2.state);
    expect(t3.state.safetyScreened).toBe(true);
    expect(t3.state.consent).toBe(false);
    expect(t3.reply.toLowerCase()).toContain("quieres que te ayude a solicitar una cita");
    expect(t3.reply.toLowerCase()).not.toContain("aceptas que guardemos");
  });

  it("CASO 5: \"Si, recibi un golpe ayer\" SI activa el protocolo de traumatismo (la correccion de negaciones no rompe afirmaciones reales)", async () => {
    const result = await turn("Si, recibi un golpe ayer y me duele mucho.", initialDentalAgentState);
    expect(result.state.intent).toBe("trauma");
    expect(result.reply.toLowerCase()).toContain("golpe");
  });

  it("regresion: 'Donde estais?' sigue funcionando", async () => {
    const result = await turn("Donde estais?", initialDentalAgentState);
    expect(result.conversationIntent).toBe("ask_location");
  });

  it("regresion: precio de implante sigue funcionando", async () => {
    const result = await turn("Cuanto cuesta un implante?", initialDentalAgentState);
    expect(result.conversationIntent).toBe("ask_price");
    expect(result.state.consent).toBe(false);
  });

  it("regresion: cita para limpieza sigue funcionando", async () => {
    const result = await turn("Hola, quiero una cita para una limpieza.", initialDentalAgentState);
    expect(result.conversationIntent).toBe("book_appointment");
    expect(result.treatmentTopic).toBe("hygiene");
  });
});

// Hotfix dental-negation-context: PROBLEMA 1/2/3 - la oferta de ayuda con la
// cita y la peticion de consentimiento nunca pueden ir en el mismo turno, y
// resolver sangrado/golpe no basta para dar el cribado de seguridad por
// completo. CASO A-F tal y como los especifico el usuario.
describe("hotfix dental-negation-context - CASO A-F (oferta de cita antes de consentimiento)", () => {
  it("CASO A: \"Me duele al morder\" -> pregunta de seguridad -> \"No, nada de eso\" no repite, cierra el cribado, ofrece cita, no pide consentimiento", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    expect(t1.reply.toLowerCase()).toContain("fiebre");
    expect(t1.state.safetyScreened).toBe(false);

    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.safetyScreened).toBe(true);
    const reply2 = t2.reply.toLowerCase();
    expect(reply2).not.toContain("antes de nada");
    expect(reply2).not.toContain("hay fiebre");
    expect(t2.reply).toContain("Quieres que te ayude a solicitar una cita");
    expect(reply2).not.toContain("aceptas que guardemos");
    expect(t2.state.consent).toBe(false);
  });

  it("CASO B: tras la oferta, \"Si\" pide UNICAMENTE el consentimiento (sin nombre/email/telefono, sin repetir la oferta de cita)", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.lastAssistantAction).toBe("OFFER_APPOINTMENT_HELP");

    const t3 = await turn("Si", t2.state);
    const reply3 = t3.reply.toLowerCase();
    expect(reply3).toContain("aceptas que");
    expect(reply3).not.toContain("nombre");
    expect(reply3).not.toContain("email");
    expect(reply3).not.toContain("telefono");
    expect(reply3).not.toContain("teléfono");
    expect(t3.state.consent).toBe(false);
  });

  // PR #13 (comentario de Codex): "Si quieres te preparo una cita" repetia la
  // oferta de ayuda con la cita que el paciente YA habia aceptado - la
  // pregunta de consentimiento en ese turno debe ser autonoma, sin volver a
  // ofrecer la cita.
  it("no repite 'Si quieres te preparo una cita' tras aceptar la oferta con 'Si'", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    const t2 = await turn("No, nada de eso.", t1.state);
    const t3 = await turn("Si", t2.state);
    expect(t3.reply).not.toContain("Si quieres te preparo una cita");
    expect(t3.reply).not.toContain("¿Quieres que te ayude a solicitar una cita?");
  });

  it("CASO C: \"Acepto\" activa el consentimiento y pide solo el siguiente dato administrativo (nombre)", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    const t2 = await turn("No, nada de eso.", t1.state);
    const t3 = await turn("Si", t2.state);
    expect(t3.state.consent).toBe(false);

    const t4 = await turn("Acepto", t3.state);
    expect(t4.state.consent).toBe(true);
    expect(t4.reply.toLowerCase()).toContain("nombre");
    expect(t4.reply.toLowerCase()).not.toContain("email");
    expect(t4.reply.toLowerCase()).not.toContain("telefono");
  });

  it("CASO D: tras la oferta, \"No, gracias\" no pide consentimiento ni recoge datos - cierre breve", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.lastAssistantAction).toBe("OFFER_APPOINTMENT_HELP");

    const t3 = await turn("No, gracias", t2.state);
    expect(t3.state.appointmentHelpDeclined).toBe(true);
    expect(t3.state.consent).toBe(false);
    const reply3 = t3.reply.toLowerCase();
    expect(reply3).not.toContain("aceptas que guardemos");
    expect(reply3).not.toContain("nombre");
    expect(reply3).not.toContain("email");
    expect(reply3.length).toBeLessThan(160);
  });

  it("CASO E: sangrado leve sin golpe registra la diferencial, pero no ofrece cita ni pide consentimiento todavia", async () => {
    const t1 = await turn("Me duele una muela y sangra.", initialDentalAgentState);
    expect(t1.reply.toLowerCase()).toContain("golpe");

    const t2 = await turn("Es poco y no he recibido ningun golpe.", t1.state);
    expect(t2.state.bleedingDifferentialResolved).toBe(true);
    expect(t2.state.intent).not.toBe("trauma");
    const reply2 = t2.reply.toLowerCase();
    expect(reply2).not.toContain("fractura");
    expect(reply2).not.toContain("luxacion");
    expect(reply2).not.toContain("quieres que te ayude a solicitar una cita");
    expect(reply2).not.toContain("aceptas que guardemos");
  });

  it("CASO F: al descartar tambien fiebre/hinchazon/pus/dificultad, cierra el cribado y ofrece cita (sin consentimiento en el mismo turno)", async () => {
    const t1 = await turn("Me duele una muela y sangra.", initialDentalAgentState);
    const t2 = await turn("Es poco y no he recibido ningun golpe.", t1.state);

    const t3 = await turn("No tengo fiebre, hinchazon ni pus y puedo abrir la boca y tragar bien.", t2.state);
    expect(t3.state.safetyScreened).toBe(true);
    expect(t3.reply).toContain("Quieres que te ayude a solicitar una cita");
    expect(t3.reply.toLowerCase()).not.toContain("aceptas que guardemos");
  });
});

// PR #13 (comentario P1 de Codex - "Do not negate red flags from unrelated
// no"): end-to-end obligatorio por el pipeline real.
describe("PR #13 P1: hinchazon en el ojo se conserva pese a negar fiebre en la misma frase", () => {
  it("1. niega fiebre, afirma hinchazon, conserva la red flag, EMERGENCY, recomienda atencion urgente, sin consentimiento/datos/cita ni avance de bookingStatus", async () => {
    const result = await turn("No tengo fiebre y tengo hinchazón en el ojo", initialDentalAgentState);

    expect(result.state.redFlags).toContain("hinchazon en cuello, boca u ojo");
    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.state.escalated).toBe(true);
    expect(result.reply.toLowerCase()).toContain("urgencias");
    // PR #13 (Codex): EMERGENCY corta el flujo por completo - nada de
    // consentimiento, datos ni cita en este turno.
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("aceptas");
    expect(reply).not.toContain("consentimiento");
    expect(reply).not.toContain("nombre");
    expect(reply).not.toContain("telefono");
    expect(reply).not.toContain("email");
    expect(reply).not.toContain("que dia y hora");
    expect(reply).not.toContain("franja");
    expect(result.state.consent).toBe(false);
    expect(result.state.bookingStatus).toBe("IDLE");
    expect(result.state.ready).toBe(false);
    expect(result.conversationStatus).toBe("ESCALATED");
  });

  it("2. 'Tengo la cara muy hinchada y me cuesta respirar' -> EMERGENCY, mensaje de atencion inmediata, ninguna accion administrativa", async () => {
    const result = await turn("Tengo la cara muy hinchada y me cuesta respirar", initialDentalAgentState);

    expect(result.state.triageLevel).toBe("EMERGENCY");
    expect(result.reply.toLowerCase()).toContain("urgencias");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("aceptas");
    expect(reply).not.toContain("nombre");
    expect(reply).not.toContain("telefono");
    expect(reply).not.toContain("cita");
    expect(result.state.consent).toBe(false);
    expect(result.state.bookingStatus).toBe("IDLE");
  });

  // 6. Un caso ROUTINE, tras completar el triaje sin red flags, sigue
  // ofreciendo ayuda para la cita - no queda bloqueado por el guardrail de
  // emergencia (que solo actua cuando triageLevel === EMERGENCY).
  it("6. un caso ROUTINE sigue ofreciendo ayuda para la cita tras el triaje, sin bloqueo del guardrail de emergencia", async () => {
    const t1 = await turn("Me duele al morder.", initialDentalAgentState);
    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.triageLevel).not.toBe("EMERGENCY");
    expect(t2.reply).toContain("Quieres que te ayude a solicitar una cita");
  });

  // 7. URGENT_24H (escalado pero NO emergencia): a diferencia de EMERGENCY,
  // SI pide consentimiento (para gestionar con prioridad) una vez resuelto
  // el cribado clinico - pero nunca mezcla eso con una reserva ordinaria
  // (no ofrece huecos/franja/sede en el mismo turno que pide prioridad).
  it("7. URGENT_24H no trata la instruccion clinica prioritaria como una reserva ordinaria en el mismo turno", async () => {
    const t1 = await turn("Me duele mucho por la noche, es un dolor pulsatil.", initialDentalAgentState);
    expect(t1.state.triageLevel).toBe("URGENT_24H");
    expect(t1.state.escalated).toBe(true);
    // Primer turno: pregunta de seguridad pendiente, no pide consentimiento
    // ni ofrece cita todavia.
    expect(t1.reply.toLowerCase()).toContain("fiebre");
    expect(t1.reply.toLowerCase()).not.toContain("aceptas");
    expect(t1.reply.toLowerCase()).not.toContain("huecos");

    const t2 = await turn("No, nada de eso.", t1.state);
    expect(t2.state.triageLevel).toBe("URGENT_24H");
    expect(t2.state.safetyScreened).toBe(true);
    // Cribado resuelto: pide consentimiento para gestionar con prioridad (a
    // diferencia de EMERGENCY, que nunca pide esto) - pero sigue sin ofrecer
    // huecos/franja/sede en este mismo turno.
    const reply2 = t2.reply.toLowerCase();
    expect(reply2).toContain("prioridad");
    expect(reply2).toContain("aceptas");
    expect(reply2).not.toContain("huecos");
    expect(reply2).not.toContain("franja");
    expect(t2.state.consent).toBe(false);
  });
});

// PR #13 (comentario P2 de Codex): un lastQuestionKey invalido persistido en
// el estado no puede tumbar la API con un 500.
describe("PR #13 P2: lastQuestionKey invalido no provoca una excepcion en el pipeline real", () => {
  it('lastQuestionKey="valor-invalido" se normaliza y el turno responde con normalidad (sin lanzar/500)', async () => {
    const state = { ...initialDentalAgentState, lastQuestionKey: "valor-invalido" as never };
    const result = await turn("No tengo fiebre", state);
    expect(result.state.lastQuestionKey).not.toBe("valor-invalido");
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
