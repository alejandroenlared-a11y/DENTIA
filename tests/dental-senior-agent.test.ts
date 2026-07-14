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

  it("recognizes periodontal symptoms and only gives the price band when asked", () => {
    const withoutPriceAsk = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me sangran las encias al cepillarme y noto mal aliento desde hace meses."
    );

    expect(withoutPriceAsk.state.intent).toBe("periodontics");
    expect(withoutPriceAsk.state.treatmentNeed).toBe("Periodoncia");
    expect(withoutPriceAsk.state.budget).toBe("desde 90 EUR");
    expect(withoutPriceAsk.state.triageLabel).toBe("Prioridad 48-72h");
    expect(withoutPriceAsk.reply).toContain("gingivitis");
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
    expect(turn.reply).toContain("Aceptas que guardemos tus datos");
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
      "Para un implante. Acepto que guardeis mis datos. Soy Rosa Gil, telefono 622333444. Murcia por la tarde."
    );
    expect(second.state.ready).toBe(true);
    expect(second.reply).toContain("pre-reserva lista");
    expect(second.reply).toContain("1.200 EUR");
  });

  it("accepts a bare name reply when the agent just asked for the name", () => {
    const emergency = runDentalSeniorTurn(
      initialDentalAgentState,
      "Me duele mucho una muela, tengo la cara muy hinchada y me cuesta tragar"
    );
    expect(emergency.state.triageLevel).toBe("EMERGENCY");

    const consented = runDentalSeniorTurn(emergency.state, "me vale");
    expect(consented.state.consent).toBe(true);
    expect(consented.reply.toLowerCase()).toContain("nombre");

    const named = runDentalSeniorTurn(consented.state, "Alejandro Marti");
    expect(named.state.name).toBe("Alejandro Marti");
    expect(named.reply).not.toContain("Como te llamas");
    expect(named.reply.toLowerCase()).toContain("telefono");
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
      "Me falta una muela y quiero implante. Acepto que guarde mis datos. Soy Ana Molina, telefono 612999111. Prefiero Murcia por la tarde."
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
});
