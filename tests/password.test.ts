import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("verifica la contrasena correcta", () => {
    const hash = hashPassword("secreto-123");
    expect(verifyPassword("secreto-123", hash)).toBe(true);
  });

  it("rechaza contrasena incorrecta", () => {
    const hash = hashPassword("secreto-123");
    expect(verifyPassword("otro", hash)).toBe(false);
  });

  it("genera hashes distintos por salt", () => {
    expect(hashPassword("igual")).not.toBe(hashPassword("igual"));
  });

  it("rechaza hash nulo o malformado", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", "sin-separador")).toBe(false);
  });
});
