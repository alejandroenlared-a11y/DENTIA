import type { ReplyContext } from "@/lib/agent/intents";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// Clave de la API de Anthropic; nombre propio para poder rotarla por tenant en el futuro.
const LLM_KEY_ENV = "DENTIA_LLM_API_KEY";

export async function generateLlmReply(
  ctx: ReplyContext,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<string | null> {
  const apiKey = process.env[LLM_KEY_ENV];
  if (!apiKey) {
    return null;
  }

  const priced = ctx.treatments
    .map(treatment =>
      treatment.priceCents === null
        ? `${treatment.name}: requiere valoracion previa`
        : `${treatment.name}: ${(treatment.priceCents / 100).toFixed(0)} EUR`
    )
    .join("\n");

  const system = [
    `Eres ${ctx.assistantName}, recepcionista virtual de la clinica dental ${ctx.clinicName}.`,
    `Reglas estrictas:`,
    `- Nunca diagnosticas ni valoras sintomas clinicos. Ante dolor o urgencia, derivas a un humano.`,
    `- Solo usas precios de esta lista autorizada:\n${priced || "(sin catalogo cargado: no des precios)"}`,
    `- Ofreces primera visita con valoracion a coste cero y financiacion hasta 24 meses sin intereses.`,
    `- Pides consentimiento antes de guardar datos personales.`,
    `- Respondes en espanol, en 2-4 frases, tono cercano y profesional.`
  ].join("\n");

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system,
        messages: history
      })
    });

    if (!response.ok) {
      console.error("generateLlmReply: Anthropic API error", response.status);
      return null;
    }

    const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = payload.content?.find(block => block.type === "text")?.text;
    return text?.trim() || null;
  } catch (error) {
    console.error("generateLlmReply failed", error);
    return null;
  }
}
