import { notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import { hasRole, requireSessionUser } from "@/lib/auth";

export async function requireAdminUser() {
  const user = await requireSessionUser();
  const adminEmails = getAdminEmails();
  const allowedByEmail = adminEmails.length > 0
    ? adminEmails.includes(user.email.toLowerCase())
    : process.env.NODE_ENV !== "production";

  if (!hasRole(user, UserRole.OWNER) || !allowedByEmail) {
    notFound();
  }

  return user;
}

function getAdminEmails() {
  return (process.env.DENTIA_ADMIN_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}
