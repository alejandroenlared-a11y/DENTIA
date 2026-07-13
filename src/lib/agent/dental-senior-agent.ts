import { demoKnowledge, type DemoScenarioId } from "@/lib/agent/demo-data";

export type DentalIntentId =
  | DemoScenarioId
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
  location: string;
  availability: string;
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
};

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
  followUp: string[];
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
  location: "",
  availability: "",
  ready: false,
  triageLevel: "ROUTINE",
  triageLabel: "Pendiente",
  clinicalReading: "Esperando descripcion del paciente.",
  likelyCauses: [],
  detectedSignals: [],
  redFlags: [],
  missingClinicalData: [],
  confidence: "Baja",
  safetyScreened: false
};

export const intentProfiles: Record<DentalIntentId, IntentProfile> = {
  first_visit: {
    title: "Primera visita",
    intentCode: "CITA_PRIMERA_VISITA",
    treatmentNeed: "Primera visita y diagnostico digital",
    budget: "0 EUR",
    estimatedValue: 35000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["revision general", "molestia sin clasificar", "valoracion preventiva"],
    clinicalReading: "Puede encajar con una primera valoracion para revisar el estado de una pieza o resolver dudas.",
    priceNote: "La primera visita y diagnostico digital es sin coste.",
    followUp: ["Que pieza o zona quieres revisar?", "Tienes dolor, sensibilidad o solo quieres una revision?"]
  },
  urgent_pain: {
    title: "Dolor / infeccion",
    intentCode: "TRIAJE_DOLOR_INFECCION",
    treatmentNeed: "Urgencia dental",
    budget: "desde 70 EUR",
    estimatedValue: 22000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pulpitis", "absceso dental", "fisura", "infeccion periodontal", "pericoronaritis"],
    clinicalReading:
      "Los sintomas de dolor intenso, dolor pulsatil, hinchazon o mal sabor pueden sugerir inflamacion o infeccion odontogena. Requiere valoracion prioritaria.",
    priceNote: "La urgencia dental parte desde 70 EUR; el tratamiento definitivo depende de la exploracion.",
    followUp: [
      "El dolor es espontaneo o aparece al morder?",
      "Hay hinchazon, fiebre, pus, mal sabor o dificultad para abrir la boca?",
      "Desde cuando ocurre y que intensidad tiene del 0 al 10?"
    ]
  },
  implant_price: {
    title: "Implante",
    intentCode: "IMPLANTE_PROTESIS_VALORACION",
    treatmentNeed: "Implante unitario",
    budget: "desde 1.200 EUR",
    estimatedValue: 120000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["ausencia de pieza", "pieza no restaurable", "rehabilitacion con implante", "protesis sobre implante"],
    clinicalReading:
      "Si falta una pieza o esta pendiente de extraccion, conviene valorar hueso, encia, mordida y pruebas de imagen antes de cerrar presupuesto.",
    priceNote: "El implante unitario parte desde 1.200 EUR y puede financiarse hasta 24 meses segun aprobacion.",
    followUp: [
      "La pieza ya falta o te han dicho que hay que extraerla?",
      "En que zona es: muela, premolar o diente frontal?",
      "Tienes radiografia reciente o presupuesto previo?"
    ]
  },
  whitening: {
    title: "Blanqueamiento",
    intentCode: "ESTETICA_BLANQUEAMIENTO",
    treatmentNeed: "Blanqueamiento",
    budget: "desde 280 EUR",
    estimatedValue: 28000,
    defaultTriage: "ESTHETIC",
    likelyCauses: ["tratamiento estetico", "tincion dental", "evento proximo", "mantenimiento de sonrisa"],
    clinicalReading:
      "El blanqueamiento puede ser una buena opcion estetica, pero antes se revisa sensibilidad, encia, caries y restauraciones visibles.",
    priceNote: "El blanqueamiento empieza desde 280 EUR, pendiente de valorar sensibilidad y estado oral.",
    followUp: [
      "Tienes sensibilidad con frio o encia inflamada?",
      "Es para una fecha concreta?",
      "Has hecho blanqueamiento antes?"
    ]
  },
  reactivation: {
    title: "Higiene / mantenimiento",
    intentCode: "HIGIENE_PERIODONCIA",
    treatmentNeed: "Higiene dental",
    budget: "55 EUR",
    estimatedValue: 5500,
    defaultTriage: "ROUTINE",
    likelyCauses: ["mantenimiento periodontal", "sarro", "gingivitis", "revision preventiva"],
    clinicalReading:
      "Una higiene puede resolver sarro y sangrado leve, pero si hay sangrado frecuente, movilidad o mal aliento persistente conviene valorar periodoncia.",
    priceNote: "La higiene dental dura unos 45 minutos y tiene precio orientativo de 55 EUR.",
    followUp: [
      "Hace cuanto fue tu ultima limpieza?",
      "Te sangran las encias al cepillarte?",
      "Notas movilidad, mal sabor o retraccion de encia?"
    ]
  },
  orthodontics: {
    title: "Ortodoncia invisible",
    intentCode: "ORTODONCIA_INVISIBLE_ESTUDIO",
    treatmentNeed: "Ortodoncia invisible",
    budget: "desde 1.800 EUR",
    estimatedValue: 180000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["apinamiento", "malposicion dental", "mordida abierta/cruzada", "recidiva tras ortodoncia"],
    clinicalReading:
      "La ortodoncia invisible requiere estudio digital para confirmar si el caso es apto, duracion aproximada y presupuesto cerrado.",
    priceNote: "La ortodoncia invisible parte desde 1.800 EUR y se confirma tras estudio digital.",
    followUp: [
      "Que quieres corregir: apinamiento, separacion, mordida o estetica general?",
      "Has llevado ortodoncia antes?",
      "Buscas alineadores invisibles o tambien valorarias otra opcion?"
    ]
  },
  endodontics: {
    title: "Endodoncia / nervio",
    intentCode: "DOLOR_PULPAR_ENDODONCIA",
    treatmentNeed: "Endodoncia",
    budget: "desde 220 EUR",
    estimatedValue: 42000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pulpitis irreversible", "infeccion periapical", "caries profunda", "fractura con afectacion pulpar"],
    clinicalReading:
      "Dolor espontaneo, nocturno, pulsatil o sensibilidad que tarda en calmar puede apuntar a afectacion del nervio. Necesita valoracion prioritaria.",
    priceNote: "La endodoncia parte desde 220 EUR, pendiente de radiografia, pieza afectada y complejidad.",
    followUp: [
      "El dolor te despierta por la noche?",
      "El frio o el calor dejan dolor que dura varios segundos?",
      "Notas dolor al morder o tocar la pieza?"
    ]
  },
  caries_restoration: {
    title: "Caries / empaste",
    intentCode: "CARIES_RESTAURACION",
    treatmentNeed: "Empaste / conservadora",
    budget: "desde 65 EUR",
    estimatedValue: 11000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["caries", "filtracion de empaste", "fisura", "sensibilidad dentinaria"],
    clinicalReading:
      "Dolor breve con frio, dulce o al morder puede relacionarse con caries, filtracion de empaste o sensibilidad. Conviene revisar antes de que avance.",
    priceNote: "El empaste parte desde 65 EUR, pendiente de tamano y profundidad de la lesion.",
    followUp: [
      "La sensibilidad se va rapido o se queda rato?",
      "Ves un agujero, mancha oscura o empaste roto?",
      "Duele al morder?"
    ]
  },
  periodontics: {
    title: "Encias / periodoncia",
    intentCode: "PERIODONCIA_ENCIAS",
    treatmentNeed: "Periodoncia",
    budget: "desde 90 EUR",
    estimatedValue: 22000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["gingivitis", "periodontitis", "sarro subgingival", "inflamacion periodontal"],
    clinicalReading:
      "Sangrado de encias, mal aliento, retraccion o movilidad pueden sugerir inflamacion gingival o periodontal. Requiere exploracion y sondaje.",
    priceNote: "La valoracion periodontal parte desde 90 EUR segun prueba y tratamiento necesario.",
    followUp: [
      "Sangran las encias al cepillarte o espontaneamente?",
      "Notas dientes con movilidad o encia retraida?",
      "Hace cuanto fue tu ultima higiene?"
    ]
  },
  prosthetics: {
    title: "Corona / protesis",
    intentCode: "PROTESIS_CORONA_DESCEMENTADA",
    treatmentNeed: "Corona / protesis fija",
    budget: "desde 450 EUR",
    estimatedValue: 45000,
    defaultTriage: "PRIORITY_72H",
    likelyCauses: ["corona descementada", "fractura de corona", "empaste grande fracturado", "protesis desajustada"],
    clinicalReading:
      "Una corona o funda que se mueve, se cae o molesta debe revisarse para evitar caries, fractura del munon o irritacion de la encia.",
    priceNote: "Una corona parte desde 450 EUR; si solo hay recementado o ajuste puede ser menos.",
    followUp: [
      "La funda se ha caido por completo o solo se mueve?",
      "Hay dolor, mal olor o sangrado alrededor?",
      "La conservas en buen estado?"
    ]
  },
  wisdom_tooth: {
    title: "Muela del juicio",
    intentCode: "MUELA_JUICIO_PERICORONARITIS",
    treatmentNeed: "Extraccion muela del juicio",
    budget: "desde 120 EUR",
    estimatedValue: 28000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["pericoronaritis", "muela incluida", "infeccion local", "dolor de tercer molar"],
    clinicalReading:
      "Dolor en la zona posterior, encia inflamada, mal sabor o dificultad al abrir puede encajar con inflamacion alrededor de una muela del juicio.",
    priceNote: "La extraccion de muela del juicio parte desde 120 EUR; depende de posicion y complejidad.",
    followUp: [
      "Es la zona de atras del todo?",
      "Puedes abrir bien la boca?",
      "Hay hinchazon, mal sabor o dolor al tragar?"
    ]
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
    priceNote: "La ferula de descarga parte desde 180 EUR, pendiente de exploracion y registros.",
    followUp: [
      "Aprietas o rechinas los dientes por la noche?",
      "Tienes chasquidos al abrir o dolor cerca del oido?",
      "Te levantas con dolor de mandibula o cabeza?"
    ]
  },
  trauma: {
    title: "Traumatismo dental",
    intentCode: "TRAUMA_DENTAL",
    treatmentNeed: "Urgencia dental",
    budget: "desde 70 EUR",
    estimatedValue: 30000,
    defaultTriage: "URGENT_24H",
    likelyCauses: ["fractura dental", "luxacion", "avulsion", "trauma de tejidos blandos"],
    clinicalReading:
      "Un golpe, diente roto, diente que se mueve o sangrado tras traumatismo requiere valoracion urgente para conservar la pieza y controlar tejidos blandos.",
    priceNote: "La urgencia parte desde 70 EUR; el tratamiento depende de radiografia y tipo de trauma.",
    followUp: [
      "El diente se ha roto, se mueve o se ha salido?",
      "Hay sangrado que no para?",
      "Hace cuanto fue el golpe?"
    ]
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
  { label: "dolor pulsatil/nocturno", pattern: /(late|pulsatil|palpita|por la noche|me despierta|espontaneo|sin tocar)/ },
  { label: "dolor al morder", pattern: /(al morder|cuando mastico|masticar|presion|al cerrar)/ },
  { label: "sensibilidad al frio/calor", pattern: /(frio|calor|helado|bebida fria|bebida caliente|sensibilidad)/ },
  { label: "inflamacion", pattern: /(inflamad|hinchad|bulto|flemon|absceso|pus|mal sabor)/ },
  { label: "sangrado de encias", pattern: /(sangran las encias|sangrado de encias|encia sangra|sangra al cepillar)/ },
  { label: "movilidad dental", pattern: /(se mueve|movilidad|diente flojo)/ },
  { label: "pieza rota o funda", pattern: /(roto|fractur|funda|corona|empaste|se ha caido|caido)/ },
  { label: "pieza ausente", pattern: /(me falta|perdi una pieza|sin muela|sin diente|implante)/ },
  { label: "estetica", pattern: /(blanque|estetica|boda|sonrisa|dientes blancos)/ },
  { label: "ortodoncia", pattern: /(ortodoncia|alineador|invisible|brackets|apinado|apinamiento|mordida)/ },
  { label: "bruxismo/atm", pattern: /(bruxismo|aprieto|rechino|chasquido|mandibula|atm|dolor de cabeza)/ },
  { label: "muela del juicio", pattern: /(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/ }
];

export function runDentalSeniorTurn(current: DentalAgentState, rawText: string): DentalAgentTurn {
  const text = rawText.trim();
  const normalized = normalize(text);
  const redFlags = unique([...current.redFlags, ...detectLabels(normalized, redFlagPatterns)]);
  const detectedSignals = unique([...current.detectedSignals, ...detectLabels(normalized, signalPatterns)]);
  const intent = inferIntent(current.intent, normalized, detectedSignals, redFlags);
  const profile = intent ? intentProfiles[intent] : null;
  const name = current.name || extractName(text);
  const phone = current.phone || extractPhone(text);
  const location = current.location || extractLocation(normalized);
  const availability = current.availability || extractAvailability(normalized, text);
  const consent = current.consent || acceptsConsent(normalized);
  const safetyScreened = current.safetyScreened || detectSafetyScreen(normalized, redFlags);
  const triageLevel = getTriageLevel(intent, redFlags, detectedSignals);
  const missingClinicalData = getMissingClinicalData(intent, detectedSignals, safetyScreened);

  const nextState = completeDentalState({
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
    escalated: triageLevel === "EMERGENCY" || triageLevel === "URGENT_24H" || Boolean(profile && profile.defaultTriage === "URGENT_24H" && redFlags.length > 0),
    confidence: getConfidence(intent, detectedSignals, redFlags),
    missingClinicalData,
    safetyScreened,
    consent,
    name,
    phone,
    location,
    availability
  });

  return { state: nextState, reply: buildDentalReply(nextState, text) };
}

export function buildDentalSummary(state: DentalAgentState) {
  if (!state.intent) {
    return "Esperando motivo de consulta y sintomas.";
  }
  if (state.triageLevel === "EMERGENCY") {
    return "Senales de alarma detectadas. Derivacion inmediata a humano/urgencias.";
  }
  if (state.ready) {
    return state.escalated
      ? "Urgencia registrada con datos minimos para recepcion."
      : "Pre-reserva lista con orientacion clinica y presupuesto aproximado.";
  }
  return `${state.triageLabel}. ${state.clinicalReading}`;
}

function buildDentalReply(state: DentalAgentState, latestPatientText: string) {
  if (!state.intent) {
    return "Te leo. Para orientarte bien necesito situarte un poco: dime si es dolor, encia, una pieza rota, implante, ortodoncia, estetica o una revision. Si hay hinchazon importante, fiebre, sangrado que no para o dificultad para tragar/respirar, lo tratamos como urgente.";
  }

  const profile = intentProfiles[state.intent];
  const clinicalIntro = naturalClinicalIntro(state, profile, latestPatientText);
  const nextQuestion = nextQuestionFor(state, profile);

  if (state.triageLevel === "EMERGENCY") {
    if (!state.consent) {
      return `${clinicalIntro} Por seguridad, esto no deberia esperar a una cita normal. Si tienes dificultad para respirar, tragar o hablar, hinchazon que sube al ojo/cuello o sangrado que no cede, contacta con urgencias medicas. Si aceptas que registre tus datos, aviso a recepcion para priorizarte.`;
    }
    if (!state.name) {
      return `${clinicalIntro} Lo marco como prioridad maxima. Dime tu nombre y apellidos para que recepcion pueda identificarte.`;
    }
    if (!state.phone) {
      return `${state.name}, necesito un telefono para activar llamada prioritaria.`;
    }
    return `${state.name}, dejo la alerta registrada para llamada prioritaria en ${state.phone}. No puedo diagnosticar por chat; el doctor debe explorarte. Si notas dificultad para respirar, tragar, hablar o la hinchazon avanza, no esperes a la llamada y acude a urgencias.`;
  }

  if (state.ready) {
    return state.escalated
      ? `${state.name}, queda registrado como ${profile.title.toLowerCase()} con prioridad. Te llamaremos en ${state.phone}. Presupuesto orientativo de la visita: ${state.budget}, y el doctor confirmara tratamiento y coste tras exploracion.`
      : `${state.name}, pre-reserva lista para ${state.treatmentNeed} en ${state.location}, franja ${state.availability}. Orientacion economica: ${state.budget}. El doctor confirmara diagnostico, plan y presupuesto cerrado en la valoracion.`;
  }

  if (nextQuestion) {
    return `${clinicalIntro} ${nextQuestion}`;
  }

  if (state.escalated) {
    if (!state.consent) {
      return `${clinicalIntro} Por lo que cuentas, conviene que recepcion lo vea con prioridad. Aceptas que guardemos tus datos para gestionar la llamada/cita?`;
    }
    if (!state.name) {
      return `${clinicalIntro} Perfecto, dime tu nombre y apellidos para preparar el aviso.`;
    }
    if (!state.phone) {
      return `${state.name}, dime un telefono de contacto para que recepcion pueda llamarte.`;
    }
    return `${state.name}, queda registrado como ${profile.title.toLowerCase()} con prioridad. Te llamaremos en ${state.phone}. Presupuesto orientativo de la visita: ${state.budget}, y el doctor confirmara tratamiento y coste tras exploracion.`;
  }

  if (!state.consent) {
    // clinicalIntro ya termina con profile.priceNote: no repetirla aqui.
    return `${clinicalIntro} Si quieres, puedo preparar una pre-reserva. Para eso necesito que confirmes si aceptas que guardemos tus datos para gestionar la solicitud.`;
  }
  if (!state.name) {
    return `${clinicalIntro} Con tu consentimiento, dime tu nombre y apellidos.`;
  }
  if (!state.phone) {
    return `${state.name}, dime un telefono para confirmar la cita y enviarte recordatorio.`;
  }
  if (!state.location) {
    return `${state.name}, te encajaria mejor ${demoKnowledge.clinic.locations.join(" o ")}?`;
  }
  if (!state.availability) {
    return `Para ${state.treatmentNeed} en ${state.location}, puedo dejar pre-reserva. Prefieres manana, tarde o algun dia concreto esta semana?`;
  }

  return `${state.name}, pre-reserva lista para ${state.treatmentNeed} en ${state.location}, franja ${state.availability}. Orientacion economica: ${state.budget}. El doctor confirmara diagnostico, plan y presupuesto cerrado en la valoracion.`;
}

function naturalClinicalIntro(state: DentalAgentState, profile: IntentProfile, latestPatientText: string) {
  const signalText = state.detectedSignals.length ? `Por lo que cuentas (${state.detectedSignals.slice(0, 3).join(", ")})` : "Por lo que cuentas";
  const causes = profile.likelyCauses.slice(0, 3).join(", ");
  const safety = state.redFlags.length
    ? ` Veo senales de alarma: ${state.redFlags.join(", ")}.`
    : "";
  const budget = profile.priceNote ? ` ${profile.priceNote}` : "";
  const wording = latestPatientText.length > 120 ? "He recogido varios datos." : signalText;
  return `${wording}, podria encajar con ${causes}. No es un diagnostico por chat; es una orientacion para priorizarte bien.${safety}${budget}`;
}

function nextQuestionFor(state: DentalAgentState, profile: IntentProfile) {
  if (state.redFlags.length === 0 && !state.safetyScreened && ["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(state.intent ?? "")) {
    return "Para descartar senales de alarma: hay fiebre, hinchazon en cara/cuello, pus o dificultad para abrir la boca, tragar o respirar?";
  }
  const nextMissing = state.missingClinicalData[0];
  if (nextMissing) {
    return nextMissing;
  }
  if (!state.consent && state.detectedSignals.length === 0) {
    return profile.followUp.find(question => !wasAnswered(question, state)) ?? "";
  }
  return "";
}

function completeDentalState(state: DentalAgentState): DentalAgentState {
  const ready = state.escalated
    ? Boolean(state.intent && state.consent && state.name && state.phone)
    : Boolean(state.intent && state.consent && state.name && state.phone && state.location && state.availability);
  return { ...state, ready };
}

function inferIntent(current: DentalIntentId | undefined, normalized: string, signals: string[], redFlags: string[]): DentalIntentId | undefined {
  if (redFlags.length > 0) {
    return /golpe|trauma|accidente|caida|roto/.test(normalized) ? "trauma" : "urgent_pain";
  }
  if (/(golpe|trauma|accidente|caida|se ha salido|diente fuera)/.test(normalized)) return "trauma";
  if (/(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/.test(normalized)) return "wisdom_tooth";
  if (/(implante|me falta|perdi una pieza|sin muela|sin diente)/.test(normalized)) return "implant_price";
  if (/(ortodoncia|alineador|invisible|brackets|apin|mordida)/.test(normalized)) return "orthodontics";
  if (/(blanque|boda|estetica|sonrisa|dientes blancos)/.test(normalized)) return "whitening";
  if (/(sangran las encias|encia|encias|periodon|mal aliento|movilidad|sarro)/.test(normalized)) return "periodontics";
  if (/(funda|corona|protesis|empaste.*caido|se me ha caido|se mueve la funda)/.test(normalized)) return "prosthetics";
  if (/(bruxismo|aprieto|rechino|chasquido|mandibula|atm|dolor de cabeza)/.test(normalized)) return "tmj_bruxism";
  if (/(late|pulsatil|por la noche|me despierta|calor|dolor espontaneo|nervio)/.test(normalized)) return "endodontics";
  if (/(frio|dulce|agujero|mancha|caries|empaste|sensibilidad|al morder)/.test(normalized)) return "caries_restoration";
  if (/(dolor|duele|hinchad|inflamad|pus|flemon|urgencia)/.test(normalized) || signals.includes("dolor intenso")) return "urgent_pain";
  if (/(limpieza|higiene|revision|revisar|primera visita|cita|valoracion)/.test(normalized)) return current ?? "first_visit";
  return current;
}

function getTriageLevel(intent: DentalIntentId | undefined, redFlags: string[], signals: string[]): TriageLevel {
  if (redFlags.some(flag => ["dificultad para respirar", "dificultad para tragar o hablar", "hinchazon en cuello, boca u ojo", "sangrado no controlado"].includes(flag))) {
    return "EMERGENCY";
  }
  if (redFlags.length > 0 || signals.includes("inflamacion") || signals.includes("dolor intenso") || intent === "endodontics" || intent === "wisdom_tooth" || intent === "trauma") {
    return "URGENT_24H";
  }
  if (intent === "caries_restoration" || intent === "periodontics" || intent === "prosthetics" || intent === "implant_price") {
    return "PRIORITY_72H";
  }
  if (intent === "whitening") {
    return "ESTHETIC";
  }
  return "ROUTINE";
}

function getMissingClinicalData(intent: DentalIntentId | undefined, signals: string[], safetyScreened: boolean) {
  const missing: string[] = [];
  if (!intent) return missing;
  if (["urgent_pain", "endodontics", "caries_restoration"].includes(intent)) {
    if (!signals.some(signal => ["dolor al morder", "sensibilidad al frio/calor", "dolor pulsatil/nocturno"].includes(signal))) {
      missing.push("El dolor aparece con frio/calor, al morder o aparece solo sin tocar la pieza?");
    }
  }
  if (["urgent_pain", "endodontics", "wisdom_tooth", "trauma"].includes(intent) && !safetyScreened) {
    missing.push("Desde cuando ocurre y que intensidad tiene del 0 al 10?");
  }
  if (intent === "periodontics" && !signals.some(signal => ["sangrado de encias", "movilidad dental"].includes(signal))) {
    missing.push("Hay sangrado al cepillar, mal aliento, movilidad o encia retraida?");
  }
  if (intent === "implant_price" && !signals.includes("pieza ausente")) {
    missing.push("La pieza ya falta o todavia hay que extraerla?");
  }
  return missing.slice(0, 2);
}

function getConfidence(intent: DentalIntentId | undefined, signals: string[], redFlags: string[]) {
  if (!intent) return "Baja";
  if (redFlags.length > 0 || signals.length >= 3) return "Alta";
  if (signals.length >= 1) return "Media";
  return "Baja";
}

function triageLabel(level: TriageLevel) {
  switch (level) {
    case "EMERGENCY":
      return "Emergencia inmediata";
    case "URGENT_24H":
      return "Urgencia 24h";
    case "PRIORITY_72H":
      return "Prioridad 48-72h";
    case "ESTHETIC":
      return "Estetica programable";
    case "ROUTINE":
    default:
      return "Cita normal";
  }
}

function wasAnswered(question: string, state: DentalAgentState) {
  if (question.includes("pieza") && state.detectedSignals.includes("pieza ausente")) return true;
  if (question.includes("sensibilidad") && state.detectedSignals.includes("sensibilidad al frio/calor")) return true;
  if (question.includes("sangran") && state.detectedSignals.includes("sangrado de encias")) return true;
  return false;
}

function detectLabels(normalized: string, rules: Array<{ label: string; pattern: RegExp }>) {
  return rules
    .filter(rule => rule.pattern.test(normalized) && !isNegatedLabel(rule.label, normalized))
    .map(rule => rule.label);
}

function detectSafetyScreen(normalized: string, redFlags: string[]) {
  if (redFlags.length > 0) return true;
  return /(no tengo fiebre|sin fiebre|no hay fiebre|no esta hinchad|sin hinchazon|no tengo hinchazon|puedo tragar|puedo respirar|no sangra|no hay pus|dolor [0-7])/.test(normalized);
}

function isNegatedLabel(label: string, normalized: string) {
  if (label.includes("fiebre")) {
    return /(sin fiebre|no tengo fiebre|no hay fiebre)/.test(normalized);
  }
  if (label.includes("hinchazon") || label === "inflamacion") {
    return /(sin hinchazon|no tengo hinchazon|no hay hinchazon|no esta hinchad|sin inflamacion|no tengo inflamacion)/.test(normalized);
  }
  if (label.includes("sangrado")) {
    return /(no sangra|no hay sangrado|sin sangrado|no me sangra)/.test(normalized);
  }
  if (label.includes("pus")) {
    return /(no hay pus|sin pus)/.test(normalized);
  }
  if (label.includes("tragar") || label.includes("respirar")) {
    return /(puedo tragar|puedo respirar|sin dificultad para tragar|sin dificultad para respirar)/.test(normalized);
  }
  if (label.includes("abrir")) {
    return /(puedo abrir|abro bien|sin dificultad para abrir)/.test(normalized);
  }
  return false;
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
