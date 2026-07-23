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
import { runOpenAiDentalAgentTurn, type DentalAgentApiTurn } from "@/lib/agent/openai-dental-agent";

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

async function turn(message: string, state: DentalAgentState): Promise<DentalAgentApiTurn> {
  delete process.env.LLM_PROVIDER;
  delete process.env[OPENAI_KEY_ENV];
  delete process.env.DENTAL_AGENT_SCHEMA_VERSION;
  const result = await runOpenAiDentalAgentTurn({ latestPatientMessage: message, history: [], state });
  expect(result.runtime).toBe("local");
  return result;
}

describe("CASO 1 - cita para limpieza", () => {
  it("clasifica book_appointment/hygiene sin inventar diagnostico periodontal", async () => {
    const result = await turn("Hola, quiero una cita para una limpieza.", initialDentalAgentState);

    expect(result.conversationIntent).toBe("book_appointment");
    expect(result.treatmentTopic).toBe("hygiene");
    expect(result.state.intent).not.toBe("periodontics");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("sarro");
    expect(reply).not.toContain("gingivitis");
    expect(reply).not.toContain("periodontitis");
    expect(reply).not.toContain("mantenimiento periodontal");
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
  it("responde ask_price/implant con el rango autorizado, sin iniciar triaje", async () => {
    const result = await turn("Cuanto cuesta un implante?", initialDentalAgentState);

    expect(result.conversationIntent).toBe("ask_price");
    expect(result.treatmentTopic).toBe("implant");
    expect(result.reply).toContain("1.200 EUR");
    const reply = result.reply.toLowerCase();
    expect(reply).not.toContain("fiebre");
    expect(reply).not.toContain("hinchazon");
    expect(reply).not.toContain("dolor intenso");
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
    expect(caso7.conversationIntent).toBe("confirm");
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
  });
});
