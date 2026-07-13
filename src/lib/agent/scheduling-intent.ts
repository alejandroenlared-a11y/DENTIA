export type SchedulingRequestKind = "cancel" | "reschedule" | "query";

const CANCEL_PATTERNS = [/\bcancela/i, /\bcancelar\b/i, /\banula/i, /\banular\b/i, /no voy a poder ir/i, /ya no puedo ir/i];
const RESCHEDULE_PATTERNS = [
  /cambiar\s+(la\s+)?cita/i,
  /reprogramar/i,
  /mover\s+la\s+cita/i,
  /posponer/i,
  /aplazar\s+la\s+cita/i
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
