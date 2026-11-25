// Hash de senha do dono (ETAPA 10). Roda só no servidor.
//
// Algoritmo atual: PBKDF2-HMAC-SHA256 pelo WebCrypto (nativo no Deno, sem dependência),
// 600.000 iterações (recomendação OWASP para PBKDF2-SHA256), salt aleatório de 16 bytes.
// O valor guardado descreve o próprio algoritmo e os parâmetros, então dá para trocar
// por Argon2id depois (ou subir as iterações) sem perder senhas: no login, `needsRehash`
// avisa que o hash deve ser refeito com os parâmetros novos.
//
// Formato: pbkdf2-sha256$<iterações>$<salt base64url>$<hash base64url>

import { bytesToBase64Url, base64UrlToBytes, timingSafeEqual } from "./encoding.ts";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 256; // evita custo excessivo com entradas enormes
export const DEFAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;
const PREFIX = "pbkdf2-sha256";

export interface HashOptions {
  iterations?: number;
}

export interface VerifyResult {
  ok: boolean;
  /** true quando a senha confere, mas o hash usa parâmetros mais fracos que os atuais. */
  needsRehash: boolean;
}

function normalize(password: string): string {
  return password.normalize("NFC");
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalize(password)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, options: HashOptions = {}): Promise<string> {
  if (password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    throw new RangeError("Tamanho de senha inválido.");
  }
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  if (!Number.isInteger(iterations) || iterations < 100_000) {
    throw new RangeError("Número de iterações muito baixo.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations);
  return [PREFIX, String(iterations), bytesToBase64Url(salt), bytesToBase64Url(hash)].join("$");
}

interface ParsedHash {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

function parse(stored: string): ParsedHash | null {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1) return null;
  try {
    const salt = base64UrlToBytes(parts[2] ?? "");
    const hash = base64UrlToBytes(parts[3] ?? "");
    if (salt.length < 16 || hash.length !== KEY_BITS / 8) return null;
    return { iterations, salt, hash };
  } catch {
    return null;
  }
}

export async function verifyPassword(
  password: string,
  stored: string,
  options: HashOptions = {},
): Promise<VerifyResult> {
  if (password.length === 0 || password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, needsRehash: false };
  }
  const parsed = parse(stored);
  if (!parsed) return { ok: false, needsRehash: false };
  const candidate = await derive(password, parsed.salt, parsed.iterations);
  const ok = timingSafeEqual(candidate, parsed.hash);
  const wanted = options.iterations ?? DEFAULT_ITERATIONS;
  return { ok, needsRehash: ok && parsed.iterations < wanted };
}

/**
 * Faz o mesmo trabalho de uma verificação real. Usado quando o e-mail não existe,
 * para que a resposta demore o mesmo tempo e não revele quais e-mails existem.
 */
export async function burnVerificationTime(password: string): Promise<void> {
  const salt = new Uint8Array(SALT_BYTES);
  await derive(password.slice(0, PASSWORD_MAX_LENGTH) || "x", salt, DEFAULT_ITERATIONS);
}

export interface PasswordPolicyResult {
  ok: boolean;
  reasons: string[];
}

// Lista curta de senhas comuns. A verificação completa (lista grande) entra na Fase 5.
const COMMON = new Set([
  "123456789012",
  "senha1234567",
  "password1234",
  "qwertyuiop12",
  "pizzaria1234",
  "fornobella123",
  "000000000000",
  "111111111111",
]);

export function checkPasswordPolicy(password: string, email?: string): PasswordPolicyResult {
  const reasons: string[] = [];
  const p = normalize(password);
  if (p.length < PASSWORD_MIN_LENGTH) reasons.push(`Use pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`);
  if (p.length > PASSWORD_MAX_LENGTH) reasons.push("Senha longa demais.");
  if (COMMON.has(p.toLowerCase())) reasons.push("Essa senha é comum demais.");
  if (/^(.)\1+$/.test(p)) reasons.push("Não use um único caractere repetido.");
  if (email) {
    const local = email.split("@")[0]?.toLowerCase() ?? "";
    if (local.length >= 4 && p.toLowerCase().includes(local)) {
      reasons.push("Não use o seu e-mail dentro da senha.");
    }
  }
  return { ok: reasons.length === 0, reasons };
}
