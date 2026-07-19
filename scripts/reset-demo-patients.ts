import { config } from "dotenv";

const explicitEnvPath = process.env.DOTENV_CONFIG_PATH;
if (explicitEnvPath) {
  config({ path: explicitEnvPath, override: true });
  if (!process.env.DATABASE_URL) {
    throw new Error(`DATABASE_URL no esta definido en ${explicitEnvPath}.`);
  }
} else {
  config({ path: ".env.local" });
  if (!process.env.DATABASE_URL) {
    config({ path: ".env", override: true });
  }
}

async function main() {
  const { resetDemoPatientsForTenant } = await import("../src/lib/demo-patient-reset");
  const result = await resetDemoPatientsForTenant({
    tenantSlug: process.env.DEFAULT_TENANT_SLUG || "clinica-murcia-elche"
  });
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
