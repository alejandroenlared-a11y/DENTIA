import { demoKnowledge, type DemoScenarioId } from "@/lib/agent/demo-data";
import type { BookingStatus, ConversationStatus } from "@/lib/agent/dental-agent-types";

export type DentalIntentId =
  | DemoScenarioId
  | "cosmetic_dentistry"
  | "orthodontics"
  | "endodontics"
  | "caries_restoration"
  | "periodontics"
  | "prosthetics"
  | "wisdom_tooth"
  | "tmj_bruxism"
  | "trauma";

export type TriageLevel = "EMERGENCY" | "URGENT_24H" | "PRIORITY_72H" | "ROUTINE" | "ESTHETIC";

export type DentalAgentState = {
  intent?: DentalIntentId;
  intentCode: string;
  treatmentNeed: string;
  budget: string;
  estimatedValue: number;
  escalated: boolean;
  consent: boolean;
  name: string;
  phone: string;
  email: string;
  location: string;
  availability: string;
  offeredAvailabilityOptions: string[];
  ready: boolean;
  triageLevel: TriageLevel;
  triageLabel: string;
  clinicalReading: string;
  likelyCauses: string[];
  detectedSignals: string[];
  redFlags: string[];
  missingClinicalData: string[];
  confidence: "Baja" | "Media" | "Alta";
  safetyScreened: boolean;
  requiresGuardian: boolean;
  dataErasureRequested: boolean;
  // Fase 4 (correccion): antes solo existian como campos calculados en
  // DentalAgentApiTurn (dental-agent-router.ts), nunca en el estado que de
  // verdad viaja/persiste entre turnos (ver dentalAgentStateSchema en
  // openai-dental-agent.ts). Ahora son parte real de DentalAgentState:
  // bookingStatus se recalcula cada turno (computeBookingStatus, deriva de
  // datos ya presentes: consent/nombre/telefono/sede/disponibilidad/ready) y
  // conversationStatus SOLO lo escribe dental-agent-router.ts (necesita
  // conversationIntent, que este motor no calcula) - aqui simplemente viaja
  // sin tocarse turno a turno hasta que el router decide su valor nuevo.
  bookingStatus: BookingStatus;
  conversationStatus: ConversationStatus;
  // Marca que ya se emitio el mensaje especifico de cierre (estado real de la
  // reserva) al menos una vez, para no repetirlo en agradecimientos
  // posteriores (ver buildDentalReply, bloque state.ready).
  closureAcknowledged: boolean;
  // Hotfix dental-negation-context: identifica de forma semantica (no por
  // texto literal) cual fue la ULTIMA pregunta clinica/de seguridad que
  // Clara hizo, para que resolveAnswerToLastClinicalQuestion (mas abajo)
  // pueda interpretar una respuesta corta ("no, nada de eso", "es poco")
  // en funcion de que se pregunto, no solo del texto suelto del paciente.
  // "" cuando el ultimo turno no hizo ninguna de estas preguntas fijas.
  lastQuestionKey: string;
  // Hotfix dental-negation-context (Problema 2): resolver sangrado
  // leve/abundante + presencia/ausencia de golpe (bleeding_severity_or_impact)
  // ya NO basta por si solo para dar el cribado de seguridad por completo -
  // todavia falta preguntar fiebre/hinchazon/pus/dificultad para abrir o
  // tragar. Este flag distingue "la diferencial de sangrado esta resuelta" de
  // "el cribado de seguridad completo esta resuelto" (safetyScreened).
  bleedingDifferentialResolved: boolean;
  // Hotfix dental-negation-context (Problema 1/3): identifica de forma
  // semantica cual fue la ULTIMA pregunta/oferta que Clara hizo (mirroring de
  // lastQuestionKey pero para el flujo completo de reserva, no solo las
  // preguntas clinicas), para interpretar correctamente una respuesta corta
  // ("si"/"no, gracias") segun el contexto real, no solo por texto suelto.
  // Tipado como string (no LastAssistantAction) por el mismo motivo que
  // lastQuestionKey: viaja serializado via Zod (dentalAgentStateSchema) y
  // estados antiguos persistidos no garantizan un valor del enum.
  lastAssistantAction: string;
  // Una vez completado el triaje de seguridad, Clara ofrece ayuda para pedir
  // cita ANTES de pedir consentimiento (nunca en el mismo turno). Estos dos
  // flags son sticky: una vez el paciente acepta o declina esa oferta, la
  // decision se recuerda en toda la conversacion.
  appointmentHelpAccepted: boolean;
  appointmentHelpDeclined: boolean;
};

export type LastAssistantAction =
  | ""
  | "ASK_CLINICAL_SAFETY"
  | "OFFER_APPOINTMENT_HELP"
  | "ASK_PRIVACY_CONSENT"
  | "ASK_NAME"
  | "ASK_EMAIL"
  | "ASK_PHONE"
  | "ASK_LOCATION"
  | "OFFER_SLOTS";

export type DentalAgentTurn = {
  state: DentalAgentState;
  reply: string;
};

type IntentProfile = {
  title: string;
  intentCode: string;
  treatmentNeed: string;
  budget: string;
  estimatedValue: number;
  defaultTriage: TriageLevel;
  likelyCauses: string[];
  clinicalReading: string;
  priceNote: string;
};

export const initialDentalAgentState: DentalAgentState = {
  intentCode: "INTENCION_PENDIENTE",
  treatmentNeed: "Pendiente de clasificar",
  budget: "Pendiente",
  estimatedValue: 0,
  escalated: false,
  consent: false,
  name: "",
  phone: "",
  email: "",
  location: "",
  availability: "",
  offeredAvailabilityOptions: [],
  ready: false,
  triageLevel: "ROUTINE",
  triageLabel: "Pendiente",
  clinicalReading: "Esperando descripción del paciente.",
  likelyCauses: [],
  detectedSignals: [],
  redFlags: [],
  missingClinicalData: [],
  confidence: "Baja",
  safetyScreened: false,
  requiresGuardian: false,
  dataErasureRequested: false,
  bookingStatus: "IDLE",
  conversationStatus: "ACTIVE",
  closureAcknowledged: false,
  lastQuestionKey: "",
  bleedingDifferentialResolved: false,
  lastAssistantAction: "",
  appointmentHelpAccepted: false,
  appointmentHelpDeclined: false
};

// Intents que exigen cribado clinico de seguridad antes de poder ofrecer
// ayuda con la cita (Problema 1/3): el resto (administrativos, presupuesto,
// primera visita sin sintomas...) sigue yendo directo a consentimiento como
// hasta ahora, sin este paso intermedio.
const CLINICAL_SAFETY_INTENTS: DentalIntentId[] = [
  "urgent_pain",
  "endodontics",
  "wisdom_tooth",
  "trauma",
  "caries_restoration",
  "periodontics"
];

export const intentProfiles: Record<DentalIntentId, IntentProfile> = {
  first_visit: {
    title: "Primera visita",
    intentCode: "CITA_PRIMERA_VISITA",
    treatmentNeed: "Primera visita y diagnóstico digital",
    budget: "0 EUR",
    estimatedValue: 35000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["revisión general", "molestia sin clasificar", "valoración preventiva"],
    clinicalReading: "Puede encajar con una primera valoración para revisar el estado de una pieza o resolver dudas.",
    priceNote: "La primera visita y diagnóstico digital es sin coste."
  },
  urgent_pain: {
    title: "Dolor / infección",
    intentCode: "TRIAJE_DOLOR_INFECCION",
    treatmentNeed: "Urgencia dental",
    budget: "desde 70 EUR",
    estimatedValue: 22000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pulpitis", "absceso dental", "fisura", "infección periodontal", "pericoronaritis"],
    clinicalReading:
      "Los síntomas de dolor intenso, dolor pulsátil, hinchazon o mal sabor pueden sugerir inflamación o infección odontógena. Requiere valoración prioritaria.",
    priceNote: "La urgencia dental parte desde 70 EUR; el tratamiento definitivo depende de la exploración."
  },
  implant_price: {
    title: "Implante",
    intentCode: "IMPLANTE_PROTESIS_VALORACION",
    treatmentNeed: "Implante unitario",
    budget: "desde 1.200 EUR",
    estimatedValue: 120000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["ausencia de pieza", "pieza no restaurable", "rehabilitación con implante", "prótesis sobre implante"],
    clinicalReading:
      "Si falta una pieza o esta pendiente de extracción, conviene valorar hueso, encia, mordida y un estudio de imagen (TAC/escáner 3D) antes de cerrar presupuesto; en casos con poco hueso puede requerir injerto previo.",
    priceNote: "El implante unitario parte desde 1.200 EUR y puede financiarse hasta 24 meses según aprobación."
  },
  whitening: {
    title: "Blanqueamiento",
    intentCode: "ESTETICA_BLANQUEAMIENTO",
    treatmentNeed: "Blanqueamiento",
    budget: "desde 280 EUR",
    estimatedValue: 28000,
    defaultTriage: "ESTHETIC",
    likelyCauses: ["tratamiento estético", "tinción dental", "evento próximo", "mantenimiento de sonrisa"],
    clinicalReading:
      "El blanqueamiento puede ser una buena opción estética, pero antes se revisa sensibilidad, encia, caries y restauraciones visibles (las fundas/empastes no cambian de color).",
    priceNote: "El blanqueamiento empieza desde 280 EUR, pendiente de valorar sensibilidad y estado oral."
  },
  cosmetic_dentistry: {
    title: "Estética dental",
    intentCode: "ESTETICA_DENTAL_VALORACION",
    treatmentNeed: "Estética dental",
    budget: "valoración sin coste",
    estimatedValue: 85000,
    defaultTriage: "ESTHETIC",
    likelyCauses: ["mejora de sonrisa", "color dental", "forma dental", "diseño de sonrisa"],
    clinicalReading:
      "En estética dental puede valorarse blanqueamiento, carillas, restauraciones estéticas de composite o Digital Smile Design según color, forma, encia y mordida.",
    priceNote:
      "En estética dental hay varias opciones: blanqueamiento desde 280 EUR; carillas, composite estético o Digital Smile Design requieren valoración para presupuesto cerrado."
  },
  reactivation: {
    title: "Higiene / mantenimiento",
    intentCode: "HIGIENE_PERIODONCIA",
    treatmentNeed: "Higiene dental",
    budget: "55 EUR",
    estimatedValue: 5500,
    defaultTriage: "ROUTINE",
    likelyCauses: ["mantenimiento periodontal", "sarro", "gingivitis", "revisión preventiva"],
    clinicalReading:
      "Una higiene puede resolver sarro y sangrado leve, pero si hay sangrado frecuente, movilidad o mal aliento persistente conviene valorar periodoncia.",
    priceNote: "La higiene dental dura unos 45 minutos y tiene precio orientativo de 55 EUR."
  },
  orthodontics: {
    title: "Ortodoncia",
    intentCode: "ORTODONCIA_ESTUDIO",
    treatmentNeed: "Ortodoncia",
    budget: "desde 1.800 EUR",
    estimatedValue: 180000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["apinamiento", "malposición dental", "mordida abierta/cruzada", "recidiva tras ortodoncia"],
    clinicalReading:
      "La ortodoncia requiere estudio digital para confirmar si encajan alineadores invisibles, brackets Damon u otra opción, duración aproximada y presupuesto cerrado. En niños puede valorarse ortopedia funcional para guiar el crecimiento.",
    priceNote:
      "La ortodoncia parte desde 1.800 EUR en casos sencillos; brackets, Damon u ortodoncia invisible se confirman tras estudio digital."
  },
  endodontics: {
    title: "Endodoncia / nervio",
    intentCode: "DOLOR_PULPAR_ENDODONCIA",
    treatmentNeed: "Endodoncia",
    budget: "desde 220 EUR",
    estimatedValue: 42000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pulpitis irreversible", "infección periapical", "caries profunda", "fractura con afectación pulpar"],
    clinicalReading:
      "Dolor espontáneo, nocturno, pulsátil o sensibilidad que tarda en calmar puede apuntar a afectación del nervio. Necesita valoración prioritaria.",
    priceNote: "La endodoncia parte desde 220 EUR, pendiente de radiografía, pieza afectada y complejidad."
  },
  caries_restoration: {
    title: "Caries / empaste",
    intentCode: "CARIES_RESTAURACION",
    treatmentNeed: "Empaste / conservadora",
    budget: "desde 65 EUR",
    estimatedValue: 11000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["caries", "filtración de empaste", "fisura", "sensibilidad dentinaria"],
    clinicalReading:
      "Dolor breve con frio, dulce o al morder puede relacionarse con caries, filtración de empaste o sensibilidad. Conviene revisar antes de que avance.",
    priceNote: "El empaste parte desde 65 EUR, pendiente de tamano y profundidad de la lesión."
  },
  periodontics: {
    title: "Encias / periodoncia",
    intentCode: "PERIODONCIA_ENCIAS",
    treatmentNeed: "Periodoncia",
    budget: "desde 90 EUR",
    estimatedValue: 22000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["gingivitis", "periodontitis", "sarro subgingival", "inflamación periodontal"],
    clinicalReading:
      "Sangrado de encias, mal aliento, retracción o movilidad pueden sugerir inflamación gingival o periodontal. Requiere exploración y sondaje; si se confirma periodontitis, el mantenimiento profesional pasa a ser cada 3 meses de forma indefinida.",
    priceNote: "La valoración periodontal parte desde 90 EUR según prueba y tratamiento necesario."
  },
  prosthetics: {
    title: "Corona / prótesis",
    intentCode: "PROTESIS_CORONA_DESCEMENTADA",
    treatmentNeed: "Corona / prótesis fija",
    budget: "desde 450 EUR",
    estimatedValue: 45000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["corona descementada", "fractura de corona", "empaste grande fracturado", "prótesis desajustada"],
    clinicalReading:
      "Una corona o funda que se mueve, se cae o molesta debe revisarse para evitar caries, fractura del muñón o irritación de la encía.",
    priceNote: "Una corona parte desde 450 EUR; si solo hay recementado o ajuste puede ser menos."
  },
  wisdom_tooth: {
    title: "Muela del juicio",
    intentCode: "MUELA_JUICIO_PERICORONARITIS",
    treatmentNeed: "Extracción muela del juicio",
    budget: "desde 120 EUR",
    estimatedValue: 28000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pericoronaritis", "muela incluida", "infección local", "dolor de tercer molar"],
    clinicalReading:
      "Dolor en la zona posterior, encia inflamada, mal sabor o dificultad al abrir puede encajar con inflamación alrededor de una muela del juicio.",
    priceNote: "La extracción de muela del juicio parte desde 120 EUR; depende de posición y complejidad."
  },
  tmj_bruxism: {
    title: "Bruxismo / ATM",
    intentCode: "BRUXISMO_ATM",
    treatmentNeed: "Ferula de descarga",
    budget: "desde 180 EUR",
    estimatedValue: 18000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["bruxismo", "sobrecarga mandibular", "dolor muscular", "trastorno temporomandibular"],
    clinicalReading:
      "Dolor mandibular, chasquidos, desgaste dental o cefalea al despertar pueden relacionarse con bruxismo o sobrecarga de ATM.",
    priceNote: "La ferula de descarga parte desde 180 EUR, pendiente de exploración y registros."
  },
  trauma: {
    title: "Traumatismo dental",
    intentCode: "TRAUMA_DENTAL",
    treatmentNeed: "Urgencia dental",
    budget: "desde 70 EUR",
    estimatedValue: 30000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["fractura dental", "luxación", "avulsión", "trauma de tejidos blandos"],
    clinicalReading:
      "Un golpe, diente roto, diente que se mueve o sangrado tras traumatismo requiere valoración urgente para conservar la pieza y controlar tejidos blandos.",
    priceNote: "La urgencia parte desde 70 EUR; el tratamiento depende de radiografía y tipo de trauma."
  }
};

const redFlagPatterns = [
  { label: "dificultad para respirar", pattern: /(no puedo respirar|dificultad.*respirar|me cuesta respirar|ahogo|asfixia)/ },
  { label: "dificultad para tragar o hablar", pattern: /(dificultad.*tragar|no puedo tragar|me cuesta tragar|dificultad.*hablar|no puedo hablar)/ },
  { label: "hinchazon en cuello, boca u ojo", pattern: /(cuello hinchado|ojo hinchado|hinchazon.*ojo|boca hinchada|suelo de la boca|cara muy hinchada)/ },
  { label: "sangrado no controlado", pattern: /(sangra mucho|sangrado abundante|no para de sangrar|hemorragia)/ },
  { label: "fiebre o mal estado general", pattern: /(fiebre|decimas|mal cuerpo|escalofrios|me encuentro fatal)/ },
  { label: "dificultad para abrir la boca", pattern: /(no puedo abrir|me cuesta abrir|trismus|mandibula bloqueada)/ }
];

const signalPatterns = [
  { label: "dolor intenso", pattern: /(dolor fuerte|mucho dolor|dolor intenso|insoportable|me duele mucho|dolor 8|dolor 9|dolor 10)/ },
  { label: "dolor pulsátil/nocturno", pattern: /(late|pulsatil|palpita|por la noche|me despierta|espontaneo|sin tocar)/ },
  { label: "dolor al morder", pattern: /(al morder|cuando mastico|masticar|presion|al cerrar)/ },
  { label: "sensibilidad al frio/calor", pattern: /(frio|calor|helado|bebida fria|bebida caliente|sensibilidad)/ },
  { label: "inflamación", pattern: /(inflamad|inflamacion|hinchad|bulto|flemon|absceso|pus|mal sabor)/ },
  { label: "sangrado de encias", pattern: /(sangran las encias|sangrado de encias|encia sangra|sangra al cepillar|sangrado|sangra)/ },
  { label: "movilidad dental", pattern: /(se me mueve|se mueve|movilidad|diente flojo|muela floja)/ },
  { label: "pieza rota o funda", pattern: /(roto|fractur|funda|corona|empaste|se ha caido|caido)/ },
  { label: "pieza ausente", pattern: /(me falta|perdi una pieza|sin muela|sin diente|implante)/ },
  { label: "estética", pattern: /(blanque|estetica|boda|sonrisa|dientes blancos)/ },
  { label: "ortodoncia", pattern: /(ortodoncia|alineador|invisible|brackets|apinado|apinamiento|mordida)/ },
  { label: "bruxismo/atm", pattern: /(bruxismo|aprieto|rechino|chasquido|mandibula|atm|dolor de cabeza)/ },
  { label: "muela del juicio", pattern: /(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/ }
];

// Hotfix dental-negation-context: fallo real en produccion - "no, nada de
// eso" tras la pregunta de seguridad repetia la misma pregunta indefinidamente
// (ningun patron de detectSafetyScreen reconoce una negacion generica sin
// palabra clave), y "no he recibido ningun golpe" no coincidia con el listado
// cerrado de isTraumaNegated ("sin golpe"/"no ha sido golpe"/...), asi que
// "golpe" seguia detectandose como afirmado y el intent saltaba a trauma.
// Estas funciones sustituyen las listas de frases cerradas por una deteccion
// de negacion por clausula, genuinamente general.
export type ClinicalSignalKey =
  | "fever"
  | "swelling"
  | "pus"
  | "swallowingDifficulty"
  | "breathingDifficulty"
  | "openingDifficulty"
  | "bleedingUncontrolled"
  | "trauma";

// Solo las señales de "negacion simple" (no tengo/hay X => X ausente) usan el
// algoritmo generico por clausula. tragar/respirar/abrir quedan fuera: su
// forma AFIRMATIVA real ("no puedo respirar") contiene literalmente "no",
// asi que un escaneo generico de negacion las cancelaria a si mismas (bug
// real ya detectado antes en isNegatedLabel - ver DIFFICULTY_SIGNAL_RULES).
const SIMPLE_NEGATION_SIGNAL_PATTERNS: Record<"fever" | "swelling" | "pus" | "bleedingUncontrolled" | "trauma", RegExp> = {
  fever: /fiebre|decimas|escalofrios/,
  swelling: /hinchaz/,
  pus: /\bpus\b|flemon|absceso/,
  bleedingUncontrolled: /sangr/,
  trauma: /golpe|traumatismo|me golpee|\baccidente\b|\bcaida\b/
};

// tragar/respirar/abrir: "no puedo X" ES la afirmacion (hay dificultad real),
// no una negacion - necesitan reglas dedicadas de afirmacion/via libre en vez
// del escaneo generico de negacion de arriba.
const DIFFICULTY_SIGNAL_RULES: Record<
  "breathingDifficulty" | "swallowingDifficulty" | "openingDifficulty",
  { affirmed: RegExp; allClear: RegExp }
> = {
  breathingDifficulty: {
    allClear: /(?<!no )puedo respirar|sin dificultad para respirar|respiro bien|no (tengo|hay) dificultad.*respirar/,
    affirmed: /no puedo respirar|dificultad.*respirar|me cuesta respirar|\bahogo\b|asfixia/
  },
  swallowingDifficulty: {
    allClear:
      /(?<!no )puedo tragar|trago bien|tragar bien|sin dificultad.*tragar|tragar.*sin dificultad|no me cuesta tragar|no (tengo|hay) dificultad.*tragar/,
    affirmed: /no puedo tragar|dificultad.*tragar|me cuesta tragar/
  },
  openingDifficulty: {
    allClear:
      /(?<!no )puedo abrir|abro bien|sin dificultad.*abrir|abrir.*sin dificultad|no me cuesta abrir|no (tengo|hay) dificultad.*abrir/,
    affirmed: /no puedo abrir|dificultad.*abrir|me cuesta abrir|mandibula bloqueada|trismus|cuesta abrir/
  }
};

// Separa el mensaje en clausulas cortas (coma/punto/conjuncion "pero") para
// que una negacion en una clausula ("no tengo fiebre") no contamine una
// afirmacion real en otra clausula del mismo mensaje ("pero si tengo
// hinchazon" ya queda en su propia clausula).
const CLAUSE_SPLIT_PATTERN = /[.,;!¡¿?]+|\bpero\b/;
// "ni" incluido: bug real (CASO F) - "hinchazon ni pus" sin "ni" aqui no se
// reconocia como negacion (solo la primera clausula, "no tengo fiebre",
// tenia "no"), y la segunda clausula afirmaba hinchazon/pus por defecto.
const NEGATION_CUE_PATTERN = /\b(no|ningun[oa]?|nada|sin|tampoco|nunca|ni)\b/;
const AFFIRMATION_OVERRIDE_PATTERN = /\b(si|sí)\b/;

export type ClinicalSignalExtraction = {
  affirmed: ClinicalSignalKey[];
  negated: ClinicalSignalKey[];
  unknown: ClinicalSignalKey[];
};

// Deteccion de señales clinicas afirmadas/negadas por clausula - reemplaza el
// enfoque anterior de "la palabra aparece => la señal es real" (que ignoraba
// cualquier negacion no prevista en una lista cerrada de frases).
export function extractAffirmedAndNegatedClinicalSignals(message: string): ClinicalSignalExtraction {
  const normalized = normalize(message);
  const clauses = normalized
    .split(CLAUSE_SPLIT_PATTERN)
    .map(clause => clause.trim())
    .filter(Boolean);
  const affirmed = new Set<ClinicalSignalKey>();
  const negated = new Set<ClinicalSignalKey>();
  const simpleKeys = Object.keys(SIMPLE_NEGATION_SIGNAL_PATTERNS) as Array<keyof typeof SIMPLE_NEGATION_SIGNAL_PATTERNS>;

  for (const clause of clauses) {
    const clauseHasNegation = NEGATION_CUE_PATTERN.test(clause);
    const clauseHasAffirmationOverride = AFFIRMATION_OVERRIDE_PATTERN.test(clause);
    for (const key of simpleKeys) {
      if (!SIMPLE_NEGATION_SIGNAL_PATTERNS[key].test(clause)) continue;
      if (clauseHasNegation) {
        negated.add(key);
      } else {
        affirmed.add(key);
      }
      if (clauseHasAffirmationOverride && !clauseHasNegation) {
        affirmed.add(key);
      }
    }
  }
  // Si la misma señal aparece afirmada en otra clausula del mismo mensaje
  // ("no tengo fiebre, pero si tengo hinchazon" - dos clausulas, cada una con
  // su propia señal), la afirmacion real gana sobre cualquier negacion.
  for (const key of affirmed) negated.delete(key);

  // tragar/respirar/abrir: reglas dedicadas sobre el mensaje completo (su via
  // libre real, "puedo respirar", ya contiene la palabra sin negacion previa
  // que el escaneo por clausula pudiera usar de forma fiable).
  const difficultyKeys = Object.keys(DIFFICULTY_SIGNAL_RULES) as Array<keyof typeof DIFFICULTY_SIGNAL_RULES>;
  for (const key of difficultyKeys) {
    const rules = DIFFICULTY_SIGNAL_RULES[key];
    if (rules.allClear.test(normalized)) {
      negated.add(key);
    } else if (rules.affirmed.test(normalized)) {
      affirmed.add(key);
    }
  }

  const signalKeys = [...simpleKeys, ...difficultyKeys];
  const unknown = signalKeys.filter(key => !affirmed.has(key) && !negated.has(key));
  return { affirmed: [...affirmed], negated: [...negated], unknown };
}

// "no, nada de eso" no menciona ninguna señal por su nombre: solo tiene
// sentido en el contexto de la pregunta que se acaba de hacer. Un mensaje es
// "negacion global" si, tras quitar puntuacion, todos sus tokens son
// palabras de negacion/relleno (nunca contenido clinico real).
const BARE_DENIAL_TOKENS = new Set([
  "no",
  "nada",
  "ningun",
  "ninguno",
  "ninguna",
  "tampoco",
  "nunca",
  "sin",
  "de",
  "eso",
  "y",
  "ni"
]);

function isBareDenial(normalized: string): boolean {
  const tokens = normalized
    .replace(/[^\wñ\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length > 0 && tokens.every(token => BARE_DENIAL_TOKENS.has(token));
}

function resolveBleedingLevel(normalized: string): "leve" | "abundante" | null {
  if (/(abundante|mucho|no para|no deja de sangrar|bastante)/.test(normalized)) return "abundante";
  if (/(\bpoco\b|\bleve\b|un poco)/.test(normalized)) return "leve";
  return null;
}

// Claves fijas de las preguntas clinicas/de seguridad deterministas que
// nextStep (mas abajo) puede hacer, y que señales cubre cada una - unica
// fuente de verdad para que resolveAnswerToLastClinicalQuestion sepa que
// negar/afirmar ante una respuesta corta como "no, nada de eso".
export type LastQuestionKey =
  | "safety_screen_general"
  | "trauma_initial"
  | "trauma_opening_only"
  | "trauma_swallowing_only"
  | "bleeding_severity_or_impact"
  | "";

const QUESTION_SIGNAL_MAP: Record<Exclude<LastQuestionKey, "">, ClinicalSignalKey[]> = {
  safety_screen_general: ["fever", "swelling", "pus", "swallowingDifficulty", "openingDifficulty"],
  trauma_initial: ["trauma", "openingDifficulty", "swallowingDifficulty"],
  trauma_opening_only: ["openingDifficulty"],
  trauma_swallowing_only: ["swallowingDifficulty"],
  bleeding_severity_or_impact: ["bleedingUncontrolled", "trauma"]
};

export type ResolvedClinicalAnswer = {
  affirmed: ClinicalSignalKey[];
  negated: ClinicalSignalKey[];
  resolvesSafetyScreen: boolean;
  resolvesBleedingDifferential: boolean;
};

// Fuente unica de verdad para interpretar una respuesta a la ULTIMA pregunta
// clinica/de seguridad hecha (lastQuestionKey persistido en el estado). No
// reconstruye señales por texto libre solamente: si la respuesta es una
// negacion global ("no, nada de eso"), niega TODAS las señales que esa
// pregunta concreta cubria, aunque el texto no las repita una a una.
export function resolveAnswerToLastClinicalQuestion(input: {
  patientMessage: string;
  lastQuestionKey: LastQuestionKey;
}): ResolvedClinicalAnswer {
  const normalized = normalize(input.patientMessage);
  const extraction = extractAffirmedAndNegatedClinicalSignals(input.patientMessage);
  const expectedSignals = input.lastQuestionKey ? QUESTION_SIGNAL_MAP[input.lastQuestionKey] : [];

  const negated = new Set(extraction.negated);
  const affirmed = new Set(extraction.affirmed);

  if (expectedSignals.length > 0 && isBareDenial(normalized)) {
    for (const key of expectedSignals) negated.add(key);
  }

  if (input.lastQuestionKey === "bleeding_severity_or_impact") {
    const bleedingLevel = resolveBleedingLevel(normalized);
    if (bleedingLevel === "leve") negated.add("bleedingUncontrolled");
    if (bleedingLevel === "abundante") affirmed.add("bleedingUncontrolled");
  }

  // Hotfix dental-negation-context (Problema 2): resolver sangrado leve/
  // abundante + golpe si/no NO completa por si solo el cribado general de
  // seguridad (fiebre/hinchazon/pus/dificultad abrir-tragar siguen sin
  // preguntarse) - solo cierra su propia diferencial de sangrado
  // (resolvesBleedingDifferential), nunca resolvesSafetyScreen.
  const isBleedingQuestion = input.lastQuestionKey === "bleeding_severity_or_impact";
  const resolvesSafetyScreen =
    !isBleedingQuestion &&
    expectedSignals.length > 0 &&
    expectedSignals.every(key => negated.has(key) || affirmed.has(key));
  const resolvesBleedingDifferential =
    isBleedingQuestion && expectedSignals.every(key => negated.has(key) || affirmed.has(key));

  return { affirmed: [...affirmed], negated: [...negated], resolvesSafetyScreen, resolvesBleedingDifferential };
}

// Determina que pregunta clinica/de seguridad fija hara nextStep ESTE turno
// (para persistirla como lastQuestionKey y poder interpretar la respuesta del
// paciente el turno siguiente). Replica las mismas condiciones que nextStep,
// sin duplicar el texto de las preguntas.
function identifyNextClinicalQuestionKey(
  state: Pick<
    DentalAgentState,
    "intent" | "redFlags" | "safetyScreened" | "missingClinicalData" | "escalated" | "bleedingDifferentialResolved"
  >,
  latestPatientText: string
): LastQuestionKey {
  if (state.intent === "trauma" && state.redFlags.length === 0 && !state.safetyScreened) {
    const normalized = normalize(latestPatientText);
    if (mentionsSwallowingAnswer(normalized) && !mentionsOpeningAnswer(normalized)) return "trauma_swallowing_only";
    if (mentionsOpeningAnswer(normalized) && !mentionsSwallowingAnswer(normalized)) return "trauma_opening_only";
    return "trauma_initial";
  }
  if (
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent ?? "")
  ) {
    return "safety_screen_general";
  }
  if (!state.escalated && state.missingClinicalData[0] === "El sangrado es leve o abundante, y ha empezado tras un golpe?") {
    return "bleeding_severity_or_impact";
  }
  if (!state.escalated && state.intent === "caries_restoration" && state.redFlags.length === 0 && !state.safetyScreened) {
    return "safety_screen_general";
  }
  // Hotfix dental-negation-context (Problema 2): tras resolver la diferencial
  // de sangrado/golpe en periodoncia, todavia falta la pregunta general de
  // fiebre/hinchazon/pus/dificultad antes de dar el cribado por completo.
  if (
    !state.escalated &&
    state.intent === "periodontics" &&
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    state.bleedingDifferentialResolved
  ) {
    return "safety_screen_general";
  }
  return "";
}

// Los labels de redFlagPatterns/signalPatterns que corresponden 1:1 a una
// señal clinica ya cubierta por extractAffirmedAndNegatedClinicalSignals -
// una negacion detectada alli nunca puede dejar pasar el label equivalente
// aqui, aunque isNegatedLabel (mas abajo, frases cerradas) no la reconozca.
const REDFLAG_LABEL_TO_SIGNAL_KEY: Record<string, ClinicalSignalKey> = {
  "dificultad para respirar": "breathingDifficulty",
  "dificultad para tragar o hablar": "swallowingDifficulty",
  "hinchazon en cuello, boca u ojo": "swelling",
  "sangrado no controlado": "bleedingUncontrolled",
  "fiebre o mal estado general": "fever",
  "dificultad para abrir la boca": "openingDifficulty"
};

const SIGNAL_LABEL_TO_SIGNAL_KEY: Record<string, ClinicalSignalKey> = {
  inflamación: "swelling",
  "sangrado de encias": "bleedingUncontrolled"
};

function filterOutNegatedLabels(
  labels: string[],
  negated: ClinicalSignalKey[],
  labelMap: Record<string, ClinicalSignalKey>
): string[] {
  if (negated.length === 0) return labels;
  return labels.filter(label => {
    const key = labelMap[label];
    return !key || !negated.includes(key);
  });
}

// Transparencia obligatoria (AI Act): si preguntan directamente si es humana,
// se responde siempre que no, sin ambiguedad. Esto se ANADE a la respuesta
// que tocaria de todas formas: no sustituye el triaje. Si el mismo mensaje
// trae una emergencia real ("no puedo respirar, eres humana?"), el escalado
// y la pregunta de seguridad se procesan con normalidad y la revelación se
// antepone al aviso de urgencia (bug real detectado en revisión: la versión
// anterior devolvia el estado congelado y se saltaba por completo el
// triaje de banderas rojas para ese mensaje). Capa de seguridad además de la
// instruccion en el prompt del LLM: funciona incluso si Gemini/OpenAI no
// estan disponibles.
const IDENTITY_QUESTION_PATTERN =
  /(eres (una persona|un humano|humana|human|real)|hablo con (un humano|una persona)|(eres|sois) (un bot|un robot|una ia|inteligencia artificial)|es usted (una persona|un humano))/;
const IDENTITY_DISCLOSURE =
  "No, no soy humana, soy la asistente de inteligencia artificial de la clínica. Te ayudo igual que en recepción.";

export function runDentalSeniorTurn(current: DentalAgentState, rawText: string, lastAssistantMessage?: string): DentalAgentTurn {
  const text = rawText.trim();
  const normalized = normalize(text);
  const asksIdentity = IDENTITY_QUESTION_PATTERN.test(normalized);
  // PR #11 (fix "la tercera"): mismo contexto que usa el router para gatear
  // ordinales en texto libre - aqui resuelve la seleccion real, no solo la
  // clasificacion de conversationIntent.
  const assistantOfferedSlotsLastTurn = Boolean(lastAssistantMessage && jumpsToBookingOptions(lastAssistantMessage));

  // Hotfix dental-negation-context: interpreta ESTE mensaje en el contexto de
  // la ultima pregunta clinica/de seguridad real (current.lastQuestionKey,
  // persistida el turno anterior) antes de derivar cualquier señal por texto
  // suelto - "no, nada de eso" no repite ninguna palabra clave, solo tiene
  // sentido sabiendo que se pregunto.
  const clinicalAnswer = resolveAnswerToLastClinicalQuestion({
    patientMessage: text,
    lastQuestionKey: (current.lastQuestionKey || "") as LastQuestionKey
  });
  const messageRedFlags = filterOutNegatedLabels(
    detectLabels(normalized, redFlagPatterns),
    clinicalAnswer.negated,
    REDFLAG_LABEL_TO_SIGNAL_KEY
  );
  const messageSignals = filterOutNegatedLabels(
    detectLabels(normalized, signalPatterns),
    clinicalAnswer.negated,
    SIGNAL_LABEL_TO_SIGNAL_KEY
  );
  let redFlags = unique([...current.redFlags, ...messageRedFlags]);
  let detectedSignals = unique([...current.detectedSignals, ...messageSignals]);
  // La clasificación de intención usa SOLO las señales/alarmas de ESTE
  // mensaje, no el historial acumulado: si no, un "dolor intenso" mencionado
  // hace varios turnos seguia forzando urgent_pain en cualquier mensaje
  // posterior sin relación (incluso una simple negación de síntomas).
  // Hotfix dental-negation-context: una señal de golpe NEGADA ("no he
  // recibido ningun golpe") nunca puede activar el intent trauma, aunque la
  // palabra "golpe" este presente en el mensaje.
  const intent = inferIntent(current.intent, normalized, messageSignals, messageRedFlags, clinicalAnswer.negated.includes("trauma"));
  // Cambio de tema: los síntomas y alarmas del motivo anterior no deben
  // arrastrar la urgencia a una consulta nueva distinta (p.ej. de un dolor ya
  // resuelto a una consulta de ortodoncia días después).
  if (intent && current.intent && intent !== current.intent) {
    redFlags = messageRedFlags.length > 0 ? unique(messageRedFlags) : [];
    detectedSignals = unique(messageSignals);
  }
  const profile = intent ? intentProfiles[intent] : null;
  // Datos como nombre/teléfono/email/sede son "sticky" por defecto (no se
  // repiten ni se pisan con ruido posterior). Pero si el paciente corrige
  // explicitamente ("en realidad es Elche", "perdona me confundi, soy Maria
  // Lopez"), el dato nuevo debe ganar; si no, Clara se queda con el primer
  // valor para siempre aunque el paciente lo corrija (bug real detectado en
  // QA: sede y nombre corregidos por el paciente se ignoraban).
  const isCorrecting = isExplicitCorrection(normalized);
  // Si la pregunta pendiente era el nombre, aceptar una respuesta que sea
  // solo el nombre ("Alejandro Marti"), sin exigir "soy" o "me llamo"; una
  // pregunta de identidad no cuenta como nombre aunque sea una frase corta.
  // La frase de traspaso a un tutor ("soy la madre, seguimos...") competia
  // con extractName y capturaba "la madre" como nombre del paciente: se
  // recorta antes de buscar el nombre real que venga después en el mismo
  // mensaje.
  const textForName = GUARDIAN_TAKEOVER_PATTERN.test(normalized) ? text.replace(GUARDIAN_TAKEOVER_PATTERN, " ") : text;
  const incomingName =
    extractName(textForName) ||
    extractNameNextToPhone(textForName) ||
    (wasAskedForName(current) && !asksIdentity ? extractBareName(textForName) : "");
  const name =
    isCorrecting && incomingName
      ? incomingName
      : current.name
        ? completeNameWithSurname(current.name, incomingName)
        : incomingName;
  const incomingPhone = extractPhone(text);
  const phone = isCorrecting && incomingPhone ? incomingPhone : current.phone || incomingPhone;
  const incomingEmail = extractEmail(text);
  const email = isCorrecting && incomingEmail ? incomingEmail : current.email || incomingEmail;
  const incomingLocation = extractLocation(normalized);
  const location = isCorrecting && incomingLocation ? incomingLocation : current.location || incomingLocation;
  const selectedAvailability = current.availability
    ? ""
    : resolveSelectedAvailabilityOption(current.offeredAvailabilityOptions, normalized, assistantOfferedSlotsLastTurn);
  const asksForAvailabilityOptions = Boolean(requestedSlotOptionsPeriod(text));
  const availability = current.availability || selectedAvailability || (asksForAvailabilityOptions ? "" : extractAvailability(normalized, text));
  const consent = current.consent || acceptsExplicitConsent(normalized) || (wasAskedForConsent(current) && acceptsConsent(normalized));
  // Bug real (pruebas de estres): "dolor 10/10, no aguanto" seguido de "puede
  // esperar a la semana que viene" no se reconocia; Clara repetia la misma
  // pregunta de seguridad tal cual, ignorando que el paciente se retracto.
  const patientDeescalates = redFlags.length === 0 && patientDeescalatesUrgency(normalized);
  // Hotfix dental-negation-context: fallo real - "no, nada de eso" tras la
  // pregunta de seguridad no coincidia con ninguna frase de
  // detectSafetyScreen (que exige mencionar la palabra clave), asi que
  // safetyScreened se quedaba false para siempre y Clara repetia la misma
  // pregunta indefinidamente. clinicalAnswer.resolvesSafetyScreen cubre
  // exactamente esta negacion generica, sin palabra clave.
  // Hotfix dental-negation-context (Problema 2): el fallback generico de
  // detectSafetyScreen (palabras sueltas como "leve"/"sin golpe") no puede
  // completar el cribado GENERAL cuando lo que en realidad se esta
  // respondiendo es la pregunta ESTRECHA de sangrado/golpe - si no, "leve,
  // sin golpe" cerraba de un tiron todo el cribado sin haber preguntado
  // nunca fiebre/hinchazon/pus/dificultad.
  const isAnsweringBleedingQuestion = current.lastQuestionKey === "bleeding_severity_or_impact";
  const safetyScreened =
    current.safetyScreened ||
    clinicalAnswer.resolvesSafetyScreen ||
    (!isAnsweringBleedingQuestion &&
      (intent === "trauma"
        ? detectTraumaSafetyScreen(normalized, redFlags)
        : detectSafetyScreen(normalized, redFlags))) ||
    patientDeescalates;
  // Hotfix dental-negation-context (Problema 2): sangrado leve/abundante +
  // golpe si/no resuelto es un requisito PREVIO al cribado general, nunca lo
  // sustituye - ver comentario en resolveAnswerToLastClinicalQuestion.
  const bleedingDifferentialResolved = current.bleedingDifferentialResolved || clinicalAnswer.resolvesBleedingDifferential;
  let triageLevel = getTriageLevel(intent, redFlags, detectedSignals);
  if (patientDeescalates && (triageLevel === "URGENT_24H" || triageLevel === "PRIORITY_72H")) {
    triageLevel = "ROUTINE";
  }
  const missingClinicalData = getMissingClinicalData(intent, detectedSignals, safetyScreened, bleedingDifferentialResolved);
  // Bug real detectado en pruebas de estres: un menor que dice su edad y pide
  // cita "sin mis padres" recibia el mismo guion de consentimiento/reserva que
  // un adulto. Una vez detectado, se pide tutor en todos los turnos
  // siguientes hasta que un adulto responsable tome la conversación.
  const guardianTookOver = GUARDIAN_TAKEOVER_PATTERN.test(normalized);
  const requiresGuardian = guardianTookOver ? false : current.requiresGuardian || detectsMinorSelfReport(normalized);
  // Igual de real: "borra mis datos"/"retiro el consentimiento" no tenia
  // ningún manejo, Clara seguia charlando como si nada. Se escala a un
  // humano (único que puede verificar identidad y ejecutar el borrado) y se
  // deja de proponer citas o pedir mas datos en esta conversación.
  const dataErasureRequested = current.dataErasureRequested || detectsDataErasureRequest(normalized);
  // Sin intent reconocido y en un idioma que el motor no entiende: no fingir
  // que se entendio, avisar con honestidad y escalar para que un humano
  // contacte en su idioma.
  const needsHumanForLanguage = !intent && detectsNonSpanishLanguage(text);
  const escalated =
    triageLevel === "EMERGENCY" ||
    triageLevel === "URGENT_24H" ||
    Boolean(profile && profile.defaultTriage === "URGENT_24H" && redFlags.length > 0) ||
    dataErasureRequested ||
    needsHumanForLanguage;
  // Hotfix dental-negation-context: que pregunta hara nextStep (mas abajo)
  // ESTE turno, para poder interpretar la respuesta del paciente el turno
  // siguiente con resolveAnswerToLastClinicalQuestion.
  const lastQuestionKey = identifyNextClinicalQuestionKey(
    { intent, redFlags, safetyScreened, missingClinicalData, escalated, bleedingDifferentialResolved },
    text
  );
  // Hotfix dental-negation-context (Problema 1): interpreta "si"/"no, gracias"
  // segun si Clara ACABA de ofrecer ayuda para pedir cita (current.lastAssistantAction),
  // no por texto suelto sin contexto - sticky una vez aceptado o declinado.
  const offeredAppointmentHelpLastTurn = current.lastAssistantAction === "OFFER_APPOINTMENT_HELP";
  const appointmentHelpAccepted =
    current.appointmentHelpAccepted || (offeredAppointmentHelpLastTurn && acceptsAppointmentHelp(normalized));
  const appointmentHelpDeclined =
    !appointmentHelpAccepted &&
    (current.appointmentHelpDeclined || (offeredAppointmentHelpLastTurn && declinesAppointmentHelp(normalized)));
  const lastAssistantAction = identifyLastAssistantAction({
    intent,
    redFlags,
    safetyScreened,
    missingClinicalData,
    escalated,
    bleedingDifferentialResolved,
    consent,
    name,
    email,
    phone,
    location,
    availability,
    appointmentHelpAccepted,
    appointmentHelpDeclined
  });

  let nextState = completeDentalState({
    ...current,
    ...(profile
      ? {
          intent,
          intentCode: profile.intentCode,
          treatmentNeed: profile.treatmentNeed,
          budget: profile.budget,
          estimatedValue: profile.estimatedValue,
          clinicalReading: profile.clinicalReading,
          likelyCauses: profile.likelyCauses
        }
      : {}),
    redFlags,
    detectedSignals,
    triageLevel,
    triageLabel: triageLabel(triageLevel),
    escalated,
    requiresGuardian,
    dataErasureRequested,
    confidence: getConfidence(intent, detectedSignals, redFlags),
    missingClinicalData,
    safetyScreened,
    lastQuestionKey,
    bleedingDifferentialResolved,
    lastAssistantAction,
    appointmentHelpAccepted,
    appointmentHelpDeclined,
    consent,
    name,
    phone,
    email,
    location,
    availability,
    offeredAvailabilityOptions: selectedAvailability ? [] : current.offeredAvailabilityOptions
  });

  const requestedPeriod = requestedSlotOptionsPeriod(text);
  if (requestedPeriod && nextState.location && !nextState.availability) {
    nextState = {
      ...nextState,
      offeredAvailabilityOptions: fallbackAvailabilityOptions(requestedPeriod)
    };
  }
  if (
    !requestedPeriod &&
    canOfferAvailabilityOptions(nextState) &&
    nextState.offeredAvailabilityOptions.length === 0
  ) {
    nextState = {
      ...nextState,
      offeredAvailabilityOptions: fallbackAvailabilityOptions("manana")
    };
  }

  // Petición de presupuesto sin tratamiento concreto: marcarla para que el
  // siguiente turno de al grano con el rango de precio del tratamiento.
  if (!intent && wantsPrice(undefined, text)) {
    nextState.intentCode = BUDGET_PENDING_INTENT;
  }

  // bookingStatus se recalcula siempre aqui (unica fuente: computeBookingStatus)
  // para que quede persistido en el propio estado, no solo como campo calculado
  // aparte. closureAcknowledged marca si este turno YA fue (o sigue siendo) un
  // cierre tras una reserva lista, para que buildDentalReply sepa distinguir el
  // primer cierre (mensaje con el estado real de la reserva) de agradecimientos
  // posteriores (despedida breve, sin repetir el mismo mensaje).
  const isClosingExchange = current.ready && current.intent === nextState.intent && nextState.ready;
  nextState = {
    ...nextState,
    bookingStatus: computeBookingStatus(nextState),
    closureAcknowledged: !nextState.ready ? false : current.closureAcknowledged || isClosingExchange
  };

  const reply = buildDentalReply(nextState, current, text);
  return {
    state: nextState,
    reply: asksIdentity ? `${IDENTITY_DISCLOSURE} ${reply}`.trim() : reply
  };
}

export function buildDentalSummary(state: DentalAgentState) {
  if (!state.intent) {
    return "Esperando motivo de consulta y síntomas.";
  }
  if (state.triageLevel === "EMERGENCY") {
    return "Senales de alarma detectadas. Derivación inmediata a humano/urgencias.";
  }
  if (state.ready) {
    return state.escalated
      ? "Urgencia registrada con datos minimos para recepción."
      : "Pre-reserva lista con orientación clínica y presupuesto aproximado.";
  }
  return `${state.triageLabel}. ${state.clinicalReading}`;
}

// Estilo conversacional: mensajes cortos (2-3 frases), UNA pregunta por turno,
// empatia variable y nada de repetir orientación o precios ya dados. El estado
// anterior dice que se comunico ya: la orientación clínica solo se da la
// primera vez que se detecta la intención.
const EMPATHY_PAIN = [
  "Entiendo, es molesto.",
  "Vale, vamos con calma.",
  "Gracias por contarlo."
];

const PAIN_INTENTS: DentalIntentId[] = [
  "urgent_pain",
  "endodontics",
  "wisdom_tooth",
  "trauma",
  "prosthetics",
  "caries_restoration"
];

// Intenciones donde el precio orientativo se adelanta sin que lo pidan.
const PRICE_FORWARD_INTENTS: DentalIntentId[] = ["implant_price", "whitening", "cosmetic_dentistry", "orthodontics", "first_visit"];

// El paciente pidio presupuesto pero aun no sabemos de que tratamiento.
const BUDGET_PENDING_INTENT = "PRESUPUESTO_PENDIENTE";

function buildDentalReply(state: DentalAgentState, previous: DentalAgentState, latestPatientText: string) {
  const paymentSafetyReply = buildPaymentSafetyReply(latestPatientText);
  if (paymentSafetyReply) {
    return paymentSafetyReply;
  }
  const healthCardReply = buildHealthCardReply(latestPatientText);
  if (healthCardReply) {
    return healthCardReply;
  }
  const addressReply = buildAddressReply(latestPatientText);
  if (addressReply) {
    return addressReply;
  }
  const teamReply = buildTeamReply(latestPatientText);
  if (teamReply) {
    return teamReply;
  }
  const appointmentManagementReply = buildAppointmentManagementReply(latestPatientText);
  if (appointmentManagementReply) {
    return appointmentManagementReply;
  }
  const clinicInfoReply = buildClinicInfoReply(latestPatientText);
  if (clinicInfoReply) {
    return clinicInfoReply;
  }
  const postCareReply = buildPostCareReply(latestPatientText);
  if (postCareReply) {
    return postCareReply;
  }
  const dataErasureReply = buildDataErasureReply(state);
  if (dataErasureReply) {
    return dataErasureReply;
  }
  const guardianRequiredReply = buildGuardianRequiredReply(state);
  if (guardianRequiredReply) {
    return guardianRequiredReply;
  }
  const invalidContactDataReply = buildInvalidContactDataReply(state, latestPatientText);
  if (invalidContactDataReply) {
    return invalidContactDataReply;
  }
  const courtesyReply = buildCourtesyReply(latestPatientText);
  if (courtesyReply && !state.intent) {
    return courtesyReply;
  }

  if (!state.intent) {
    // Quien pide presupuesto viene a comprar, no con dolor: se le pregunta
    // directamente por el tratamiento del catalogo, sin menu de síntomas.
    if (state.intentCode === BUDGET_PENDING_INTENT) {
      return pickVariant(
        [
          "Encantada de prepararte un presupuesto. De que tratamiento hablamos: implantes, ortodoncia invisible, blanqueamiento o estética, coronas/prótesis, o algun otro? La primera visita con valoración es sin coste.",
          "Claro, te oriento con el presupuesto. Que te interesa: implantes, ortodoncia invisible, estética dental, coronas/prótesis u otro tratamiento? Recuerda que la primera valoración es gratuita.",
          "Perfecto. Dime para que tratamiento lo quieres: implantes, ortodoncia invisible, blanqueamiento, coronas/prótesis u otro, y te doy el rango orientativo. La valoración inicial es sin coste."
        ],
        latestPatientText
      );
    }
    // Bug real (pruebas de estrés): un mensaje integramente en inglés o
    // valenciano/catalán (Elche es zona valencianoparlante) recibia el mismo
    // menu generico en español, como si fuera texto sin sentido. No hay
    // traducción real todavia: al menos se avisa con honestidad y se escala
    // a un humano en vez de fingir que no se entendio nada.
    if (detectsNonSpanishLanguage(latestPatientText)) {
      return "Disculpa, de momento solo puedo atenderte en español. Aviso al equipo para que te contacten en tu idioma.\n\nSorry, I can currently only help in Spanish - I've flagged this so the team can reach out to you.";
    }
    return "Te leo. Cuentame un poco mas: es dolor, encías, una pieza rota, implante, ortodoncia, estética o una revisión?";
  }

  const profile = intentProfiles[state.intent];
  const isNewIntent = previous.intent !== state.intent;
  const first = firstName(state.name);

  if (state.triageLevel === "EMERGENCY") {
    if (!state.consent) {
      return `${pickVariant(EMPATHY_PAIN, latestPatientText)}\n\nEsto no debería esperar: si te cuesta respirar o tragar, o la hinchazón avanza, acude a urgencias ya. Mientras, ¿aceptas que guardemos tus datos para priorizarte?`;
    }
    if (!state.name) {
      return pickVariant(
        [
          "Lo marco como prioridad máxima. Como te llamas?",
          "Queda marcado como prioritario. Me dices tu nombre y apellidos?",
          "Lo gestiono como urgencia ya. Dime tu nombre, por favor."
        ],
        latestPatientText
      );
    }
    if (!state.phone) {
      return `${first}, dime un teléfono y te llamamos ya.`;
    }
    return `${first}, alerta enviada: te llamamos ahora al ${state.phone}. Si notas que empeora, no esperes nuestra llamada y acude a urgencias.`;
  }

  if (state.ready) {
    // La reserva ya se comunico en el turno anterior: cerrar con naturalidad
    // en vez de repetir el mismo mensaje de confirmación.
    if (previous.ready && !isNewIntent) {
      // Bug real: el primer cierre tras una reserva usaba un mensaje generico
      // ("Aquí sigo si necesitas algo mas...") que no dejaba claro el estado
      // REAL de la solicitud (pre-reservada, nunca "confirmada"/"te
      // esperamos" sin que el backend la haya confirmado de verdad). Este
      // mensaje especifico solo se da UNA vez (closureAcknowledged aun en
      // false en el estado anterior); a partir de ahi, un agradecimiento
      // posterior usa una despedida breve, sin repetirlo.
      if (!previous.closureAcknowledged) {
        return state.bookingStatus === "CONFIRMED"
          ? `Perfecto${first ? `, ${first}` : ""}. Tu cita queda confirmada. Te esperamos en la clínica.`
          : `Perfecto${first ? `, ${first}` : ""}. La solicitud queda pre-reservada. La clínica te confirmará la cita.`;
      }
      // Bug real (produccion): "perfecto" y luego "gracias" cayeron en el
      // mismo hash de pickVariant y Clara envio el mismo cierre ("Aquí sigo
      // si necesitas algo mas...") dos veces seguidas. Un "gracias" suelto
      // tras la reserva ya lista es un cierre de conversacion, no otra
      // confirmacion mas: responde con un agradecimiento distinto y no
      // vuelve a ofrecer nada.
      if (/^(gracias|muchas gracias|ok gracias|vale gracias)[!.? ]*$/.test(normalize(latestPatientText).trim())) {
        return `Gracias a ti${first ? `, ${first}` : ""}. Nos vemos pronto.`;
      }
      return pickVariant(
        [
          `Todo listo${first ? `, ${first}` : ""}. Si necesitas cambiar algo de la cita, dimelo por aquí.`,
          `Aquí sigo si necesitas algo mas${first ? `, ${first}` : ""}. Te esperamos en la clínica.`,
          `Perfecto${first ? `, ${first}` : ""}. Cualquier duda antes de la visita, me escribes.`
        ],
        latestPatientText
      );
    }
    // Si el precio se pidio y este es el primer turno con tratamiento
    // conocido (todo llego de golpe), incluirlo en la confirmación.
    const pricePending = isNewIntent && (previous.intentCode === BUDGET_PENDING_INTENT || mentionsPrice(latestPatientText));
    const priceLine = pricePending ? ` ${profile.priceNote}` : "";
    if (state.escalated) {
      return `${first}, queda registrado con prioridad. Te llamamos al ${state.phone} enseguida.`;
    }
    const confirmation = `${first}, pre-reserva lista: ${state.treatmentNeed.toLowerCase()} en ${state.location}, franja ${state.availability}.${priceLine}`;
    return `${confirmation}\n\nEl doctor te confirma plan y presupuesto cerrado en la visita.`;
  }

  // Si la conversación nacio pidiendo presupuesto, dar el rango de precio en
  // cuanto se conoce el tratamiento aunque este mensaje ya no lo mencione.
  const cameFromBudget = previous.intentCode === BUDGET_PENDING_INTENT;
  // Con el intent ya fijado, los turnos siguientes solo pasaban por buildAck
  // (casi siempre vacio) + nextStep (pide el siguiente dato fijo). Una
  // pregunta de idoneidad clínica en ese turno (edad, embarazo...) quedaba
  // sin responder (visto en QA con la pregunta de la edad para ortodoncia).
  const intro = isNewIntent
    ? buildIntro(state, profile, latestPatientText, cameFromBudget)
    : [detectSuitabilityAnswer(normalize(latestPatientText)), buildAck(state, previous)].filter(Boolean).join(" ");
  const question = intro.trim().endsWith("?") ? "" : nextStep(state, latestPatientText);
  const reply = [intro, question].filter(Boolean).join("\n\n").trim();
  return reply || "Cuentame un poco mas para orientarte bien.";
}

function buildCourtesyReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText).trim();
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches)[!.? ]*$/.test(normalized)) {
    return "Hola.\n\nCuentame qué necesitas y te oriento.";
  }
  if (/^(gracias|muchas gracias|ok gracias|vale gracias)[!.? ]*$/.test(normalized)) {
    return "A ti. Si necesitas algo mas, aquí estoy.";
  }
  return "";
}

function buildHealthCardReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!/(tarjeta sanitaria|tarjeta de la seguridad social|tarjeta sip|\bsip\b)/.test(normalized)) {
    return "";
  }

  return "No hace falta traer tarjeta sanitaria. Con tu nombre y teléfono podemos gestionar la visita.\n\nQuieres que miremos una cita?";
}

function buildAddressReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!asksClinicAddress(normalized)) {
    return "";
  }

  const addresses = demoKnowledge.clinic.addresses;
  if (normalized.includes("elche")) {
    return [
      `La clínica de Elche esta en ${addresses["Elche - Altabix"]}.`,
      "Quieres que te cuente nuestros servicios o prefieres que miremos una cita en Elche?"
    ].join("\n\n");
  }
  if (normalized.includes("murcia")) {
    return [
      `La clínica de Murcia esta en ${addresses["Murcia centro"]}.`,
      "Quieres que te cuente nuestros servicios o prefieres que miremos una cita en Murcia?"
    ].join("\n\n");
  }
  return [
    `La clínica de Murcia esta en ${addresses["Murcia centro"]}.`,
    `La clínica de Elche esta en ${addresses["Elche - Altabix"]}.`,
    "Quieres que te cuente nuestros servicios o prefieres que miremos una cita?"
  ].join("\n\n");
}

function asksClinicAddress(normalized: string) {
  return /(\bdonde estais\b|\bdonde estan\b|\bdonde sois\b|\bdonde teneis\b|\bdonde queda\b|\bdonde esta\b|\bdonde se encuentra\b|direccion|ubicacion|calle|como llego|localizacion|ubicados|ubicadas|en que zona|por donde queda)/.test(normalized);
}

function buildTeamReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!asksTeamOrSpecialties(normalized)) {
    return "";
  }

  const team = demoKnowledge.clinic.team.map(member => `${member.name}: ${member.specialty}.`).join("\n");
  return [
    "Claro. El equipo trabaja por especialidades:",
    team,
    "Quieres que te oriente por alguna molestia, buscas una urgencia o prefieres que miremos cita con algun doctor en concreto?"
  ].join("\n\n");
}

function asksTeamOrSpecialties(normalized: string) {
  return /(especialidades|especialidad|especialistas|doctores|doctoras|odontologos|dentistas|equipo|quien atiende|quien lleva|quien hace)/.test(normalized);
}

function buildAppointmentManagementReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!asksAppointmentManagement(normalized)) {
    return "";
  }
  if (/(cancel|anular)/.test(normalized)) {
    return "Te ayudo a cancelarla. Para localizar la cita, dime nombre completo y teléfono de contacto.";
  }
  return "Te ayudo a cambiarla. Para localizar la cita, dime nombre completo, teléfono y que día o franja te vendria mejor.";
}

export function asksAppointmentManagement(normalized: string) {
  return /(cancelar|cancelo|anular|anulo|cambiar|cambio|mover|reprogramar|modificar).{0,30}\bcita\b|\bcita\b.{0,30}(cancelar|anular|cambiar|mover|reprogramar|modificar)/.test(normalized);
}

function buildClinicInfoReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(quiero hablar con una persona|hablar con alguien|hablar con recepcion|pasame con recepcion|humano|persona real)/.test(normalized)) {
    return "Claro. Puedo avisar a recepción para que te atienda una persona. Dime brevemente el motivo y un teléfono de contacto.";
  }
  if (/(horario|hora abris|hora cerrais|cuando abris|cuando cerrais)/.test(normalized)) {
    return `${demoKnowledge.clinic.hours}\n\nQuieres que miremos una cita?`;
  }
  if (/(telefono de la clinica|telefono teneis|ten[eé]is telefono|numero de telefono|llamaros|llamar a la clinica)/.test(normalized)) {
    return `El teléfono de la clínica es ${demoKnowledge.clinic.phone}.\n\nTambien puedo ayudarte por aquí a mirar cita, presupuesto o urgencia.`;
  }
  if (/(clinica privada|sois privados|sois privada|privada)/.test(normalized)) {
    return "Sí, somos una clínica dental privada.\n\nQuieres que te oriente con algun tratamiento o prefieres que miremos una cita?";
  }
  if (/(seguro|mutua|adeslas|sanitas|asisa|dkv)/.test(normalized)) {
    const insuranceReply = "Para seguros o mutuas concretas es mejor confirmarlo con recepción, porque depende de la poliza y del tratamiento.";
    // Bug real (pruebas de estres): "cuanto cuesta un implante y aceptais
    // Sanitas" perdia la parte del precio por completo, contestaba solo el
    // seguro. Si el mismo mensaje también pregunta precio, no se descarta.
    if (mentionsPrice(latestPatientText)) {
      return `${insuranceReply}\n\nSobre el precio: dime el tratamiento (implante, ortodoncia, blanqueamiento...) y te doy un rango orientativo.`;
    }
    return `${insuranceReply}\n\nSi quieres, dime qué necesitas y te orientamos.`;
  }
  if (
    /(pago con tarjeta|tarjeta bancaria|bizum|forma de pago|formas de pago|financiar|financiacion)/.test(normalized) &&
    !/(implante|ortodoncia|invisalign|bracket|blanqueamiento|carilla|endodoncia)/.test(normalized)
  ) {
    return "Para tratamientos con presupuesto cerrado se puede estudiar financiación hasta 24 meses según aprobación. Las formas de pago concretas te las confirman en recepción.\n\nQuieres que te oriente con algun tratamiento?";
  }
  if (/(atendeis ninos|atend[eé]is niños|odontopediatria|dentista infantil|mi hijo|mi hija)/.test(normalized) && !/(ortodoncia|dolor|duele|muela|diente)/.test(normalized)) {
    return "Sí, atendemos niños. Tenemos odontopediatría con Dra. Laura Herencia Lizaran y Dra. Paula Garcia Garcia.\n\nQuieres que miremos una primera visita o es por alguna molestia?";
  }
  if (/(parking|aparcamiento|aparcar)/.test(normalized)) {
    return "No quiero inventarte el aparcamiento exacto. Dime si vienes a Murcia o a Elche y te indico la dirección de la sede para que puedas calcularlo bien.";
  }
  if (/(silla de ruedas|accesible|acceso|movilidad reducida)/.test(normalized)) {
    return "Para accesibilidad concreta de la sede, lo mejor es confirmarlo con recepción antes de venir.\n\nDime si seria Murcia o Elche y te ayudamos a organizarlo.";
  }
  if (/(do you speak english|speak english|english please|hablais ingles|habl[aá]is ingles)/.test(normalized)) {
    return "Yes, I can help you in English. Tell me what you need: appointment, budget, dental pain, or clinic information.";
  }
  if (/(llevo esperando|nadie me contesta|no me respondeis|reclamacion|queja)/.test(normalized)) {
    return "Lo siento. Para pasarlo a recepción y que lo revisen, dime tu nombre y un teléfono de contacto.";
  }
  return "";
}

function buildPostCareReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(me han hecho|me hicieron|me quitaron|me sacaron).{0,40}(empaste|endodoncia|extraccion|muela|diente)/.test(normalized)) {
    if (/(sangra mucho|no para de sangrar|hemorragia|no puedo tragar|me cuesta respirar)/.test(normalized)) {
      return "Eso conviene revisarlo con prioridad. Si el sangrado no cede o te cuesta respirar o tragar, acude a urgencias. Si puedes, dime nombre y teléfono y aviso a recepción.";
    }
    return "Tras un tratamiento reciente, sigue la pauta que te dio el doctor. Si hay dolor fuerte, inflamación, fiebre o sangrado que no cede, avisanos para revisarlo con prioridad.\n\nQue tratamiento te hicieron y cuando fue?";
  }
  return "";
}

// Senales que expresan deseo de tratamiento, no un síntoma clínico: nombrar
// "corona" o "implante" al pedir presupuesto no es reportar una molestia.
const NON_SYMPTOM_SIGNALS = new Set(["pieza ausente", "estética", "ortodoncia", "pieza rota o funda"]);

function buildIntro(state: DentalAgentState, profile: IntentProfile, latestPatientText: string, cameFromBudget = false) {
  const normalized = normalize(latestPatientText);
  const suitabilityAnswer = detectSuitabilityAnswer(normalized);
  if (/(miedo|panico|ansiedad).{0,30}(dentista|clinica|doctor)/.test(normalized)) {
    return "Lo entiendo, a muchas personas les pasa. Lo anotamos para que el equipo lo tenga en cuenta y te expliquen todo con calma.";
  }
  if (/(se me mueve|se mueve|movilidad).{0,30}implante|implante.{0,30}(se me mueve|se mueve|movilidad)/.test(normalized)) {
    return "Un implante que se mueve conviene revisarlo cuanto antes para valorar encia, tornillo, corona y soporte.";
  }
  const expressesPain = /(duele|dolor|molest|me mata|horrible|fatal)/.test(normalize(latestPatientText));
  const empathy =
    state.intent && PAIN_INTENTS.includes(state.intent) && (expressesPain || state.escalated)
      ? `${pickVariant(EMPATHY_PAIN, latestPatientText)} `
      : "";
  const alarm = state.redFlags.length
    ? ` Lo que comentas de ${state.redFlags[0]} es importante, así que te vamos a priorizar.`
    : "";
  const price = cameFromBudget || wantsPrice(state.intent, latestPatientText) ? ` ${profile.priceNote}` : "";

  // Consulta comercial de presupuesto (venga en dos turnos o en un solo
  // mensaje "quiero presupuesto para un implante"): sin lectura de síntomas.
  const asksPriceNow = mentionsPrice(latestPatientText);
  const hasSymptoms = state.detectedSignals.some(signal => !NON_SYMPTOM_SIGNALS.has(signal));
  // Bug real (produccion): "cita para una limpieza" (sin sintomas ni dolor)
  // caia en el guion generico de diagnostico ("podria ser mantenimiento
  // periodontal o sarro; te lo confirmara el doctor"), inventando una causa
  // clinica para lo que solo es una peticion administrativa de cita. Una
  // limpieza/revision de rutina sin sintomas nunca necesita esa hipotesis.
  const isRoutineReactivationRequest = state.intent === "reactivation" && !expressesPain && !hasSymptoms && !state.escalated;
  // Fix real (CASO 1): "cita para una limpieza" sin sintomas NI pregunta de
  // precio no debe mostrar el precio ni pedir consentimiento todavia - eso
  // solo corresponde si el paciente pregunta el precio explicitamente
  // (asksPriceNow, ver mas abajo). Sin precio de por medio, nextStep() ya se
  // encarga de preguntar la sede a continuacion (ver nextStep).
  if (isRoutineReactivationRequest && !asksPriceNow && !cameFromBudget) {
    return suitabilityAnswer || "Claro.";
  }
  if (((cameFromBudget || asksPriceNow) || isRoutineReactivationRequest) && !expressesPain && !hasSymptoms && !state.escalated) {
    if (state.intent === "cosmetic_dentistry") {
      const prefix = suitabilityAnswer ? `${suitabilityAnswer}\n\n` : "";
      return `${prefix}Tenemos varias opciones de estética dental.\n\nBlanqueamiento, carillas, composite estético y Digital Smile Design.\n\nCual te interesa mas?`;
    }
    if (state.intent === "orthodontics") {
      const opener = suitabilityAnswer || "Claro, te oriento.";
      return `${opener} ${profile.priceNote} La valoración inicial es sin coste y ahi te dicen duración, opciones y financiación.`;
    }
    if (state.intent === "reactivation") {
      const opener = suitabilityAnswer || "Claro.";
      return `${opener} ${profile.priceNote} Si al verte hubiera encia inflamada o mucha acumulación, te avisamos antes de hacer nada.`;
    }
    // Fix real (CASO 5): una consulta de precio de implante no debe pedir
    // consentimiento ni datos personales todavia - solo el rango de precio,
    // aclarar que el presupuesto definitivo requiere valoracion, y preguntar
    // si quiere ayuda para solicitar cita. Termina en "?": nextStep() (que
    // pediria consentimiento) no se ejecuta este turno.
    if (state.intent === "implant_price") {
      const opener = suitabilityAnswer ? `${suitabilityAnswer} ` : "";
      return `${opener}${profile.priceNote} El presupuesto definitivo se confirma tras la valoración de tu caso.\n\nQuieres que te ayude a solicitar una cita?`;
    }
    const opener = suitabilityAnswer || "Buena elección.";
    return `${opener} ${profile.priceNote} El doctor te confirma el presupuesto cerrado en la valoración, que es sin coste.`;
  }

  const causes = profile.likelyCauses.slice(0, 2).join(" o ");
  if (
    state.intent === "periodontics" &&
    state.detectedSignals.includes("movilidad dental") &&
    !state.detectedSignals.some(signal => ["sangrado de encias", "inflamación", "dolor intenso"].includes(signal))
  ) {
    return "Que una muela se mueva conviene revisarlo pronto para valorar la encia y el soporte de la pieza.";
  }
  // Bug real: con una pregunta de seguridad/aclaracion todavia pendiente
  // (missingClinicalData), este guion generico decia "podria ser gingivitis o
  // periodontitis"/"caries o filtracion de empaste" ANTES de preguntar nada,
  // inventando un diagnostico sin haber descartado ni un sintoma. La pregunta ya
  // la hace nextStep() a continuacion: aqui solo va la empatia si aplica, nunca
  // la hipotesis clinica, hasta que esa pregunta quede contestada.
  // Si el paciente pregunta el precio explicitamente, respondemos aunque quede
  // una pregunta de seguridad pendiente: no retenemos informacion que ya pidio.
  if (pendingSafetyScreenQuestion(state) && !asksPriceNow) {
    return `${suitabilityAnswer || empathy.trim()}${alarm}`.trim();
  }
  const suitabilityPrefix = suitabilityAnswer ? `${suitabilityAnswer} ` : empathy;
  return `${suitabilityPrefix}Por lo que me cuentas podria ser ${causes}; te lo confirmara el doctor al verte.${alarm}${price}`;
}

function buildAck(state: DentalAgentState, previous: DentalAgentState) {
  // Hotfix dental-negation-context (Problema 1): el paciente declino la
  // oferta de ayuda con la cita - cierre breve, sin pedir consentimiento ni
  // iniciar la reserva (ver nextStep, que en este mismo turno ya no pregunta
  // nada mas).
  if (state.appointmentHelpDeclined && !previous.appointmentHelpDeclined) {
    return "De acuerdo, no pasa nada. Si cambias de opinión o necesitas algo más, aquí estoy.";
  }
  // Bug real (pruebas de estres): un paciente que bajaba de "10/10, no
  // aguanto" a "puede esperar a la semana que viene" recibia la misma
  // pregunta de seguridad tal cual, como si no hubiera dicho nada.
  if (state.safetyScreened && !previous.safetyScreened && state.triageLevel === "ROUTINE" && previous.triageLevel !== "ROUTINE") {
    return "Vale, lo dejamos como revisión normal entonces.";
  }
  if (state.name && !previous.name) {
    return `Encantada, ${firstName(state.name)}.`;
  }
  if (state.consent && !previous.consent) {
    return "Genial, gracias.";
  }
  if (state.phone && !previous.phone) {
    return "Apuntado.";
  }
  if (state.redFlags.length > previous.redFlags.length) {
    return "Gracias por decirmelo, eso es importante.";
  }
  if (state.detectedSignals.length > previous.detectedSignals.length) {
    return "Vale, eso me ayuda a orientarte.";
  }
  return "";
}

const CONSENT_ASKS = [
  "Si quieres te preparo una cita. Aceptas que guardemos tus datos para gestionarla?",
  "Te dejo la cita preparada si te va bien. Aceptas que guardemos tus datos para gestionarla?",
  "Puedo dejarte la cita lista ahora mismo. Aceptas que guardemos tus datos para gestionarla?"
];

// Mismas condiciones que nextStep() usa para decidir si el turno hace (o ya esta
// haciendo) una pregunta de seguridad/diferencial pendiente, expresadas aparte para
// que buildIntro() pueda comprobarlas sin adelantar una hipotesis clinica antes de
// esa pregunta (bug real: "podria ser gingivitis o periodontitis"/"caries o
// filtracion de empaste" aparecian ANTES de la pregunta de seguridad).
function pendingSafetyScreenQuestion(state: DentalAgentState): boolean {
  if (state.safetyScreened || state.escalated) return false;
  if (state.missingClinicalData[0]) return true;
  if (state.redFlags.length === 0 && ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent ?? "")) {
    return true;
  }
  if (state.intent === "caries_restoration" && state.redFlags.length === 0) return true;
  // Hotfix dental-negation-context (Problema 2): tras resolver sangrado/golpe
  // en periodoncia, la pregunta general de fiebre/hinchazon/pus/dificultad
  // sigue pendiente - no diagnosticar todavia en ese turno intermedio.
  return state.intent === "periodontics" && state.redFlags.length === 0 && state.bleedingDifferentialResolved;
}

function nextStep(state: DentalAgentState, latestPatientText: string) {
  if (state.intent === "trauma" && state.redFlags.length === 0 && !state.safetyScreened) {
    const normalized = normalize(latestPatientText);
    if (mentionsSwallowingAnswer(normalized) && !mentionsOpeningAnswer(normalized)) {
      return "Y puedes abrir la boca bien?";
    }
    if (mentionsOpeningAnswer(normalized) && !mentionsSwallowingAnswer(normalized)) {
      return "Y puedes tragar bien?";
    }
    return "Cuando te diste el golpe y cuanto te duele del 0 al 10? Puedes abrir la boca y tragar bien?";
  }
  if (
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent ?? "")
  ) {
    return "Antes de nada: hay fiebre, hinchazon, pus o te cuesta abrir la boca o tragar?";
  }
  if (!state.escalated && state.missingClinicalData[0]) {
    return state.missingClinicalData[0];
  }
  // Bug real (produccion): "me duele una muela" (urgent_pain) + "al morder"
  // reclasifica a caries_restoration. Ese intent no exige la alarma general
  // arriba (para no repetirla antes de la diferencial frio/calor/morder en
  // un primer mensaje de caries simple), pero una vez resuelta la diferencial
  // (missingClinicalData ya vacio) sigue haciendo falta descartar
  // absceso/infeccion antes de pasar a diagnostico + consentimiento.
  // periodontics: su missingClinicalData de sangrado/movilidad se cierra con
  // bleedingDifferentialResolved (ver getMissingClinicalData), no con
  // safetyScreened - todavia falta la pregunta general de abajo.
  if (!state.escalated && state.intent === "caries_restoration" && state.redFlags.length === 0 && !state.safetyScreened) {
    return "Antes de nada: hay fiebre, hinchazon, pus o te cuesta abrir la boca o tragar?";
  }
  // Hotfix dental-negation-context (Problema 2): resolver sangrado leve/
  // abundante + golpe si/no NO completa el cribado - todavia falta descartar
  // fiebre/hinchazon/pus/dificultad para abrir o tragar en una pregunta aparte.
  if (
    !state.escalated &&
    state.intent === "periodontics" &&
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    state.bleedingDifferentialResolved
  ) {
    return "Gracias. ¿Tienes también fiebre, hinchazón, pus o dificultad para abrir la boca o tragar?";
  }
  // Fix real (CASO 1): una peticion administrativa de cita (limpieza, sin
  // sintomas) no debe pedir consentimiento como primer dato - la sede no es
  // un dato personal, asi que se pregunta antes. Una vez la sede este
  // guardada, el flujo sigue igual (consentimiento, nombre, email, telefono,
  // disponibilidad).
  if (!state.escalated && state.intent === "reactivation" && !state.consent && !state.location) {
    return `Te viene mejor ${demoKnowledge.clinic.locations.join(" o ")}?`;
  }
  // Hotfix dental-negation-context (Problema 1/3): tras completar el triaje
  // clinico de seguridad, Clara ofrece ayuda para la cita ANTES de pedir
  // consentimiento - nunca ambas cosas en el mismo turno. Solo aplica a
  // conversaciones que de verdad pasaron por un cribado clinico (sintoma
  // real); las peticiones administrativas (limpieza, presupuesto...) siguen
  // yendo directas a consentimiento como hasta ahora.
  if (
    !state.escalated &&
    !state.consent &&
    !state.appointmentHelpAccepted &&
    !state.appointmentHelpDeclined &&
    state.intent &&
    CLINICAL_SAFETY_INTENTS.includes(state.intent) &&
    state.safetyScreened
  ) {
    return "De acuerdo. No aparecen señales de alarma inmediatas, pero conviene que un dentista valore la zona. ¿Quieres que te ayude a solicitar una cita?";
  }
  // El paciente declino la oferta de ayuda: no se pide consentimiento ni se
  // recogen datos. buildAck ya emitio el cierre breve este mismo turno (ver
  // mas arriba); aqui no hay nada mas pendiente que preguntar.
  if (!state.escalated && !state.consent && state.appointmentHelpDeclined) {
    return "";
  }
  if (!state.consent) {
    return state.escalated
      ? "Quiero que recepción te llame con prioridad. Aceptas que guardemos tus datos para gestionarlo?"
      : pickVariant(CONSENT_ASKS, latestPatientText);
  }
  if (!state.name) {
    return "Y tu nombre y apellidos?";
  }
  if (!hasFullName(state.name)) {
    return `Gracias, ${firstName(state.name)}. Me faltan tus apellidos.`;
  }
  if (!state.escalated && !state.email) {
    if (looksLikeInvalidEmail(latestPatientText)) {
      return "Ese email no me encaja. Me lo puedes escribir completo? Por ejemplo, nombre@dominio.com.";
    }
    return "Y tu email para enviarte la confirmación de la cita?";
  }
  if (!state.phone) {
    return `Y un teléfono de contacto, ${firstName(state.name)}?`;
  }
  if (!state.location && !state.availability) {
    return `Te viene mejor ${demoKnowledge.clinic.locations.join(" o ")}?`;
  }
  if (!state.location) {
    return `Te viene mejor ${demoKnowledge.clinic.locations.join(" o ")}?`;
  }
  if (!state.availability) {
    const requestedPeriod = requestedSlotOptionsPeriod(latestPatientText);
    if (requestedPeriod) {
      return buildGuidedAvailabilityReply(state.location, requestedPeriod, state.offeredAvailabilityOptions);
    }
    if (state.offeredAvailabilityOptions.length > 0) {
      return buildGuidedAvailabilityReply(state.location, "", state.offeredAvailabilityOptions);
    }
    return "Que día y hora o franja te encaja? Por ejemplo, viernes por la mañana o lunes a las 10:00.";
  }
  return "";
}

export function mentionsPrice(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(precio|cuanto|coste|costar|cuesta|financi|presupuesto)/.test(normalized)) {
    return true;
  }
  // "vale" solo, sin "cuanto/que" delante, suele ser muletilla de cierre
  // ("me vale", "vale, gracias") y no una pregunta de precio ("cuanto vale",
  // "que vale la limpieza"). Sin esto, despedirse con "vale" reabria el
  // flujo de presupuesto (visto en QA: "con el teléfono me vale, gracias").
  return /(cuanto|que)\s+val/.test(normalized);
}

function wantsPrice(intent: DentalIntentId | undefined, latestPatientText: string) {
  if (intent && PRICE_FORWARD_INTENTS.includes(intent)) {
    return true;
  }
  return mentionsPrice(latestPatientText);
}

// Preguntas de idoneidad clínica frecuentes (edad, embarazo, condiciones
// médicas) que llegan mezcladas con el mensaje que fija el intent. Sin esto,
// el guion de presupuesto/tratamiento las pisaba por completo (visto en QA:
// "tengo 60 años, es un problema para la ortodoncia?" recibia solo el precio,
// sin responder a la pregunta real).
function detectSuitabilityAnswer(normalized: string): string {
  if (/(\d{1,3}\s*anos|edad)/.test(normalized) && /(problema|impedimento|puedo|puede|limite|tarde)/.test(normalized)) {
    return "La edad no suele ser impedimento; lo que importa es el estado de encias y hueso, que se valora en la revisión.";
  }
  if (/(embarazo|embarazada|estoy embarazada)/.test(normalized)) {
    return "En el embarazo se puede tratar con precauciones; el doctor ajusta el plan según el trimestre.";
  }
  if (/(diabetes|diabetico|diabetica|anticoagulantes|marcapasos)/.test(normalized)) {
    return "Con diabetes, anticoagulantes o marcapasos se puede tratar, pero conviene comentarlo en la valoración para ajustar el protocolo.";
  }
  // Bifosfonatos/osteoporosis: riesgo real de osteonecrosis en implantes, y
  // alergia a la anestesia: ambas quedaban sin respuesta (visto en pruebas de
  // estres), tapadas por el guion generico de tratamiento/precio.
  if (/(bifosfonatos|osteoporosis)/.test(normalized)) {
    return "Con bifosfonatos u osteoporosis se puede tratar en muchos casos, pero el doctor necesita revisar tu historial antes de confirmar el implante.";
  }
  if (/alerg\w*.{0,20}(anestesia|anestesico)|(anestesia|anestesico).{0,20}alerg\w*/.test(normalized)) {
    return "Si hay alergia a la anestesia, el doctor lo revisa antes y ajusta el protocolo o usa una alternativa segura.";
  }
  return "";
}

// Bug real (P1, pruebas de estres): un paciente que declara ser menor de
// edad y pide gestionar la cita "sin mis padres" recibia el mismo guion de
// consentimiento y reserva que un adulto. Detección conservadora: solo
// dispara con una declaración explicita de edad o de minoria de edad, no con
// menciones de duración ("llevo 15 años con este dolor" no matchea porque no
// usa "tengo").
const MINOR_AGE_PATTERN = /\btengo\s+(\d{1,2})\s*(anos|años)\b/;
const MINOR_SELF_DECLARATION_PATTERN = /\bsoy\s+menor\s+de\s+edad\b/;

function detectsMinorSelfReport(normalized: string): boolean {
  if (MINOR_SELF_DECLARATION_PATTERN.test(normalized)) {
    return true;
  }
  const match = normalized.match(MINOR_AGE_PATTERN);
  if (!match) {
    return false;
  }
  const age = Number(match[1]);
  return age > 0 && age < 18;
}

const GUARDIAN_TAKEOVER_PATTERN = /\b(soy\s+(el|la)\s+(padre|madre|tutor|tutora)|habla\s+(el|la)\s+(padre|madre|tutor|tutora))\b/;

function buildGuardianRequiredReply(state: DentalAgentState): string {
  if (!state.requiresGuardian) {
    return "";
  }
  return "Para menores de edad necesitamos el consentimiento y los datos de contacto de un padre, madre o tutor legal antes de seguir.\n\nPuede escribirnos el o ella, o nos dejas su nombre y un teléfono para que lo gestionemos nosotros?";
}

// Bug real (P2, pruebas de estres): "borra mis datos"/"retiro el
// consentimiento" no tenia ningún manejo; Clara seguia proponiendo citas como
// si nada. Un bot no puede verificar identidad para ejecutar un borrado real,
// así que se escala a un humano en vez de fingir que ya esta hecho.
const DATA_ERASURE_PATTERNS = [
  /borra(r)?\s+(todos\s+)?mis\s+datos/,
  /elimina(r)?\s+(todos\s+)?mis\s+datos/,
  /retiro\s+(el\s+)?consentimiento/,
  /derecho\s+al\s+olvido/,
  /borrame\s+de\s+(vuestro|su|el)?\s*sistema/
];

function detectsDataErasureRequest(normalized: string): boolean {
  return DATA_ERASURE_PATTERNS.some(pattern => pattern.test(normalized));
}

function buildDataErasureReply(state: DentalAgentState): string {
  if (!state.dataErasureRequested) {
    return "";
  }
  return "Entendido, lo dejo marcado como prioritario para que el equipo verifique tu identidad y gestione la baja o el borrado de tus datos.\n\nNo seguimos con la reserva mientras tanto; si cambias de idea, nos lo dices.";
}

// Bug real (pruebas de estres): un email sin arroba o un "mi teléfono es
// 123" se descartaban en silencio y Clara seguia pidiendo consentimiento
// como si nada, sin decir que el dato no valia. El chequeo de email ya
// existia pero solo se llegaba a el via nextStep, que un mensaje con todos
// los datos de golpe se saltaba por completo (entraba al guion de
// presupuesto/reserva antes). Se adelanta aquí para que nunca se pierda.
function buildInvalidContactDataReply(state: DentalAgentState, latestPatientText: string): string {
  if (!state.email && looksLikeInvalidEmail(latestPatientText)) {
    return "Ese email no me encaja. Me lo puedes escribir completo? Por ejemplo, nombre@dominio.com.";
  }
  if (!state.phone && looksLikeInvalidPhoneAttempt(latestPatientText)) {
    return "Ese teléfono no me encaja, debería tener 9 dígitos (móvil o fijo español). Me lo repites?";
  }
  return "";
}

// Bug real (P3, pruebas de estres): un paciente pegaba un número de tarjeta
// completo en el chat y Clara seguia con el guion de precio/cita como si
// nada, sin avisar de que eso no deberia mandarse por WhatsApp.
const PAYMENT_KEYWORDS_PATTERN = /(numero de tarjeta|tarjeta de credito|tarjeta de debito|numero de cuenta|cuenta bancaria|\biban\b|codigo de seguridad de la tarjeta|\bcvv\b)/;

export function mentionsPaymentCredentials(rawText: string): boolean {
  const normalized = normalize(rawText);
  if (PAYMENT_KEYWORDS_PATTERN.test(normalized)) {
    return true;
  }
  const candidates = rawText.match(/\b[\d][\d -]{11,20}[\d]\b/g) ?? [];
  return candidates.some(candidate => {
    const digits = candidate.replace(/\D/g, "");
    return digits.length >= 13 && digits.length <= 19;
  });
}

function buildPaymentSafetyReply(rawText: string): string {
  if (!mentionsPaymentCredentials(rawText)) {
    return "";
  }
  return "Por tu seguridad, no nos mandes por aquí el número completo de una tarjeta o cuenta: no lo vamos a usar ni a guardar.\n\nEl pago se hace en la clínica o por un enlace seguro que te mandaria el equipo.";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "";
}

export function hasFullName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

// Compartido con guardrails.ts (preparePatientReply) y openai-dental-agent.ts
// (computeReady): un día sin franja u hora concreta ("la semana que viene")
// no cuenta como disponibilidad reservable.
export function hasConcreteAvailability(availability: string) {
  const normalized = normalize(availability);
  const hasDay = /\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|esta semana|proxima semana|\d{1,2}[/-]\d{1,2})\b/.test(normalized);
  const hasTime =
    /\b([01]?\d|2[0-3])(?::|\.|h)([0-5]\d)?\b/.test(availability) ||
    /\b(manana|tarde|por la manana|por la tarde|primera hora|ultima hora|temprano)\b/.test(normalized);
  return hasDay && hasTime;
}

// Unica fuente de verdad para "estan todos los datos administrativos listos
// para ofrecer huecos" (consent + nombre completo + telefono + email + sede).
// Bug real (revision PR #11, "Keep location-only states in data collection"):
// computeBookingStatus devolvia READY_TO_OFFER_SLOTS solo porque existia
// state.location, aunque siguieran faltando consentimiento/nombre/email/
// telefono - el estado persistido decia "listo para ofrecer huecos" cuando el
// siguiente paso real seguia siendo pedir esos datos. Funcion unica, reusada
// tambien por canOfferAvailabilityOptions, para que ambos sitios nunca puedan
// desincronizarse.
export function hasSlotOfferPrerequisites(state: DentalAgentState): boolean {
  return Boolean(
    state.intent &&
    state.consent &&
    hasFullName(state.name) &&
    state.phone &&
    state.email &&
    state.location
  );
}

// Unica fuente de verdad para derivar bookingStatus a partir de los datos ya
// presentes en el estado (consent/nombre/telefono/sede/disponibilidad/ready).
// Reusada tal cual por dental-agent-migration.ts (mapBookingStatus) para que
// el estado antiguo/compat nunca recalcule esta misma logica por su cuenta -
// solo aplica CONFIRMED/CANCELLED encima cuando hay una señal real del
// Appointment (nunca se infiere CONFIRMED de una cadena de disponibilidad).
export function computeBookingStatus(state: DentalAgentState): BookingStatus {
  if (state.ready && hasConcreteAvailability(state.availability)) return "PREBOOKED";
  if (state.availability) return "SLOT_SELECTED";
  if (state.offeredAvailabilityOptions.length > 0) return "SLOTS_OFFERED";
  if (hasSlotOfferPrerequisites(state)) return "READY_TO_OFFER_SLOTS";
  if (state.consent) return "COLLECTING_PATIENT_DATA";
  if (state.intent) return "COLLECTING_CONSENT";
  return "IDLE";
}

const CORRECTION_PATTERNS = [/en realidad/, /me (he )?confund/, /me (he )?equivoc/, /\bcorrijo\b/, /quise decir/];

function isExplicitCorrection(normalized: string): boolean {
  return CORRECTION_PATTERNS.some(pattern => pattern.test(normalized));
}

function completeNameWithSurname(currentName: string, incomingName: string) {
  if (!incomingName || hasFullName(currentName)) {
    return currentName;
  }
  const currentNormalized = normalize(currentName);
  const incomingNormalized = normalize(incomingName);
  if (!incomingNormalized || currentNormalized === incomingNormalized || currentNormalized.includes(incomingNormalized)) {
    return currentName;
  }
  return `${currentName.trim()} ${incomingName.trim()}`.replace(/\s+/g, " ").slice(0, 48);
}

// Variación determinista (testeable) a partir del texto del paciente, para que
// las aperturas no suenen siempre identicas.
function pickVariant(options: string[], seed: string) {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997;
  }
  return options[hash % options.length];
}

function requestedSlotOptionsPeriod(text: string) {
  const normalized = normalize(text);
  const asksForOptions = /(que dias|que dia|que huecos|que horas|tienes|teneis|disponible|disponibilidad|opciones|hueco|huecos)/.test(normalized);
  if (!asksForOptions) {
    return "";
  }
  if (/\b(tarde|tardes|por la tarde|por las tardes)\b/.test(normalized)) {
    return "tarde";
  }
  if (/\b(manana|mananas|por la manana|por las mananas)\b/.test(normalized)) {
    return "manana";
  }
  return "";
}

function buildGuidedAvailabilityReply(location: string, period: string, offeredOptions: string[] = []) {
  const options = offeredOptions.length > 0 ? offeredOptions : fallbackAvailabilityOptions(period);
  const lines = options.map((slot, index) => `${index + 1}. ${slot}`);
  const periodText = period ? ` de ${period}` : "";
  return [`Te puedo proponer estos huecos${periodText} en ${location}:`, ...lines, "Responde con 1, 2 o 3 y te la dejo pre-reservada."].join("\n\n");
}

// Movida desde guardrails.ts (PR #11, fix "la tercera"): el motor local
// tambien necesita saber si el ultimo mensaje del asistente ofrecio huecos,
// para resolver ordinales en texto libre - guardrails.ts sigue reexportando
// esta misma funcion para no romper sus imports existentes.
export function jumpsToBookingOptions(reply: string): boolean {
  const normalized = normalize(reply);
  return /(huecos|opciones|te propongo|pre-reservada|reservada|miercoles|jueves|viernes|lunes|martes)/.test(normalized);
}

// Formas de selección que NO requieren que el ultimo mensaje del asistente
// haya ofrecido huecos: un numero suelto o "opcion N" son inequivocos si ya
// hay offeredAvailabilityOptions en curso (no se confunden con nada mas).
const BARE_OPTION_PATTERNS: [RegExp, number][] = [
  [/^opcion\s*1$/, 0],
  [/^opcion\s*2$/, 1],
  [/^opcion\s*3$/, 2],
  [/^1$/, 0],
  [/^2$/, 1],
  [/^3$/, 2]
];

// Ordinales en texto libre ("la tercera", "tercera", "el tercero"): mucho mas
// ambiguos fuera de contexto ("la tercera vez que vine..."), asi que solo se
// resuelven cuando el ultimo mensaje del asistente realmente ofrecio huecos.
const ORDINAL_OPTION_PATTERNS: [RegExp, number][] = [
  [/\b(la primera|el primero|primera|primero)\b/, 0],
  [/\b(la segunda|el segundo|segunda|segundo)\b/, 1],
  [/\b(la tercera|el tercero|tercera|tercero)\b/, 2]
];

// Fase 4/PR #11: unica funcion determinista para resolver una seleccion de
// hueco contra offeredAvailabilityOptions - la usan tanto el motor local
// (runDentalSeniorTurn, mas abajo) como el router (dental-agent-router.ts),
// para que nunca puedan divergir en que cuenta como "el paciente eligio el
// hueco N". assistantOfferedSlotsLastTurn (si Clara realmente ofrecio huecos
// en su ultimo mensaje) es obligatorio para ordinales en texto libre, no para
// un numero/opcion N suelto (ya inequivocos por si solos si hay huecos
// ofrecidos).
export function resolveSelectedAvailabilityOption(
  offeredOptions: string[],
  normalizedText: string,
  assistantOfferedSlotsLastTurn: boolean
): string {
  if (offeredOptions.length === 0) {
    return "";
  }
  const trimmed = normalizedText.trim();
  for (const [pattern, index] of BARE_OPTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return offeredOptions[index] ?? "";
    }
  }
  if (assistantOfferedSlotsLastTurn) {
    for (const [pattern, index] of ORDINAL_OPTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        return offeredOptions[index] ?? "";
      }
    }
  }
  return "";
}

function fallbackAvailabilityOptions(period: string) {
  const hour = period === "tarde" ? [17, 18, 17] : [10, 11, 10];
  const start = new Date();
  const slots: string[] = [];
  for (let offset = 1; offset <= 10 && slots.length < 3; offset += 1) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + offset);
    if (candidate.getDay() === 0 || candidate.getDay() === 6) {
      continue;
    }
    candidate.setHours(hour[slots.length] ?? hour[0], 0, 0, 0);
    slots.push(
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(candidate)
    );
  }
  return slots;
}

function canOfferAvailabilityOptions(state: DentalAgentState) {
  return hasSlotOfferPrerequisites(state) && !state.availability;
}

function completeDentalState(state: DentalAgentState): DentalAgentState {
  const ready = Boolean(
    state.intent &&
    state.consent &&
    hasFullName(state.name) &&
    state.phone &&
    (state.escalated || state.email) &&
    state.location &&
    hasAppointmentAvailability(state.availability) &&
    !state.requiresGuardian &&
    !state.dataErasureRequested
  );
  return { ...state, ready };
}

// Hotfix dental-negation-context: traumaNegated ya viene de
// extractAffirmedAndNegatedClinicalSignals (deteccion de negacion por
// clausula, no una lista cerrada de frases) - sustituye a la vieja
// isTraumaNegated, que no reconocia frases como "no he recibido ningun
// golpe".
// Bug real (Problema 2 / CASO F): negar fiebre/hinchazon/pus al responder la
// pregunta general de seguridad ("no tengo fiebre, hinchazon ni pus...")
// coincidia con las palabras sueltas de la rama generica de urgent_pain (mas
// abajo) y reclasificaba el intent aunque el paciente estuviera DESCARTANDO
// alarmas, no reportandolas. Reutiliza el mismo escaneo por clausula que
// extractAffirmedAndNegatedClinicalSignals para saber si la mencion esta
// realmente negada en su propia clausula.
function mentionsUrgentAlarmWithoutNegation(normalized: string): boolean {
  const clauses = normalized
    .split(CLAUSE_SPLIT_PATTERN)
    .map(clause => clause.trim())
    .filter(Boolean);
  return clauses.some(
    clause => /(dolor|duele|hinchad|inflamad|pus|flemon|urgencia)/.test(clause) && !NEGATION_CUE_PATTERN.test(clause)
  );
}

function inferIntent(
  current: DentalIntentId | undefined,
  normalized: string,
  signals: string[],
  redFlags: string[],
  traumaNegated: boolean
): DentalIntentId | undefined {
  if (asksAppointmentManagement(normalized)) {
    return current;
  }
  const mentionsWisdomTooth = /(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/.test(normalized);
  if (redFlags.length > 0) {
    if (/(golpe|trauma|accidente|caida|roto)/.test(normalized) && !traumaNegated) {
      return "trauma";
    }
    if (mentionsWisdomTooth) {
      return "wisdom_tooth";
    }
    return "urgent_pain";
  }
  if (/(golpe|trauma|accidente|caida|se ha salido|diente fuera)/.test(normalized) && !traumaNegated) return "trauma";
  if (current === "trauma" && looksLikeTraumaFollowUp(normalized) && !traumaNegated) return "trauma";
  if (mentionsWisdomTooth) return "wisdom_tooth";
  if (/(implante|me falta|perdi una pieza|sin muela|sin diente)/.test(normalized)) return "implant_price";
  if (/(ortodoncia|alineador|invisible|invisalign|brackets|aparato|retenedor|retencion|apin|mordida)/.test(normalized)) return "orthodontics";
  if (/(blanque|dientes blancos)/.test(normalized)) return "whitening";
  if (/(estetica|sonrisa|carilla|carillas|diseno de sonrisa|smile design|composite estetico|mejorar sonrisa)/.test(normalized)) return "cosmetic_dentistry";
  if (
    /(sangran las encias|encia|encias|periodon|mal aliento|movilidad|se me mueve|se mueve|mueve un diente|diente se mueve|diente flojo|muela floja)/.test(
      normalized
    ) ||
    signals.includes("sangrado de encias")
  ) return "periodontics";
  if (/(funda|corona|protesis|empaste.*caido|se me ha caido|se mueve la funda|diente roto|muela rota|pieza rota|roto un diente|rota una muela)/.test(normalized)) return "prosthetics";
  if (/(bruxismo|aprieto|rechino|chasquido|mandibula|atm|dolor de cabeza)/.test(normalized)) return "tmj_bruxism";
  if (/(late|pulsatil|por la noche|me despierta|calor|dolor espontaneo|nervio)/.test(normalized)) return "endodontics";
  if (/(frio|dulce|agujero|mancha|caries|empaste|sensibilidad|al morder)/.test(normalized)) return "caries_restoration";
  if (mentionsUrgentAlarmWithoutNegation(normalized) || signals.includes("dolor intenso")) return "urgent_pain";
  if (/(limpieza|limpiar|higiene|quitar sarro|sarro)/.test(normalized)) return "reactivation";
  if (/(revision|revisar|primera visita|cita|valoracion)/.test(normalized)) return current ?? "first_visit";
  return current;
}

// Hotfix dental-clinical-authority: subconjunto de redFlagPatterns (arriba)
// que por si solo ya justifica EMERGENCY - reusado tal cual por
// classifyAuthorizedRedFlagSignal (mas abajo) para que la IA nunca pueda
// escalar con una senal que el motor local no reconoceria como emergencia.
const EMERGENCY_RED_FLAG_LABELS = new Set([
  "dificultad para respirar",
  "dificultad para tragar o hablar",
  "hinchazon en cuello, boca u ojo",
  "sangrado no controlado"
]);

function getTriageLevel(intent: DentalIntentId | undefined, redFlags: string[], signals: string[]): TriageLevel {
  if (redFlags.some(flag => EMERGENCY_RED_FLAG_LABELS.has(flag))) {
    return "EMERGENCY";
  }
  if (redFlags.length > 0 || signals.includes("inflamación") || signals.includes("dolor intenso") || intent === "endodontics" || intent === "wisdom_tooth" || intent === "trauma") {
    return "URGENT_24H";
  }
  if (intent === "caries_restoration" || intent === "periodontics" || intent === "prosthetics" || intent === "implant_price") {
    return "PRIORITY_72H";
  }
  if (intent === "whitening" || intent === "cosmetic_dentistry") {
    return "ESTHETIC";
  }
  return "ROUTINE";
}

function getMissingClinicalData(
  intent: DentalIntentId | undefined,
  signals: string[],
  safetyScreened: boolean,
  bleedingDifferentialResolved: boolean
) {
  const missing: string[] = [];
  if (!intent) return missing;
  if (["urgent_pain", "endodontics", "caries_restoration"].includes(intent) && !safetyScreened) {
    if (!signals.some(signal => ["dolor al morder", "sensibilidad al frio/calor", "dolor pulsátil/nocturno"].includes(signal))) {
      missing.push("El dolor aparece con frio/calor, al morder o aparece solo sin tocar la pieza?");
    }
  }
  if (intent === "trauma" && !safetyScreened) {
    missing.push("Cuando te diste el golpe y cuanto te duele del 0 al 10? Puedes abrir la boca y tragar bien?");
  }
  if (["urgent_pain", "endodontics", "wisdom_tooth"].includes(intent) && !safetyScreened) {
    missing.push("Desde cuando ocurre y que intensidad tiene del 0 al 10?");
  }
  // Hotfix dental-negation-context (Problema 2): esta pregunta se cierra con
  // su propio flag (bleedingDifferentialResolved) ademas de safetyScreened -
  // asi no se repite una vez respondida especificamente, pero resolverla
  // tampoco da por completo el cribado general (fiebre/hinchazon/pus/
  // dificultad siguen pendientes hasta que safetyScreened tambien sea true).
  if (intent === "periodontics" && signals.includes("sangrado de encias") && !bleedingDifferentialResolved && !safetyScreened) {
    missing.push("El sangrado es leve o abundante, y ha empezado tras un golpe?");
  }
  // bleedingDifferentialResolved tambien cierra esta pregunta cuando ambas
  // señales (sangrado + movilidad) coinciden en la misma conversación: pregunta
  // por el mismo trauma/sangrado de fondo, resolverlo una vez basta.
  if (intent === "periodontics" && signals.includes("movilidad dental") && !safetyScreened && !bleedingDifferentialResolved) {
    missing.push("Te duele, notas inflamación, sangrado o ha sido por un golpe?");
  }
  if (intent === "periodontics" && !signals.some(signal => ["sangrado de encias", "movilidad dental"].includes(signal))) {
    missing.push("Hay sangrado al cepillar, mal aliento, movilidad o encia retraida?");
  }
  if (intent === "implant_price" && !signals.includes("pieza ausente")) {
    missing.push("La pieza ya falta o todavia hay que extraerla?");
  }
  // Bug real (produccion): con dos condiciones cumplidas a la vez (p.ej.
  // "me duele una muela" dispara frio/calor Y desde-cuando/intensidad), el
  // array llegaba con 2 preguntas y el LLM las hacia ambas en el mismo
  // turno, violando "una pregunta, una respuesta". Nunca mas de una a la vez.
  return missing.slice(0, 1);
}

function getConfidence(intent: DentalIntentId | undefined, signals: string[], redFlags: string[]) {
  if (!intent) return "Baja";
  if (redFlags.length > 0 || signals.length >= 3) return "Alta";
  if (signals.length >= 1) return "Media";
  return "Baja";
}

// Hotfix dental-clinical-authority: orden de urgencia para comparar el
// triaje local con una posible elevacion validada de la IA (mergeClinicalEscalation,
// openai-dental-agent.ts) - la IA solo puede subir, nunca bajar.
export const TRIAGE_URGENCY_ORDER: Record<TriageLevel, number> = {
  ESTHETIC: 0,
  ROUTINE: 1,
  PRIORITY_72H: 2,
  URGENT_24H: 3,
  EMERGENCY: 4
};

// Hotfix dental-clinical-authority: valida una senal de alarma que la IA
// reporte (aiOutput.redFlags) contra los MISMOS patrones deterministas que
// usa el motor local (redFlagPatterns) - nunca se confia en la etiqueta o el
// nivel que la IA declare por si solos, solo en si el texto realmente
// coincide con una senal reconocida por codigo. Devuelve el nivel que esa
// senal justificaria (o null si no coincide con ninguna).
export function classifyAuthorizedRedFlagSignal(candidateText: string): "EMERGENCY" | "URGENT_24H" | null {
  const normalized = normalize(candidateText);
  const matched = redFlagPatterns.find(rule => rule.pattern.test(normalized));
  if (!matched) return null;
  return EMERGENCY_RED_FLAG_LABELS.has(matched.label) ? "EMERGENCY" : "URGENT_24H";
}

export function triageLabel(level: TriageLevel) {
  switch (level) {
    case "EMERGENCY":
      return "Emergencia inmediata";
    case "URGENT_24H":
      return "Urgencia 24h";
    case "PRIORITY_72H":
      return "Prioridad 48-72h";
    case "ESTHETIC":
      return "Estética programable";
    case "ROUTINE":
    default:
      return "Cita normal";
  }
}

function detectLabels(normalized: string, rules: Array<{ label: string; pattern: RegExp }>) {
  return rules
    .filter(rule => rule.pattern.test(normalized) && !isNegatedLabel(rule.label, normalized))
    .map(rule => rule.label);
}

function detectSafetyScreen(normalized: string, redFlags: string[]) {
  if (redFlags.length > 0) return true;
  return /(no tengo fiebre|sin fiebre|no hay fiebre|no esta hinchad|sin hinchazon|no tengo hinchazon|noto inflamacion|tengo inflamacion|hay inflamacion|puedo tragar|puedo respirar|no sangra|sangrado leve|sangra poco|leve|no hay pus|sin golpe|no ha sido golpe|dolor [0-7])/.test(normalized);
}

function detectTraumaSafetyScreen(normalized: string, redFlags: string[]) {
  if (redFlags.length > 0) return true;
  return (
    /(sin dificultad|con normalidad|todo normal)/.test(normalized) ||
    (mentionsOpeningAnswer(normalized) && mentionsSwallowingAnswer(normalized))
  );
}

function looksLikeTraumaFollowUp(normalized: string) {
  return /(ayer|hoy|anoche|esta manana|esta tarde|hace|me duele|dolor|del 0 al 10|[0-9]\s*(de|\/)\s*10|puedo abrir|puedo tragar|abrir la boca|tragar)/.test(normalized);
}

function mentionsOpeningAnswer(normalized: string) {
  return /(puedo abrir|abro bien|abrir la boca|sin dificultad.*abrir|abrir.*sin dificultad|no me cuesta abrir)/.test(normalized);
}

function mentionsSwallowingAnswer(normalized: string) {
  return /(puedo tragar|trago bien|tragar bien|sin dificultad.*tragar|tragar.*sin dificultad|no me cuesta tragar)/.test(normalized);
}

function isPainNegated(normalized: string) {
  return /(no hay dolor|no tengo dolor|sin dolor|no me duele|no duele|no es dolor)/.test(normalized);
}

function isNegatedLabel(label: string, normalized: string) {
  if (label === "dolor intenso") {
    return isPainNegated(normalized);
  }
  if (label.includes("fiebre")) {
    return /(sin fiebre|no tengo fiebre|no hay fiebre)/.test(normalized);
  }
  if (label.includes("hinchazon") || label === "inflamación") {
    return /(sin hinchazon|no tengo hinchazon|no hay hinchazon|no esta hinchad|sin inflamacion|no tengo inflamacion)/.test(normalized);
  }
  if (label.includes("sangrado")) {
    return /(no sangra|no hay sangrado|sin sangrado|ni sangrado|no me sangra)/.test(normalized);
  }
  if (label.includes("pus")) {
    return /(no hay pus|sin pus)/.test(normalized);
  }
  if (label.includes("tragar") || label.includes("respirar")) {
    // "puedo respirar/tragar" es un substring literal de "no puedo
    // respirar/tragar": sin el lookbehind, la frase de emergencia real se
    // cancelaba a si misma y nunca escalaba.
    return /(?<!no )puedo tragar|(?<!no )puedo respirar|sin dificultad para tragar|sin dificultad para respirar/.test(
      normalized
    );
  }
  if (label.includes("abrir")) {
    return /(?<!no )puedo abrir|abro bien|sin dificultad para abrir/.test(normalized);
  }
  return false;
}

function extractName(text: string) {
  const match = text.match(/\b(?:me llamo|mi nombre es)\s+([^,.;]+)/i) ?? text.match(/\bsoy\s+(?!de\b)([^,.;]+)/i);
  if (!match?.[1]) {
    return "";
  }
  return cleanNameCandidate(match[1].replace(/\s+y\s+.*/i, ""), { allowReservedWords: true });
}

function extractNameNextToPhone(text: string) {
  if (!PHONE_PATTERN.test(text)) {
    return "";
  }
  return cleanNameCandidate(text);
}

function extractPhone(text: string) {
  const match = text.match(PHONE_PATTERN);
  return match ? match[0].replace(/[^\d+]/g, "") : "";
}

const PHONE_PATTERN = /(?:\+?34[\s.-]?)?[6789](?:[\s.-]?\d){8}/;

function extractEmail(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

// Heuristica ligera, no detección de idioma real: solo palabras muy
// distintivas para evitar falsos positivos con mensajes en espanol mezclados
// con alguna palabra suelta (eso ya lo cubre el motor de intenciones).
const ENGLISH_SIGNAL_PATTERN = /\b(hi|hello|hey|tooth|toothache|appointment|please|thanks|thank you)\b/;
const CATALAN_SIGNAL_PATTERN = /\b(bon dia|bones|queixal|dona'm|doneu|podeu|teniu|gracies|si us plau)\b/;

function detectsNonSpanishLanguage(rawText: string): boolean {
  const normalized = normalize(rawText);
  return CATALAN_SIGNAL_PATTERN.test(normalized) || ENGLISH_SIGNAL_PATTERN.test(normalized);
}

const URGENCY_DEESCALATION_PATTERNS = [
  /puede esperar/,
  /no es para tanto/,
  /ya no (me duele|duele) tanto/,
  /se me ha pasado/,
  /prefiero esperar/,
  /no hace falta tanta prisa/
];

function patientDeescalatesUrgency(normalized: string): boolean {
  return URGENCY_DEESCALATION_PATTERNS.some(pattern => pattern.test(normalized));
}

function looksLikeInvalidEmail(text: string) {
  return text.includes("@") && !extractEmail(text);
}

// Solo dispara cuando el paciente lo enmarca explicitamente como su teléfono
// ("mi teléfono es 123"), para no confundir cualquier número corto suelto en
// el mensaje (precio, edad, fecha) con un intento de teléfono.
function looksLikeInvalidPhoneAttempt(text: string) {
  if (PHONE_PATTERN.test(text)) {
    return false;
  }
  return /(mi\s+telefono\s+es|mi\s+numero\s+es|telefono\s*:|numero\s*:)\s*\+?\d{1,8}\b/.test(normalize(text));
}

// Palabras que descartan que una respuesta corta sea un nombre.
const NON_NAME_WORDS = new Set([
  "si", "no", "vale", "ok", "okay", "hola", "buenas", "gracias", "acepto", "claro",
  "perfecto", "genial", "bien", "mal", "ya", "aqui", "manana", "tarde", "noche",
  "murcia", "elche", "cita", "urgencia", "dolor", "muela", "porque", "que", "cuando",
  "desde", "ayer", "hoy", "anoche", "hace", "semana", "semanas", "dia", "dias",
  "mes", "meses", "mucho", "poco", "nada", "todo", "fuerte", "por", "la", "el"
]);

// Replica el orden de preguntas de buildDentalReply/nextStep para saber si el
// último mensaje del agente pidio el nombre: solo entonces se puede tratar una
// respuesta suelta como nombre (evita guardar "desde ayer" como nombre cuando
// la pregunta pendiente era clínica).
function wasAskedForName(state: DentalAgentState): boolean {
  if (!state.intent || !state.consent || state.name) {
    return false;
  }
  if (state.triageLevel === "EMERGENCY") {
    return true;
  }
  const safetyPending =
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent);
  if (safetyPending) {
    return false;
  }
  if (!state.escalated && state.missingClinicalData.length > 0) {
    return false;
  }
  return true;
}

function wasAskedForConsent(state: DentalAgentState): boolean {
  if (!state.intent || state.consent) {
    return false;
  }
  if (state.triageLevel === "EMERGENCY") {
    return true;
  }
  const safetyPending =
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent);
  if (safetyPending) {
    return false;
  }
  if (!state.escalated && state.missingClinicalData.length > 0) {
    return false;
  }
  // Fix real (CASO 1): una peticion de cita administrativa (limpieza) sin
  // sintomas ahora pregunta la sede ANTES que el consentimiento (ver
  // nextStep). Mientras falte la sede, un "vale"/"si" suelto responde a esa
  // pregunta, no es una aceptacion de guardar datos - sin esto,
  // acceptsConsent() (que reconoce "vale"/"si" sueltos) marcaria consent=true
  // por error antes de haber preguntado por los datos.
  if (state.intent === "reactivation" && !state.location) {
    return false;
  }
  // Hotfix dental-negation-context (Problema 1): mientras la oferta de ayuda
  // con la cita siga pendiente de resolver, un "si"/"vale" suelto responde a
  // ESA oferta, no es una aceptacion de guardar datos - sin esto,
  // acceptsConsent() marcaria consent=true por error en el mismo turno que
  // debia limitarse a aceptar (o declinar) la oferta.
  if (
    !state.escalated &&
    !state.appointmentHelpAccepted &&
    !state.appointmentHelpDeclined &&
    CLINICAL_SAFETY_INTENTS.includes(state.intent) &&
    state.safetyScreened
  ) {
    return false;
  }
  return true;
}

function extractBareName(raw: string) {
  return cleanNameCandidate(raw);
}

function cleanNameCandidate(raw: string, options: { allowReservedWords?: boolean } = {}) {
  const candidate = raw
    .replace(new RegExp(PHONE_PATTERN.source, "g"), "")
    .replace(/\b(?:telefono|tel|movil|contacto|numero)\b/gi, " ")
    .replace(/[,;.!?:/|]+/g, " ")
    .replace(/\s*[-–—]+\s*$/g, " ")
    .replace(/^\s*[-–—]+\s*/g, " ")
    .replace(/\s+[-–—]+\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!/^[\p{L}][\p{L}' -]{1,47}$/u.test(candidate)) {
    return "";
  }
  const words = candidate.split(" ");
  if (words.length > 4 || (!options.allowReservedWords && words.some(word => NON_NAME_WORDS.has(normalize(word))))) {
    return "";
  }
  return candidate.slice(0, 48);
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
  const day = extractPreferredDay(normalized, raw);
  const timePreference = extractPreferredTimePreference(normalized, raw, day);
  if (!day || !timePreference) {
    return "";
  }
  if (day === "manana" && timePreference === "manana" && !/(por la manana|por las mananas|a la manana|de manana|temprano|primera hora|matinal)/.test(normalized)) {
    return "";
  }
  return `${day} ${timePreference}`.trim();
}

function hasAppointmentAvailability(availability: string) {
  const normalized = normalize(availability);
  return Boolean(extractAvailability(normalized, availability));
}

function extractPreferredDay(normalized: string, raw: string) {
  const explicitDate = raw.match(/\b(?:[0-3]?\d[/-][01]?\d(?:[/-]\d{2,4})?)\b/)?.[0];
  if (explicitDate) {
    return explicitDate;
  }
  return normalized.match(/\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|esta semana|proxima semana)\b/)?.[0] ?? "";
}

function extractPreferredTimePreference(normalized: string, raw: string, day = "") {
  const timeMatch = raw.match(/\b([01]?\d|2[0-3])(?::|\.|h)([0-5]\d)?\b/)?.[0];
  if (timeMatch) {
    return timeMatch.replace(/\.$/, "");
  }
  const bareHour = day ? extractBareHourNearDay(normalized, day) : "";
  if (bareHour) {
    return bareHour;
  }
  return extractPreferredDayPeriod(normalized);
}

function extractBareHourNearDay(normalized: string, day: string) {
  const escapedDay = day.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${escapedDay}\\b\\s*(?:a\\s+las?|sobre\\s+las?|a\\s+)?([01]?\\d|2[0-3])\\b`),
    new RegExp(`\\b([01]?\\d|2[0-3])\\b\\s*(?:el\\s+)?\\b${escapedDay}\\b`)
  ];
  const match = patterns.map(pattern => normalized.match(pattern)).find(Boolean);
  if (!match) {
    return "";
  }
  return `${match[1].padStart(2, "0")}:00`;
}

function extractPreferredDayPeriod(normalized: string) {
  if (
    /\b(tarde|tardes|por la tarde|por las tardes|a la tarde|despues de comer)\b/.test(normalized) ||
    /\b(vespertino|ultima hora)\b/.test(normalized)
  ) {
    return "tarde";
  }

  if (
    /\b(manana|mananas|por la manana|por las mananas|a la manana|de manana)\b/.test(normalized) ||
    /\b(temprano|primera hora|matinal)\b/.test(normalized)
  ) {
    return "manana";
  }

  return "";
}

function acceptsConsent(normalized: string) {
  const value = normalized.trim();
  return /(\bacepto\b|\bautorizo\b|\bconsiento\b|de acuerdo|\bok\b|\bvale\b)/.test(value) || /^si[,.! ]?$/.test(value);
}

function acceptsExplicitConsent(normalized: string) {
  return /\b(acepto|autorizo|consiento)\b.{0,50}\b(datos|guardar|guarde|gestionarla|gestionarlo|cita)\b/.test(normalized);
}

// Hotfix dental-negation-context (Problema 1): interpreta la respuesta a la
// oferta de ayuda con la cita. declinesAppointmentHelp se comprueba primero
// (una negacion explicita nunca se confunde con una aceptacion).
function declinesAppointmentHelp(normalized: string) {
  return /\bno\b/.test(normalized);
}

function acceptsAppointmentHelp(normalized: string) {
  if (declinesAppointmentHelp(normalized)) return false;
  return /(\bsi\b|\bvale\b|\bdale\b|\bok\b|de acuerdo|ayudame|ayudeme|quiero cita|porfavor|por favor)/.test(normalized);
}

// Hotfix dental-negation-context (Problema 3): replica la secuencia completa
// de nextStep() para identificar, en terminos semanticos, que pregunta u
// oferta hara ESTE turno - se persiste para poder interpretar correctamente
// una respuesta corta ("si"/"no, gracias") el turno siguiente segun el
// contexto real, no solo por texto suelto.
function identifyLastAssistantAction(
  state: Pick<
    DentalAgentState,
    | "intent"
    | "redFlags"
    | "safetyScreened"
    | "missingClinicalData"
    | "escalated"
    | "bleedingDifferentialResolved"
    | "consent"
    | "name"
    | "email"
    | "phone"
    | "location"
    | "availability"
    | "appointmentHelpAccepted"
    | "appointmentHelpDeclined"
  >
): LastAssistantAction {
  if (state.intent === "trauma" && state.redFlags.length === 0 && !state.safetyScreened) {
    return "ASK_CLINICAL_SAFETY";
  }
  if (
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent ?? "")
  ) {
    return "ASK_CLINICAL_SAFETY";
  }
  if (!state.escalated && state.missingClinicalData[0]) {
    return "ASK_CLINICAL_SAFETY";
  }
  if (!state.escalated && state.intent === "caries_restoration" && state.redFlags.length === 0 && !state.safetyScreened) {
    return "ASK_CLINICAL_SAFETY";
  }
  if (
    !state.escalated &&
    state.intent === "periodontics" &&
    state.redFlags.length === 0 &&
    !state.safetyScreened &&
    state.bleedingDifferentialResolved
  ) {
    return "ASK_CLINICAL_SAFETY";
  }
  if (!state.escalated && state.intent === "reactivation" && !state.consent && !state.location) {
    return "ASK_LOCATION";
  }
  if (
    !state.escalated &&
    !state.consent &&
    !state.appointmentHelpAccepted &&
    !state.appointmentHelpDeclined &&
    state.intent &&
    CLINICAL_SAFETY_INTENTS.includes(state.intent) &&
    state.safetyScreened
  ) {
    return "OFFER_APPOINTMENT_HELP";
  }
  if (!state.escalated && !state.consent && state.appointmentHelpDeclined) {
    return "";
  }
  if (!state.consent) {
    return "ASK_PRIVACY_CONSENT";
  }
  if (!state.name || !hasFullName(state.name)) {
    return "ASK_NAME";
  }
  if (!state.escalated && !state.email) {
    return "ASK_EMAIL";
  }
  if (!state.phone) {
    return "ASK_PHONE";
  }
  if (!state.location) {
    return "ASK_LOCATION";
  }
  if (!state.availability) {
    return "OFFER_SLOTS";
  }
  return "";
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
