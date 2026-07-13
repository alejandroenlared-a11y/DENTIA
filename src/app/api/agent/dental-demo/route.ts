import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runDentalAgentTurn, dentalAgentRequestSchema } from "@/lib/agent/openai-dental-agent";
import { prisma } from "@/lib/prisma";
import { firstErrorMessage } from "@/lib/validation";

// Margen suficiente para el turno LLM (12s) + contexto del tenant.
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Sesion no valida." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "JSON no valido." }, { status: 400 });
  }

  const parsed = dentalAgentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: firstErrorMessage(parsed.error) }, { status: 422 });
  }

  const treatments = await prisma.treatment.findMany({
    where: { tenantId: user.tenantId, active: true },
    orderBy: { name: "asc" },
    select: { name: true, priceCents: true, durationMinutes: true, rules: true, requiresAssessment: true }
  });

  const clinicContext = [
    `Tenant: ${user.tenant.name}`,
    `Assistant: ${user.tenant.assistantName}`,
    user.tenant.phone ? `Telefono clinica: ${user.tenant.phone}` : "",
    user.tenant.settings?.tone ? `Tono configurado: ${user.tenant.settings.tone}` : "",
    user.tenant.settings?.escalationRules ? `Reglas de escalado tenant: ${user.tenant.settings.escalationRules}` : "",
    user.tenant.settings?.rgpdNotes ? `Notas RGPD tenant: ${user.tenant.settings.rgpdNotes}` : "",
    user.tenant.settings?.knowledgeNotes ? `Base de conocimiento de la clinica:\n${user.tenant.settings.knowledgeNotes}` : "",
    treatments.length > 0
      ? `Catalogo real del tenant:\n${treatments
          .map(treatment =>
            `- ${treatment.name}: ${treatment.priceCents === null ? "valoracion previa" : `${Math.round(treatment.priceCents / 100)} EUR`}; ${treatment.durationMinutes} min; ${treatment.rules}; requiere valoracion: ${treatment.requiresAssessment ? "si" : "no"}`
          )
          .join("\n")}`
      : ""
  ].filter(Boolean).join("\n");

  const result = await runDentalAgentTurn({
    latestPatientMessage: parsed.data.message,
    history: parsed.data.messages,
    state: parsed.data.state,
    clinicContext
  });

  return NextResponse.json({
    success: true,
    data: result,
    error: null
  });
}
