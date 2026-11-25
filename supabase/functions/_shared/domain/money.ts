// Dinheiro sempre em centavos inteiros (RN-01). Nada de número quebrado em valores.

export type Cents = number;

const MAX_CENTS = 100_000_000; // R$ 1.000.000,00: teto de sanidade

export function isCents(value: unknown): value is Cents {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_CENTS;
}

/**
 * Aplica desconto percentual (0 a 100, até 2 casas) e arredonda para o centavo
 * mais próximo, com meio centavo para cima. Ex.: 4790 com 20% = 3832.
 */
export function applyPercentDiscount(cents: Cents, percent: number): Cents {
  if (!isCents(cents)) throw new RangeError("Valor em centavos inválido.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new RangeError("Percentual inválido.");
  }
  const basisPoints = Math.round(percent * 100); // 20% = 2000
  return Math.round((cents * (10_000 - basisPoints)) / 10_000);
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 42,90" (com espaço não separável, como o Intl gera). */
export function formatBRL(cents: Cents): string {
  return BRL.format(cents / 100);
}
