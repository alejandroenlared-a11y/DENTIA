import { demoKnowledge, type DemoScenarioId } from "@/lib/agent/demo-data";

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
    priceNote: "La primera visita y diagnostico digital es sin coste."
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
    priceNote: "La urgencia dental parte desde 70 EUR; el tratamiento definitivo depende de la exploracion."
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
      "Si falta una pieza o esta pendiente de extraccion, conviene valorar hueso, encia, mordida y un estudio de imagen (TAC/escaner 3D) antes de cerrar presupuesto; en casos con poco hueso puede requerir injerto previo.",
    priceNote: "El implante unitario parte desde 1.200 EUR y puede financiarse hasta 24 meses segun aprobacion."
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
      "El blanqueamiento puede ser una buena opcion estetica, pero antes se revisa sensibilidad, encia, caries y restauraciones visibles (las fundas/empastes no cambian de color).",
    priceNote: "El blanqueamiento empieza desde 280 EUR, pendiente de valorar sensibilidad y estado oral."
  },
  cosmetic_dentistry: {
    title: "Estetica dental",
    intentCode: "ESTETICA_DENTAL_VALORACION",
    treatmentNeed: "Estetica dental",
    budget: "valoracion sin coste",
    estimatedValue: 85000,
    defaultTriage: "ESTHETIC",
    likelyCauses: ["mejora de sonrisa", "color dental", "forma dental", "diseno de sonrisa"],
    clinicalReading:
      "En estetica dental puede valorarse blanqueamiento, carillas, restauraciones esteticas de composite o Digital Smile Design segun color, forma, encia y mordida.",
    priceNote:
      "En estetica dental hay varias opciones: blanqueamiento desde 280 EUR; carillas, composite estetico o Digital Smile Design requieren valoracion para presupuesto cerrado."
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
    priceNote: "La higiene dental dura unos 45 minutos y tiene precio orientativo de 55 EUR."
  },
  orthodontics: {
    title: "Ortodoncia",
    intentCode: "ORTODONCIA_ESTUDIO",
    treatmentNeed: "Ortodoncia",
    budget: "desde 1.800 EUR",
    estimatedValue: 180000,
    defaultTriage: "ROUTINE",
    likelyCauses: ["apinamiento", "malposicion dental", "mordida abierta/cruzada", "recidiva tras ortodoncia"],
    clinicalReading:
      "La ortodoncia requiere estudio digital para confirmar si encajan alineadores invisibles, brackets Damon u otra opcion, duracion aproximada y presupuesto cerrado. En ninos puede valorarse ortopedia funcional para guiar el crecimiento.",
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
    likelyCauses: ["pulpitis irreversible", "infeccion periapical", "caries profunda", "fractura con afectacion pulpar"],
    clinicalReading:
      "Dolor espontaneo, nocturno, pulsatil o sensibilidad que tarda en calmar puede apuntar a afectacion del nervio. Necesita valoracion prioritaria.",
    priceNote: "La endodoncia parte desde 220 EUR, pendiente de radiografia, pieza afectada y complejidad."
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
    priceNote: "El empaste parte desde 65 EUR, pendiente de tamano y profundidad de la lesion."
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
      "Sangrado de encias, mal aliento, retraccion o movilidad pueden sugerir inflamacion gingival o periodontal. Requiere exploracion y sondaje; si se confirma periodontitis, el mantenimiento profesional pasa a ser cada 3 meses de forma indefinida.",
    priceNote: "La valoracion periodontal parte desde 90 EUR segun prueba y tratamiento necesario."
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
    priceNote: "Una corona parte desde 450 EUR; si solo hay recementado o ajuste puede ser menos."
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
    priceNote: "La extraccion de muela del juicio parte desde 120 EUR; depende de posicion y complejidad."
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
    priceNote: "La ferula de descarga parte desde 180 EUR, pendiente de exploracion y registros."
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
    priceNote: "La urgencia parte desde 70 EUR; el tratamiento depende de radiografia y tipo de trauma."
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
  { label: "inflamacion", pattern: /(inflamad|inflamacion|hinchad|bulto|flemon|absceso|pus|mal sabor)/ },
  { label: "sangrado de encias", pattern: /(sangran las encias|sangrado de encias|encia sangra|sangra al cepillar|sangrado|sangra)/ },
  { label: "movilidad dental", pattern: /(se me mueve|se mueve|movilidad|diente flojo|muela floja)/ },
  { label: "pieza rota o funda", pattern: /(roto|fractur|funda|corona|empaste|se ha caido|caido)/ },
  { label: "pieza ausente", pattern: /(me falta|perdi una pieza|sin muela|sin diente|implante)/ },
  { label: "estetica", pattern: /(blanque|estetica|boda|sonrisa|dientes blancos)/ },
  { label: "ortodoncia", pattern: /(ortodoncia|alineador|invisible|brackets|apinado|apinamiento|mordida)/ },
  { label: "bruxismo/atm", pattern: /(bruxismo|aprieto|rechino|chasquido|mandibula|atm|dolor de cabeza)/ },
  { label: "muela del juicio", pattern: /(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/ }
];

// Transparencia obligatoria (AI Act): si preguntan directamente si es humana,
// se responde siempre que no, sin ambiguedad. Esto se ANADE a la respuesta
// que tocaria de todas formas: no sustituye el triaje. Si el mismo mensaje
// trae una emergencia real ("no puedo respirar, eres humana?"), el escalado
// y la pregunta de seguridad se procesan con normalidad y la revelacion se
// antepone al aviso de urgencia (bug real detectado en revision: la version
// anterior devolvia el estado congelado y se saltaba por completo el
// triaje de banderas rojas para ese mensaje). Capa de seguridad ademas de la
// instruccion en el prompt del LLM: funciona incluso si Gemini/OpenAI no
// estan disponibles.
const IDENTITY_QUESTION_PATTERN =
  /(eres (una persona|un humano|humana|human|real)|hablo con (un humano|una persona)|(eres|sois) (un bot|un robot|una ia|inteligencia artificial)|es usted (una persona|un humano))/;
const IDENTITY_DISCLOSURE =
  "No, no soy humana, soy la asistente de inteligencia artificial de la clinica. Te ayudo igual que en recepcion.";

export function runDentalSeniorTurn(current: DentalAgentState, rawText: string): DentalAgentTurn {
  const text = rawText.trim();
  const normalized = normalize(text);
  const asksIdentity = IDENTITY_QUESTION_PATTERN.test(normalized);

  const messageRedFlags = detectLabels(normalized, redFlagPatterns);
  const messageSignals = detectLabels(normalized, signalPatterns);
  let redFlags = unique([...current.redFlags, ...messageRedFlags]);
  let detectedSignals = unique([...current.detectedSignals, ...messageSignals]);
  // La clasificacion de intencion usa SOLO las senales/alarmas de ESTE
  // mensaje, no el historial acumulado: si no, un "dolor intenso" mencionado
  // hace varios turnos seguia forzando urgent_pain en cualquier mensaje
  // posterior sin relacion (incluso una simple negacion de sintomas).
  const intent = inferIntent(current.intent, normalized, messageSignals, messageRedFlags);
  // Cambio de tema: los sintomas y alarmas del motivo anterior no deben
  // arrastrar la urgencia a una consulta nueva distinta (p.ej. de un dolor ya
  // resuelto a una consulta de ortodoncia dias despues).
  if (intent && current.intent && intent !== current.intent) {
    redFlags = messageRedFlags.length > 0 ? unique(messageRedFlags) : [];
    detectedSignals = unique(messageSignals);
  }
  const profile = intent ? intentProfiles[intent] : null;
  // Datos como nombre/telefono/email/sede son "sticky" por defecto (no se
  // repiten ni se pisan con ruido posterior). Pero si el paciente corrige
  // explicitamente ("en realidad es Elche", "perdona me confundi, soy Maria
  // Lopez"), el dato nuevo debe ganar; si no, Clara se queda con el primer
  // valor para siempre aunque el paciente lo corrija (bug real detectado en
  // QA: sede y nombre corregidos por el paciente se ignoraban).
  const isCorrecting = isExplicitCorrection(normalized);
  // Si la pregunta pendiente era el nombre, aceptar una respuesta que sea
  // solo el nombre ("Alejandro Marti"), sin exigir "soy" o "me llamo"; una
  // pregunta de identidad no cuenta como nombre aunque sea una frase corta.
  const incomingName =
    extractName(text) ||
    extractNameNextToPhone(text) ||
    (wasAskedForName(current) && !asksIdentity ? extractBareName(text) : "");
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
  const selectedAvailability = extractSelectedAvailabilityOption(current, normalized);
  const asksForAvailabilityOptions = Boolean(requestedSlotOptionsPeriod(text));
  const availability = current.availability || selectedAvailability || (asksForAvailabilityOptions ? "" : extractAvailability(normalized, text));
  const consent = current.consent || acceptsExplicitConsent(normalized) || (wasAskedForConsent(current) && acceptsConsent(normalized));
  const safetyScreened =
    current.safetyScreened ||
    (intent === "trauma"
      ? detectTraumaSafetyScreen(normalized, redFlags)
      : detectSafetyScreen(normalized, redFlags));
  const triageLevel = getTriageLevel(intent, redFlags, detectedSignals);
  const missingClinicalData = getMissingClinicalData(intent, detectedSignals, safetyScreened);

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
    escalated: triageLevel === "EMERGENCY" || triageLevel === "URGENT_24H" || Boolean(profile && profile.defaultTriage === "URGENT_24H" && redFlags.length > 0),
    confidence: getConfidence(intent, detectedSignals, redFlags),
    missingClinicalData,
    safetyScreened,
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

  // Peticion de presupuesto sin tratamiento concreto: marcarla para que el
  // siguiente turno de al grano con el rango de precio del tratamiento.
  if (!intent && wantsPrice(undefined, text)) {
    nextState.intentCode = BUDGET_PENDING_INTENT;
  }

  const reply = buildDentalReply(nextState, current, text);
  return {
    state: nextState,
    reply: asksIdentity ? `${IDENTITY_DISCLOSURE} ${reply}`.trim() : reply
  };
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

// Estilo conversacional: mensajes cortos (2-3 frases), UNA pregunta por turno,
// empatia variable y nada de repetir orientacion o precios ya dados. El estado
// anterior dice que se comunico ya: la orientacion clinica solo se da la
// primera vez que se detecta la intencion.
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
  const courtesyReply = buildCourtesyReply(latestPatientText);
  if (courtesyReply && !state.intent) {
    return courtesyReply;
  }

  if (!state.intent) {
    // Quien pide presupuesto viene a comprar, no con dolor: se le pregunta
    // directamente por el tratamiento del catalogo, sin menu de sintomas.
    if (state.intentCode === BUDGET_PENDING_INTENT) {
      return pickVariant(
        [
          "Encantada de prepararte un presupuesto. De que tratamiento hablamos: implantes, ortodoncia invisible, blanqueamiento o estetica, coronas/protesis, o algun otro? La primera visita con valoracion es sin coste.",
          "Claro, te oriento con el presupuesto. Que te interesa: implantes, ortodoncia invisible, estetica dental, coronas/protesis u otro tratamiento? Recuerda que la primera valoracion es gratuita.",
          "Perfecto. Dime para que tratamiento lo quieres: implantes, ortodoncia invisible, blanqueamiento, coronas/protesis u otro, y te doy el rango orientativo. La valoracion inicial es sin coste."
        ],
        latestPatientText
      );
    }
    return "Te leo. Cuentame un poco mas: es dolor, encias, una pieza rota, implante, ortodoncia, estetica o una revision?";
  }

  const profile = intentProfiles[state.intent];
  const isNewIntent = previous.intent !== state.intent;
  const first = firstName(state.name);

  if (state.triageLevel === "EMERGENCY") {
    if (!state.consent) {
      return `${pickVariant(EMPATHY_PAIN, latestPatientText)}\n\nEsto no deberia esperar: si te cuesta respirar o tragar, o la hinchazon avanza, acude a urgencias ya. Mientras, ¿aceptas que guardemos tus datos para priorizarte?`;
    }
    if (!state.name) {
      return pickVariant(
        [
          "Lo marco como prioridad maxima. Como te llamas?",
          "Queda marcado como prioritario. Me dices tu nombre y apellidos?",
          "Lo gestiono como urgencia ya. Dime tu nombre, por favor."
        ],
        latestPatientText
      );
    }
    if (!state.phone) {
      return `${first}, dime un telefono y te llamamos ya.`;
    }
    return `${first}, alerta enviada: te llamamos ahora al ${state.phone}. Si notas que empeora, no esperes nuestra llamada y acude a urgencias.`;
  }

  if (state.ready) {
    // La reserva ya se comunico en el turno anterior: cerrar con naturalidad
    // en vez de repetir el mismo mensaje de confirmacion.
    if (previous.ready && !isNewIntent) {
      return pickVariant(
        [
          `Todo listo${first ? `, ${first}` : ""}. Si necesitas cambiar algo de la cita, dimelo por aqui.`,
          `Aqui sigo si necesitas algo mas${first ? `, ${first}` : ""}. Te esperamos en la clinica.`,
          `Perfecto${first ? `, ${first}` : ""}. Cualquier duda antes de la visita, me escribes.`
        ],
        latestPatientText
      );
    }
    // Si el precio se pidio y este es el primer turno con tratamiento
    // conocido (todo llego de golpe), incluirlo en la confirmacion.
    const pricePending = isNewIntent && (previous.intentCode === BUDGET_PENDING_INTENT || mentionsPrice(latestPatientText));
    const priceLine = pricePending ? ` ${profile.priceNote}` : "";
    if (state.escalated) {
      return `${first}, queda registrado con prioridad. Te llamamos al ${state.phone} enseguida.`;
    }
    const confirmation = `${first}, pre-reserva lista: ${state.treatmentNeed.toLowerCase()} en ${state.location}, franja ${state.availability}.${priceLine}`;
    return `${confirmation}\n\nEl doctor te confirma plan y presupuesto cerrado en la visita.`;
  }

  // Si la conversacion nacio pidiendo presupuesto, dar el rango de precio en
  // cuanto se conoce el tratamiento aunque este mensaje ya no lo mencione.
  const cameFromBudget = previous.intentCode === BUDGET_PENDING_INTENT;
  // Con el intent ya fijado, los turnos siguientes solo pasaban por buildAck
  // (casi siempre vacio) + nextStep (pide el siguiente dato fijo). Una
  // pregunta de idoneidad clinica en ese turno (edad, embarazo...) quedaba
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
    return "Hola.\n\nCuentame que necesitas y te oriento.";
  }
  if (/^(gracias|muchas gracias|ok gracias|vale gracias)[!.? ]*$/.test(normalized)) {
    return "A ti. Si necesitas algo mas, aqui estoy.";
  }
  return "";
}

function buildHealthCardReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!/(tarjeta sanitaria|tarjeta de la seguridad social|tarjeta sip|\bsip\b)/.test(normalized)) {
    return "";
  }

  return "No hace falta traer tarjeta sanitaria. Con tu nombre y telefono podemos gestionar la visita.\n\nQuieres que miremos una cita?";
}

function buildAddressReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (!asksClinicAddress(normalized)) {
    return "";
  }

  const addresses = demoKnowledge.clinic.addresses;
  if (normalized.includes("elche")) {
    return [
      `La clinica de Elche esta en ${addresses["Elche - Altabix"]}.`,
      "Quieres que te cuente nuestros servicios o prefieres que miremos una cita en Elche?"
    ].join("\n\n");
  }
  if (normalized.includes("murcia")) {
    return [
      `La clinica de Murcia esta en ${addresses["Murcia centro"]}.`,
      "Quieres que te cuente nuestros servicios o prefieres que miremos una cita en Murcia?"
    ].join("\n\n");
  }
  return [
    `La clinica de Murcia esta en ${addresses["Murcia centro"]}.`,
    `La clinica de Elche esta en ${addresses["Elche - Altabix"]}.`,
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
    return "Te ayudo a cancelarla. Para localizar la cita, dime nombre completo y telefono de contacto.";
  }
  return "Te ayudo a cambiarla. Para localizar la cita, dime nombre completo, telefono y que dia o franja te vendria mejor.";
}

function asksAppointmentManagement(normalized: string) {
  return /(cancelar|cancelo|anular|anulo|cambiar|cambio|mover|reprogramar|modificar).{0,30}\bcita\b|\bcita\b.{0,30}(cancelar|anular|cambiar|mover|reprogramar|modificar)/.test(normalized);
}

function buildClinicInfoReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(quiero hablar con una persona|hablar con alguien|hablar con recepcion|pasame con recepcion|humano|persona real)/.test(normalized)) {
    return "Claro. Puedo avisar a recepcion para que te atienda una persona. Dime brevemente el motivo y un telefono de contacto.";
  }
  if (/(horario|hora abris|hora cerrais|cuando abris|cuando cerrais)/.test(normalized)) {
    return `${demoKnowledge.clinic.hours}\n\nQuieres que miremos una cita?`;
  }
  if (/(telefono de la clinica|telefono teneis|ten[eé]is telefono|numero de telefono|llamaros|llamar a la clinica)/.test(normalized)) {
    return `El telefono de la clinica es ${demoKnowledge.clinic.phone}.\n\nTambien puedo ayudarte por aqui a mirar cita, presupuesto o urgencia.`;
  }
  if (/(clinica privada|sois privados|sois privada|privada)/.test(normalized)) {
    return "Si, somos una clinica dental privada.\n\nQuieres que te oriente con algun tratamiento o prefieres que miremos una cita?";
  }
  if (/(seguro|mutua|adeslas|sanitas|asisa|dkv)/.test(normalized)) {
    return "Para seguros o mutuas concretas es mejor confirmarlo con recepcion, porque depende de la poliza y del tratamiento.\n\nSi quieres, dime que necesitas y te orientamos.";
  }
  if (
    /(pago con tarjeta|tarjeta bancaria|bizum|forma de pago|formas de pago|financiar|financiacion)/.test(normalized) &&
    !/(implante|ortodoncia|invisalign|bracket|blanqueamiento|carilla|endodoncia)/.test(normalized)
  ) {
    return "Para tratamientos con presupuesto cerrado se puede estudiar financiacion hasta 24 meses segun aprobacion. Las formas de pago concretas te las confirman en recepcion.\n\nQuieres que te oriente con algun tratamiento?";
  }
  if (/(atendeis ninos|atend[eé]is niños|odontopediatria|dentista infantil|mi hijo|mi hija)/.test(normalized) && !/(ortodoncia|dolor|duele|muela|diente)/.test(normalized)) {
    return "Si, atendemos ninos. Tenemos odontopediatria con Dra. Laura Herencia Lizaran y Dra. Paula Garcia Garcia.\n\nQuieres que miremos una primera visita o es por alguna molestia?";
  }
  if (/(parking|aparcamiento|aparcar)/.test(normalized)) {
    return "No quiero inventarte el aparcamiento exacto. Dime si vienes a Murcia o a Elche y te indico la direccion de la sede para que puedas calcularlo bien.";
  }
  if (/(silla de ruedas|accesible|acceso|movilidad reducida)/.test(normalized)) {
    return "Para accesibilidad concreta de la sede, lo mejor es confirmarlo con recepcion antes de venir.\n\nDime si seria Murcia o Elche y te ayudamos a organizarlo.";
  }
  if (/(do you speak english|speak english|english please|hablais ingles|habl[aá]is ingles)/.test(normalized)) {
    return "Yes, I can help you in English. Tell me what you need: appointment, budget, dental pain, or clinic information.";
  }
  if (/(llevo esperando|nadie me contesta|no me respondeis|reclamacion|queja)/.test(normalized)) {
    return "Lo siento. Para pasarlo a recepcion y que lo revisen, dime tu nombre y un telefono de contacto.";
  }
  return "";
}

function buildPostCareReply(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(me han hecho|me hicieron|me quitaron|me sacaron).{0,40}(empaste|endodoncia|extraccion|muela|diente)/.test(normalized)) {
    if (/(sangra mucho|no para de sangrar|hemorragia|no puedo tragar|me cuesta respirar)/.test(normalized)) {
      return "Eso conviene revisarlo con prioridad. Si el sangrado no cede o te cuesta respirar o tragar, acude a urgencias. Si puedes, dime nombre y telefono y aviso a recepcion.";
    }
    return "Tras un tratamiento reciente, sigue la pauta que te dio el doctor. Si hay dolor fuerte, inflamacion, fiebre o sangrado que no cede, avisanos para revisarlo con prioridad.\n\nQue tratamiento te hicieron y cuando fue?";
  }
  return "";
}

// Senales que expresan deseo de tratamiento, no un sintoma clinico: nombrar
// "corona" o "implante" al pedir presupuesto no es reportar una molestia.
const NON_SYMPTOM_SIGNALS = new Set(["pieza ausente", "estetica", "ortodoncia", "pieza rota o funda"]);

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
    ? ` Lo que comentas de ${state.redFlags[0]} es importante, asi que te vamos a priorizar.`
    : "";
  const price = cameFromBudget || wantsPrice(state.intent, latestPatientText) ? ` ${profile.priceNote}` : "";

  // Consulta comercial de presupuesto (venga en dos turnos o en un solo
  // mensaje "quiero presupuesto para un implante"): sin lectura de sintomas.
  const asksPriceNow = mentionsPrice(latestPatientText);
  const hasSymptoms = state.detectedSignals.some(signal => !NON_SYMPTOM_SIGNALS.has(signal));
  if ((cameFromBudget || asksPriceNow) && !expressesPain && !hasSymptoms && !state.escalated) {
    if (state.intent === "cosmetic_dentistry") {
      const prefix = suitabilityAnswer ? `${suitabilityAnswer}\n\n` : "";
      return `${prefix}Tenemos varias opciones de estetica dental.\n\nBlanqueamiento, carillas, composite estetico y Digital Smile Design.\n\nCual te interesa mas?`;
    }
    if (state.intent === "orthodontics") {
      const opener = suitabilityAnswer || "Claro, te oriento.";
      return `${opener} ${profile.priceNote} La valoracion inicial es sin coste y ahi te dicen duracion, opciones y financiacion.`;
    }
    if (state.intent === "reactivation") {
      const opener = suitabilityAnswer || "Claro.";
      return `${opener} ${profile.priceNote} Si al verte hubiera encia inflamada o mucha acumulacion, te avisamos antes de hacer nada.`;
    }
    const opener = suitabilityAnswer || "Buena eleccion.";
    return `${opener} ${profile.priceNote} El doctor te confirma el presupuesto cerrado en la valoracion, que es sin coste.`;
  }

  const causes = profile.likelyCauses.slice(0, 2).join(" o ");
  if (
    state.intent === "periodontics" &&
    state.detectedSignals.includes("movilidad dental") &&
    !state.detectedSignals.some(signal => ["sangrado de encias", "inflamacion", "dolor intenso"].includes(signal))
  ) {
    return "Que una muela se mueva conviene revisarlo pronto para valorar la encia y el soporte de la pieza.";
  }
  const suitabilityPrefix = suitabilityAnswer ? `${suitabilityAnswer} ` : empathy;
  return `${suitabilityPrefix}Por lo que me cuentas podria ser ${causes}; te lo confirmara el doctor al verte.${alarm}${price}`;
}

function buildAck(state: DentalAgentState, previous: DentalAgentState) {
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
  if (!state.consent) {
    return state.escalated
      ? "Quiero que recepcion te llame con prioridad. Aceptas que guardemos tus datos para gestionarlo?"
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
    return "Y tu email para enviarte la confirmacion de la cita?";
  }
  if (!state.phone) {
    return `Y un telefono de contacto, ${firstName(state.name)}?`;
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
    return "Que dia y hora o franja te encaja? Por ejemplo, viernes por la manana o lunes a las 10:00.";
  }
  return "";
}

function mentionsPrice(latestPatientText: string) {
  const normalized = normalize(latestPatientText);
  if (/(precio|cuanto|coste|costar|cuesta|financi|presupuesto)/.test(normalized)) {
    return true;
  }
  // "vale" solo, sin "cuanto/que" delante, suele ser muletilla de cierre
  // ("me vale", "vale, gracias") y no una pregunta de precio ("cuanto vale",
  // "que vale la limpieza"). Sin esto, despedirse con "vale" reabria el
  // flujo de presupuesto (visto en QA: "con el telefono me vale, gracias").
  return /(cuanto|que)\s+val/.test(normalized);
}

function wantsPrice(intent: DentalIntentId | undefined, latestPatientText: string) {
  if (intent && PRICE_FORWARD_INTENTS.includes(intent)) {
    return true;
  }
  return mentionsPrice(latestPatientText);
}

// Preguntas de idoneidad clinica frecuentes (edad, embarazo, condiciones
// medicas) que llegan mezcladas con el mensaje que fija el intent. Sin esto,
// el guion de presupuesto/tratamiento las pisaba por completo (visto en QA:
// "tengo 60 anos, es un problema para la ortodoncia?" recibia solo el precio,
// sin responder a la pregunta real).
function detectSuitabilityAnswer(normalized: string): string {
  if (/(\d{1,3}\s*anos|edad)/.test(normalized) && /(problema|impedimento|puedo|puede|limite|tarde)/.test(normalized)) {
    return "La edad no suele ser impedimento; lo que importa es el estado de encias y hueso, que se valora en la revision.";
  }
  if (/(embarazo|embarazada|estoy embarazada)/.test(normalized)) {
    return "En el embarazo se puede tratar con precauciones; el doctor ajusta el plan segun el trimestre.";
  }
  if (/(diabetes|diabetico|diabetica|anticoagulantes|marcapasos)/.test(normalized)) {
    return "Con diabetes, anticoagulantes o marcapasos se puede tratar, pero conviene comentarlo en la valoracion para ajustar el protocolo.";
  }
  return "";
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "";
}

export function hasFullName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}

// Compartido con guardrails.ts (preparePatientReply) y openai-dental-agent.ts
// (computeReady): un dia sin franja u hora concreta ("la semana que viene")
// no cuenta como disponibilidad reservable.
export function hasConcreteAvailability(availability: string) {
  const normalized = normalize(availability);
  const hasDay = /\b(hoy|manana|pasado manana|lunes|martes|miercoles|jueves|viernes|esta semana|proxima semana|\d{1,2}[/-]\d{1,2})\b/.test(normalized);
  const hasTime =
    /\b([01]?\d|2[0-3])(?::|\.|h)([0-5]\d)?\b/.test(availability) ||
    /\b(manana|tarde|por la manana|por la tarde|primera hora|ultima hora|temprano)\b/.test(normalized);
  return hasDay && hasTime;
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

// Variacion determinista (testeable) a partir del texto del paciente, para que
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

function extractSelectedAvailabilityOption(current: DentalAgentState, normalized: string) {
  const option = normalized.trim().match(/^[123]$/)?.[0];
  if (!option || current.offeredAvailabilityOptions.length === 0 || current.availability) {
    return "";
  }
  return current.offeredAvailabilityOptions[Number(option) - 1] ?? "";
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
  return Boolean(
    state.intent &&
    state.consent &&
    hasFullName(state.name) &&
    state.phone &&
    state.email &&
    state.location &&
    !state.availability
  );
}

function completeDentalState(state: DentalAgentState): DentalAgentState {
  const ready = Boolean(
    state.intent &&
    state.consent &&
    hasFullName(state.name) &&
    state.phone &&
    (state.escalated || state.email) &&
    state.location &&
    hasAppointmentAvailability(state.availability)
  );
  return { ...state, ready };
}

function inferIntent(current: DentalIntentId | undefined, normalized: string, signals: string[], redFlags: string[]): DentalIntentId | undefined {
  if (asksAppointmentManagement(normalized)) {
    return current;
  }
  const mentionsWisdomTooth = /(muela del juicio|cordal|tercer molar|dolor atras|zona de atras)/.test(normalized);
  if (redFlags.length > 0) {
    if (/(golpe|trauma|accidente|caida|roto)/.test(normalized) && !isTraumaNegated(normalized)) {
      return "trauma";
    }
    if (mentionsWisdomTooth) {
      return "wisdom_tooth";
    }
    return "urgent_pain";
  }
  if (/(golpe|trauma|accidente|caida|se ha salido|diente fuera)/.test(normalized) && !isTraumaNegated(normalized)) return "trauma";
  if (current === "trauma" && looksLikeTraumaFollowUp(normalized)) return "trauma";
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
  if ((/(dolor|duele|hinchad|inflamad|pus|flemon|urgencia)/.test(normalized) && !isPainNegated(normalized)) || signals.includes("dolor intenso")) return "urgent_pain";
  if (/(limpieza|limpiar|higiene|quitar sarro|sarro)/.test(normalized)) return "reactivation";
  if (/(revision|revisar|primera visita|cita|valoracion)/.test(normalized)) return current ?? "first_visit";
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
  if (intent === "whitening" || intent === "cosmetic_dentistry") {
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
  if (intent === "trauma" && !safetyScreened) {
    missing.push("Cuando te diste el golpe y cuanto te duele del 0 al 10? Puedes abrir la boca y tragar bien?");
  }
  if (["urgent_pain", "endodontics", "wisdom_tooth"].includes(intent) && !safetyScreened) {
    missing.push("Desde cuando ocurre y que intensidad tiene del 0 al 10?");
  }
  if (intent === "periodontics" && signals.includes("sangrado de encias") && !safetyScreened) {
    missing.push("El sangrado es leve o abundante, y ha empezado tras un golpe?");
  }
  if (intent === "periodontics" && signals.includes("movilidad dental") && !safetyScreened) {
    missing.push("Te duele, notas inflamacion, sangrado o ha sido por un golpe?");
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

function isTraumaNegated(normalized: string) {
  return /(sin golpe|no ha sido golpe|no fue golpe|no me he golpeado|no me di golpe|no hubo golpe)/.test(normalized);
}

function isNegatedLabel(label: string, normalized: string) {
  if (label === "dolor intenso") {
    return isPainNegated(normalized);
  }
  if (label.includes("fiebre")) {
    return /(sin fiebre|no tengo fiebre|no hay fiebre)/.test(normalized);
  }
  if (label.includes("hinchazon") || label === "inflamacion") {
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

function looksLikeInvalidEmail(text: string) {
  return text.includes("@") && !extractEmail(text);
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
// ultimo mensaje del agente pidio el nombre: solo entonces se puede tratar una
// respuesta suelta como nombre (evita guardar "desde ayer" como nombre cuando
// la pregunta pendiente era clinica).
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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
