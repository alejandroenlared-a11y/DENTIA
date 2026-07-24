export type SchedulingRequestKind = "cancel" | "reschedule" | "query";

const CANCEL_PATTERNS = [/\bcancela/i, /\bcancelar\b/i, /\banula/i, /\banular\b/i, /no voy a poder ir/i, /ya no puedo ir/i];
const RESCHEDULE_PATTERNS = [
  /cambiar\s+(la\s+)?cita/i,
  /reprogramar/i,
  /mover\s+la\s+cita/i,
  /posponer/i,
  /aplazar\s+la\s+cita/i,
  // El paciente pide cambiar la fecha/hora sin decir la palabra "cita"
  // (p.ej. tras una pre-reserva: "no me viene bien el 15 de julio, lo
  // puedo cambiar?"). Sin esto, el mensaje caia al cierre generico del
  // motor local en vez de ofrecer huecos alternativos.
  /no\s+me\s+viene\s+bien/i,
  /me\s+viene\s+mal/i,
  /puedo\s+cambiar(lo|la|los|las)?\b/i,
  // Codex (cierre de pre-reserva, Caso C): "Quiero cambiarla" tras la
  // pre-reserva - sin "de dia/fecha/hora" ni la palabra "cita" - caia fuera
  // de todos los patrones anteriores y se trataba como cierre generico en
  // vez de reabrir el flujo de cambio.
  /quiero\s+cambiar(lo|la|los|las)?\b/i,
  /cambiar(lo|la)?\s+de\s+(dia|fecha|hora)/i,
  /hay\s+otro\s+dia/i,
  /otro\s+dia\s+(o\s+)?(hora|horario)/i
];
// El paciente pregunta por la fecha/hora de una cita ya confirmada (p.ej.
// tras una pre-reserva vaga como "franja manana"): responder con el dato
// real en vez del mensaje generico de cierre.
const QUERY_PATTERNS = [
  /para\s+cuando\s+es/i,
  /que\s+dia\s+es\s+(la\s+cita|mi\s+cita|la\s+visita)/i,
  /cuando\s+es\s+(mi\s+cita|la\s+cita|mi\s+visita|la\s+visita)/i,
  /a\s+que\s+hora\s+es\s+(mi\s+cita|la\s+cita)/i,
  /cuando\s+tengo\s+(la\s+)?cita/i
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function detectSchedulingRequest(body: string): SchedulingRequestKind | null {
  const text = normalize(body);
  if (RESCHEDULE_PATTERNS.some(pattern => pattern.test(text))) {
    return "reschedule";
  }
  if (CANCEL_PATTERNS.some(pattern => pattern.test(text))) {
    return "cancel";
  }
  if (QUERY_PATTERNS.some(pattern => pattern.test(text))) {
    return "query";
  }
  return null;
}
