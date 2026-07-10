"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { demoKnowledge, demoScenarios } from "@/lib/agent/demo-data";
import {
  buildDentalSummary,
  initialDentalAgentState,
  runDentalSeniorTurn,
  type DentalAgentState
} from "@/lib/agent/dental-senior-agent";

type ServerAction = (formData: FormData) => void | Promise<void>;
type ChatRole = "patient" | "assistant";
type AgentRuntime = "openai" | "local" | "idle";

type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: "assistant-start",
    role: "assistant",
    body:
      "Hola, soy Clara, recepcionista IA de Clinica Dental Murcia-Elche. Cuentame que notas: dolor, sensibilidad, encias, pieza rota, implante, ortodoncia o estetica. Te hare unas preguntas para priorizarte, orientar el presupuesto y preparar una cita si encaja."
  }
];

const expertPrompts = [
  {
    label: "Dolor al frio",
    prompt:
      "Me duele una muela cuando tomo algo frio y tambien un poco al morder. No tengo fiebre ni hinchazon."
  },
  {
    label: "Encias",
    prompt:
      "Me sangran las encias al cepillarme y noto mal aliento. Hace mas de un ano que no hago limpieza."
  },
  {
    label: "Funda caida",
    prompt:
      "Se me ha caido una funda de una muela. La guardo, no sangra, pero noto sensibilidad."
  },
  {
    label: "Muela juicio",
    prompt:
      "Me duele la zona de atras del todo y me cuesta abrir bien la boca desde ayer."
  },
  {
    label: "Bruxismo",
    prompt:
      "Me levanto con dolor de mandibula y creo que aprieto los dientes por la noche."
  }
];

export function InteractiveAgentDemo({ saveAction }: { saveAction: ServerAction }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [dentalState, setDentalState] = useState<DentalAgentState>(initialDentalAgentState);
  const [isThinking, setIsThinking] = useState(false);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntime>("idle");
  const [apiNotice, setApiNotice] = useState("");

  const transcript = useMemo(
    () => JSON.stringify(messages.map(message => ({ role: message.role, body: message.body }))),
    [messages]
  );
  const summary = useMemo(() => buildDentalSummary(dentalState), [dentalState]);
  const canSave = messages.length > 2 && dentalState.ready;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendPatientMessage(input);
  }

  async function sendPatientMessage(rawText: string) {
    const text = rawText.trim();
    if (!text || isThinking) {
      return;
    }
    const patientMessage: ChatMessage = { id: makeId("patient"), role: "patient", body: text };
    const nextMessages = [...messages, patientMessage];
    const fallbackTurn = runDentalSeniorTurn(dentalState, text);
    setInput("");
    setIsThinking(true);
    setApiNotice("");
    setMessages(nextMessages);

    try {
      const response = await fetch("/api/agent/dental-demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text,
          messages: nextMessages.map(message => ({ role: message.role, body: message.body })),
          state: dentalState
        })
      });
      const payload = await response.json() as {
        success?: boolean;
        error?: string | null;
        data?: {
          reply: string;
          state: DentalAgentState;
          runtime: AgentRuntime;
          model: string;
          fallbackReason?: string;
        };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "No se pudo consultar la IA.");
      }
      setDentalState(payload.data.state);
      setAgentRuntime(payload.data.runtime);
      setApiNotice(payload.data.fallbackReason ? `Fallback local: ${payload.data.fallbackReason}` : `IA API activa: ${payload.data.model}`);
      setMessages([...nextMessages, { id: makeId("assistant"), role: "assistant", body: payload.data.reply }]);
    } catch (error) {
      console.error("sendPatientMessage failed", error);
      setDentalState(fallbackTurn.state);
      setAgentRuntime("local");
      setApiNotice("Fallback local: no se pudo consultar la IA.");
      setMessages([...nextMessages, { id: makeId("assistant"), role: "assistant", body: fallbackTurn.reply }]);
    } finally {
      setIsThinking(false);
    }
  }

  function resetDemo() {
    setInput("");
    setDentalState(initialDentalAgentState);
    setMessages(starterMessages);
    setAgentRuntime("idle");
    setApiNotice("");
    setIsThinking(false);
  }

  return (
    <div className="interactive-demo-shell">
      <div className="interactive-chat">
        <div className="interactive-chat-head">
          <div>
            <h3>Prueba libre con Clara</h3>
            <p>Escribe como si fueras paciente. La demo clasifica, asesora, pide datos y prepara cita.</p>
          </div>
          <button className="button ghost" type="button" onClick={resetDemo}>Reiniciar</button>
        </div>
        <div className="quick-prompts" aria-label="Casos de prueba">
          {demoScenarios.map(scenario => (
            <button key={scenario.id} type="button" onClick={() => sendPatientMessage(scenario.prompt)} disabled={isThinking}>
              {scenario.title}
            </button>
          ))}
          {expertPrompts.map(prompt => (
            <button key={prompt.label} type="button" onClick={() => sendPatientMessage(prompt.prompt)} disabled={isThinking}>
              {prompt.label}
            </button>
          ))}
        </div>
        <div className="chat-window" aria-live="polite">
          {messages.map(message => (
            <div className={`chat-bubble ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? demoKnowledge.clinic.assistant : "Paciente"}</span>
              <p>{message.body}</p>
            </div>
          ))}
          {isThinking ? (
            <div className="chat-bubble assistant thinking">
              <span>{demoKnowledge.clinic.assistant}</span>
              <p>Consultando la base de conocimiento y preparando una respuesta...</p>
            </div>
          ) : null}
        </div>
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="agent-demo-input">Mensaje del paciente</label>
          <input
            id="agent-demo-input"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Ej: me duele al morder desde ayer, sin fiebre, acepto. Soy Marta y prefiero Elche por la tarde..."
            disabled={isThinking}
          />
          <button className="button primary" type="submit" disabled={isThinking}>
            {isThinking ? "Pensando" : "Enviar"}
          </button>
        </form>
      </div>

      <aside className="interactive-intake">
        <div className="intake-card">
          <span className="tile-icon accent-blue"><Icon name="bot" /></span>
          <div>
            <div className="agent-runtime-row">
              <h3>Lectura del agente</h3>
              <span className={`agent-runtime-badge ${agentRuntime}`}>
                {agentRuntime === "openai" ? "IA API" : agentRuntime === "local" ? "Fallback local" : "Preparada"}
              </span>
            </div>
            <p>{summary}</p>
            {apiNotice ? <p className="agent-api-notice">{apiNotice}</p> : null}
          </div>
        </div>
        <div className="intake-grid">
          <StatusChip label="Prioridad" value={dentalState.triageLabel} ready={Boolean(dentalState.intent)} tone={dentalState.escalated ? "warning" : "normal"} />
          <StatusChip label="Intencion" value={dentalState.intentCode.replaceAll("_", " ")} ready={Boolean(dentalState.intent)} />
          <StatusChip label="Hipotesis" value={dentalState.likelyCauses.slice(0, 2).join(" / ") || "Pendiente"} ready={dentalState.likelyCauses.length > 0} />
          <StatusChip label="Senales" value={dentalState.detectedSignals.slice(0, 3).join(", ") || "Pendiente"} ready={dentalState.detectedSignals.length > 0} />
          <StatusChip label="Tratamiento" value={dentalState.treatmentNeed} ready={Boolean(dentalState.intent)} />
          <StatusChip label="Presupuesto" value={dentalState.budget} ready={dentalState.budget !== "Pendiente"} />
          <StatusChip label="Confianza" value={dentalState.confidence} ready={dentalState.confidence !== "Baja"} />
          <StatusChip label="Consentimiento" value={dentalState.consent ? "Aceptado" : "Pendiente"} ready={dentalState.consent} />
          <StatusChip label="Nombre" value={dentalState.name || "Pendiente"} ready={Boolean(dentalState.name)} />
          <StatusChip label="Telefono" value={dentalState.phone || "Pendiente"} ready={Boolean(dentalState.phone)} />
          <StatusChip label="Sede" value={dentalState.location || "Pendiente"} ready={Boolean(dentalState.location) || dentalState.escalated} />
          <StatusChip label="Horario" value={dentalState.availability || "Pendiente"} ready={Boolean(dentalState.availability) || dentalState.escalated} />
        </div>
        <form action={saveAction} className="interactive-save-form">
          <input type="hidden" name="transcript" value={transcript} />
          <input type="hidden" name="intent" value={dentalState.intentCode} />
          <input type="hidden" name="patientName" value={dentalState.name || "Paciente demo"} />
          <input type="hidden" name="phone" value={dentalState.phone} />
          <input type="hidden" name="treatmentNeed" value={dentalState.treatmentNeed} />
          <input type="hidden" name="estimatedValue" value={dentalState.estimatedValue} />
          <input type="hidden" name="budget" value={dentalState.budget} />
          <input type="hidden" name="location" value={dentalState.location} />
          <input type="hidden" name="availability" value={dentalState.availability} />
          <input type="hidden" name="summary" value={summary} />
          <input type="hidden" name="escalated" value={dentalState.escalated ? "true" : "false"} />
          <button className="button primary" type="submit" disabled={!canSave}>
            Registrar conversacion en CRM
          </button>
          <p>{canSave ? "Lista para guardar como lead operativo." : "La IA activara el guardado cuando tenga los datos minimos."}</p>
        </form>
      </aside>
    </div>
  );
}

function StatusChip({ label, value, ready, tone = "normal" }: { label: string; value: string; ready: boolean; tone?: "normal" | "warning" }) {
  return (
    <div className={`status-chip ${ready ? "ready" : ""} ${tone === "warning" ? "warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
