import { describe, expect, it } from "vitest";
import {
  appointmentInputSchema,
  conversationReplySchema,
  firstErrorMessage,
  patientInputSchema,
  settingsInputSchema,
  taskInputSchema,
  treatmentInputSchema
} from "@/lib/validation";

describe("patientInputSchema", () => {
  it("acepta un paciente valido", () => {
    const result = patientInputSchema.safeParse({
      name: "Laura Ortiz",
      phone: "600111222",
      email: "laura@example.com",
      estimatedValue: "350"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimatedValue).toBe(350);
    }
  });

  it("acepta email vacio", () => {
    const result = patientInputSchema.safeParse({ name: "Laura", phone: "600111222", email: "" });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre vacio", () => {
    const result = patientInputSchema.safeParse({ name: "  ", phone: "600111222" });
    expect(result.success).toBe(false);
  });

  it("rechaza email invalido", () => {
    const result = patientInputSchema.safeParse({ name: "Laura", phone: "600111222", email: "no-es-email" });
    expect(result.success).toBe(false);
  });

  it("rechaza valor estimado negativo", () => {
    const result = patientInputSchema.safeParse({ name: "Laura", phone: "600111222", estimatedValue: "-5" });
    expect(result.success).toBe(false);
  });
});

describe("appointmentInputSchema", () => {
  it("acepta una cita valida con defaults", () => {
    const result = appointmentInputSchema.safeParse({
      patientId: "pat_1",
      title: "Primera visita",
      date: "2026-07-09",
      time: "10:30"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("REQUESTED");
      expect(result.data.channel).toBe("WHATSAPP");
    }
  });

  it("rechaza cita sin paciente", () => {
    const result = appointmentInputSchema.safeParse({ title: "Visita", date: "2026-07-09", time: "10:30" });
    expect(result.success).toBe(false);
  });

  it("rechaza estado desconocido", () => {
    const result = appointmentInputSchema.safeParse({
      patientId: "pat_1",
      title: "Visita",
      date: "2026-07-09",
      time: "10:30",
      status: "INVENTADO"
    });
    expect(result.success).toBe(false);
  });
});

describe("taskInputSchema", () => {
  it("acepta tarea valida", () => {
    const result = taskInputSchema.safeParse({ title: "Llamar paciente", type: "Recepcion" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("MEDIUM");
    }
  });

  it("rechaza tarea sin titulo", () => {
    const result = taskInputSchema.safeParse({ type: "Recepcion" });
    expect(result.success).toBe(false);
  });
});

describe("conversationReplySchema", () => {
  it("rechaza respuesta demasiado corta", () => {
    const result = conversationReplySchema.safeParse({ conversationId: "conv_1", body: "a" });
    expect(result.success).toBe(false);
  });

  it("acepta respuesta valida", () => {
    const result = conversationReplySchema.safeParse({ conversationId: "conv_1", body: "Hola, le confirmo la cita." });
    expect(result.success).toBe(true);
  });
});

describe("treatmentInputSchema", () => {
  it("acepta precio vacio como valoracion previa", () => {
    const result = treatmentInputSchema.safeParse({
      name: "Implante",
      durationMinutes: "60",
      price: "",
      rules: "Solo con valoracion previa"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBeUndefined();
    }
  });

  it("convierte precio numerico", () => {
    const result = treatmentInputSchema.safeParse({
      name: "Limpieza",
      durationMinutes: "30",
      price: "60",
      rules: "Agendable directa"
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(60);
    }
  });

  it("rechaza duracion menor a 5 minutos", () => {
    const result = treatmentInputSchema.safeParse({ name: "Revision", durationMinutes: "2", rules: "x" });
    expect(result.success).toBe(false);
  });
});

describe("settingsInputSchema", () => {
  const base = {
    name: "Clinica Dental Murcia-Elche",
    assistantName: "Clara",
    pmsProvider: "Gesden",
    tone: "Cercano",
    escalationRules: "Urgencias a humano",
    rgpdNotes: "Consentimiento explicito"
  };

  it("acepta configuracion valida", () => {
    const result = settingsInputSchema.safeParse({ ...base, retentionDays: "90" });
    expect(result.success).toBe(true);
  });

  it("rechaza retencion fuera de rango", () => {
    expect(settingsInputSchema.safeParse({ ...base, retentionDays: "0" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, retentionDays: "9999" }).success).toBe(false);
  });
});

describe("firstErrorMessage", () => {
  it("devuelve mensaje con etiqueta en espanol", () => {
    const result = patientInputSchema.safeParse({ phone: "600111222" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = firstErrorMessage(result.error);
      expect(message).toContain("Nombre");
      expect(message).toContain("obligatorio");
    }
  });

  it("etiqueta el email invalido", () => {
    const result = patientInputSchema.safeParse({ name: "Laura", phone: "600", email: "mal" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstErrorMessage(result.error)).toContain("Email");
    }
  });
});
