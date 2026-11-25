// Cálculo de preço dos itens do pedido (ETAPA 4 e RN-02).
// É função pura: o servidor usa para decidir o valor; o site usa só para mostrar a prévia.
//
// Regras:
// - Broto aceita 1 sabor; Grande até 3 (o limite vem do cadastro do tamanho).
// - Pizza com mais de um sabor custa o preço do sabor MAIS CARO no tamanho escolhido.
// - Promoção (percentual ou valor manual) vale só para pizza de UM sabor, no tamanho da promoção.
// - Borda e adicionais têm preço único (igual para Broto e Grande) e somam por unidade.
// - Item pausado ou inativo nunca entra em pedido.

import { applyPercentDiscount, type Cents } from "./money.ts";

export type FlavorKind = "pizza_salgada" | "pizza_doce";

export interface Size {
  id: string;
  name: string;
  slices: number;
  maxFlavors: number;
  active: boolean;
}

export interface Flavor {
  id: string;
  name: string;
  kind: FlavorKind;
  ingredients: string[];
  /** preço por id de tamanho */
  prices: Record<string, Cents | undefined>;
  paused: boolean;
  active: boolean;
}

export interface Extra {
  id: string;
  name: string;
  priceCents: Cents;
  paused: boolean;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  priceCents: Cents;
  paused: boolean;
  active: boolean;
}

export interface Promotion {
  flavorId: string;
  sizeId: string;
  kind: "percent" | "manual";
  percent: number | null;
  priceCents: Cents | null;
  active: boolean;
}

export interface Catalog {
  sizes: Size[];
  flavors: Flavor[];
  crusts: Extra[];
  addons: Extra[];
  products: Product[];
  promotions: Promotion[];
}

export const MAX_ITEMS = 30;
export const MAX_QUANTITY = 20;
export const MAX_ITEM_NOTE = 140;

export interface PizzaItemInput {
  kind: "pizza";
  sizeId: string;
  flavorIds: string[];
  crustId?: string | null;
  addonIds?: string[];
  removedIngredients?: string[];
  note?: string;
  quantity: number;
}

export interface ProductItemInput {
  kind: "product";
  productId: string;
  note?: string;
  quantity: number;
}

export type CartItemInput = PizzaItemInput | ProductItemInput;

export type PricingIssueCode =
  | "EMPTY_CART"
  | "TOO_MANY_ITEMS"
  | "INVALID_QUANTITY"
  | "SIZE_UNAVAILABLE"
  | "FLAVOR_COUNT"
  | "FLAVOR_DUPLICATE"
  | "FLAVOR_UNAVAILABLE"
  | "PRICE_MISSING"
  | "CRUST_UNAVAILABLE"
  | "ADDON_UNAVAILABLE"
  | "ADDON_DUPLICATE"
  | "INGREDIENT_INVALID"
  | "PRODUCT_UNAVAILABLE"
  | "NOTE_TOO_LONG";

export interface PricingIssue {
  code: PricingIssueCode;
  /** posição do item no carrinho; -1 para o carrinho inteiro */
  itemIndex: number;
  message: string;
}

export interface NamedPrice {
  id: string;
  name: string;
  priceCents: Cents;
}

export interface PricedPizza {
  kind: "pizza";
  sizeId: string;
  sizeName: string;
  slices: number;
  flavors: { id: string; name: string }[];
  crust: NamedPrice | null;
  addons: NamedPrice[];
  removedIngredients: string[];
  note: string;
  quantity: number;
  /** preço unitário sem promoção (para mostrar "de/por") */
  listUnitPriceCents: Cents;
  unitPriceCents: Cents;
  totalCents: Cents;
  promotionApplied: boolean;
}

export interface PricedProduct {
  kind: "product";
  productId: string;
  productName: string;
  note: string;
  quantity: number;
  listUnitPriceCents: Cents;
  unitPriceCents: Cents;
  totalCents: Cents;
}

export type PricedItem = PricedPizza | PricedProduct;

export type PriceCartResult =
  | { ok: true; items: PricedItem[]; subtotalCents: Cents }
  | { ok: false; issues: PricingIssue[] };

const available = (x: { active: boolean; paused: boolean } | undefined): boolean =>
  !!x && x.active && !x.paused;

function indexById<T extends { id: string }>(list: T[]): Map<string, T> {
  return new Map(list.map((x) => [x.id, x]));
}

/** Preço de promoção de um sabor num tamanho, ou null se não houver promoção ativa. */
export function promotionPrice(catalog: Catalog, flavorId: string, sizeId: string): Cents | null {
  const flavor = catalog.flavors.find((f) => f.id === flavorId);
  const list = flavor?.prices[sizeId];
  if (list === undefined) return null;
  const promo = catalog.promotions.find(
    (p) => p.active && p.flavorId === flavorId && p.sizeId === sizeId,
  );
  if (!promo) return null;
  if (promo.kind === "percent" && promo.percent !== null) {
    return applyPercentDiscount(list, promo.percent);
  }
  if (promo.kind === "manual" && promo.priceCents !== null) return promo.priceCents;
  return null;
}

/**
 * Preço da pizza (sem borda e adicionais) para os sabores e o tamanho escolhidos.
 * Retorna null se algum sabor não tiver preço nesse tamanho.
 */
export function pizzaBasePrice(
  catalog: Catalog,
  sizeId: string,
  flavorIds: string[],
): { listCents: Cents; finalCents: Cents; promotionApplied: boolean } | null {
  const flavors = indexById(catalog.flavors);
  let listCents = 0;
  for (const id of flavorIds) {
    const price = flavors.get(id)?.prices[sizeId];
    if (price === undefined) return null;
    listCents = Math.max(listCents, price);
  }
  if (flavorIds.length === 1) {
    const promo = promotionPrice(catalog, flavorIds[0] as string, sizeId);
    if (promo !== null && promo < listCents) {
      return { listCents, finalCents: promo, promotionApplied: true };
    }
  }
  return { listCents, finalCents: listCents, promotionApplied: false };
}

function cleanText(value: string | undefined, max: number): string | null {
  const v = (value ?? "").replace(/\s+/g, " ").trim();
  return v.length > max ? null : v;
}

export function priceCart(catalog: Catalog, items: CartItemInput[]): PriceCartResult {
  const issues: PricingIssue[] = [];
  if (items.length === 0) {
    return { ok: false, issues: [{ code: "EMPTY_CART", itemIndex: -1, message: "O carrinho está vazio." }] };
  }
  if (items.length > MAX_ITEMS) {
    return {
      ok: false,
      issues: [{ code: "TOO_MANY_ITEMS", itemIndex: -1, message: `Use no máximo ${MAX_ITEMS} itens por pedido.` }],
    };
  }

  const sizes = indexById(catalog.sizes);
  const flavors = indexById(catalog.flavors);
  const crusts = indexById(catalog.crusts);
  const addons = indexById(catalog.addons);
  const products = indexById(catalog.products);
  const priced: PricedItem[] = [];

  items.forEach((item, i) => {
    const add = (code: PricingIssueCode, message: string) => issues.push({ code, itemIndex: i, message });

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      add("INVALID_QUANTITY", `Quantidade deve ser de 1 a ${MAX_QUANTITY}.`);
      return;
    }
    const note = cleanText(item.note, MAX_ITEM_NOTE);
    if (note === null) {
      add("NOTE_TOO_LONG", `A observação pode ter até ${MAX_ITEM_NOTE} caracteres.`);
      return;
    }

    if (item.kind === "product") {
      const product = products.get(item.productId);
      if (!product || !available(product)) {
        add("PRODUCT_UNAVAILABLE", "Este produto não está disponível no momento.");
        return;
      }
      priced.push({
        kind: "product",
        productId: product.id,
        productName: product.name,
        note,
        quantity: item.quantity,
        listUnitPriceCents: product.priceCents,
        unitPriceCents: product.priceCents,
        totalCents: product.priceCents * item.quantity,
      });
      return;
    }

    const size = sizes.get(item.sizeId);
    if (!size || !size.active) {
      add("SIZE_UNAVAILABLE", "Este tamanho não está disponível.");
      return;
    }
    const ids = item.flavorIds;
    if (ids.length < 1 || ids.length > size.maxFlavors) {
      add(
        "FLAVOR_COUNT",
        size.maxFlavors === 1
          ? `A pizza ${size.name} aceita só 1 sabor.`
          : `A pizza ${size.name} aceita de 1 a ${size.maxFlavors} sabores.`,
      );
      return;
    }
    if (new Set(ids).size !== ids.length) {
      add("FLAVOR_DUPLICATE", "Escolha sabores diferentes.");
      return;
    }
    const chosen = ids.map((id) => flavors.get(id));
    if (chosen.some((f) => !available(f))) {
      add("FLAVOR_UNAVAILABLE", "Um dos sabores escolhidos não está disponível no momento.");
      return;
    }
    const base = pizzaBasePrice(catalog, size.id, ids);
    if (!base) {
      add("PRICE_MISSING", "Um dos sabores não tem preço neste tamanho.");
      return;
    }

    let crust: NamedPrice | null = null;
    if (item.crustId) {
      const c = crusts.get(item.crustId);
      if (!c || !available(c)) {
        add("CRUST_UNAVAILABLE", "A borda escolhida não está disponível.");
        return;
      }
      crust = { id: c.id, name: c.name, priceCents: c.priceCents };
    }

    const addonIds = item.addonIds ?? [];
    if (new Set(addonIds).size !== addonIds.length) {
      add("ADDON_DUPLICATE", "Um adicional foi escolhido mais de uma vez.");
      return;
    }
    const chosenAddons: NamedPrice[] = [];
    for (const id of addonIds) {
      const a = addons.get(id);
      if (!a || !available(a)) {
        add("ADDON_UNAVAILABLE", "Um dos adicionais não está disponível.");
        return;
      }
      chosenAddons.push({ id: a.id, name: a.name, priceCents: a.priceCents });
    }

    const allowedIngredients = new Set(
      chosen.flatMap((f) => (f ? f.ingredients.map((x) => x.toLowerCase()) : [])),
    );
    const removed = [...new Set((item.removedIngredients ?? []).map((x) => x.trim()).filter(Boolean))];
    if (removed.some((x) => !allowedIngredients.has(x.toLowerCase()))) {
      add("INGREDIENT_INVALID", "Só é possível retirar ingredientes dos sabores escolhidos.");
      return;
    }

    const extras = (crust?.priceCents ?? 0) + chosenAddons.reduce((s, a) => s + a.priceCents, 0);
    const unit = base.finalCents + extras;
    priced.push({
      kind: "pizza",
      sizeId: size.id,
      sizeName: size.name,
      slices: size.slices,
      flavors: chosen.map((f) => ({ id: (f as Flavor).id, name: (f as Flavor).name })),
      crust,
      addons: chosenAddons,
      removedIngredients: removed,
      note,
      quantity: item.quantity,
      listUnitPriceCents: base.listCents + extras,
      unitPriceCents: unit,
      totalCents: unit * item.quantity,
      promotionApplied: base.promotionApplied,
    });
  });

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, items: priced, subtotalCents: priced.reduce((s, x) => s + x.totalCents, 0) };
}
