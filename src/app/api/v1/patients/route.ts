import { ConversationChannel, PatientStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { apiError, authenticateApiRequest, getPlanLimits } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { firstErrorMessage, patientInputSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("response" in auth) {
    return auth.response;
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "25") || 25));

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where: { tenantId: auth.tenant.id } }),
    prisma.patient.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        primaryLocation: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        source: true,
        treatmentNeed: true,
        estimatedValue: true,
        createdAt: true
      }
    })
  ]);

  return NextResponse.json({
    success: true,
    data: patients,
    error: null,
    meta: { total, page, limit }
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("response" in auth) {
    return auth.response;
  }

  const limits = getPlanLimits(auth.tenant.plan);
  const total = await prisma.patient.count({ where: { tenantId: auth.tenant.id } });
  if (total >= limits.maxPatients) {
    return apiError(403, `Limite de pacientes del plan ${auth.tenant.plan} alcanzado (${limits.maxPatients}).`);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "JSON no valido.");
  }

  const parsed = patientInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, firstErrorMessage(parsed.error));
  }

  try {
    const patient = await prisma.patient.create({
      data: {
        tenantId: auth.tenant.id,
        primaryLocation: parsed.data.primaryLocation,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        status: PatientStatus.NEW_LEAD,
        source: parsed.data.source ?? "api",
        preferredChannel: ConversationChannel.WHATSAPP,
        treatmentNeed: parsed.data.treatmentNeed,
        estimatedValue: parsed.data.estimatedValue * 100
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: auth.tenant.id,
        action: "api.patient.created",
        entityType: "Patient",
        entityId: patient.id
      }
    });

    return NextResponse.json({ success: true, data: patient, error: null }, { status: 201 });
  } catch (error) {
    console.error("api v1 create patient failed", error);
    return apiError(409, "No se pudo crear el paciente. Telefono duplicado?");
  }
}
