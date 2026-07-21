import { hasConcreteAvailability, hasFullName, normalize, type DentalAgentState } from "@/lib/agent/dental-senior-agent";
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
  if (!state.intent && isSimpleGreeting(latestPatientMessage)) {
    return formatReplyForChat("Hola.\n\nPara poder orientarte, cuentame que necesitas o que te preocupa.");
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

export function asksForPersonalData(reply: string): boolean {
  const normalized = normalize(reply);
  return /(nombre|email|e-mail|correo|telefono|contacto|apellidos|sede|murcia|elche|consentimiento|guardar|datos|informacion|registrar|cita)/.test(normalized);
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

export function jumpsToBookingOptions(reply: string): boolean {
  const normalized = normalize(reply);
  return /(huecos|opciones|te propongo|pre-reservada|reservada|miercoles|jueves|viernes|lunes|martes)/.test(normalized);
}
