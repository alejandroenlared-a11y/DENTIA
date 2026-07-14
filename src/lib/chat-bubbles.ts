// Tanto el motor local como Gemini/OpenAI separan ideas distintas con una
// linea en blanco (\n\n) cuando conviene mandarlas como mensajes seguidos de
// WhatsApp en vez de un unico parrafo. Este helper es compartido por las tres
// superficies de chat (demo WhatsApp, demo interactivo y widget) para que las
// tres partan y animen las burbujas de la misma forma.
const MAX_BUBBLES = 3;

export function splitReplyIntoBubbles(reply: string): string[] {
  const bubbles = reply
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);

  if (bubbles.length === 0) {
    return [reply.trim()];
  }
  if (bubbles.length <= MAX_BUBBLES) {
    return bubbles;
  }
  const head = bubbles.slice(0, MAX_BUBBLES - 1);
  const tail = bubbles.slice(MAX_BUBBLES - 1).join(" ");
  return [...head, tail];
}

// Retraso de "escribiendo..." proporcional a la longitud del mensaje, para
// que las burbujas no aparezcan todas de golpe sino con el ritmo de alguien
// tecleando en el movil.
export function typingDelayForBubble(text: string): number {
  return Math.min(1800, Math.max(450, text.length * 18));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
