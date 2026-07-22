// Fase 3 del refactor de arquitectura. Enrutador determinista del acto
// conversacional (saludo, gracias, precio, ubicacion, equipo, cierre) — una dimension
// ortogonal al tema clinico, que ya clasifica inferIntent en dental-senior-agent.ts y
// que normalizeDentalAgentState (fase 1) refleja en treatmentTopic. Reusa los
// detectores ya existentes en vez de duplicar sus regex, para que un cambio en el
// criterio de "es un saludo"/"pregunta precio"/etc. solo se edite en un sitio.
// Aditivo: no sustituye todavia a inferIntent/buildDentalReply en produccion.
import {
  asksClinicAddress,
  asksTeamOrSpecialties,
  isBookingClosingAcknowledgment,
  isSimpleGreeting
} from "@/lib/agent/guardrails";
import { mentionsPrice, normalize } from "@/lib/agent/dental-senior-agent";
import type { ConversationIntent } from "@/lib/agent/dental-agent-types";

// Mismo patron que el "gracias" suelto ya usado en dental-senior-agent.ts (nextStep/
// buildCourtesyReply) para distinguir un agradecimiento de cierre de una confirmacion
// generica ("vale", "perfecto"), que isBookingClosingAcknowledgment agrupa junto.
const BARE_THANKS_PATTERN = /^(gracias|muchas gracias|ok gracias|vale gracias)[!.? ]*$/;

export function routeConversationIntent(latestPatientText: string): ConversationIntent {
  const bareText = normalize(latestPatientText).replace(/[!¡¿?.,\s]+/g, " ").trim();

  if (isSimpleGreeting(latestPatientText)) return "greeting";
  if (BARE_THANKS_PATTERN.test(bareText)) return "thanks";
  if (asksClinicAddress(latestPatientText)) return "ask_location";
  if (asksTeamOrSpecialties(latestPatientText)) return "ask_team";
  if (mentionsPrice(latestPatientText)) return "ask_price";
  if (isBookingClosingAcknowledgment(latestPatientText)) return "confirm";
  return "unknown";
}
