// Catálogo de exemplo para testes (mesmos valores do seed de demonstração).
import type { Catalog } from "./pricing.ts";

export const BROTO = "00000000-0000-4000-8000-000000000201";
export const GRANDE = "00000000-0000-4000-8000-000000000202";
export const MARGHERITA = "00000000-0000-4000-8000-000000000301";
export const PEPPERONI = "00000000-0000-4000-8000-000000000302";
export const CALABRESA = "00000000-0000-4000-8000-000000000303";
export const QUATRO_QUEIJOS = "00000000-0000-4000-8000-000000000304";
export const CHOCOLATE_MORANGO = "00000000-0000-4000-8000-000000000305";
export const BANANA_CANELA = "00000000-0000-4000-8000-000000000306";
export const CATUPIRY = "00000000-0000-4000-8000-000000000401";
export const CHEDDAR = "00000000-0000-4000-8000-000000000402";
export const BACON = "00000000-0000-4000-8000-000000000501";
export const AZEITONAS = "00000000-0000-4000-8000-000000000502";
export const REFRI = "00000000-0000-4000-8000-000000000601";
export const AGUA = "00000000-0000-4000-8000-000000000602";

export function demoCatalog(): Catalog {
  const f = (id: string, name: string, kind: "pizza_salgada" | "pizza_doce", ingredients: string[], broto: number, grande: number) => ({
    id, name, kind, ingredients, prices: { [BROTO]: broto, [GRANDE]: grande }, paused: false, active: true,
  });
  return {
    sizes: [
      { id: BROTO, name: "Broto", slices: 4, maxFlavors: 1, active: true },
      { id: GRANDE, name: "Grande", slices: 8, maxFlavors: 3, active: true },
    ],
    flavors: [
      f(MARGHERITA, "Margherita", "pizza_salgada", ["molho de tomate", "muçarela", "manjericão"], 3290, 5290),
      f(PEPPERONI, "Pepperoni", "pizza_salgada", ["pepperoni", "muçarela", "orégano"], 3690, 5690),
      f(CALABRESA, "Calabresa", "pizza_salgada", ["calabresa", "cebola", "muçarela"], 3490, 5490),
      f(QUATRO_QUEIJOS, "Quatro Queijos", "pizza_salgada", ["muçarela", "provolone", "gorgonzola", "parmesão"], 3890, 5890),
      f(CHOCOLATE_MORANGO, "Chocolate com Morango", "pizza_doce", ["creme de chocolate", "morango"], 2990, 4990),
      f(BANANA_CANELA, "Banana com Canela", "pizza_doce", ["banana", "canela", "açúcar"], 2790, 4790),
    ],
    crusts: [
      { id: CATUPIRY, name: "Catupiry", priceCents: 990, paused: false, active: true },
      { id: CHEDDAR, name: "Cheddar", priceCents: 990, paused: false, active: true },
    ],
    addons: [
      { id: BACON, name: "Bacon", priceCents: 600, paused: false, active: true },
      { id: AZEITONAS, name: "Azeitonas", priceCents: 400, paused: false, active: true },
    ],
    products: [
      { id: REFRI, name: "Refrigerante lata 350 ml", priceCents: 800, paused: false, active: true },
      { id: AGUA, name: "Água mineral 500 ml", priceCents: 500, paused: false, active: true },
    ],
    promotions: [
      { flavorId: MARGHERITA, sizeId: GRANDE, kind: "manual", percent: null, priceCents: 4490, active: true },
      { flavorId: BANANA_CANELA, sizeId: GRANDE, kind: "percent", percent: 20, priceCents: null, active: true },
    ],
  };
}
