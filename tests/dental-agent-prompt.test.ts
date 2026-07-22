import { describe, expect, it } from "vitest";
import { buildDentalUserInput, buildGeminiSystemInstruction } from "@/lib/agent/openai-dental-agent";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";

// Fase 4: estas 4 lineas antes vivian duplicadas palabra por palabra en el prompt de
// OpenAI (buildDentalUserInput) y el de Gemini (buildGeminiSystemInstruction). Se
// unificaron en una sola constante (DENTAL_OUTPUT_BASE_INSTRUCTIONS); este test
// bloquea que ambos prompts se desincronicen otra vez.
const SHARED_OUTPUT_INSTRUCTIONS_BLOCK = [
  "Instrucciones de salida:",
  "- Si faltan datos de cita, rellena missingClinicalData con preguntas clínicas o administrativas relevantes.",
  "- ready debe ser true solo si ya hay datos minimos para cita: consentimiento, nombre y apellidos, teléfono, email, sede y disponibilidad concreta con día y hora/franja.",
  "- Aunque detectes urgencia, no marques ready sin sede y disponibilidad concreta. En emergencia inmediata puedes escalar, pero no confirmes cita sin esos datos.",
  "- Si missingClinicalData contiene una pregunta clínica, el reply debe hacer esa pregunta antes de pedir consentimiento o datos."
].join("\n");

describe("dental agent prompt builders", () => {
  it("keeps the shared output instructions identical between the OpenAI and Gemini prompts", () => {
    const openAiInput = buildDentalUserInput([], "hola", initialDentalAgentState);
    const geminiInstruction = buildGeminiSystemInstruction();

    expect(openAiInput).toContain(SHARED_OUTPUT_INSTRUCTIONS_BLOCK);
    expect(geminiInstruction).toContain(SHARED_OUTPUT_INSTRUCTIONS_BLOCK);
  });

  it("still appends each provider's own distinct closing instruction after the shared block", () => {
    const openAiInput = buildDentalUserInput([], "hola", initialDentalAgentState);
    const geminiInstruction = buildGeminiSystemInstruction();

    expect(openAiInput).toContain("Manten reply en español natural y cercano");
    expect(geminiInstruction).toContain("Devuelve solo JSON conforme al esquema");
  });
});
