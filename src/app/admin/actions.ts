"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin-auth";
import { resetDemoPatientsForTenant } from "@/lib/demo-patient-reset";

const CONFIRMATION = "RESET PACIENTES DEMO";

export async function resetDemoPatientsAction(formData: FormData) {
  const user = await requireAdminUser();
  const tenantSlug = String(formData.get("tenantSlug") || "").trim();
  const confirmation = String(formData.get("confirmation") || "").trim();

  if (!tenantSlug) {
    redirect("/admin?error=" + encodeURIComponent("Selecciona un tenant para resetear."));
  }
  if (confirmation !== CONFIRMATION) {
    redirect("/admin?error=" + encodeURIComponent(`Confirmacion invalida. Escribe: ${CONFIRMATION}`));
  }

  let result: Awaited<ReturnType<typeof resetDemoPatientsForTenant>>;
  try {
    result = await resetDemoPatientsForTenant({ tenantSlug, actorUserId: user.id });
  } catch (error) {
    console.error("resetDemoPatientsAction failed", error);
    redirect("/admin?error=" + encodeURIComponent("No se pudo resetear la demo. Revisa logs de Vercel."));
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect(
    "/admin?ok=" +
      encodeURIComponent(
        `Pacientes demo reseteados en ${result.tenant.slug}: ${result.deletedPatients} borrados, ${result.counts.patients} activos.`
      )
  );
}
