import { describe, expect, it } from "vitest";
import {
  buildDentalSummary,
  initialDentalAgentState,
  runDentalSeniorTurn
} from "@/lib/agent/dental-senior-agent";

describe("runDentalSeniorTurn", () => {
  it("detects emergency red flags without waiting for a normal booking flow", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Tengo la cara muy hinchada y me cuesta tragar. Acepto. Soy Urgencia Senior y mi telefono es 611999222."
    );

    expect(turn.state.triageLevel).toBe("EMERGENCY");
    expect(turn.state.escalated).toBe(true);
    expect(turn.state.ready).toBe(true);
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

  it("recognizes periodontal symptoms and gives the clinic price band", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me sangran las encias al cepillarme y noto mal aliento desde hace meses."
    );

    expect(turn.state.intent).toBe("periodontics");
    expect(turn.state.treatmentNeed).toBe("Periodoncia");
    expect(turn.state.budget).toBe("desde 90 EUR");
    expect(turn.state.triageLabel).toBe("Prioridad 48-72h");
    expect(turn.reply).toContain("periodontal");
  });

  it("can complete a high-value implant pre-booking when the patient gives consent and contact data", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero valorar implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111. Prefiero Murcia por la tarde."
    );

    expect(turn.state.intent).toBe("implant_price");
    expect(turn.state.ready).toBe(true);
    expect(turn.state.escalated).toBe(false);
    expect(turn.state.location).toBe("Murcia centro");
    expect(turn.state.availability).toContain("tarde");
    expect(turn.state.budget).toBe("desde 1.200 EUR");
    expect(turn.reply).toContain("pre-reserva lista");
  });

  it("does not repeat the price note when asking for consent", () => {
    const turn = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me falta una muela y quiero saber el precio de un implante y si se puede financiar."
    );

    const priceNote = "El implante unitario parte desde 1.200 EUR";
    const occurrences = turn.reply.split(priceNote).length - 1;
    expect(occurrences).toBe(1);
    expect(turn.reply).toContain("aceptas que guardemos tus datos");
  });
});
