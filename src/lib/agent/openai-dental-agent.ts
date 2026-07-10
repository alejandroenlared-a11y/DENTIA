import { z } from "zod";
import { demoKnowledge } from "@/lib/agent/demo-data";
import {
  initialDentalAgentState,
  runDentalSeniorTurn,
  type DentalAgentState,
  type DentalIntentId,
  type TriageLevel
} from "@/lib/agent/dental-senior-agent";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const PENDING_INTENT = "INTENCION_PENDIENTE";

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

export type DentalAgentRuntime = "openai" | "local";

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

export async function runOpenAiDentalAgentTurn(input: {
  latestPatientMessage: string;
  history: DentalChatMessage[];
  state: DentalAgentState;
  clinicContext?: string;
}): Promise<DentalAgentApiTurn> {
  const localTurn = runDentalSeniorTurn(input.state, input.latestPatientMessage);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return {
      reply: localTurn.reply,
      state: localTurn.state,
      runtime: "local",
      model,
      fallbackReason: "OPENAI_API_KEY no configurada"
    };
  }

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
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
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("runOpenAiDentalAgentTurn OpenAI error", response.status, errorText.slice(0, 500));
      return {
        reply: localTurn.reply,
        state: localTurn.state,
        runtime: "local",
        model,
        fallbackReason: `OpenAI API ${response.status}`
      };
    }

    const payload = (await response.json()) as OpenAiResponsePayload;
    const rawText = extractOpenAiText(payload);
    if (!rawText) {
      return {
        reply: localTurn.reply,
        state: localTurn.state,
        runtime: "local",
        model,
        fallbackReason: payload.error?.message || "OpenAI no devolvio texto"
      };
    }

    const aiOutput = dentalAgentAiOutputSchema.parse(JSON.parse(rawText));
    const state = mergeAiState(localTurn.state, aiOutput);
    return { reply: aiOutput.reply, state, runtime: "openai", model };
  } catch (error) {
    console.error("runOpenAiDentalAgentTurn failed", error);
    return {
      reply: localTurn.reply,
      state: localTurn.state,
      runtime: "local",
      model,
      fallbackReason: "Respuesta IA no valida"
    };
  }
}

function buildDentalSystemPrompt(extraContext?: string) {
  const treatments = demoKnowledge.treatments
    .map(treatment => `- ${treatment.name}: ${treatment.price}. Regla: ${treatment.rule}`)
    .join("\n");

  return [
    `Eres Clara, recepcionista IA senior de ${demoKnowledge.clinic.name}.`,
    "Tu objetivo es atender como una recepcionista entrenada en clinica dental: entender el motivo, orientar con lenguaje natural, priorizar y preparar cita o escalado.",
    "No eres odontologo y no diagnosticas. Usa frases como 'podria encajar con', 'requiere valoracion del doctor' o 'conviene revisar'.",
    "No inventes precios, tratamientos, sedes, horarios ni financiacion. Usa solo la base de conocimiento cargada.",
    "Pregunta de forma conversacional y una cosa cada vez, salvo que el paciente ya haya dado varios datos.",
    "Si el paciente ya dio consentimiento, nombre, telefono, sede o disponibilidad, no los vuelvas a pedir.",
    "Escala como emergencia inmediata si hay dificultad para respirar, tragar o hablar, hinchazon importante de cara/cuello/ojo, sangrado que no cede o traumatismo serio.",
    "Escala a recepcion/doctor si hay dolor intenso, inflamacion, pus, fiebre, bloqueo mandibular, trauma, reclamacion o incertidumbre clinica relevante.",
    "Para presupuestos, da rangos orientativos y remata con que el doctor confirmara diagnostico y presupuesto cerrado.",
    "Debe parecer un agente formado en la clinica, no un flujo de formulario.",
    "",
    "Base de conocimiento:",
    `Sedes: ${demoKnowledge.clinic.locations.join(" | ")}`,
    `Horario: ${demoKnowledge.clinic.hours}`,
    `Financiacion: ${demoKnowledge.financing.join(" ")}`,
    `Guardrails: ${demoKnowledge.guardrails.join(" ")}`,
    "Tratamientos y precios:",
    treatments,
    extraContext ? `Contexto adicional del tenant:\n${extraContext}` : "",
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
    "- Mantén reply en espanol natural, maximo 5 frases."
  ].join("\n");
}

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
