"use server";

import { randomBytes } from "node:crypto";
import { ConsentKind, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { firstErrorMessage, loginInputSchema, signupInputSchema } from "@/lib/validation";

function backToLogin(error: string): never {
  redirect(`/login?error=${encodeURIComponent(error)}`);
}

function backToSignup(error: string): never {
  redirect(`/signup?error=${encodeURIComponent(error)}`);
}

export async function loginAction(formData: FormData) {
  const parsed = loginInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backToLogin(firstErrorMessage(parsed.error));
  }

  const user = await prisma.user.findFirst({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    backToLogin("Credenciales no validas.");
  }

  await createSession(user.id);
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      actorUserId: user.id,
      action: "auth.login",
      entityType: "User",
      entityId: user.id
    }
  });
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function signupAction(formData: FormData) {
  const parsed = signupInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    backToSignup(firstErrorMessage(parsed.error));
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: parsed.data.slug } });
  if (existingTenant) {
    backToSignup("Ese identificador de clinica ya existe.");
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findFirst({ where: { email } });
  if (existingUser) {
    backToSignup("Ese email ya esta registrado.");
  }

  let ownerId: string;
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: parsed.data.clinicName,
        slug: parsed.data.slug,
        apiKey: `dentia_${randomBytes(24).toString("hex")}`,
        settings: {
          create: {
            tone: "Cercano y profesional",
            escalationRules: "Urgencias y dolor agudo siempre a humano.",
            rgpdNotes: "Consentimiento explicito antes de guardar datos personales."
          }
        }
      }
    });

    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.userName,
        email,
        passwordHash: hashPassword(parsed.data.password),
        role: UserRole.OWNER
      }
    });
    ownerId = owner.id;

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: owner.id,
        action: "tenant.created",
        entityType: "Tenant",
        entityId: tenant.id,
        metadata: { consentBaseline: ConsentKind.DATA_PROCESSING }
      }
    });
  } catch (error) {
    console.error("signupAction failed", error);
    backToSignup("No se pudo crear la clinica. Intentalo de nuevo.");
  }

  await createSession(ownerId);
  redirect("/?ok=" + encodeURIComponent("Clinica creada. Bienvenido a Dentia AI."));
}
