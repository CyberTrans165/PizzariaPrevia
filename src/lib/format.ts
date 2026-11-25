// Formatação e máscaras usadas nas telas.
export { formatBRL } from "@shared/domain/money.ts";

/** Caminho de arquivo público que funciona tanto no site quanto na vitrine (base relativa). */
export function asset(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
  return base.replace(/\/?$/, "/") + path.replace(/^\/+/, "");
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** "42,90" ou "42.90" → 4290. Retorna null se não for um valor válido. */
export function parseMoney(value: string): number | null {
  const v = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function moneyInput(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function orderNumber(n: number): string {
  return "#" + String(n).padStart(4, "0");
}

export function timeAgo(iso: string, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16),
    );
  }
}
