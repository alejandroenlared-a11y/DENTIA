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
