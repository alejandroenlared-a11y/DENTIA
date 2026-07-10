"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { demoKnowledge, demoScenarios, type DemoScenarioId } from "@/lib/agent/demo-data";

type ServerAction = (formData: FormData) => void | Promise<void>;
type DemoIntentId = DemoScenarioId | "orthodontics";
type ChatRole = "patient" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  body: string;
};

type IntakeState = {
  intent?: DemoIntentId;
  intentCode: string;
  treatmentNeed: string;
  budget: string;
  estimatedValue: number;
  escalated: boolean;
  consent: boolean;
  name: string;
  phone: string;
  location: string;
  availability: string;
  ready: boolean;
};

const initialIntake: IntakeState = {
  intentCode: "INTENCION_PENDIENTE",
  treatmentNeed: "Pendiente de clasificar",
  budget: "Pendiente",
  estimatedValue: 0,
  escalated: false,
  consent: false,
  name: "",
  phone: "",
  location: "",
  availability: "",
  ready: false
};

const intentCatalog: Record<DemoIntentId, {
  title: string;
  intentCode: string;
  treatmentNeed: string;
  budget: string;
  estimatedValue: number;
  escalated: boolean;
  advice: string;
}> = {
  first_visit: {
    title: "Primera visita",
    intentCode: "CITA_PRIMERA_VISITA",
    treatmentNeed: "Primera visita y diagnostico digital",
    budget: "0 EUR",
    estimatedValue: 35000,
    escalated: false,
    advice:
      "La primera visita y diagnostico digital es sin coste. Sirve para revisar el caso y que el doctor confirme el plan."
  },
  urgent_pain: {
    title: "Urgencia dental",
    intentCode: "URGENCIA_DOLOR_INFLAMACION",
    treatmentNeed: "Urgencia dental",
    budget: "desde 70 EUR",
    estimatedValue: 22000,
    escalated: true,
    advice:
      "Por dolor intenso, inflamacion, sangrado o traumatismo lo marco como urgencia. No diagnostico sintomas: lo escalo a recepcion/doctor."
  },
  implant_price: {
    title: "Implante",
    intentCode: "PRECIO_IMPLANTE_FINANCIACION",
    treatmentNeed: "Implante unitario",
    budget: "desde 1.200 EUR",
    estimatedValue: 120000,
    escalated: false,
    advice:
      "Un implante unitario parte desde 1.200 EUR. El presupuesto exacto requiere valoracion y normalmente TAC."
  },
  whitening: {
    title: "Blanqueamiento",
    intentCode: "PRECIO_BLANQUEAMIENTO",
    treatmentNeed: "Blanqueamiento",
    budget: "desde 280 EUR",
    estimatedValue: 28000,
    escalated: false,
    advice:
      "El blanqueamiento empieza desde 280 EUR. Antes se revisa encia, sensibilidad y color inicial para hacerlo con seguridad."
  },
  reactivation: {
    title: "Higiene dental",
    intentCode: "REACTIVACION_HIGIENE",
    treatmentNeed: "Higiene dental",
    budget: "55 EUR",
    estimatedValue: 5500,
    escalated: false,
    advice:
      "La higiene dental dura unos 45 minutos y tiene precio orientativo de 55 EUR. Puede activarse recordatorio automatico."
  },
  orthodontics: {
    title: "Ortodoncia invisible",
    intentCode: "VALORACION_ORTODONCIA_INVISIBLE",
    treatmentNeed: "Ortodoncia invisible",
    budget: "desde 1.800 EUR",
    estimatedValue: 180000,
    escalated: false,
    advice:
      "La ortodoncia invisible parte desde 1.800 EUR. Siempre necesita estudio digital para confirmar viabilidad y precio final."
  }
};

const starterMessages: ChatMessage[] = [
  {
    id: "assistant-start",
    role: "assistant",
    body:
      "Hola, soy Clara, recepcionista IA de Clinica Dental Murcia-Elche. Puedo orientarte sobre tratamientos, precios aproximados, financiacion y ayudarte a preparar una cita. Cuentame que necesitas."
  }
];

export function InteractiveAgentDemo({ saveAction }: { saveAction: ServerAction }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [intake, setIntake] = useState<IntakeState>(initialIntake);

  const transcript = useMemo(
    () => JSON.stringify(messages.map(message => ({ role: message.role, body: message.body }))),
    [messages]
  );
  const summary = useMemo(() => buildSummary(intake), [intake]);
  const canSave = messages.length > 2 && intake.ready;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendPatientMessage(input);
  }

  function sendPatientMessage(rawText: string) {
    const text = rawText.trim();
    if (!text) {
      return;
    }
    setInput("");
    setMessages(currentMessages => {
      const nextIntake = completeIntake(readPatientMessage(intake, text));
      setIntake(nextIntake);
      return [
        ...currentMessages,
        { id: makeId("patient"), role: "patient", body: text },
        { id: makeId("assistant"), role: "assistant", body: buildAssistantReply(nextIntake) }
      ];
    });
  }

  function resetDemo() {
    setInput("");
    setIntake(initialIntake);
    setMessages(starterMessages);
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
            <button key={scenario.id} type="button" onClick={() => sendPatientMessage(scenario.prompt)}>
              {scenario.title}
            </button>
          ))}
          <button type="button" onClick={() => sendPatientMessage("Estoy pensando en ortodoncia invisible. Me gustaria saber precio y financiacion.")}>
            Ortodoncia
          </button>
        </div>
        <div className="chat-window" aria-live="polite">
          {messages.map(message => (
            <div className={`chat-bubble ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? demoKnowledge.clinic.assistant : "Paciente"}</span>
              <p>{message.body}</p>
            </div>
          ))}
        </div>
        <form className="chat-input-row" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="agent-demo-input">Mensaje del paciente</label>
          <input
            id="agent-demo-input"
            value={input}
            onChange={event => setInput(event.target.value)}
            placeholder="Ej: Quiero un implante, soy Marta y puedo ir a Elche por la tarde..."
          />
          <button className="button primary" type="submit">Enviar</button>
        </form>
      </div>

      <aside className="interactive-intake">
        <div className="intake-card">
          <span className="tile-icon accent-blue"><Icon name="bot" /></span>
          <div>
            <h3>Lectura del agente</h3>
            <p>{summary}</p>
          </div>
        </div>
        <div className="intake-grid">
          <StatusChip label="Intencion" value={intake.intentCode.replaceAll("_", " ")} ready={Boolean(intake.intent)} />
          <StatusChip label="Tratamiento" value={intake.treatmentNeed} ready={Boolean(intake.intent)} />
          <StatusChip label="Presupuesto" value={intake.budget} ready={intake.budget !== "Pendiente"} />
          <StatusChip label="Consentimiento" value={intake.consent ? "Aceptado" : "Pendiente"} ready={intake.consent} />
          <StatusChip label="Nombre" value={intake.name || "Pendiente"} ready={Boolean(intake.name)} />
          <StatusChip label="Telefono" value={intake.phone || "Pendiente"} ready={Boolean(intake.phone)} />
          <StatusChip label="Sede" value={intake.location || "Pendiente"} ready={Boolean(intake.location) || intake.escalated} />
          <StatusChip label="Horario" value={intake.availability || "Pendiente"} ready={Boolean(intake.availability) || intake.escalated} />
        </div>
        <form action={saveAction} className="interactive-save-form">
          <input type="hidden" name="transcript" value={transcript} />
          <input type="hidden" name="intent" value={intake.intentCode} />
          <input type="hidden" name="patientName" value={intake.name || "Paciente demo"} />
          <input type="hidden" name="phone" value={intake.phone} />
          <input type="hidden" name="treatmentNeed" value={intake.treatmentNeed} />
          <input type="hidden" name="estimatedValue" value={intake.estimatedValue} />
          <input type="hidden" name="budget" value={intake.budget} />
          <input type="hidden" name="location" value={intake.location} />
          <input type="hidden" name="availability" value={intake.availability} />
          <input type="hidden" name="summary" value={summary} />
          <input type="hidden" name="escalated" value={intake.escalated ? "true" : "false"} />
          <button className="button primary" type="submit" disabled={!canSave}>
            Registrar conversacion en CRM
          </button>
          <p>{canSave ? "Lista para guardar como lead operativo." : "La IA activara el guardado cuando tenga los datos minimos."}</p>
        </form>
      </aside>
    </div>
  );
}

function StatusChip({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <div className={`status-chip ${ready ? "ready" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function readPatientMessage(current: IntakeState, text: string): IntakeState {
  const normalized = normalize(text);
  const intent = current.intent ?? detectDemoIntent(normalized);
  const catalog = intent ? intentCatalog[intent] : null;

  const name = current.name || extractName(text);
  const phone = current.phone || extractPhone(text);
  const location = current.location || extractLocation(normalized);
  const availability = current.availability || extractAvailability(normalized, text);
  const consent = current.consent || acceptsConsent(normalized);

  return {
    ...current,
    ...(catalog
      ? {
          intent,
          intentCode: catalog.intentCode,
          treatmentNeed: catalog.treatmentNeed,
          budget: catalog.budget,
          estimatedValue: catalog.estimatedValue,
          escalated: catalog.escalated
        }
      : {}),
    name,
    phone,
    location,
    availability,
    consent
  };
}

function completeIntake(state: IntakeState): IntakeState {
  const ready = state.escalated
    ? Boolean(state.intent && state.consent && state.name && state.phone)
    : Boolean(state.intent && state.consent && state.name && state.phone && state.location && state.availability);
  return { ...state, ready };
}

function buildAssistantReply(state: IntakeState): string {
  if (!state.intent) {
    return "Te puedo ayudar con primera visita, higiene, blanqueamiento, ortodoncia invisible, implantes o urgencias. Dime que tratamiento te interesa y te doy una orientacion con los limites de la clinica.";
  }

  const catalog = intentCatalog[state.intent];
  const intro = `${catalog.advice} El importe es orientativo y queda pendiente de valoracion del doctor.`;
  const financing = state.intent === "implant_price" || state.intent === "orthodontics"
    ? " Tambien puedo explicar financiacion hasta 24 meses segun importe y aprobacion."
    : "";

  if (state.escalated) {
    if (!state.consent) {
      return `${intro} Para registrar tus datos y que recepcion te llame con prioridad necesito que confirmes si aceptas el tratamiento de datos. Si hay fiebre, sangrado abundante o empeora rapido, llama a la clinica o acude a urgencias.`;
    }
    if (!state.name) {
      return `${intro} Para escalarlo ahora, dime tu nombre. Si hay fiebre, sangrado abundante o empeora rapido, llama a la clinica o acude a urgencias.`;
    }
    if (!state.phone) {
      return `${state.name}, necesito un telefono para que recepcion te contacte con prioridad.`;
    }
    return `${state.name}, dejo registrada la urgencia para llamada prioritaria en ${state.phone}. No cierro diagnostico por chat; recepcion lo pasa a humano y el doctor valorara el caso.`;
  }

  if (!state.consent) {
    return `${intro}${financing} Antes de tomar datos para pre-reservar cita, necesito que me confirmes si aceptas que guardemos tus datos para gestionar la solicitud.`;
  }
  if (!state.name) {
    return `${intro}${financing} Perfecto, con tu consentimiento puedo preparar la cita. Dime tu nombre y apellidos.`;
  }
  if (!state.phone) {
    return `${state.name}, dime un telefono de contacto para confirmar la cita y enviarte recordatorio.`;
  }
  if (!state.location) {
    return `${state.name}, trabajamos en ${demoKnowledge.clinic.locations.join(" y ")}. Que sede prefieres para esta valoracion?`;
  }
  if (!state.availability) {
    return `Para ${state.treatmentNeed} en ${state.location}, puedo dejar una pre-reserva. Que franja te va mejor: manana, tarde o un dia concreto esta semana?`;
  }

  return `${state.name}, pre-reserva lista para ${state.treatmentNeed} en ${state.location}, franja ${state.availability}. Presupuesto aproximado: ${state.budget}, siempre pendiente de valoracion del doctor. Te llamaremos en ${state.phone} para confirmar el hueco exacto.`;
}

function detectDemoIntent(normalized: string): DemoIntentId | undefined {
  if (/(dolor|duele|inflamad|hinchad|urgenc|sangr|trauma|golpe|roto)/.test(normalized)) {
    return "urgent_pain";
  }
  if (/(implante|tornillo|pieza perdida|muela perdida)/.test(normalized)) {
    return "implant_price";
  }
  if (/(blanque|boda|dientes blancos|estetic)/.test(normalized)) {
    return "whitening";
  }
  if (/(limpieza|higiene|sarro|revisar encia)/.test(normalized)) {
    return "reactivation";
  }
  if (/(ortodoncia|alineador|invisible|brackets)/.test(normalized)) {
    return "orthodontics";
  }
  if (/(primera visita|revision|revisar|cita|valoracion)/.test(normalized)) {
    return "first_visit";
  }
  return undefined;
}

function extractName(text: string) {
  const match = text.match(/\b(?:me llamo|mi nombre es)\s+([^,.;]+)/i) ?? text.match(/\bsoy\s+(?!de\b)([^,.;]+)/i);
  if (!match?.[1]) {
    return "";
  }
  return match[1].replace(/\s+y\s+.*/i, "").trim().slice(0, 48);
}

function extractPhone(text: string) {
  const match = text.match(/(?:\+?34[\s.-]?)?[6789](?:[\s.-]?\d){8}/);
  return match ? match[0].replace(/[^\d+]/g, "") : "";
}

function extractLocation(normalized: string) {
  if (normalized.includes("elche")) {
    return "Elche - Altabix";
  }
  if (normalized.includes("murcia")) {
    return "Murcia centro";
  }
  return "";
}

function extractAvailability(normalized: string, raw: string) {
  const dayMatch = normalized.match(/\b(lunes|martes|miercoles|jueves|viernes|manana|tarde|esta semana|proxima semana)\b/);
  const timeMatch = raw.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/);
  const parts = [dayMatch?.[0], timeMatch?.[0]].filter(Boolean);
  return parts.join(" ").trim();
}

function acceptsConsent(normalized: string) {
  const value = normalized.trim();
  return /(\bacepto\b|\bautorizo\b|\bconsiento\b|de acuerdo|\bok\b|\bvale\b)/.test(value) || /^si[,.! ]?$/.test(value);
}

function buildSummary(state: IntakeState) {
  if (!state.intent) {
    return "Esperando intencion del paciente.";
  }
  if (state.escalated) {
    return state.ready ? "Urgencia escalada con datos minimos." : "Urgencia detectada. Faltan datos de contacto.";
  }
  if (state.ready) {
    return "Pre-reserva lista con presupuesto orientativo y cita pendiente de confirmacion.";
  }
  return "Asesorando y recogiendo consentimiento, contacto, sede y disponibilidad.";
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
