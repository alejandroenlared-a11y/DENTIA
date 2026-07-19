import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

loadLocalDatabaseUrlFallback();

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function loadLocalDatabaseUrlFallback() {
  if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL) return;

  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const databaseUrlLine = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find(line => line.trim().startsWith("DATABASE_URL="));

  if (!databaseUrlLine) return;

  const rawValue = databaseUrlLine.split("=").slice(1).join("=").trim();
  const value = rawValue.replace(/^["']|["']$/g, "");
  if (value) {
    process.env.DATABASE_URL = value;
  }
}
