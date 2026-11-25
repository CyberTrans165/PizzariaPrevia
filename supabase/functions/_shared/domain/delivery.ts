// Entrega por raio, taxa por faixas e frete grátis (ETAPA 6). Decidido sempre no servidor.

import type { Cents } from "./money.ts";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FeeBand {
  fromKm: number;
  toKm: number;
  feeCents: Cents;
}

const EARTH_RADIUS_KM = 6371.0088;

/** Distância em linha reta (fórmula de Haversine), em km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Confere se as faixas estão em ordem, sem buracos, começando em 0 e terminando no raio.
 * Retorna a lista de problemas (vazia = válido). Usado ao salvar no ADM.
 */
export function validateFeeBands(bands: FeeBand[], radiusKm: number): string[] {
  const problems: string[] = [];
  if (!(radiusKm > 0)) problems.push("O raio máximo precisa ser maior que zero.");
  if (bands.length === 0) {
    problems.push("Cadastre pelo menos uma faixa de taxa.");
    return problems;
  }
  const sorted = [...bands].sort((a, b) => a.fromKm - b.fromKm);
  if (sorted[0]?.fromKm !== 0) problems.push("A primeira faixa deve começar em 0 km.");
  sorted.forEach((band, i) => {
    if (!(band.fromKm < band.toKm)) problems.push(`Faixa ${i + 1}: o fim deve ser maior que o início.`);
    if (!Number.isInteger(band.feeCents) || band.feeCents < 0) {
      problems.push(`Faixa ${i + 1}: taxa inválida.`);
    }
    const prev = sorted[i - 1];
    if (prev && Math.abs(prev.toKm - band.fromKm) > 1e-9) {
      problems.push(`Faixa ${i + 1}: deve começar onde a faixa anterior termina (${prev.toKm} km).`);
    }
  });
  const last = sorted[sorted.length - 1];
  if (last && Math.abs(last.toKm - radiusKm) > 1e-9) {
    problems.push(`A última faixa deve terminar no raio máximo (${radiusKm} km).`);
  }
  return problems;
}

export type DeliveryQuote =
  | {
      ok: true;
      distanceKm: number;
      bandIndex: number;
      bandFeeCents: Cents;
      feeCents: Cents;
      freeShipping: boolean;
      /** quanto falta para frete grátis; null se o frete grátis estiver desligado ou já alcançado */
      missingForFreeCents: Cents | null;
    }
  | { ok: false; reason: "OUT_OF_AREA"; distanceKm: number; radiusKm: number };

export interface QuoteInput {
  distanceKm: number;
  radiusKm: number;
  bands: FeeBand[];
  subtotalCents: Cents;
  /** null = frete grátis desligado */
  freeShippingAboveCents: Cents | null;
}

/**
 * "Até X km" inclui o próprio X: 3,0 km cai na faixa 0–3.
 * Acima do raio, o endereço está fora da área.
 */
export function quoteDelivery(input: QuoteInput): DeliveryQuote {
  const { distanceKm, radiusKm, subtotalCents, freeShippingAboveCents } = input;
  const bands = [...input.bands].sort((a, b) => a.fromKm - b.fromKm);
  if (!(distanceKm >= 0) || distanceKm > radiusKm) {
    return { ok: false, reason: "OUT_OF_AREA", distanceKm, radiusKm };
  }
  const bandIndex = bands.findIndex((b) => distanceKm <= b.toKm);
  const band = bands[bandIndex];
  if (!band) return { ok: false, reason: "OUT_OF_AREA", distanceKm, radiusKm };

  const freeShipping = freeShippingAboveCents !== null && subtotalCents >= freeShippingAboveCents;
  return {
    ok: true,
    distanceKm,
    bandIndex,
    bandFeeCents: band.feeCents,
    feeCents: freeShipping ? 0 : band.feeCents,
    freeShipping,
    missingForFreeCents:
      freeShippingAboveCents === null || freeShipping ? null : freeShippingAboveCents - subtotalCents,
  };
}

/** Quanto falta para o pedido mínimo (0 = já alcançou ou não há mínimo). Vale sobre o subtotal dos itens. */
export function missingForMinimum(subtotalCents: Cents, minOrderCents: Cents | null): Cents {
  if (minOrderCents === null) return 0;
  return Math.max(0, minOrderCents - subtotalCents);
}

/** Só dígitos; CEP brasileiro tem 8. */
export function normalizeCep(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}
