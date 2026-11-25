// Leitura do cardápio ativo. Itens pausados vêm junto (o site mostra "Indisponível").
// Devolve o formato do site e o catálogo usado pelo cálculo de preço no servidor.
import type { Sql } from "../db.ts";
import type { Catalog, FlavorKind } from "../../_shared/domain/pricing.ts";
import { pizzaBasePrice } from "../../_shared/domain/pricing.ts";

export interface MenuFlavor {
  id: string;
  categoryId: string;
  kind: FlavorKind;
  name: string;
  description: string;
  ingredients: string[];
  photoUrl: string | null;
  paused: boolean;
  prices: Record<string, number>;
}

export interface MenuProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  photoUrl: string | null;
  paused: boolean;
}

export interface MenuExtra {
  id: string;
  name: string;
  priceCents: number;
  paused: boolean;
}

export interface Menu {
  sizes: { id: string; name: string; slices: number; maxFlavors: number }[];
  categories: { id: string; name: string; kind: string }[];
  flavors: MenuFlavor[];
  /** promoções ativas já calculadas ("de/por") */
  promotions: { flavorId: string; sizeId: string; listCents: number; promoCents: number }[];
  crusts: MenuExtra[];
  addons: MenuExtra[];
  products: MenuProduct[];
}

type R<T> = T & Record<string, unknown>;

export async function loadMenu(sql: Sql): Promise<{ menu: Menu; catalog: Catalog }> {
  const [sizes, categories, flavors, promos, crusts, addons, products] = await Promise.all([
    sql<R<Menu["sizes"][number]>>`
      select id::text as id, name, slices::int as slices, max_flavors::int as "maxFlavors"
      from sizes where active order by sort, name`,
    sql<R<Menu["categories"][number]>>`
      select id::text as id, name, kind::text as kind from categories where active order by sort, name`,
    sql<R<MenuFlavor>>`
      select
        f.id::text as id,
        f.category_id::text as "categoryId",
        c.kind::text as kind,
        f.name,
        f.description,
        f.ingredients,
        f.photo_url as "photoUrl",
        f.paused,
        coalesce(
          (select jsonb_object_agg(fp.size_id::text, fp.price_cents)
             from flavor_prices fp join sizes s on s.id = fp.size_id and s.active
            where fp.flavor_id = f.id),
          '{}'::jsonb
        ) as prices
      from flavors f
      join categories c on c.id = f.category_id and c.active
      where f.active and c.kind in ('pizza_salgada', 'pizza_doce')
      order by c.sort, f.sort, f.name`,
    sql<R<{ flavorId: string; sizeId: string; kind: "percent" | "manual"; percent: number | null; priceCents: number | null }>>`
      select p.flavor_id::text as "flavorId", p.size_id::text as "sizeId", p.kind::text as kind,
             p.percent::float8 as percent, p.price_cents as "priceCents"
      from promotions p
      join flavors f on f.id = p.flavor_id and f.active
      join sizes s on s.id = p.size_id and s.active
      where p.active
      order by p.sort`,
    sql<R<MenuExtra>>`
      select id::text as id, name, price_cents as "priceCents", paused from crusts where active order by sort, name`,
    sql<R<MenuExtra>>`
      select id::text as id, name, price_cents as "priceCents", paused from addons where active order by sort, name`,
    sql<R<MenuProduct>>`
      select p.id::text as id, p.category_id::text as "categoryId", p.name, p.description,
             p.price_cents as "priceCents", p.photo_url as "photoUrl", p.paused
      from products p join categories c on c.id = p.category_id and c.active
      where p.active
      order by c.sort, p.sort, p.name`,
  ]);

  // Alguns clientes Postgres devolvem jsonb como texto; normaliza.
  const flavorList: MenuFlavor[] = flavors.map((f) => ({
    ...f,
    prices: typeof f.prices === "string" ? (JSON.parse(f.prices) as Record<string, number>) : f.prices,
  }));

  const catalog: Catalog = {
    sizes: sizes.map((s) => ({ ...s, active: true })),
    flavors: flavorList.map((f) => ({
      id: f.id, name: f.name, kind: f.kind, ingredients: f.ingredients, prices: f.prices, paused: f.paused, active: true,
    })),
    crusts: crusts.map((c) => ({ ...c, active: true })),
    addons: addons.map((a) => ({ ...a, active: true })),
    products: products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, paused: p.paused, active: true })),
    promotions: promos.map((p) => ({ ...p, active: true })),
  };

  const promotions = promos.flatMap((p) => {
    const price = pizzaBasePrice(catalog, p.sizeId, [p.flavorId]);
    return price?.promotionApplied
      ? [{ flavorId: p.flavorId, sizeId: p.sizeId, listCents: price.listCents, promoCents: price.finalCents }]
      : [];
  });

  return {
    menu: {
      sizes: sizes.map((s) => ({ id: s.id, name: s.name, slices: s.slices, maxFlavors: s.maxFlavors })),
      categories: categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
      flavors: flavorList,
      promotions,
      crusts: crusts.map((c) => ({ id: c.id, name: c.name, priceCents: c.priceCents, paused: c.paused })),
      addons: addons.map((a) => ({ id: a.id, name: a.name, priceCents: a.priceCents, paused: a.paused })),
      products: products.map((p) => ({ ...p })),
    },
    catalog,
  };
}
