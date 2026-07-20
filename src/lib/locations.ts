import type { ClinicLocation, ProviderLocationScope } from "@prisma/client";

export const LOCATION_MURCIA = "MURCIA" as ClinicLocation;
export const LOCATION_ELCHE = "ELCHE" as ClinicLocation;
export const PROVIDER_SCOPE_MURCIA = "MURCIA" as ProviderLocationScope;
export const PROVIDER_SCOPE_ELCHE = "ELCHE" as ProviderLocationScope;
export const PROVIDER_SCOPE_BOTH = "BOTH" as ProviderLocationScope;
export const DEFAULT_LOCATION = LOCATION_MURCIA;

export function parseLocation(value: unknown): ClinicLocation {
  return parseOptionalLocation(value) ?? DEFAULT_LOCATION;
}

export function parseOptionalLocation(value: unknown): ClinicLocation | null {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "elche" || normalized === "elx" || normalized.includes("elche")) {
    return LOCATION_ELCHE;
  }
  if (normalized === "murcia" || normalized.includes("murcia")) {
    return LOCATION_MURCIA;
  }
  return null;
}

export function locationSlug(location: ClinicLocation) {
  return location === LOCATION_ELCHE ? "elche" : "murcia";
}

export function locationLabel(location: ClinicLocation) {
  return location === LOCATION_ELCHE ? "Elche" : "Murcia";
}

export function providerScopesForLocation(location: ClinicLocation): ProviderLocationScope[] {
  return location === LOCATION_ELCHE
    ? [PROVIDER_SCOPE_ELCHE, PROVIDER_SCOPE_BOTH]
    : [PROVIDER_SCOPE_MURCIA, PROVIDER_SCOPE_BOTH];
}
