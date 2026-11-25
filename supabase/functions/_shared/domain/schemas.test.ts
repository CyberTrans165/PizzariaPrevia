import { describe, expect, it } from "vitest";
import { addressSchema, createOrderSchema, phoneSchema } from "./schemas.ts";
import { GRANDE, MARGHERITA, REFRI } from "./fixtures.ts";

const valid = {
  idempotencyKey: "6f1c2b8e-3a4d-4c5e-9f00-112233445566",
  items: [
    { kind: "pizza", sizeId: GRANDE, flavorIds: [MARGHERITA], quantity: 1 },
    { kind: "product", productId: REFRI, quantity: 2 },
  ],
  fulfillment: "delivery",
  customer: { name: "  Ana   Souza ", phone: "(11) 98765-4321" },
  address: { cep: "01001-000", street: "Praça da Sé", number: "100", district: "Sé", city: "São Paulo", uf: "sp" },
  paymentMethod: "cash",
  cashChangeForCents: 10000,
  consent: true,
  consentTextVersion: 1,
  turnstileToken: "token-de-teste",
};

describe("telefone", () => {
  it("aceita máscara e +55, recusa sem DDD", () => {
    expect(phoneSchema.parse("(11) 98765-4321")).toBe("11987654321");
    expect(phoneSchema.parse("+55 11 3333-4444")).toBe("1133334444");
    expect(phoneSchema.safeParse("98765-4321").success).toBe(false);
    expect(phoneSchema.safeParse("(01) 98765-4321").success).toBe(false);
  });
});

describe("endereço", () => {
  it("normaliza CEP e UF", () => {
    const a = addressSchema.parse(valid.address);
    expect(a).toMatchObject({ cep: "01001000", uf: "SP", complement: "" });
  });
});

describe("criar pedido", () => {
  it("aceita um pedido válido e limpa espaços do nome", () => {
    const r = createOrderSchema.parse(valid);
    expect(r.customer).toEqual({ name: "Ana Souza", phone: "11987654321" });
  });

  it("E-14 sem aceite não finaliza", () => {
    expect(createOrderSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it("entrega exige endereço; retirada não", () => {
    const { address: _a, ...noAddress } = valid;
    expect(createOrderSchema.safeParse(noAddress).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...noAddress, fulfillment: "pickup" }).success).toBe(true);
  });

  it("troco só com dinheiro", () => {
    expect(createOrderSchema.safeParse({ ...valid, paymentMethod: "pix" }).success).toBe(false);
  });

  it("recusa id que não é uuid, item de tipo desconhecido e carrinho vazio", () => {
    expect(createOrderSchema.safeParse({ ...valid, items: [{ kind: "pizza", sizeId: "1", flavorIds: ["2"], quantity: 1 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...valid, items: [{ kind: "cupom", quantity: 1 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
  });
});
