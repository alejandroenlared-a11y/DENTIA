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
    expect(getDashboardDataRequirements("agent").needsPatientIntakeRows).toBe(false);
    expect(getDashboardDataRequirements("aiReview").needsPatientIntakeRows).toBe(true);
    expect(getDashboardDataRequirements("inventory").needsPatientIntakeRows).toBe(false);
  });

  it("does not load unused overview counts outside the home view", () => {
    expect(getDashboardDataRequirements("home").needsOverviewMetricCounts).toBe(true);
    expect(getDashboardDataRequirements("calendar").needsOverviewMetricCounts).toBe(false);
    expect(getDashboardDataRequirements("patients").needsOverviewMetricCounts).toBe(false);
  });

  it("splits invoice rows from expense rows by view", () => {
    expect(getDashboardDataRequirements("patients").needsInvoiceRows).toBe(true);
    expect(getDashboardDataRequirements("patients").needsExpenseRows).toBe(false);
    expect(getDashboardDataRequirements("documents").needsInvoiceRows).toBe(true);
    expect(getDashboardDataRequirements("documents").needsExpenseRows).toBe(false);
    expect(getDashboardDataRequirements("billing").needsInvoiceRows).toBe(true);
    expect(getDashboardDataRequirements("billing").needsExpenseRows).toBe(true);
  });
});
