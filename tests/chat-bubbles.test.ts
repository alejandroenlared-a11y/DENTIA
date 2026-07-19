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
});
