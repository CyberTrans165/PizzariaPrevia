// Armazenamento no aparelho com proteção: se o navegador bloquear (modo privado, frame restrito),
// tudo continua funcionando em memória durante a visita.
const memory = new Map<string, string>();

function area(kind: "local" | "session"): Storage | null {
  try {
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    const probe = "__fb_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function readItem(key: string, kind: "local" | "session" = "local"): string | null {
  try {
    return area(kind)?.getItem(key) ?? memory.get(`${kind}:${key}`) ?? null;
  } catch {
    return memory.get(`${kind}:${key}`) ?? null;
  }
}

export function writeItem(key: string, value: string, kind: "local" | "session" = "local"): void {
  memory.set(`${kind}:${key}`, value);
  try {
    area(kind)?.setItem(key, value);
  } catch {
    /* fica só em memória */
  }
}

export function removeItem(key: string, kind: "local" | "session" = "local"): void {
  memory.delete(`${kind}:${key}`);
  try {
    area(kind)?.removeItem(key);
  } catch {
    /* ignora */
  }
}
