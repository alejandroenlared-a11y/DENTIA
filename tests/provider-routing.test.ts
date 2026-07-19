import { describe, expect, it } from "vitest";
import { chooseProviderForIntent } from "@/lib/agent";

const providers = [
  { name: "Ana Isabel Garcia Marcos", specialty: "Higiene y mantenimiento periodontal" },
  { name: "Dr. Ernesto Ruiz Chumilla", specialty: "Periodoncia, implantes y cirugia oral" },
  { name: "Dra. Esther Estrada Mallada", specialty: "Ortodoncia" }
];

describe("chooseProviderForIntent", () => {
  it("routes periodontics to the periodontist, not the hygienist", () => {
    const provider = chooseProviderForIntent(providers, "periodontics");

    expect(provider?.name).toBe("Dr. Ernesto Ruiz Chumilla");
  });

  it("routes hygiene/reactivation to the hygienist", () => {
    const provider = chooseProviderForIntent(providers, "reactivation");

    expect(provider?.name).toBe("Ana Isabel Garcia Marcos");
  });

  it("does not use a hygienist as the default provider for first visits", () => {
    const provider = chooseProviderForIntent(providers, "first_visit");

    expect(provider?.name).toBe("Dr. Ernesto Ruiz Chumilla");
  });
});
