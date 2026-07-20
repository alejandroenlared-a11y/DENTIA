import { AppointmentStatus, CalendarEventType, type ClinicLocation, type Prisma } from "@prisma/client";
import { notifyAppointmentEvent } from "@/lib/notifications/appointment-notifications";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCATION } from "@/lib/locations";

export const SLOT_MINUTES = 30;
export const CLINIC_OPEN_HOUR = 9;
export const CLINIC_CLOSE_HOUR = 20;
export const URGENT_BOOKING_BUFFER_MINUTES = 20;
export const URGENT_MAX_DAYS_AHEAD = 3;
export const DEFAULT_MAX_DAYS_AHEAD = 14;

const HOLDING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.REQUESTED,
  AppointmentStatus.PROPOSED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.URGENT
];

export class SchedulingConflictError extends Error {
  constructor(message = "El hueco solicitado ya esta ocupado.") {
    super(message);
    this.name = "SchedulingConflictError";
  }
}

export function roundUpToSlot(date: Date, stepMinutes: number = SLOT_MINUTES): Date {
  const stepMs = stepMinutes * 60_000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

function dayBounds(day: Date) {
  const dayStart = new Date(day);
  dayStart.setHours(CLINIC_OPEN_HOUR, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(CLINIC_CLOSE_HOUR, 0, 0, 0);
  return { dayStart, dayEnd };
}

async function fetchDayOccupancy(tenantId: string, providerId: string, dayStart: Date, dayEnd: Date) {
  const [appointments, events] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        providerId,
        status: { in: HOLDING_STATUSES },
        startsAt: { gte: dayStart, lt: dayEnd }
      },
      select: { startsAt: true, durationMinutes: true }
    }),
    prisma.calendarEvent.findMany({
      where: {
        tenantId,
        providerId,
        startsAt: { gte: dayStart, lt: dayEnd }
      },
      select: { startsAt: true, durationMinutes: true }
    })
  ]);
  return [...appointments, ...events];
}

function overlaps(
  slotStart: number,
  slotEnd: number,
  appointments: Array<{ startsAt: Date; durationMinutes: number }>
): boolean {
  return appointments.some(appt => {
    const apptStart = appt.startsAt.getTime();
    const apptEnd = apptStart + appt.durationMinutes * 60_000;
    return apptStart < slotEnd && apptEnd > slotStart;
  });
}

export async function findNextAvailableSlot(
  tenantId: string,
  providerId: string,
  options: { durationMinutes?: number; maxDaysAhead?: number; bufferMinutes?: number; from?: Date } = {}
): Promise<Date | null> {
  const durationMinutes = options.durationMinutes ?? SLOT_MINUTES;
  const maxDaysAhead = options.maxDaysAhead ?? DEFAULT_MAX_DAYS_AHEAD;
  const bufferMinutes = options.bufferMinutes ?? 0;
  const now = options.from ?? new Date();

  for (let dayOffset = 0; dayOffset < maxDaysAhead; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    const { dayStart, dayEnd } = dayBounds(day);

    let cursor = dayOffset === 0 ? roundUpToSlot(new Date(now.getTime() + bufferMinutes * 60_000)) : dayStart;
    if (cursor < dayStart) {
      cursor = dayStart;
    }
    if (cursor >= dayEnd) {
      continue;
    }

    const dayOccupancy = await fetchDayOccupancy(tenantId, providerId, dayStart, dayEnd);

    while (cursor.getTime() + durationMinutes * 60_000 <= dayEnd.getTime()) {
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + durationMinutes * 60_000;
      if (!overlaps(slotStart, slotEnd, dayOccupancy)) {
        return new Date(slotStart);
      }
      cursor = new Date(slotEnd);
    }
  }

  return null;
}

export async function listAvailableSlots(
  tenantId: string,
  providerId: string,
  dateIso: string,
  durationMinutes: number = SLOT_MINUTES
): Promise<Date[]> {
  const day = new Date(`${dateIso}T00:00:00.000Z`);
  const { dayStart, dayEnd } = dayBounds(day);
  const dayOccupancy = await fetchDayOccupancy(tenantId, providerId, dayStart, dayEnd);

  const slots: Date[] = [];
  let cursor = dayStart;
  const now = new Date();
  while (cursor.getTime() + durationMinutes * 60_000 <= dayEnd.getTime()) {
    const slotStart = cursor.getTime();
    const slotEnd = slotStart + durationMinutes * 60_000;
    if (slotStart >= now.getTime() && !overlaps(slotStart, slotEnd, dayOccupancy)) {
      slots.push(new Date(slotStart));
    }
    cursor = new Date(slotEnd);
  }
  return slots;
}

export async function listNextAvailableSlots(
  tenantId: string,
  providerId: string,
  options: { durationMinutes?: number; maxDaysAhead?: number; limit?: number; from?: Date } = {}
): Promise<Date[]> {
  const durationMinutes = options.durationMinutes ?? SLOT_MINUTES;
  const maxDaysAhead = options.maxDaysAhead ?? 7;
  const limit = options.limit ?? 3;
  const from = options.from ?? new Date();

  const results: Date[] = [];
  for (let dayOffset = 0; dayOffset < maxDaysAhead && results.length < limit; dayOffset += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + dayOffset);
    const dateIso = day.toISOString().slice(0, 10);
    const daySlots = await listAvailableSlots(tenantId, providerId, dateIso, durationMinutes);
    for (const slot of daySlots) {
      if (results.length >= limit) break;
      if (slot.getTime() >= from.getTime()) {
        results.push(slot);
      }
    }
  }

  return results;
}

export async function hasConflict(
  tenantId: string,
  input: { providerId: string; startsAt: Date; durationMinutes: number; excludeAppointmentId?: string }
): Promise<boolean> {
  const slotStart = input.startsAt.getTime();
  const slotEnd = slotStart + input.durationMinutes * 60_000;
  const dayStart = new Date(input.startsAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [dayAppointments, dayEvents] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        tenantId,
        providerId: input.providerId,
        status: { in: HOLDING_STATUSES },
        startsAt: { gte: dayStart, lt: dayEnd },
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {})
      },
      select: { startsAt: true, durationMinutes: true }
    }),
    prisma.calendarEvent.findMany({
      where: { tenantId, providerId: input.providerId, startsAt: { gte: dayStart, lt: dayEnd } },
      select: { startsAt: true, durationMinutes: true }
    })
  ]);

  return overlaps(slotStart, slotEnd, [...dayAppointments, ...dayEvents]);
}

export type SchedulingActor = { type: "staff" | "ai"; userId?: string };

export async function createCalendarEvent(
  tenantId: string,
  input: {
    location?: ClinicLocation;
    providerId?: string | null;
    operatoryId?: string | null;
    title: string;
    type: CalendarEventType;
    startsAt: Date;
    durationMinutes: number;
    notes?: string | null;
  },
  actor: SchedulingActor
) {
  if (input.providerId) {
    const conflict = await hasConflict(tenantId, {
      providerId: input.providerId,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes
    });
    if (conflict) {
      throw new SchedulingConflictError();
    }
  }

  const event = await prisma.calendarEvent.create({
    data: {
      tenantId,
      location: input.location ?? DEFAULT_LOCATION,
      providerId: input.providerId || null,
      operatoryId: input.operatoryId || null,
      title: input.title,
      type: input.type,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      notes: input.notes || null,
      createdByUserId: actor.type === "staff" ? actor.userId ?? null : null
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.type === "staff" ? actor.userId ?? null : null,
      action: "calendar_event.created",
      entityType: "CalendarEvent",
      entityId: event.id,
      metadata: { type: input.type, startsAt: input.startsAt } as Prisma.InputJsonValue
    }
  });

  return event;
}

export async function cancelCalendarEvent(tenantId: string, eventId: string, actor: SchedulingActor) {
  const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, tenantId } });
  if (!event) {
    throw new Error("Evento no encontrado en esta clinica.");
  }

  await prisma.calendarEvent.delete({ where: { id: eventId } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.type === "staff" ? actor.userId ?? null : null,
      action: "calendar_event.cancelled",
      entityType: "CalendarEvent",
      entityId: eventId,
      metadata: { title: event.title, startsAt: event.startsAt } as Prisma.InputJsonValue
    }
  });
}

export async function cancelAppointment(
  tenantId: string,
  appointmentId: string,
  actor: SchedulingActor,
  reason?: string
) {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId } });
  if (!appointment) {
    throw new Error("Cita no encontrada en esta clinica.");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.type === "staff" ? actor.userId ?? null : null,
      action: actor.type === "ai" ? "agent.appointment_cancelled" : "appointment.cancelled",
      entityType: "Appointment",
      entityId: appointmentId,
      metadata: { reason: reason ?? null, previousStatus: appointment.status } as Prisma.InputJsonValue
    }
  });

  await notifyAppointmentEvent({
    tenantId,
    appointmentId,
    eventType: "cancelled",
    actor,
    previousStartsAt: appointment.startsAt,
    reason: reason ?? null
  });

  return updated;
}

export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  newStartsAt: Date,
  actor: SchedulingActor
) {
  const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, tenantId } });
  if (!appointment) {
    throw new Error("Cita no encontrada en esta clinica.");
  }
  if (!appointment.providerId) {
    throw new Error("La cita no tiene profesional asignado, no se puede validar disponibilidad.");
  }

  const conflict = await hasConflict(tenantId, {
    providerId: appointment.providerId,
    startsAt: newStartsAt,
    durationMinutes: appointment.durationMinutes,
    excludeAppointmentId: appointmentId
  });
  if (conflict) {
    throw new SchedulingConflictError();
  }

  const previousStartsAt = appointment.startsAt;
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { startsAt: newStartsAt, status: AppointmentStatus.CONFIRMED }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorUserId: actor.type === "staff" ? actor.userId ?? null : null,
      action: actor.type === "ai" ? "agent.appointment_rescheduled" : "appointment.rescheduled",
      entityType: "Appointment",
      entityId: appointmentId,
      metadata: { previousStartsAt, newStartsAt } as Prisma.InputJsonValue
    }
  });

  await notifyAppointmentEvent({
    tenantId,
    appointmentId,
    eventType: "rescheduled",
    actor,
    previousStartsAt
  });

  return updated;
}
