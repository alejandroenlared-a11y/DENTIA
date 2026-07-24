import { describe, expect, it } from "vitest";
import { detectSchedulingRequest } from "@/lib/agent/scheduling-intent";

describe("detectSchedulingRequest", () => {
  it("detects a cancel request", () => {
    expect(detectSchedulingRequest("Quiero cancelar mi cita")).toBe("cancel");
    expect(detectSchedulingRequest("No voy a poder ir")).toBe("cancel");
  });

  it("detects a reschedule request", () => {
    expect(detectSchedulingRequest("Necesito cambiar la cita")).toBe("reschedule");
    expect(detectSchedulingRequest("Quiero reprogramar")).toBe("reschedule");
  });

  it("detects a reschedule request phrased without the word 'cita'", () => {
    // Bug real detectado en demo: tras una pre-reserva para el 15 de julio,
    // el paciente escribio "no me viene bien el 15 de julio, lo puedo
    // cambiar?" y el patron original (que exigia la palabra "cita") no lo
    // reconocia, asi que el mensaje caia al cierre generico del motor local.
    expect(detectSchedulingRequest("no me viene bien el 15 de julio, lo puedo cambiar?")).toBe("reschedule");
    expect(detectSchedulingRequest("Ese dia me viene mal, tienes otro hueco?")).toBe("reschedule");
    expect(detectSchedulingRequest("Puedo cambiarlo para otro dia?")).toBe("reschedule");
  });

  // Codex (cierre de pre-reserva, Caso C): tras la pre-reserva, "Quiero
  // cambiarla" debe reabrir SOLO el flujo de cambio, nunca crear una cita
  // nueva por su cuenta ni tratarse como cierre generico.
  it("Caso C: 'Quiero cambiarla' tras la pre-reserva reabre el flujo de cambio", () => {
    expect(detectSchedulingRequest("Quiero cambiarla")).toBe("reschedule");
  });

  it("detects a query about the appointment date", () => {
    expect(detectSchedulingRequest("Para cuando es??")).toBe("query");
    expect(detectSchedulingRequest("Que dia es la cita")).toBe("query");
    expect(detectSchedulingRequest("Cuando es mi cita")).toBe("query");
    expect(detectSchedulingRequest("A que hora es la cita")).toBe("query");
  });

  it("returns null for unrelated messages", () => {
    expect(detectSchedulingRequest("Me duele una muela")).toBeNull();
    expect(detectSchedulingRequest("Desde cuando me duele, pues desde ayer")).toBeNull();
  });
});
