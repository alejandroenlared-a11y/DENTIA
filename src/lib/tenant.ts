import { requireSessionUser, type SessionUser } from "@/lib/auth";
import type { Tenant, TenantSetting } from "@prisma/client";

export type CurrentTenant = Tenant & { settings: TenantSetting | null };

export async function getCurrentTenant(): Promise<CurrentTenant> {
  const user = await requireSessionUser();
  return user.tenant;
}

export async function getCurrentContext(): Promise<{ user: SessionUser; tenant: CurrentTenant }> {
  const user = await requireSessionUser();
  return { user, tenant: user.tenant };
}
