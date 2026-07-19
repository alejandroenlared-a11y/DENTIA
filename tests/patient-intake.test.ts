import { PatientIntakeStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  generatePatientIntakeAccessCode,
  hasPatientIntakeData,
  resolvePatientIntakeStatus
} from "@/lib/patient-intake";
import { initialDentalAgentState } from "@/lib/agent/dental-senior-agent";

describe("patient intake", () => {
  it("generates patient-facing access codes with a stable prefix", () => {
    const code = generatePatientIntakeAccessCode();
    expect(code).toMatch(/^DENTIA-[A-Z2-9]{6}$/);
  });

  it("does not create an intake without patient-entered data", () => {
    expect(hasPatientIntakeData(initialDentalAgentState)).toBe(false);
  });

  it("recognizes chat data that should create or update an intake", () => {
    expect(hasPatientIntakeData({ ...initialDentalAgentState, email: "ana@example.com" })).toBe(true);
    expect(hasPatientIntakeData({ ...initialDentalAgentState, phone: "654718663" })).toBe(true);
  });

  it("marks duplicate candidates for human review", () => {
    expect(resolvePatientIntakeStatus(["patient_2"], "patient_1")).toBe(PatientIntakeStatus.DUPLICATE_REVIEW);
    expect(resolvePatientIntakeStatus([], "patient_1")).toBe(PatientIntakeStatus.LINKED);
    expect(resolvePatientIntakeStatus([], null)).toBe(PatientIntakeStatus.CAPTURED);
  });
});
