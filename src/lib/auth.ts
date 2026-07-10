import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Tenant, TenantSetting, User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "dentia_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = User & { tenant: Tenant & { settings: TenantSetting | null } };

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: { include: { tenant: { include: { settings: true } } } } }
  });
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  return session.user;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

const roleRank: Record<UserRole, number> = {
  OWNER: 4,
  MANAGER: 3,
  RECEPTION: 2,
  DOCTOR: 2,
  READ_ONLY: 1
};

export function hasRole(user: SessionUser, minimum: UserRole): boolean {
  return roleRank[user.role] >= roleRank[minimum];
}

export async function requireRole(minimum: UserRole): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (!hasRole(user, minimum)) {
    redirect("/?error=" + encodeURIComponent("No tienes permisos para esta accion."));
  }
  return user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
    cookieStore.delete(SESSION_COOKIE);
  }
}
