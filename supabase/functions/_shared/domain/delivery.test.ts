import { describe, expect, it } from "vitest";
import { haversineKm, missingForMinimum, normalizeCep, quoteDelivery, validateFeeBands, type FeeBand } from "./delivery.ts";

const bands: FeeBand[] = [
  { fromKm: 0, toKm: 3, feeCents: 500 },
  { fromKm: 3, toKm: 6, feeCents: 800 },
  { fromKm: 6, toKm: 8, feeCents: 1200 },
];
const base = { radiusKm: 8, bands, subtotalCents: 6000, freeShippingAboveCents: 12000 };

describe("distância", () => {
  it("E-11 Haversine em pares conhecidos", () => {
    // Praça da Sé → Av. Paulista (MASP): cerca de 2,9 km em linha reta
    const se = { lat: -23.55052, lng: -46.633308 };
    const masp = { lat: -23.561414, lng: -46.655881 };
    expect(haversineKm(se, masp)).toBeGreaterThan(2.5);
    expect(haversineKm(se, masp)).toBeLessThan(2.7);
    // 1 grau de latitude ≈ 111,2 km
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
    expect(haversineKm(se, se)).toBe(0);
  });
});

describe("taxa de entrega", () => {
  it("E-01 0 km fica na primeira faixa", () => {
    expect(quoteDelivery({ ...base, distanceKm: 0 })).toMatchObject({ ok: true, feeCents: 500, bandIndex: 0 });
  });

  it("E-02 o limite entre faixas pertence à faixa de baixo (\"até 3 km\" inclui 3)", () => {
    expect(quoteDelivery({ ...base, distanceKm: 3 })).toMatchObject({ ok: true, feeCents: 500 });
    expect(quoteDelivery({ ...base, distanceKm: 3.01 })).toMatchObject({ ok: true, feeCents: 800 });
  });

  it("E-03 distância igual ao raio é aceita", () => {
    expect(quoteDelivery({ ...base, distanceKm: 8 })).toMatchObject({ ok: true, feeCents: 1200 });
  });

  it("E-04 acima do raio está fora da área", () => {
    expect(quoteDelivery({ ...base, distanceKm: 8.01 })).toMatchObject({ ok: false, reason: "OUT_OF_AREA" });
  });

  it("E-05 subtotal igual ao valor do frete grátis zera a taxa", () => {
    expect(quoteDelivery({ ...base, distanceKm: 5, subtotalCents: 12000 })).toMatchObject({
      ok: true, feeCents: 0, bandFeeCents: 800, freeShipping: true, missingForFreeCents: null,
    });
  });

  it("mostra quanto falta para o frete grátis", () => {
    expect(quoteDelivery({ ...base, distanceKm: 5, subtotalCents: 9000 })).toMatchObject({ missingForFreeCents: 3000 });
  });

  it("E-06 frete grátis desligado sempre cobra a faixa", () => {
    expect(quoteDelivery({ ...base, distanceKm: 5, subtotalCents: 99999, freeShippingAboveCents: null })).toMatchObject({
      ok: true, feeCents: 800, freeShipping: false, missingForFreeCents: null,
    });
  });
});

describe("pedido mínimo", () => {
  it("E-07 e E-08", () => {
    expect(missingForMinimum(3000, 4000)).toBe(1000);
    expect(missingForMinimum(5000, 4000)).toBe(0);
    expect(missingForMinimum(100, null)).toBe(0);
  });
});

describe("validação das faixas no ADM", () => {
  it("aceita faixas contínuas que terminam no raio", () => {
    expect(validateFeeBands(bands, 8)).toEqual([]);
  });

  it("A-06 recusa buraco, sobreposição, início fora de zero e fim diferente do raio", () => {
    expect(validateFeeBands([{ fromKm: 0, toKm: 3, feeCents: 500 }, { fromKm: 4, toKm: 8, feeCents: 800 }], 8)).toHaveLength(1);
    expect(validateFeeBands([{ fromKm: 1, toKm: 8, feeCents: 500 }], 8)).toHaveLength(1);
    expect(validateFeeBands([{ fromKm: 0, toKm: 5, feeCents: 500 }], 8)).toHaveLength(1);
    expect(validateFeeBands([{ fromKm: 0, toKm: 8, feeCents: -1 }], 8)).toHaveLength(1);
    expect(validateFeeBands([], 8)).toHaveLength(1);
  });
});

describe("CEP", () => {
  it("E-13 aceita com ou sem máscara e recusa inválido", () => {
    expect(normalizeCep("01001-000")).toBe("01001000");
    expect(normalizeCep("01001000")).toBe("01001000");
    expect(normalizeCep("0100")).toBeNull();
  });
});
