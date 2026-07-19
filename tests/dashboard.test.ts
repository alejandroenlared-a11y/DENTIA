import { describe, expect, it } from "vitest";
import { getDashboardDataRequirements } from "@/lib/dashboard";

describe("dashboard data requirements", () => {
  it("loads appointment rows for inventory capacity metrics", () => {
    expect(getDashboardDataRequirements("inventory").needsAppointmentRows).toBe(true);
  });

  it("loads appointment rows for team capacity metrics", () => {
    expect(getDashboardDataRequirements("team").needsAppointmentRows).toBe(true);
  });

  it("loads recovered appointment rows for analytics IA recovery metrics", () => {
    expect(getDashboardDataRequirements("analytics").needsRecoveredAppointmentRows).toBe(true);
  });

  it("keeps receptionist agent data isolated to agent surfaces", () => {
    expect(getDashboardDataRequirements("agent").needsPatientIntakeRows).toBe(true);
    expect(getDashboardDataRequirements("aiReview").needsPatientIntakeRows).toBe(true);
    expect(getDashboardDataRequirements("inventory").needsPatientIntakeRows).toBe(false);
  });
});
