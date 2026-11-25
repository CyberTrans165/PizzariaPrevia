// Textos dos itens (carrinho, acompanhamento, comanda) e catálogo a partir do cardápio.
import type { Catalog, PricedItem } from "@shared/domain/pricing.ts";
import type { MenuResponse } from "../lib/backend.ts";

export function menuCatalog(menu: MenuResponse): Catalog {
  return {
    sizes: menu.sizes.map((s) => ({ ...s, active: true })),
    flavors: menu.flavors.map((f) => ({ id: f.id, name: f.name, kind: f.kind, ingredients: f.ingredients, prices: f.prices, paused: f.paused, active: true })),
    crusts: menu.crusts.map((c) => ({ ...c, active: true })),
    addons: menu.addons.map((a) => ({ ...a, active: true })),
    products: menu.products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, paused: p.paused, active: true })),
    // As promoções públicas já vêm calculadas; para o cálculo usamos o valor final como "manual".
    promotions: menu.promotions.map((p) => ({ flavorId: p.flavorId, sizeId: p.sizeId, kind: "manual" as const, percent: null, priceCents: p.promoCents, active: true })),
  };
}

export function itemTitle(it: PricedItem): string {
  if (it.kind === "product") return it.productName;
  const names = it.flavors.map((f) => f.name);
  const label = names.length === 1 ? names[0] : names.length === 2 ? `Meio a meio: ${names.join(" e ")}` : `${names.length} sabores: ${names.join(", ")}`;
  return `${label} · ${it.sizeName}`;
}

export function itemDetails(it: PricedItem): string[] {
  if (it.kind === "product") return it.note ? [`Obs.: ${it.note}`] : [];
  const lines: string[] = [];
  if (it.crust) lines.push(`Borda de ${it.crust.name}`);
  if (it.addons.length) lines.push(`Adicionais: ${it.addons.map((a) => a.name).join(", ")}`);
  if (it.removedIngredients.length) lines.push(`Sem ${it.removedIngredients.join(", ")}`);
  if (it.note) lines.push(`Obs.: ${it.note}`);
  return lines;
}
