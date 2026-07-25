import {
  hasConcreteAvailability,
  hasFullName,
  jumpsToBookingOptions,
  mentionsPaymentCredentials,
  normalize,
  type DentalAgentState
} from "@/lib/agent/dental-senior-agent";
import { formatReplyForChat } from "@/lib/chat-bubbles";

// Fase 5 (HOJA-RUTA-100.MD): no confiar solo en el LLM. Toda respuesta de la
// IA pasa por estos filtros antes de llegar al paciente; si viola alguna
// regla conocida, se descarta y se usa la respuesta del motor local
// deterministico (localReply) en su lugar.
export function preparePatientReply(
  aiReply: string,
  state: DentalAgentState,
  localReply: string,
  latestPatientMessage: string
): string {
  // Menor de edad sin tutor, solicitud de borrado de datos, o un numero de
  // tarjeta/cuenta pegado en el chat: casos legales/de seguridad demasiado
  // sensibles para confiar en que el LLM improvise. Siempre gana el guion
  // local, que ya tiene la respuesta correcta para estos tres casos.
  if (state.requiresGuardian || state.dataErasureRequested || mentionsPaymentCredentials(latestPatientMessage)) {
    return formatReplyForChat(localReply);
  }
  // PR #13 (Codex - short-circuit obligatorio para EMERGENCY): el motor
  // local ya corta el flujo (buildDentalReply en dental-senior-agent.ts
  // devuelve SIEMPRE la misma indicacion de seguridad para EMERGENCY, nunca
  // pide consentimiento/datos ni ofrece cita). Esta proteccion es la
  // contraparte para la IA: si el estado determinista es EMERGENCY, CUALQUIER
  // aiReply que pida datos de contacto/consentimiento o mencione cita/huecos/
  // disponibilidad/reserva se descarta integramente a favor de localReply -
  // sin excepciones, y por igual para OpenAI, Gemini y el fallback local (los
  // tres pasan por preparePatientReply).
  // Codex (revision sobre 77a41cc - "Require urgent guidance in every
  // emergency reply"): las comprobaciones anteriores solo descartaban un
  // aiReply EMERGENCY si pedia datos/cita - un texto benigno como "Entiendo.
  // Descansa y observa como evolucionas." pasaba intacto porque no pedia
  // nada de eso, aunque tampoco dijera "acude a urgencias". Con
  // triageLevel=EMERGENCY, la ausencia de la indicacion obligatoria de
  // urgencias tambien descarta el reply, no solo la presencia de contenido
  // administrativo.
  if (
    state.triageLevel === "EMERGENCY" &&
    (asksForPersonalData(aiReply) ||
      jumpsToBookingOptions(aiReply) ||
      /(disponibilidad|reserva)/.test(normalize(aiReply)) ||
      !mentionsUrgentCareGuidance(aiReply))
  ) {
    return formatReplyForChat(localReply);
  }
  if (!state.intent && isSimpleGreeting(latestPatientMessage)) {
    return formatReplyForChat("Hola.\n\nPara poder orientarte, cuentame qué necesitas o qué te preocupa.");
  }
  // Hotfix dental-clinical-authority (fallo confirmado en produccion): "me
  // duele al morder" (caries_restoration) recibia diagnostico prematuro
  // (caries/filtracion de empaste) + solicitud de consentimiento, saltandose
  // la pregunta de seguridad (fiebre/hinchazon/pus/abrir boca/tragar). Esa
  // pregunta para caries_restoration/urgent_pain/endodontics/wisdom_tooth/
  // trauma NO pasa por missingClinicalData (ver nextStep en
  // dental-senior-agent.ts) - el guardrail de abajo no la cubria. En vez de
  // duplicar la lista de intents que la exigen (riesgo de divergencia),
  // se usa localReply como fuente de verdad directa: si el motor
  // deterministico decidio que TOCA preguntar seguridad ahora (localReply
  // es esa pregunta) y la IA no la toca, se descarta el reply de la IA.
  if (!state.safetyScreened && isMandatorySafetyScreenQuestion(localReply) && !isMandatorySafetyScreenQuestion(aiReply)) {
    return formatReplyForChat(localReply);
  }
  // Hotfix dental-negation-context (fallo confirmado en produccion): "es
  // poco y no he recibido ningun golpe" seguia generando "Podria ser
  // fractura dental o luxacion..." - la IA hipotetizaba traumatismo aunque
  // el paciente lo hubiera negado explicitamente. No se usa state.intent
  // como guarda (la IA podria haberlo sobrescrito en su propia respuesta
  // JSON, ver mergeAiState) sino localReply: si el motor deterministico ni
  // siquiera menciona "golpe" en su respuesta de este turno (no considera
  // que sea un caso de traumatismo), cualquier hipotesis de fractura/
  // luxacion/traumatismo de la IA se descarta.
  if (!normalize(localReply).includes("golpe") && mentionsUnauthorizedTraumaHypothesis(aiReply)) {
    return formatReplyForChat(localReply);
  }
  // Bug real (produccion): con "me duele una muela y sangra" el motor local
  // pedia bien la pregunta de seguridad pendiente (missingClinicalData), pero
  // el LLM la salto y fue directo del diagnostico al consentimiento de
  // datos. Si hay una pregunta clinica de seguridad pendiente y el reply no
  // la toca, nunca se deja pasar aunque el resto del texto suene bien.
  if (
    !state.safetyScreened &&
    state.missingClinicalData[0] &&
    skipsMandatoryClinicalQuestion(aiReply, state.missingClinicalData[0])
  ) {
    return formatReplyForChat(localReply);
  }
  if (asksClinicAddress(latestPatientMessage) && asksGenericSymptomMenu(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (asksTeamOrSpecialties(latestPatientMessage) && asksGenericSymptomMenu(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (mentionsHealthCard(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (mentionsPrivateClinicUnprompted(aiReply, latestPatientMessage)) {
    return formatReplyForChat(localReply);
  }
  if (!state.consent && asksForPersonalData(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (state.consent && asksMultipleSchedulingFields(aiReply, state)) {
    return formatReplyForChat(localReply);
  }
  if (state.consent && asksForAlreadyKnownSchedulingField(aiReply, state)) {
    return formatReplyForChat(localReply);
  }
  if (state.consent && hasFullName(state.name) && !state.email && asksForPhoneOrLaterSchedulingField(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (state.location && !state.availability && asksForSlotOptions(latestPatientMessage) && asksOpenDateQuestion(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (state.intent && asksGenericSymptomMenu(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (state.intent === "trauma" && usesBadTraumaWording(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (state.intent === "trauma" && usesNonTraumaPainProtocol(aiReply)) {
    return formatReplyForChat(localReply);
  }
  if (!state.ready && promisesSpecificProvider(aiReply)) {
    return formatReplyForChat(localReply);
  }
  // Bug real (produccion): tras pre-reservar, el paciente respondio "esta
  // bien gracias" y el LLM volvio a ofrecer huecos nuevos como si nada
  // estuviera reservado. Con la cita ya lista, cualquier confirmacion del
  // paciente o intento del LLM de re-ofrecer huecos se descarta a favor del
  // cierre del motor local.
  if (
    state.ready &&
    hasConcreteAvailability(state.availability) &&
    isBookingClosingAcknowledgment(latestPatientMessage) &&
    jumpsToBookingOptions(aiReply)
  ) {
    return formatReplyForChat(localReply);
  }
  if (state.consent && state.name && state.phone) {
    if (!state.email && (asksForLocationAndAvailability(aiReply) || asksLocationOnly(aiReply) || jumpsToBookingOptions(aiReply))) {
      return formatReplyForChat(localReply);
    }
    if (!hasFullName(state.name) && jumpsToBookingOptions(aiReply)) {
      return formatReplyForChat(localReply);
    }
    if (!state.location && !state.availability && (asksForLocationAndAvailability(aiReply) || jumpsToBookingOptions(aiReply))) {
      return formatReplyForChat(localReply);
    }
    if (!state.location && jumpsToBookingOptions(aiReply)) {
      return formatReplyForChat(localReply);
    }
    if (state.location && (!state.availability || !hasConcreteAvailability(state.availability)) && (asksOpenDateQuestion(aiReply) || jumpsToBookingOptions(aiReply))) {
      return formatReplyForChat(localReply);
    }
  }
  return formatReplyForChat(aiReply);
}

// Las 7 preguntas posibles de getMissingClinicalData (dental-senior-agent.ts)
// son fijas: en vez de adivinar por regex generica, cada una tiene sus
// palabras clave propias para detectar si el LLM realmente la formulo (con
// sus propias palabras) o la salto por completo.
const CLINICAL_QUESTION_KEYWORDS: Record<string, RegExp> = {
  "El dolor aparece con frio/calor, al morder o aparece solo sin tocar la pieza?": /(frio|calor|morder|sin tocar)/,
  "Cuando te diste el golpe y cuanto te duele del 0 al 10? Puedes abrir la boca y tragar bien?": /(golpe|abrir la boca|tragar)/,
  "Desde cuando ocurre y que intensidad tiene del 0 al 10?": /(desde cuando|intensidad|0 al 10|del 0)/,
  "El sangrado es leve o abundante, y ha empezado tras un golpe?": /(leve|abundante).*sangrado|sangrado.*(leve|abundante)|golpe/,
  "Te duele, notas inflamación, sangrado o ha sido por un golpe?": /(inflamacion|sangrado|golpe)/,
  "Hay sangrado al cepillar, mal aliento, movilidad o encia retraida?": /(cepillar|mal aliento|movilidad|encia retraida)/,
  "La pieza ya falta o todavia hay que extraerla?": /(ya falta|extraerla|extraer)/
};

// Palabras clave de la pregunta general de alarma ("Antes de nada: hay
// fiebre, hinchazon, pus o te cuesta abrir la boca o tragar?", mas las 3
// variantes de golpe en trauma) que nextStep (dental-senior-agent.ts) genera
// fuera del sistema de missingClinicalData.
const SAFETY_SCREEN_KEYWORDS = /(fiebre|hinchazon|pus|abrir la boca|tragar|golpe)/;

export function isMandatorySafetyScreenQuestion(reply: string): boolean {
  return SAFETY_SCREEN_KEYWORDS.test(normalize(reply));
}

// Hotfix dental-negation-context: hipotesis de traumatismo que la IA no
// puede formular sin que el motor local (localReply) este realmente
// discutiendo un golpe este turno.
const UNAUTHORIZED_TRAUMA_HYPOTHESIS_PATTERN = /(fractura|luxacion|traumatismo|golpe recibido)/;

export function mentionsUnauthorizedTraumaHypothesis(reply: string): boolean {
  return UNAUTHORIZED_TRAUMA_HYPOTHESIS_PATTERN.test(normalize(reply));
}

export function skipsMandatoryClinicalQuestion(reply: string, missingQuestion: string): boolean {
  const keywordPattern = CLINICAL_QUESTION_KEYWORDS[missingQuestion];
  if (!keywordPattern) return false;
  return !keywordPattern.test(normalize(reply));
}

export function asksForPersonalData(reply: string): boolean {
  const normalized = normalize(reply);
  return /(nombre|email|e-mail|correo|telefono|contacto|apellidos|sede|murcia|elche|consentimiento|guardar|datos|informacion|registrar|cita)/.test(normalized);
}

// Codex (P1, revision sobre c7c9e1a - hardening solicitado tras un primer
// intento incompleto): una lista de frases prohibidas contra una lista de
// frases permitidas dejaba huecos reales sin ningun "no" pegado al verbo de
// instruccion: "Puedes esperar antes de ir a urgencias.", "Evita las
// urgencias." y "Consulta urgencias solo si empeora." (condicional, no
// inmediata) seguian leyendose como guia valida. La funcion ahora resuelve
// la POLARIDAD de la instruccion por clausula en vez de buscar una palabra
// suelta: se separa el reply en clausulas independientes (misma idea que
// APPOINTMENT_DECISION_CLAUSE_SPLIT_PATTERN en dental-senior-agent.ts - una
// "y"/"pero"/"aunque" real separa dos instrucciones distintas, para que un
// "no esperes" en una clausula no contamine la clausula siguiente), y cada
// clausula debe superar dos filtros antes de contar como guia valida:
//   1. no ser condicional/permisiva/de espera ("solo si empeora", "puedes
//      esperar", "no hace falta", "evita"...), aunque mencione urgencias;
//   2. no negar explicitamente el verbo de instruccion ("no acudas", "no
//      llames"...).
// Solo entonces se comprueba si la clausula contiene una instruccion
// afirmativa real de acudir/ir/llamar/contactar/buscar atencion urgente.
const URGENT_CARE_CLAUSE_SPLIT_PATTERN = /[.,;:!¡¿?]+|\by\b|\bpero\b|\baunque\b/;

const URGENT_CARE_CONDITIONAL_OR_PERMISSIVE_PATTERN =
  /(solo si|\bsi\b[^,]{0,25}(empeor\w*|persist\w*|se agrava|sigue|acaso)|puedes esperar|mejor esperar|espera (a ver|un poco)|no hace falta|no es necesario|no necesitas|no tienes que|\bevita\b|mejor no)/;

const URGENT_CARE_NEGATED_INSTRUCTION_PATTERN =
  /\bno\b[^,]*\b(acud\w*|vayas|vay\w*|llam\w*|contact\w*|busqu\w*|busca\w*|dirij\w*)\b/;

const URGENT_CARE_AFFIRMATIVE_INSTRUCTION_PATTERN =
  /\b(acud\w*|ve a|vete a|dirigete a|llama\w*|contacta\w*|busca\w*)\b.*(urgencias|emergencias|112|atencion urgente|atencion inmediata)|no esperes\b/;

function isUrgentCareInstructionClause(clause: string): boolean {
  if (URGENT_CARE_CONDITIONAL_OR_PERMISSIVE_PATTERN.test(clause)) return false;
  if (URGENT_CARE_NEGATED_INSTRUCTION_PATTERN.test(clause)) return false;
  return URGENT_CARE_AFFIRMATIVE_INSTRUCTION_PATTERN.test(clause);
}

export function mentionsUrgentCareGuidance(reply: string): boolean {
  const normalized = normalize(reply);
  const clauses = normalized
    .split(URGENT_CARE_CLAUSE_SPLIT_PATTERN)
    .map(clause => clause.trim())
    .filter(Boolean);
  return clauses.some(isUrgentCareInstructionClause);
}

export function mentionsHealthCard(reply: string): boolean {
  return /(tarjeta sanitaria|tarjeta de la seguridad social|sip\b|tarjeta sip)/.test(normalize(reply));
}

export function mentionsPrivateClinicUnprompted(reply: string, latestPatientMessage: string): boolean {
  const asks = /(privad[ao]s?|seguro|mutua|seguridad social)/.test(normalize(latestPatientMessage));
  return !asks && /(clinica privada|somos privados|consulta privada|privada para)/.test(normalize(reply));
}

export function asksClinicAddress(message: string) {
  const normalized = normalize(message);
  return /(\bdonde estais\b|\bdonde estan\b|\bdonde sois\b|\bdonde teneis\b|\bdonde queda\b|\bdonde esta\b|\bdonde se encuentra\b|direccion|ubicacion|calle|como llego|localizacion|ubicados|ubicadas|en que zona|por donde queda)/.test(normalized);
}

export function asksTeamOrSpecialties(message: string) {
  return /(especialidades|especialidad|especialistas|doctores|doctoras|odontologos|dentistas|equipo|quien atiende|quien lleva|quien hace)/.test(
    normalize(message)
  );
}

export function asksMultipleSchedulingFields(reply: string, state: DentalAgentState): boolean {
  const normalized = normalize(reply);
  const missingRequests = [
    !hasFullName(state.name) && /(nombre|apellidos)/.test(normalized),
    !state.phone && /(telefono|contacto|movil|numero)/.test(normalized),
    !state.email && /(email|e-mail|correo)/.test(normalized),
    !state.location && /(sede|clinica|murcia|elche)/.test(normalized),
    (!state.availability || !hasConcreteAvailability(state.availability)) &&
      /(disponibilidad|dia|hora|franja|horario|cuando|manana|tarde)/.test(normalized)
  ];
  return missingRequests.filter(Boolean).length > 1;
}

export function asksForAlreadyKnownSchedulingField(reply: string, state: DentalAgentState): boolean {
  const normalized = normalize(reply);
  return Boolean(
    (hasFullName(state.name) && /(nombre|apellidos|como te llamas|como se llama)/.test(normalized)) ||
    (state.email && /(email|e-mail|correo)/.test(normalized)) ||
    (state.phone && /(telefono|contacto|movil|numero)/.test(normalized)) ||
    (state.location && /(sede|clinica|murcia|elche)/.test(normalized)) ||
    (state.availability && /(disponibilidad|dia|hora|franja|horario|cuando)/.test(normalized))
  );
}

export function asksForPhoneOrLaterSchedulingField(reply: string): boolean {
  const normalized = normalize(reply);
  return /(telefono|contacto|movil|numero|sede|clinica|murcia|elche|disponibilidad|dia|hora|franja|horario|cuando|manana|tarde|huecos|opciones|te propongo)/.test(normalized);
}

export function asksForSlotOptions(message: string): boolean {
  const normalized = normalize(message);
  return /(que dias|que dia|que huecos|que horas|tienes|teneis|disponible|disponibilidad|opciones|hueco|huecos)/.test(normalized) &&
    /\b(tarde|tardes|manana|mananas|por la tarde|por la manana)\b/.test(normalized);
}

export function asksGenericSymptomMenu(reply: string): boolean {
  const normalized = normalize(reply);
  return /(cuentame.*(dolor|encias).*(pieza rota|implante|ortodoncia|estetica|revision)|es dolor, encias|que necesitas o que te preocupa|cuentame que necesitas)/.test(
    normalized
  );
}

export function usesBadTraumaWording(reply: string): boolean {
  const normalized = normalize(reply);
  return /desde cuando ocurrio el golpe|desde cuando fue el golpe|desde cuando te golpeaste|cuando ocurrio el golpe/.test(normalized);
}

export function usesNonTraumaPainProtocol(reply: string): boolean {
  const normalized = normalize(reply);
  return /(pulpitis|absceso|frio\/calor|frio o calor|calor.*morder|morder.*sin tocar|aparece solo sin tocar)/.test(normalized);
}

export function promisesSpecificProvider(reply: string): boolean {
  const normalized = normalize(reply);
  return /(citarte|cita|atenderte|verte|valorarte).{0,60}\b(dr|dra|doctor|doctora|especialista)\b|\b(dr|dra|doctor|doctora|especialista)\b.{0,60}(ruiz|estrada|chumilla|herencia|garcia|marcos|manuel|ernesto|esther|laura|ana|paula)/.test(
    normalized
  );
}

export function isSimpleGreeting(message: string): boolean {
  const normalized = normalize(message).replace(/[!¡¿?.,\s]+/g, " ").trim();
  return /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|hello)$/.test(normalized);
}

export function asksForLocationAndAvailability(reply: string): boolean {
  const normalized = normalize(reply);
  const asksLocation = /(sede|murcia|elche)/.test(normalized);
  const asksTime = /(manana|tarde|horario|hora|dia|dias|cuando|vienes mejor|disponibilidad)/.test(normalized);
  return asksLocation && asksTime;
}

export function asksLocationOnly(reply: string): boolean {
  return /(sede|murcia|elche)/.test(normalize(reply));
}

export function asksOpenDateQuestion(reply: string): boolean {
  const normalized = normalize(reply);
  return /(que dias|dias u horarios|que horarios|horarios te vienen|cuando te viene|disponibilidad)/.test(normalized);
}

// Expresiones de cierre/conformidad en español (WhatsApp real: con o sin
// tildes, con "!"/"." de mas, mayus/minus). Una vez la cita esta lista
// (state.ready + availability concreta), cualquiera de estas debe cerrar la
// conversacion, nunca reabrir el agendado.
const BOOKING_CLOSING_ACKNOWLEDGMENT_PATTERN =
  /\b(vale|ok|okay|okey|de acuerdo|esta bien|asi esta bien|todo bien|todo correcto|todo ok|todo claro|queda claro|entendido|entendida|perfecto|perfecta|genial|estupendo|guay|gracias|muchas gracias|mil gracias|te lo agradezco|me vale|me vale asi|correcto|exacto|eso es|listo|ya esta|sale|dale|conforme|sin problema|ningun problema|de 10|de diez|hasta luego|hasta pronto|nos vemos|adios)\b/;

export function isBookingClosingAcknowledgment(message: string): boolean {
  const normalized = normalize(message).replace(/[!¡¿?.,\s]+/g, " ").trim();
  return BOOKING_CLOSING_ACKNOWLEDGMENT_PATTERN.test(normalized);
}

// Movida a dental-senior-agent.ts (PR #11, fix "la tercera"): el motor local
// tambien necesita saber si el ultimo mensaje del asistente ofrecio huecos,
// para resolver ordinales en texto libre con la misma funcion que el router.
// Se reexporta aqui para no romper los imports existentes desde guardrails.
export { jumpsToBookingOptions };
