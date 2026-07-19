import { describe, expect, it } from "vitest";
import { buildAppointmentMakePayload } from "@/lib/notifications/appointment-notifications";

describe("buildAppointmentMakePayload", () => {
  it("marks Dentia as the calendar source of truth and Make as email delivery only", () => {
    const startsAt = new Date("2026-07-20T15:30:00.000Z");
    const updatedAt = new Date("2026-07-16T18:00:00.000Z");
    const appointment = {
        id: "appt_1",
        tenantId: "tenant_1",
        patientId: "patient_1",
        treatmentId: "treatment_1",
        providerId: "provider_1",
        operatoryId: "op_1",
        title: "Revision",
        startsAt,
        durationMinutes: 30,
        status: "PROPOSED",
        channel: "WHATSAPP",
        createdByAi: true,
        createdAt: updatedAt,
        updatedAt,
        tenant: { id: "tenant_1", name: "Clinica Dental Murcia-Elche", slug: "clinica-murcia-elche" },
        patient: {
          id: "patient_1",
          tenantId: "tenant_1",
          name: "Ana Perez Lopez",
          phone: "654718663",
          email: "ana@example.com",
          fiscalName: null,
          taxId: null,
          fiscalAddress: null,
          status: "NEW_LEAD",
          source: "whatsapp",
          preferredChannel: "WHATSAPP",
          treatmentNeed: null,
          estimatedValue: 0,
          lastVisitAt: null,
          notes: null,
          createdAt: updatedAt,
          updatedAt
        },
        provider: {
          id: "provider_1",
          tenantId: "tenant_1",
          name: "Dra. Demo",
          specialty: "Odontologia",
          active: true,
          createdAt: updatedAt,
          updatedAt
        },
        operatory: {
          id: "op_1",
          tenantId: "tenant_1",
          name: "Gabinete 1",
          kind: "general",
          active: true,
          createdAt: updatedAt,
          updatedAt
        },
        treatment: {
          id: "treatment_1",
          tenantId: "tenant_1",
          name: "Primera visita",
          durationMinutes: 30,
          priceCents: 0,
          requiresAssessment: true,
          defaultProvider: null,
          defaultOperatory: null,
          rules: "valoracion",
          active: true,
          createdAt: updatedAt,
          updatedAt
        }
    };
    const payload = buildAppointmentMakePayload(appointment as Parameters<typeof buildAppointmentMakePayload>[0], {
      eventType: "created",
      actor: { type: "ai" }
    });

    expect(payload.sourceOfTruth).toBe("dentia_native_calendar");
    expect(payload.control.makeRole).toBe("email_delivery_only");
    expect(payload.shouldEmailPatient).toBe(true);
    expect(payload.patient.email).toBe("ana@example.com");
    expect(payload.appointment.startsAt).toBe(startsAt.toISOString());
  });

  it("includes the patient portal link when an intake access code is available", () => {
    const startsAt = new Date("2026-07-20T15:30:00.000Z");
    const updatedAt = new Date("2026-07-16T18:00:00.000Z");
    const appointment = {
        id: "appt_1",
        tenantId: "tenant_1",
        patientId: "patient_1",
        treatmentId: null,
        providerId: null,
        operatoryId: null,
        title: "Primera visita",
        startsAt,
        durationMinutes: 30,
        status: "PROPOSED",
        channel: "WHATSAPP",
        createdByAi: true,
        createdAt: updatedAt,
        updatedAt,
        tenant: { id: "tenant_1", name: "Clinica Dental Murcia-Elche", slug: "clinica-murcia-elche" },
        patient: {
          id: "patient_1",
          tenantId: "tenant_1",
          name: "Ana Perez Lopez",
          phone: "654718663",
          email: "ana@example.com",
          fiscalName: null,
          taxId: null,
          fiscalAddress: null,
          status: "NEW_LEAD",
          source: "whatsapp",
          preferredChannel: "WHATSAPP",
          treatmentNeed: null,
          estimatedValue: 0,
          lastVisitAt: null,
          notes: null,
          createdAt: updatedAt,
          updatedAt
        },
        provider: null,
        operatory: null,
        treatment: null
    };
    const payload = buildAppointmentMakePayload(appointment as Parameters<typeof buildAppointmentMakePayload>[0], {
      eventType: "created",
      actor: { type: "ai" },
      patientIntake: { id: "intake_1", accessCode: "DENTIA-7K4P9Q", status: "LINKED" },
      appBaseUrl: "https://dentia.avelkia.es/"
    });

    expect(payload.patientPortalUrl).toBe("https://dentia.avelkia.es/ficha/DENTIA-7K4P9Q");
    expect(payload.patientIntake).toEqual({
      id: "intake_1",
      accessCode: "DENTIA-7K4P9Q",
      status: "LINKED",
      portalUrl: "https://dentia.avelkia.es/ficha/DENTIA-7K4P9Q"
    });
  });
});
