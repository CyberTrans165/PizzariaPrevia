import { describe, expect, it } from "vitest";
import { applyPercentDiscount, formatBRL } from "./money.ts";
import { pizzaBasePrice, priceCart, promotionPrice, type CartItemInput } from "./pricing.ts";
import {
  AGUA, AZEITONAS, BACON, BANANA_CANELA, BROTO, CALABRESA, CATUPIRY, CHOCOLATE_MORANGO, GRANDE,
  MARGHERITA, PEPPERONI, QUATRO_QUEIJOS, REFRI, demoCatalog,
} from "./fixtures.ts";

const pizza = (over: Partial<Extract<CartItemInput, { kind: "pizza" }>>): CartItemInput => ({
  kind: "pizza", sizeId: GRANDE, flavorIds: [PEPPERONI], quantity: 1, ...over,
});

function priced(items: CartItemInput[]) {
  const r = priceCart(demoCatalog(), items);
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r;
}

function issues(items: CartItemInput[], catalog = demoCatalog()) {
  const r = priceCart(catalog, items);
  if (r.ok) throw new Error("esperava recusa");
  return r.issues.map((i) => i.code);
}

describe("dinheiro", () => {
  it("desconto percentual arredonda meio centavo para cima", () => {
    expect(applyPercentDiscount(4790, 20)).toBe(3832);
    expect(applyPercentDiscount(5890, 15)).toBe(5007); // 5006,5 → 5007
    expect(applyPercentDiscount(1000, 0)).toBe(1000);
    expect(applyPercentDiscount(1000, 100)).toBe(0);
    expect(() => applyPercentDiscount(1000, 120)).toThrow();
    expect(() => applyPercentDiscount(10.5, 10)).toThrow();
  });

  it("formata em reais", () => {
    expect(formatBRL(4290).replace(/\s/g, " ")).toBe("R$ 42,90");
  });
});

describe("preço da pizza", () => {
  it("P-01 Broto com 1 sabor usa o preço do Broto", () => {
    expect(priced([pizza({ sizeId: BROTO, flavorIds: [CALABRESA] })]).subtotalCents).toBe(3490);
  });

  it("P-02 Grande com 1 sabor usa o preço do Grande", () => {
    expect(priced([pizza({ flavorIds: [CALABRESA] })]).subtotalCents).toBe(5490);
  });

  it("P-03 Grande com 2 sabores usa o mais caro", () => {
    expect(priced([pizza({ flavorIds: [CALABRESA, QUATRO_QUEIJOS] })]).subtotalCents).toBe(5890);
  });

  it("P-04 Grande com 3 sabores usa o mais caro dos 3", () => {
    expect(priced([pizza({ flavorIds: [CALABRESA, PEPPERONI, MARGHERITA] })]).subtotalCents).toBe(5690);
  });

  it("P-05 Broto com 2 sabores é recusado", () => {
    expect(issues([pizza({ sizeId: BROTO, flavorIds: [CALABRESA, PEPPERONI] })])).toEqual(["FLAVOR_COUNT"]);
  });

  it("P-06 Grande com 4 sabores é recusado", () => {
    expect(issues([pizza({ flavorIds: [CALABRESA, PEPPERONI, MARGHERITA, QUATRO_QUEIJOS] })])).toEqual(["FLAVOR_COUNT"]);
  });

  it("P-07 borda e adicionais somam por unidade", () => {
    const r = priced([pizza({ flavorIds: [CALABRESA], crustId: CATUPIRY, addonIds: [BACON, AZEITONAS] })]);
    expect(r.subtotalCents).toBe(5490 + 990 + 600 + 400);
  });

  it("P-08 quantidade multiplica o unitário", () => {
    const r = priced([pizza({ flavorIds: [CALABRESA], crustId: CATUPIRY, quantity: 3 })]);
    const item = r.items[0];
    expect(item?.unitPriceCents).toBe(6480);
    expect(item?.totalCents).toBe(19440);
  });

  it("P-09 promoção percentual em pizza de 1 sabor", () => {
    const r = priced([pizza({ flavorIds: [BANANA_CANELA] })]);
    expect(r.subtotalCents).toBe(3832);
    expect(r.items[0]).toMatchObject({ promotionApplied: true, listUnitPriceCents: 4790 });
  });

  it("P-10 promoção de valor manual", () => {
    expect(priced([pizza({ flavorIds: [MARGHERITA] })]).subtotalCents).toBe(4490);
    expect(promotionPrice(demoCatalog(), MARGHERITA, GRANDE)).toBe(4490);
    expect(promotionPrice(demoCatalog(), MARGHERITA, BROTO)).toBeNull();
  });

  it("P-11 promoção não vale para pizza com mais de um sabor", () => {
    const r = priced([pizza({ flavorIds: [MARGHERITA, CALABRESA] })]);
    expect(r.subtotalCents).toBe(5490);
    expect(r.items[0]).toMatchObject({ promotionApplied: false });
  });

  it("P-12 sabor pausado é recusado mesmo que o navegador envie", () => {
    const cat = demoCatalog();
    const f = cat.flavors.find((x) => x.id === PEPPERONI);
    if (f) f.paused = true;
    expect(issues([pizza({ flavorIds: [PEPPERONI] })], cat)).toEqual(["FLAVOR_UNAVAILABLE"]);
  });

  it("P-13 o cálculo ignora qualquer preço vindo do navegador", () => {
    const tampered = Object.assign(pizza({ flavorIds: [CALABRESA] }), { unitPriceCents: 1, totalCents: 1 });
    expect(priced([tampered]).subtotalCents).toBe(5490);
  });

  it("P-14 preço mudou no cadastro: o novo valor é o que vale", () => {
    const cat = demoCatalog();
    const f = cat.flavors.find((x) => x.id === CALABRESA);
    if (f) f.prices[GRANDE] = 5990;
    const r = priceCart(cat, [pizza({ flavorIds: [CALABRESA] })]);
    expect(r.ok && r.subtotalCents).toBe(5990);
  });

  it("P-15 remover ingrediente não muda o preço e fica registrado", () => {
    const r = priced([pizza({ flavorIds: [CALABRESA], removedIngredients: ["cebola"] })]);
    expect(r.subtotalCents).toBe(5490);
    expect(r.items[0]).toMatchObject({ removedIngredients: ["cebola"] });
  });

  it("não permite retirar ingrediente que não está nos sabores escolhidos", () => {
    expect(issues([pizza({ flavorIds: [CALABRESA], removedIngredients: ["morango"] })])).toEqual(["INGREDIENT_INVALID"]);
  });

  it("recusa sabor repetido, borda e adicional indisponíveis, quantidade inválida", () => {
    expect(issues([pizza({ flavorIds: [CALABRESA, CALABRESA] })])).toEqual(["FLAVOR_DUPLICATE"]);
    expect(issues([pizza({ crustId: "00000000-0000-4000-8000-999999999999" })])).toEqual(["CRUST_UNAVAILABLE"]);
    expect(issues([pizza({ addonIds: [BACON, BACON] })])).toEqual(["ADDON_DUPLICATE"]);
    expect(issues([pizza({ quantity: 0 })])).toEqual(["INVALID_QUANTITY"]);
    expect(issues([pizza({ quantity: 21 })])).toEqual(["INVALID_QUANTITY"]);
    expect(issues([pizza({ note: "x".repeat(141) })])).toEqual(["NOTE_TOO_LONG"]);
    expect(issues([])).toEqual(["EMPTY_CART"]);
  });

  it("salgada e doce juntas usam o mais caro (combinação não é restrita aqui)", () => {
    expect(priced([pizza({ flavorIds: [CHOCOLATE_MORANGO, CALABRESA] })]).subtotalCents).toBe(5490);
  });

  it("produtos e pizzas somam no subtotal", () => {
    const r = priced([
      pizza({ sizeId: BROTO, flavorIds: [MARGHERITA] }),
      { kind: "product", productId: REFRI, quantity: 2 },
      { kind: "product", productId: AGUA, quantity: 1, note: " gelada  " },
    ]);
    expect(r.subtotalCents).toBe(3290 + 1600 + 500);
    expect(r.items[2]).toMatchObject({ kind: "product", note: "gelada" });
  });

  it("preço base para a prévia do meio a meio", () => {
    expect(pizzaBasePrice(demoCatalog(), GRANDE, [CALABRESA, QUATRO_QUEIJOS])).toEqual({
      listCents: 5890, finalCents: 5890, promotionApplied: false,
    });
  });
});
