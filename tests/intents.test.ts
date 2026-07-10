import { describe, expect, it } from "vitest";
import { buildReply, detectIntent, shouldEscalate, type ReplyContext } from "@/lib/agent/intents";

const ctx: ReplyContext = {
  assistantName: "Clara",
  clinicName: "Clinica Dental Murcia-Elche",
  clinicPhone: "+34 968 000 111",
  treatments: [
    { name: "Higiene dental", priceCents: 6000 },
    { name: "Implante unitario", priceCents: null }
  ]
};

describe("detectIntent", () => {
  it("detecta urgencia por dolor", () => {
    expect(detectIntent("Tengo un dolor de muelas horrible")).toBe("URGENCIA");
  });

  it("detecta urgencia con acentos", () => {
    expect(detectIntent("Se me ha roto un diente y hay inflamación")).toBe("URGENCIA");
  });

  it("urgencia gana al saludo aunque el mensaje empiece con hola", () => {
    expect(detectIntent("Hola, me duele mucho una muela desde ayer")).toBe("URGENCIA");
  });

  it("detecta intencion de cita", () => {
    expect(detectIntent("Quiero reservar una cita para revision")).toBe("CITA");
  });

  it("detecta precio", () => {
    expect(detectIntent("Cuanto cuesta una limpieza?")).toBe("PRECIO");
  });

  it("detecta horario", () => {
    expect(detectIntent("Abris en agosto?")).toBe("HORARIO");
  });

  it("detecta saludo", () => {
    expect(detectIntent("Hola, buenas tardes")).toBe("SALUDO");
    expect(detectIntent("Hola!")).toBe("SALUDO");
  });

  it("cae en OTRO sin keywords", () => {
    expect(detectIntent("xyz")).toBe("OTRO");
  });
});

describe("shouldEscalate", () => {
  it("escala solo urgencias", () => {
    expect(shouldEscalate("URGENCIA")).toBe(true);
    expect(shouldEscalate("CITA")).toBe(false);
    expect(shouldEscalate("OTRO")).toBe(false);
  });
});

describe("buildReply", () => {
  it("urgencia deriva a humano y no diagnostica", () => {
    const reply = buildReply("URGENCIA", ctx);
    expect(reply).toContain("no puedo valorar sintomas");
    expect(reply).toContain("+34 968 000 111");
  });

  it("cita ofrece primera visita a coste cero", () => {
    expect(buildReply("CITA", ctx)).toContain("coste cero");
  });

  it("precio solo usa catalogo autorizado", () => {
    const reply = buildReply("PRECIO", ctx);
    expect(reply).toContain("Higiene dental: 60 EUR");
    expect(reply).not.toContain("Implante unitario:");
    expect(reply).toContain("financiacion");
  });

  it("saludo se presenta como asistente virtual", () => {
    const reply = buildReply("SALUDO", ctx);
    expect(reply).toContain("Clara");
    expect(reply).toContain("Clinica Dental Murcia-Elche");
  });
});
