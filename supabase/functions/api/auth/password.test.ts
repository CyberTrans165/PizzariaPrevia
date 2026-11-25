import { describe, expect, it } from "vitest";
import {
  checkPasswordPolicy,
  hashPassword,
  verifyPassword,
} from "./password.ts";
import { base64UrlToBytes, bytesToBase64Url, randomToken, sha256Hex, timingSafeEqual } from "./encoding.ts";

// Iterações baixas só para os testes ficarem rápidos; produção usa DEFAULT_ITERATIONS.
const FAST = { iterations: 100_000 };

describe("hash de senha", () => {
  it("gera hash no formato esperado e nunca contém a senha", async () => {
    const h = await hashPassword("massa-de-fermentacao-lenta", FAST);
    expect(h.startsWith("pbkdf2-sha256$100000$")).toBe(true);
    expect(h.split("$")).toHaveLength(4);
    expect(h.includes("massa")).toBe(false);
  });

  it("dois hashes da mesma senha são diferentes (salt aleatório)", async () => {
    const a = await hashPassword("mesma-senha-forte", FAST);
    const b = await hashPassword("mesma-senha-forte", FAST);
    expect(a).not.toBe(b);
  });

  it("confere a senha certa e recusa a errada", async () => {
    const h = await hashPassword("forno-a-lenha-2026", FAST);
    expect((await verifyPassword("forno-a-lenha-2026", h, FAST)).ok).toBe(true);
    expect((await verifyPassword("forno-a-lenha-2027", h, FAST)).ok).toBe(false);
    expect((await verifyPassword("", h, FAST)).ok).toBe(false);
  });

  it("pede novo hash quando as iterações guardadas são menores que as atuais", async () => {
    const h = await hashPassword("senha-antiga-forte", FAST);
    const r = await verifyPassword("senha-antiga-forte", h, { iterations: 200_000 });
    expect(r).toEqual({ ok: true, needsRehash: true });
  });

  it("recusa hash malformado sem lançar erro", async () => {
    for (const bad of ["", "abc", "pbkdf2-sha256$x$y$z", "bcrypt$10$a$b", "pbkdf2-sha256$1000$!!$??"]) {
      expect((await verifyPassword("qualquer", bad)).ok).toBe(false);
    }
  });

  it("normaliza Unicode (é composto e decomposto são a mesma senha)", async () => {
    const h = await hashPassword("café-com-pizza", FAST);
    expect((await verifyPassword("café-com-pizza", h, FAST)).ok).toBe(true);
  });

  it("recusa iterações baixas demais e senha gigante", async () => {
    await expect(hashPassword("senha-forte-12", { iterations: 1000 })).rejects.toThrow();
    await expect(hashPassword("x".repeat(300), FAST)).rejects.toThrow();
  });
});

describe("política de senha", () => {
  it("exige 12 caracteres e recusa senhas comuns ou com o e-mail", () => {
    expect(checkPasswordPolicy("curta").ok).toBe(false);
    expect(checkPasswordPolicy("senha1234567").ok).toBe(false);
    expect(checkPasswordPolicy("aaaaaaaaaaaaaa").ok).toBe(false);
    expect(checkPasswordPolicy("joaosilva-pizza", "joaosilva@exemplo.com").ok).toBe(false);
    expect(checkPasswordPolicy("tomate manjericao e forno").ok).toBe(true);
  });
});

describe("tokens e codificação", () => {
  it("token de sessão tem 256 bits e é único", () => {
    const a = randomToken(32);
    const b = randomToken(32);
    expect(base64UrlToBytes(a)).toHaveLength(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("base64url ida e volta", () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255]);
    expect(Array.from(base64UrlToBytes(bytesToBase64Url(bytes)))).toEqual(Array.from(bytes));
  });

  it("sha256Hex tem 64 caracteres e é determinístico", async () => {
    const h = await sha256Hex("abc");
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("comparação em tempo constante", () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true);
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false);
    expect(timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 2]))).toBe(false);
  });
});
