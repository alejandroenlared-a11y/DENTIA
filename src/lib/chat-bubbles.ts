// Tanto el motor local como Gemini/OpenAI separan ideas distintas con una
// linea en blanco (\n\n) cuando conviene mandarlas como mensajes seguidos de
// WhatsApp en vez de un unico parrafo. Si el modelo se pasa y manda un texto
// largo, lo troceamos aqui igualmente: la experiencia debe parecer alguien
// escribiendo desde recepcion, no un informe.
const MAX_BUBBLE_CHARS = 180;
const SOFT_BUBBLE_CHARS = 145;

export function splitReplyIntoBubbles(reply: string): string[] {
  const initialParts = reply
    .split(/\n{2,}/)
    .map(part => part.trim())
    .filter(Boolean);

  const bubbles = initialParts.flatMap(part => splitLongBubble(part));

  if (bubbles.length === 0) {
    return [reply.trim()].filter(Boolean);
  }

  return bubbles;
}

export function formatReplyForChat(reply: string): string {
  return splitReplyIntoBubbles(reply).join("\n\n");
}

function splitLongBubble(text: string): string[] {
  if (text.length <= MAX_BUBBLE_CHARS) {
    return [text];
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);

  if (sentences.length > 1) {
    return packChunks(sentences);
  }

  const clauses = text
    .split(/(?<=[,;:])\s+/)
    .map(clause => clause.trim())
    .filter(Boolean);

  if (clauses.length > 1) {
    return packChunks(clauses);
  }

  return splitByWords(text);
}

function packChunks(parts: string[]): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    if (!current) {
      current = part;
      continue;
    }

    const candidate = `${current} ${part}`;
    if (candidate.length <= SOFT_BUBBLE_CHARS) {
      current = candidate;
    } else {
      chunks.push(current);
      current = part;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap(chunk => (chunk.length > MAX_BUBBLE_CHARS ? splitByWords(chunk) : [chunk]));
}

function splitByWords(text: string): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_BUBBLE_CHARS) {
      current = candidate;
    } else {
      if (current) {
        chunks.push(current);
      }
      current = word;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
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
