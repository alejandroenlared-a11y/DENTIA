import { NextResponse, type NextRequest } from "next/server";
import { apiError, authenticateApiRequest } from "@/lib/api-auth";
import { notifyAppointmentEvent } from "@/lib/notifications/appointment-notifications";
import { prisma } from "@/lib/prisma";
import { firstErrorMessage, appointmentInputSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("response" in auth) {
    return auth.response;
  }

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "25") || 25));

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where: { tenantId: auth.tenant.id } }),
    prisma.appointment.findMany({
      where: { tenantId: auth.tenant.id },
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        startsAt: true,
        durationMinutes: true,
        status: true,
        channel: true,
        createdByAi: true,
        patient: { select: { id: true, name: true, phone: true } },
        treatment: { select: { id: true, name: true } }
      }
    })
  ]);

  return NextResponse.json({
    success: true,
    data: appointments,
    error: null,
    meta: { total, page, limit }
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request);
  if ("response" in auth) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "JSON no valido.");
  }

  const parsed = appointmentInputSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, firstErrorMessage(parsed.error));
  }

  const startsAt = new Date(`${parsed.data.date}T${parsed.data.time}:00.000Z`);
  if (Number.isNaN(startsAt.getTime())) {
    return apiError(422, "Fecha u hora no validas.");
  }

  const patient = await prisma.patient.findFirst({
    where: { id: parsed.data.patientId, tenantId: auth.tenant.id }
  });
  if (!patient) {
    return apiError(404, "Paciente no encontrado en esta clinica.");
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: auth.tenant.id,
        patientId: patient.id,
        treatmentId: parsed.data.treatmentId || null,
        title: parsed.data.title,
        startsAt,
        status: parsed.data.status,
        channel: parsed.data.channel,
        createdByAi: false
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: auth.tenant.id,
        action: "api.appointment.created",
        entityType: "Appointment",
        entityId: appointment.id
      }
    });
    await notifyAppointmentEvent({
      tenantId: auth.tenant.id,
      appointmentId: appointment.id,
      eventType: "created",
      actor: { type: "api" }
    });

    return NextResponse.json({ success: true, data: appointment, error: null }, { status: 201 });
  } catch (error) {
    console.error("api v1 create appointment failed", error);
    return apiError(500, "No se pudo crear la cita.");
  }
}
