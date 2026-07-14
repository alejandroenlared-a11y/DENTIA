import { z } from "zod";
import { demoKnowledge } from "@/lib/agent/demo-data";
import {
  initialDentalAgentState,
  runDentalSeniorTurn,
  type DentalAgentState,
  type DentalIntentId,
  type TriageLevel
} from "@/lib/agent/dental-senior-agent";
import { fetchWithTimeout, isTimeoutError, resolveTimeoutMs } from "@/lib/http";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
// API real de Google (Generative Language API v1beta). La version anterior
// llamaba a un endpoint "/v1beta/interactions" que nunca ha existido: por
// eso Gemini nunca respondia de verdad, con clave valida o sin ella.
function geminiGenerateContentUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}
const DEFAULT_OPENAI_MODEL = "gpt-5.6-terra";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";
const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-2.5-flash";
const PENDING_INTENT = "INTENCION_PENDIENTE";

// Presupuesto de tiempo por llamada al LLM. Si el proveedor no responde, el
// agente local deterministico contesta igualmente: el paciente nunca espera
// mas de este limite. El fallback de Gemini usa un presupuesto menor para que
// el peor caso (primario + fallback) siga cabiendo en la ventana del cliente.
const LLM_TIMEOUT_MS = resolveTimeoutMs("LLM_TIMEOUT_MS", 12_000);
const LLM_FALLBACK_TIMEOUT_MS = resolveTimeoutMs("LLM_FALLBACK_TIMEOUT_MS", 8_000);

const dentalIntentValues = [
  "first_visit",
  "urgent_pain",
  "implant_price",
  "whitening",
  "reactivation",
  "orthodontics",
  "endodontics",
  "caries_restoration",
  "periodontics",
  "prosthetics",
  "wisdom_tooth",
  "tmj_bruxism",
  "trauma",
  "unknown"
] as const;

const triageValues = ["EMERGENCY", "URGENT_24H", "PRIORITY_72H", "ROUTINE", "ESTHETIC"] as const;
const confidenceValues = ["Baja", "Media", "Alta"] as const;

export type DentalChatMessage = {
  role: "patient" | "assistant";
  body: string;
};

type LlmProvider = "openai" | "gemini";

export type DentalAgentRuntime = "openai" | "gemini" | "local";

export type DentalAgentApiTurn = {
  reply: string;
  state: DentalAgentState;
  runtime: DentalAgentRuntime;
  model: string;
  fallbackReason?: string;
};

export const dentalAgentStateSchema: z.ZodType<DentalAgentState> = z.object({
  intent: z.enum(dentalIntentValues).exclude(["unknown"]).optional(),
  intentCode: z.string().trim().min(1),
  treatmentNeed: z.string().trim().min(1),
  budget: z.string().trim().min(1),
  estimatedValue: z.coerce.number().int().min(0),
  escalated: z.boolean(),
  consent: z.boolean(),
  name: z.string(),
  phone: z.string(),
  location: z.string(),
  availability: z.string(),
  ready: z.boolean(),
  triageLevel: z.enum(triageValues),
  triageLabel: z.string().trim().min(1),
  clinicalReading: z.string().trim().min(1),
  likelyCauses: z.array(z.string()),
  detectedSignals: z.array(z.string()),
  redFlags: z.array(z.string()),
  missingClinicalData: z.array(z.string()),
  confidence: z.enum(confidenceValues),
  safetyScreened: z.boolean()
});

const dentalChatMessageSchema = z.object({
  role: z.enum(["patient", "assistant"]),
  body: z.string().trim().min(1).max(3000)
});

export const dentalAgentRequestSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  messages: z.array(dentalChatMessageSchema).max(30).default([]),
  state: dentalAgentStateSchema.default(initialDentalAgentState)
});

const dentalAgentAiOutputSchema = z.object({
  reply: z.string().trim().min(1).max(1500),
  intent: z.enum(dentalIntentValues),
  intentCode: z.string().trim().min(1),
  treatmentNeed: z.string().trim().min(1),
  budget: z.string().trim().min(1),
  estimatedValue: z.coerce.number().int().min(0),
  escalated: z.boolean(),
  consent: z.boolean(),
  name: z.string(),
  phone: z.string(),
  location: z.string(),
  availability: z.string(),
  triageLevel: z.enum(triageValues),
  triageLabel: z.string().trim().min(1),
  clinicalReading: z.string().trim().min(1),
  likelyCauses: z.array(z.string()).max(5),
  detectedSignals: z.array(z.string()).max(8),
  redFlags: z.array(z.string()).max(8),
  missingClinicalData: z.array(z.string()).max(5),
  confidence: z.enum(confidenceValues),
  safetyScreened: z.boolean()
});

type DentalAgentAiOutput = z.infer<typeof dentalAgentAiOutputSchema>;

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
};

// Forma real de la respuesta de la Generative Language API (generateContent).
type GeminiResponsePayload = {
  candidates?: Array<{
    content?: { role?: string; parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
};

type GeminiContentPart = { role: "user" | "model"; parts: [{ text: string }] };

export async function runDentalAgentTurn(input: {
  latestPatientMessage: string;
  history: DentalChatMessage[];
  state: DentalAgentState;
  clinicContext?: string;
}): Promise<DentalAgentApiTurn> {
  const provider = resolveProvider();
  if (provider === "gemini") {
    return runGeminiDentalAgentTurn(input);
  }
  return runOpenAiDentalAgentTurn(input);
}

export async function runOpenAiDentalAgentTurn(input: {
  latestPatientMessage: string;
  history: DentalChatMessage[];
  state: DentalAgentState;
  clinicContext?: string;
}): Promise<DentalAgentApiTurn> {
  const localTurn = runDentalSeniorTurn(input.state, input.latestPatientMessage);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return buildLocalFallback(localTurn, model, "OPENAI_API_KEY no configurada");
  }

  try {
    const response = await fetchWithTimeout(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions: buildDentalSystemPrompt(input.clinicContext),
        input: buildDentalUserInput(input.history, input.latestPatientMessage, localTurn.state),
        max_output_tokens: 1200,
        text: {
          format: {
            type: "json_schema",
            name: "dentia_dental_agent_turn",
            strict: true,
            schema: dentalAgentJsonSchema
          }
        }
      })
    }, LLM_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("runOpenAiDentalAgentTurn OpenAI error", response.status, errorText.slice(0, 500));
      return buildLocalFallback(localTurn, model, `OpenAI API ${response.status}`);
    }

    const payload = (await response.json()) as OpenAiResponsePayload;
    const rawText = extractOpenAiText(payload);
    if (!rawText) {
      return buildLocalFallback(localTurn, model, payload.error?.message || "OpenAI no devolvio texto");
    }

    const aiOutput = parseDentalAgentOutput(rawText);
    const state = mergeAiState(localTurn.state, aiOutput);
    return { reply: aiOutput.reply, state, runtime: "openai", model };
  } catch (error) {
    console.error("runOpenAiDentalAgentTurn failed", error);
    return buildLocalFallback(localTurn, model, error instanceof Error ? error.message : "Respuesta IA no valida");
  }
}

async function runGeminiDentalAgentTurn(input: {
  latestPatientMessage: string;
  history: DentalChatMessage[];
  state: DentalAgentState;
  clinicContext?: string;
}): Promise<DentalAgentApiTurn> {
  const localTurn = runDentalSeniorTurn(input.state, input.latestPatientMessage);
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FALLBACK_MODEL;

  if (!apiKey) {
    return buildLocalFallback(localTurn, model, "GEMINI_API_KEY no configurada");
  }

  try {
    const systemInstruction = buildGeminiSystemInstruction(input.clinicContext);
    const contents = buildGeminiContents(input.history, input.latestPatientMessage, localTurn.state);
    const primaryResult = await requestGeminiTurn({ apiKey, model, systemInstruction, contents, timeoutMs: LLM_TIMEOUT_MS });
    if (primaryResult.ok) {
      const state = mergeAiState(localTurn.state, primaryResult.output);
      return { reply: primaryResult.output.reply, state, runtime: "gemini", model };
    }

    if (primaryResult.fallbackReason === "Gemini devolvio texto libre") {
      return {
        reply: buildGeminiFreeformReply(primaryResult.errorText, localTurn.reply),
        state: localTurn.state,
        runtime: "gemini",
        model: `${model} (texto libre)`
      };
    }

    console.error("runGeminiDentalAgentTurn Gemini error", primaryResult.status, primaryResult.errorText.slice(0, 500));

    if (
      primaryResult.status &&
      [400, 404, 429].includes(primaryResult.status) &&
      fallbackModel &&
      fallbackModel !== model
    ) {
      const secondaryResult = await requestGeminiTurn({ apiKey, model: fallbackModel, systemInstruction, contents, timeoutMs: LLM_FALLBACK_TIMEOUT_MS });
      if (secondaryResult.ok) {
        const state = mergeAiState(localTurn.state, secondaryResult.output);
        return {
          reply: secondaryResult.output.reply,
          state,
          runtime: "gemini",
          model: `${fallbackModel} (fallback)`
        };
      }
      if (secondaryResult.fallbackReason === "Gemini devolvio texto libre") {
        return {
          reply: buildGeminiFreeformReply(secondaryResult.errorText, localTurn.reply),
          state: localTurn.state,
          runtime: "gemini",
          model: `${fallbackModel} (texto libre fallback)`
        };
      }
      console.error("runGeminiDentalAgentTurn Gemini fallback error", secondaryResult.status, secondaryResult.errorText.slice(0, 500));
      return buildLocalFallback(
        localTurn,
        model,
        secondaryResult.status
          ? `Gemini API ${primaryResult.status}; fallback ${fallbackModel} -> ${secondaryResult.status}`
          : secondaryResult.fallbackReason || `Gemini API ${primaryResult.status}`
      );
    }

    return buildLocalFallback(
      localTurn,
      model,
      primaryResult.status ? `Gemini API ${primaryResult.status}` : primaryResult.fallbackReason || "Gemini no devolvio texto"
    );
  } catch (error) {
    console.error("runGeminiDentalAgentTurn failed", error);
    return buildLocalFallback(localTurn, model, error instanceof Error ? error.message : "Respuesta Gemini no valida");
  }
}

async function requestGeminiTurn(input: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  contents: GeminiContentPart[];
  timeoutMs: number;
}): Promise<
  | { ok: true; output: DentalAgentAiOutput }
  | { ok: false; status?: number; errorText: string; fallbackReason?: string }
> {
  let response: Response;
  try {
    response = await fetchWithTimeout(geminiGenerateContentUrl(input.model), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": input.apiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.systemInstruction }] },
        contents: input.contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1400,
          responseMimeType: "application/json",
          responseSchema: dentalAgentGeminiSchema
        }
      })
    }, input.timeoutMs);
  } catch (error) {
    if (isTimeoutError(error)) {
      // Sin status: el flujo superior no intenta el modelo de fallback y
      // responde ya con el agente local, evitando duplicar la espera.
      return { ok: false, errorText: "", fallbackReason: error.message };
    }
    throw error;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: await response.text().catch(() => "")
    };
  }

  const payload = (await response.json()) as GeminiResponsePayload;

  if (payload.promptFeedback?.blockReason) {
    return {
      ok: false,
      errorText: "",
      fallbackReason: `Gemini bloqueo la respuesta por seguridad: ${payload.promptFeedback.blockReason}`
    };
  }

  const rawText = extractGeminiText(payload);
  if (!rawText) {
    return {
      ok: false,
      errorText: "",
      fallbackReason: payload.error?.message || "Gemini no devolvio texto"
    };
  }

  try {
    return {
      ok: true,
      output: parseDentalAgentOutput(rawText)
    };
  } catch {
    return {
      ok: false,
      errorText: rawText,
      fallbackReason: "Gemini devolvio texto libre"
    };
  }
}

function resolveProvider(): LlmProvider {
  return process.env.LLM_PROVIDER === "gemini" ? "gemini" : "openai";
}

function buildDentalSystemPrompt(extraContext?: string) {
  const treatments = demoKnowledge.treatments
    .map(treatment => `- ${treatment.name}: ${treatment.price}. ${treatment.about} Regla: ${treatment.rule}`)
    .join("\n");

  return [
    `Eres Clara, recepcionista IA senior de ${demoKnowledge.clinic.name}.`,
    "Tu objetivo es atender como una recepcionista entrenada en clinica dental: entender el motivo, orientar con lenguaje natural, priorizar y preparar cita o escalado.",
    "No eres odontologo y no diagnosticas. Usa frases como 'podria encajar con', 'requiere valoracion del doctor' o 'conviene revisar'.",
    "No inventes precios, tratamientos, sedes, horarios ni financiacion. Usa solo la base de conocimiento cargada.",
    "Se breve como una persona por WhatsApp: 2-3 frases cortas y UNA sola pregunta por mensaje. Nada de parrafos largos.",
    "Muestra empatia genuina cuando hay dolor o preocupacion, variando la forma de decirlo; no uses siempre la misma muletilla.",
    "No repitas orientacion clinica, precios ni avisos que ya diste antes en la conversacion: avanza al siguiente paso.",
    "Solo da precios si el paciente los pide o si el tratamiento es de valoracion economica (implante, ortodoncia, estetica, primera visita).",
    "Si piden presupuesto o precio sin describir sintomas, NO preguntes por dolor ni molestias: pregunta directamente que tratamiento quieren presupuestar (implantes, ortodoncia invisible, estetica, coronas/protesis...) y recuerda que la primera visita con valoracion es sin coste.",
    "Pregunta de forma conversacional y una cosa cada vez, salvo que el paciente ya haya dado varios datos.",
    "Si el paciente ya dio consentimiento, nombre, telefono, sede o disponibilidad, no los vuelvas a pedir.",
    "Escala como emergencia inmediata si hay dificultad para respirar, tragar o hablar, hinchazon importante de cara/cuello/ojo, sangrado que no cede o traumatismo serio.",
    "En urgencias no atropelles al paciente: primero haz SOLO la pregunta de seguridad (fiebre, hinchazon, pus, dificultad para abrir/tragar) y espera su respuesta; la cita se propone en el turno siguiente, nunca en el mismo mensaje que la pregunta.",
    "Escala a recepcion/doctor si hay dolor intenso, inflamacion, pus, fiebre, bloqueo mandibular, trauma, reclamacion o incertidumbre clinica relevante.",
    "Para presupuestos, da rangos orientativos y remata con que el doctor confirmara diagnostico y presupuesto cerrado.",
    "Debe parecer un agente formado en la clinica, no un flujo de formulario.",
    "Si el paciente pregunta directamente si eres humana, una persona real o un bot: responde con naturalidad que eres la asistente de inteligencia artificial de la clinica (nunca digas que eres humana ni lo dejes ambiguo); el resto de la conversacion sigue siendo calida y cercana.",
    "",
    "Base de conocimiento:",
    `Sedes: ${demoKnowledge.clinic.locations.join(" | ")}`,
    `Horario: ${demoKnowledge.clinic.hours}`,
    `Financiacion: ${demoKnowledge.financing.join(" ")}`,
    `Guardrails: ${demoKnowledge.guardrails.join(" ")}`,
    "Tratamientos y precios:",
    treatments,
    extraContext
      ? `Contexto adicional del tenant (si contradice algo de la base generica de arriba -- sedes, horario, equipo, precios -- este contexto especifico de la clinica siempre prevalece):\n${extraContext}`
      : "",
    "",
    "Devuelve solo JSON conforme al esquema. El campo reply es el mensaje que vera el paciente."
  ].filter(Boolean).join("\n");
}

function buildDentalUserInput(history: DentalChatMessage[], latestPatientMessage: string, localState: DentalAgentState) {
  const compactHistory = history
    .slice(-12)
    .map(message => `${message.role === "assistant" ? "Clara" : "Paciente"}: ${message.body}`)
    .join("\n");

  return [
    "Conversacion reciente:",
    compactHistory || "(sin historial previo)",
    "",
    `Ultimo mensaje del paciente: ${latestPatientMessage}`,
    "",
    "Lectura determinista preliminar, usala como apoyo pero mejora la naturalidad si procede:",
    JSON.stringify(localState, null, 2),
    "",
    "Instrucciones de salida:",
    "- Si faltan datos de cita, rellena missingClinicalData con preguntas clinicas o administrativas relevantes.",
    "- ready debe ser true solo si ya hay datos minimos para guardar: consentimiento, nombre y telefono; tambien sede y disponibilidad si no esta escalado.",
    "- Si detectas emergencia, escalated debe ser true y ready no debe requerir sede ni disponibilidad.",
    "- Manten reply en espanol natural y cercano: maximo 2-3 frases cortas y una sola pregunta. No repitas lo ya dicho en la conversacion."
  ].join("\n");
}

function buildGeminiSystemInstruction(clinicContext?: string) {
  return [
    buildDentalSystemPrompt(clinicContext),
    "",
    "Instrucciones de salida:",
    "- Si faltan datos de cita, rellena missingClinicalData con preguntas clinicas o administrativas relevantes.",
    "- ready debe ser true solo si ya hay datos minimos para guardar: consentimiento, nombre y telefono; tambien sede y disponibilidad si no esta escalado.",
    "- Si detectas emergencia, escalated debe ser true y ready no debe requerir sede ni disponibilidad.",
    "- Devuelve solo JSON conforme al esquema. El campo reply es el mensaje que vera el paciente."
  ].join("\n");
}

// A diferencia del prompt plano anterior, Gemini recibe la conversacion como
// turnos reales (user/model) en vez de un bloque de texto con "Paciente: ...
// Clara: ...": es la forma nativa de la API y suena mas natural porque el
// modelo la procesa como dialogo, no como un documento a resumir.
function buildGeminiContents(
  history: DentalChatMessage[],
  latestPatientMessage: string,
  localState: DentalAgentState
): GeminiContentPart[] {
  const trimmedHistory = history.slice(-12);
  // contents debe empezar en "user": se descarta cualquier saludo inicial
  // del asistente que no tenga un mensaje de paciente delante.
  const firstPatientIndex = trimmedHistory.findIndex(message => message.role === "patient");
  const relevantHistory = firstPatientIndex >= 0 ? trimmedHistory.slice(firstPatientIndex) : [];

  const turns: GeminiContentPart[] = [];
  for (const message of relevantHistory) {
    const role: "user" | "model" = message.role === "assistant" ? "model" : "user";
    const previous = turns[turns.length - 1];
    if (previous && previous.role === role) {
      // Turnos consecutivos del mismo rol (p.ej. el aviso de urgencia
      // anadido tras la respuesta principal) se fusionan: Gemini exige
      // alternancia estricta user/model.
      previous.parts = [{ text: `${previous.parts[0].text}\n${message.body}` }];
    } else {
      turns.push({ role, parts: [{ text: message.body }] });
    }
  }

  const latestWithContext = [
    latestPatientMessage,
    "",
    "[Lectura determinista preliminar del sistema, usala como apoyo pero mejora la naturalidad si procede]:",
    JSON.stringify(localState)
  ].join("\n");

  const last = turns[turns.length - 1];
  if (last && last.role === "user") {
    last.parts = [{ text: `${last.parts[0].text}\n\n${latestWithContext}` }];
  } else {
    turns.push({ role: "user", parts: [{ text: latestWithContext }] });
  }

  return turns;
}

// Gemini usa un subconjunto de OpenAPI para responseSchema: no admite
// palabras clave de JSON Schema puro como additionalProperties/maxLength/
// maxItems (las ignora en el mejor caso, puede rechazarlas en el peor).
function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(toGeminiSchema);
  }
  if (schema && typeof schema === "object") {
    const entries = Object.entries(schema as Record<string, unknown>)
      .filter(([key]) => !["additionalProperties", "maxLength", "maxItems", "minLength", "minItems"].includes(key))
      .map(([key, value]) => [key, toGeminiSchema(value)] as const);
    return Object.fromEntries(entries);
  }
  return schema;
}

const dentalAgentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "reply",
    "intent",
    "intentCode",
    "treatmentNeed",
    "budget",
    "estimatedValue",
    "escalated",
    "consent",
    "name",
    "phone",
    "location",
    "availability",
    "triageLevel",
    "triageLabel",
    "clinicalReading",
    "likelyCauses",
    "detectedSignals",
    "redFlags",
    "missingClinicalData",
    "confidence",
    "safetyScreened"
  ],
  properties: {
    reply: { type: "string", maxLength: 1500 },
    intent: { type: "string", enum: dentalIntentValues },
    intentCode: { type: "string" },
    treatmentNeed: { type: "string" },
    budget: { type: "string" },
    estimatedValue: { type: "integer", minimum: 0 },
    escalated: { type: "boolean" },
    consent: { type: "boolean" },
    name: { type: "string" },
    phone: { type: "string" },
    location: { type: "string" },
    availability: { type: "string" },
    triageLevel: { type: "string", enum: triageValues },
    triageLabel: { type: "string" },
    clinicalReading: { type: "string" },
    likelyCauses: { type: "array", items: { type: "string" }, maxItems: 5 },
    detectedSignals: { type: "array", items: { type: "string" }, maxItems: 8 },
    redFlags: { type: "array", items: { type: "string" }, maxItems: 8 },
    missingClinicalData: { type: "array", items: { type: "string" }, maxItems: 5 },
    confidence: { type: "string", enum: confidenceValues },
    safetyScreened: { type: "boolean" }
  }
} as const;

const dentalAgentGeminiSchema = toGeminiSchema(dentalAgentJsonSchema);

function extractOpenAiText(payload: OpenAiResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  return payload.output
    ?.flatMap(item => item.content ?? [])
    .map(content => content.text ?? "")
    .join("")
    .trim() || "";
}

function extractGeminiText(payload: GeminiResponsePayload) {
  return payload.candidates
    ?.flatMap(candidate => candidate.content?.parts ?? [])
    .map(part => part.text ?? "")
    .join("")
    .trim() || "";
}

function parseDentalAgentOutput(rawText: string) {
  const normalizedText = normalizeJsonText(rawText);
  const parsed = dentalAgentAiOutputSchema.safeParse(JSON.parse(normalizedText));
  if (parsed.success) {
    return parsed.data;
  }
  const issue = parsed.error.issues[0];
  const path = issue?.path?.join(".") || "root";
  throw new Error(`Salida IA invalida en ${path}: ${issue?.message || "schema mismatch"}`);
}

function normalizeJsonText(rawText: string) {
  const trimmed = rawText.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    JSON.parse(withoutFence);
    return withoutFence;
  } catch {
    const firstBrace = withoutFence.indexOf("{");
    const lastBrace = withoutFence.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return withoutFence.slice(firstBrace, lastBrace + 1);
    }
    throw new Error("Salida Gemini no se pudo interpretar como JSON");
  }
}

function buildGeminiFreeformReply(rawText: string, fallbackReply: string) {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!cleaned) {
    return fallbackReply;
  }

  const replyFromJson = extractReplyFromLooseJson(cleaned);
  const reply = replyFromJson || cleaned;

  if (reply.length > 1200) {
    return `${reply.slice(0, 1197).trim()}...`;
  }

  return reply;
}

function extractReplyFromLooseJson(value: string) {
  try {
    const parsed = JSON.parse(normalizeJsonText(value)) as unknown;
    if (parsed && typeof parsed === "object" && "reply" in parsed) {
      const reply = (parsed as { reply?: unknown }).reply;
      return typeof reply === "string" ? reply.trim() : "";
    }
  } catch {
    const quotedMatch = value.match(/"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s);
    if (quotedMatch?.[1]) {
      try {
        return JSON.parse(`"${quotedMatch[1]}"`).trim();
      } catch {
        return quotedMatch[1].replace(/\\"/g, "\"").trim();
      }
    }

    const looseReply = extractTruncatedReplyField(value);
    if (!looseReply) {
      return "";
    }
    return looseReply;
  }
  return "";
}

function extractTruncatedReplyField(value: string) {
  const marker = /"reply"\s*:\s*"/.exec(value);
  if (!marker) {
    return "";
  }

  const start = marker.index + marker[0].length;
  const afterReply = value.slice(start);
  const nextField = afterReply.search(/",\s*"[\w]+\"\s*:/s);
  const rawReply = (nextField >= 0 ? afterReply.slice(0, nextField) : afterReply)
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, "\"")
    .replace(/[}\]]+\s*$/g, "")
    .replace(/"\s*$/g, "")
    .trim();

  if (!rawReply || rawReply === value.trim()) {
    return "";
  }

  return rawReply;
}

function buildLocalFallback(
  localTurn: { reply: string; state: DentalAgentState },
  model: string,
  fallbackReason: string
): DentalAgentApiTurn {
  return {
    reply: localTurn.reply,
    state: localTurn.state,
    runtime: "local",
    model,
    fallbackReason
  };
}

function mergeAiState(localState: DentalAgentState, aiOutput: DentalAgentAiOutput): DentalAgentState {
  const intent = aiOutput.intent === "unknown" ? localState.intent : (aiOutput.intent as DentalIntentId);
  const escalated = aiOutput.triageLevel === "EMERGENCY" || aiOutput.triageLevel === "URGENT_24H" || aiOutput.escalated;
  const state: DentalAgentState = {
    ...localState,
    intent,
    intentCode: aiOutput.intentCode || localState.intentCode || PENDING_INTENT,
    treatmentNeed: aiOutput.treatmentNeed || localState.treatmentNeed,
    budget: aiOutput.budget || localState.budget,
    estimatedValue: aiOutput.estimatedValue,
    escalated,
    consent: aiOutput.consent,
    name: aiOutput.name,
    phone: aiOutput.phone,
    location: aiOutput.location,
    availability: aiOutput.availability,
    ready: false,
    triageLevel: aiOutput.triageLevel as TriageLevel,
    triageLabel: aiOutput.triageLabel,
    clinicalReading: aiOutput.clinicalReading,
    likelyCauses: unique(aiOutput.likelyCauses),
    detectedSignals: unique(aiOutput.detectedSignals),
    redFlags: unique(aiOutput.redFlags),
    missingClinicalData: unique(aiOutput.missingClinicalData),
    confidence: aiOutput.confidence,
    safetyScreened: aiOutput.safetyScreened
  };
  return { ...state, ready: computeReady(state) };
}

function computeReady(state: DentalAgentState) {
  const hasIntent = Boolean(state.intent || state.intentCode !== PENDING_INTENT);
  return state.escalated
    ? Boolean(hasIntent && state.consent && state.name && state.phone)
    : Boolean(hasIntent && state.consent && state.name && state.phone && state.location && state.availability);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}
