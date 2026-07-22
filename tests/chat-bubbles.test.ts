import { describe, expect, it } from "vitest";
import { formatReplyForChat, splitReplyIntoBubbles } from "@/lib/chat-bubbles";

describe("chat bubbles", () => {
  it("splits long assistant replies into short WhatsApp-style bubbles", () => {
    const reply =
      "Entiendo, dolor al morder y sensibilidad al frio conviene revisarlo pronto, pero no puedo diagnosticarte por chat. Antes de buscar hueco necesito descartar senales de alarma: tienes hinchazon, fiebre, pus o dificultad para tragar?";

    const bubbles = splitReplyIntoBubbles(reply);

    expect(bubbles.length).toBeGreaterThan(1);
    expect(bubbles.every(bubble => bubble.length <= 180)).toBe(true);
    expect(bubbles.join(" ")).toContain("dolor al morder");
    expect(bubbles.join(" ")).toContain("dificultad para tragar");
  });

  it("formats bubbles with blank lines for chat surfaces", () => {
    const formatted = formatReplyForChat("Vale, eso me ayuda.\n\nTe hago una pregunta rapida: tienes fiebre?");

    expect(formatted).toBe("Vale, eso me ayuda.\n\nTe hago una pregunta rapida: tienes fiebre?");
  });

  it("does not split a doctor title (Dr./Dra.) away from the name when wrapping long replies", () => {
    // Bug real detectado por el evaluador de Clara contra el LLM: el split
    // de frases usaba el punto de "Dra." como fin de frase y separaba el
    // titulo del nombre en burbujas distintas.
    const reply =
      "Claro. El equipo trabaja por especialidades: Dr. Ernesto Ruiz Chumilla: Periodoncia, implantes y cirugía oral. Dra. Esther Estrada Mallada: Ortodoncia. Dra. Laura Herencia Lizaran: Endodoncia y odontopediatría. Dr. Manuel Ruiz Chumilla: Estética dental y conservadora. Dra. Paula Garcia Garcia: Odontopediatría.";

    const bubbles = splitReplyIntoBubbles(reply);

    expect(bubbles.some(bubble => bubble.trim() === "Dra.")).toBe(false);
    expect(bubbles.some(bubble => bubble.includes("Dra. Laura Herencia Lizaran"))).toBe(true);
    expect(bubbles.some(bubble => bubble.includes("Dr. Ernesto Ruiz Chumilla"))).toBe(true);
  });
});
