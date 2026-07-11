export type SchedulingRequestKind = "cancel" | "reschedule";

const CANCEL_PATTERNS = [/\bcancela/i, /\bcancelar\b/i, /\banula/i, /\banular\b/i, /no voy a poder ir/i, /ya no puedo ir/i];
const RESCHEDULE_PATTERNS = [
  /cambiar\s+(la\s+)?cita/i,
  /reprogramar/i,
  /mover\s+la\s+cita/i,
  /posponer/i,
  /aplazar\s+la\s+cita/i
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
  return null;
}
