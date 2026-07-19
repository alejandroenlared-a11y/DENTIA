export type AgentIntent = "URGENCIA" | "CITA" | "PRECIO" | "HORARIO" | "SALUDO" | "OTRO";

interface IntentRule {
  intent: AgentIntent;
  keywords: string[];
}

const rules: IntentRule[] = [
  {
    intent: "URGENCIA",
    keywords: ["dolor", "duele", "urgencia", "urgente", "sangr", "inflam", "roto", "rota", "caido", "caida", "golpe", "flemon", "hinchado", "hinchada"]
  },
  {
    intent: "CITA",
    keywords: ["cita", "reservar", "agendar", "hueco", "visita", "consulta", "revision", "cancelar", "cambiar la cita"]
  },
  {
    intent: "PRECIO",
    keywords: ["precio", "cuanto", "coste", "costo", "presupuesto", "financiacion", "financiar", "pagar", "tarifa"]
  },
  {
    intent: "HORARIO",
    keywords: ["horario", "abierto", "abris", "cerrais", "cierran", "agosto", "festivo", "sabado", "domingo"]
  },
  {
    intent: "SALUDO",
    keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"]
  }
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function detectIntent(body: string): AgentIntent {
  const text = normalize(body);
  for (const rule of rules) {
    if (rule.keywords.some(keyword => text.includes(keyword))) {
      return rule.intent;
    }
  }
  return "OTRO";
}

export interface ReplyContext {
  assistantName: string;
  clinicName: string;
  clinicPhone?: string | null;
  treatments: Array<{ name: string; priceCents: number | null }>;
}

export function buildReply(intent: AgentIntent, ctx: ReplyContext): string {
  switch (intent) {
    case "URGENCIA":
      return (
        `Siento que tengas molestias. He avisado ahora mismo al equipo de ${ctx.clinicName} para que te atienda una persona con prioridad. ` +
        `Si el dolor es intenso o hay sangrado abundante, llama directamente${ctx.clinicPhone ? ` al ${ctx.clinicPhone}` : " a la clinica"}. ` +
        `Soy ${ctx.assistantName}, un asistente virtual, y no puedo valorar sintomas clinicos.`
      );
    case "CITA":
      return (
        `Encantada de ayudarte a reservar. La primera visita con valoracion es a coste cero. ` +
        `Dime que dia y franja te viene mejor (manana o tarde) y te propongo hueco.`
      );
    case "PRECIO": {
      const priced = ctx.treatments.filter(treatment => treatment.priceCents !== null).slice(0, 3);
      const list = priced
        .map(treatment => `${treatment.name}: ${((treatment.priceCents ?? 0) / 100).toFixed(0)} EUR`)
        .join(" · ");
      return (
        `Te oriento con precios autorizados${list ? ` (${list})` : ""}. ` +
        `Para un presupuesto exacto necesitamos una valoracion previa, que es gratuita en la primera visita. ` +
        `Ademas hay financiacion hasta 24 meses sin intereses. Quieres que te reserve esa primera visita?`
      );
    }
    case "HORARIO":
      return (
        `Atendemos con cita previa de lunes a viernes en horario de manana y tarde. ` +
        `Aunque la clinica este cerrada en algun periodo, yo estoy disponible 24/7 para reservarte hueco en la primera fecha posible. ` +
        `Te busco una?`
      );
    case "SALUDO":
      return (
        `Hola! Soy ${ctx.assistantName}, el asistente virtual de ${ctx.clinicName}. ` +
        `Puedo reservarte una primera visita gratuita, informarte de tratamientos y precios orientativos o avisar al equipo. En que te ayudo?`
      );
    default:
      return (
        `Gracias por escribir a ${ctx.clinicName}. Soy ${ctx.assistantName}, asistente virtual. ` +
        `Puedo ayudarte con citas, precios orientativos y horarios. Si prefieres hablar con una persona, dimelo y aviso a recepcion.`
      );
  }
}

export function shouldEscalate(intent: AgentIntent): boolean {
  return intent === "URGENCIA";
}
