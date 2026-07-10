import { NextResponse, type NextRequest } from "next/server";
import type { Tenant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export const planLimits: Record<string, { maxPatients: number; apiRequestsPerMinute: number }> = {
  STARTER: { maxPatients: 200, apiRequestsPerMinute: 30 },
  PRO: { maxPatients: 2000, apiRequestsPerMinute: 120 },
  SCALE: { maxPatients: 20000, apiRequestsPerMinute: 600 }
};

export function getPlanLimits(plan: string) {
  return planLimits[plan] ?? planLimits.PRO;
}

export function apiError(status: number, error: string) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function authenticateApiRequest(
  request: NextRequest
): Promise<{ tenant: Tenant } | { response: NextResponse }> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return { response: apiError(401, "Falta la cabecera x-api-key.") };
  }

  const tenant = await prisma.tenant.findUnique({ where: { apiKey } });
  if (!tenant) {
    return { response: apiError(401, "API key no valida.") };
  }

  const limits = getPlanLimits(tenant.plan);
  const rate = checkRateLimit(`api:${tenant.id}`, limits.apiRequestsPerMinute, 60_000);
  if (!rate.allowed) {
    return { response: apiError(429, "Limite de peticiones del plan alcanzado. Espera un minuto.") };
  }

  return { tenant };
}
