// Testes de integração das rotas públicas contra um banco de TESTE com migrações e seed aplicados.
// Rode antes: DATABASE_URL=... bash scripts/db/check.sh
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../supabase/functions/api/app.ts";
import { readEnv } from "../../supabase/functions/api/env.ts";
import { silentLogger } from "../../supabase/functions/api/http/log.ts";
import { PRESETS } from "../../supabase/functions/_shared/domain/theme.ts";
import { TEST_DATABASE_URL, connectTestDb } from "../helpers/db.ts";

type Db = Awaited<ReturnType<typeof connectTestDb>>;

describe.skipIf(!TEST_DATABASE_URL)("API pública contra o banco", () => {
  let db: Db;
  let app: (req: Request) => Promise<Response>;
  // Quarta, 25/11/2026, 20:00 em São Paulo (23:00 UTC): loja aberta.
  let now = new Date("2026-11-25T23:00:00Z");

  beforeAll(async () => {
    db = await connectTestDb();
    app = createApp({ sql: db, env: readEnv(() => undefined), log: silentLogger(), now: () => now });
  });
  afterAll(async () => {
    await db?.close();
  });

  const get = async (path: string) => {
    const res = await app(new Request(`http://localhost${path}`));
    return { res, body: (await res.json()) as Record<string, unknown> };
  };

  it("GET /api/health confirma o banco", async () => {
    const { res, body } = await get("/api/health");
    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("GET /api/store devolve loja, horários, status e tema", async () => {
    const { res, body } = await get("/api/store");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=30");
    expect(body.store).toMatchObject({ name: "Forno Bella Pizzeria", isDemo: true, location: { lat: -23.55052, lng: -46.633308 } });
    expect(body.hours).toHaveLength(7);
    expect(body.status).toMatchObject({ open: true, closesAt: "23:00", text: "Aberto agora · fechamos às 23:00" });
    expect(body.theme).toEqual({ preset: "forno-a-lenha", tokens: PRESETS["forno-a-lenha"] });
    expect(body.delivery).toMatchObject({ radiusKm: 8, minOrderCents: null, freeShippingAboveCents: 12000 });
    expect(body.consent).toMatchObject({ version: 1 });
  });

  it("GET /api/store não expõe segredos nem configuração interna", async () => {
    await db`update store_settings set bot_webhook_url = 'https://bot.exemplo.com/hook', bot_webhook_secret_enc = 'cifrado'`;
    try {
      const raw = await (await app(new Request("http://localhost/api/store"))).text();
      expect(raw).not.toMatch(/webhook|secret|cifrado|bot\.exemplo|password|token_hash/i);
    } finally {
      await db`update store_settings set bot_webhook_url = null, bot_webhook_secret_enc = null`;
    }
  });

  it("loja fechada fora do horário", async () => {
    now = new Date("2026-11-25T17:00:00Z"); // 14:00 em São Paulo
    const { body } = await get("/api/store");
    expect(body.status).toMatchObject({ open: false, text: "Fechado agora · abrimos hoje às 18:00" });
    now = new Date("2026-11-25T23:00:00Z");
  });

  it("GET /api/menu devolve o cardápio com preços e promoções calculadas", async () => {
    const { res, body } = await get("/api/menu");
    expect(res.status).toBe(200);
    const menu = body as {
      sizes: { name: string }[];
      flavors: { name: string; prices: Record<string, number>; ingredients: string[]; paused: boolean }[];
      promotions: { listCents: number; promoCents: number }[];
      products: unknown[];
      crusts: unknown[];
      addons: unknown[];
    };
    expect(menu.sizes.map((s) => s.name)).toEqual(["Broto", "Grande"]);
    expect(menu.flavors).toHaveLength(6);
    const margherita = menu.flavors.find((f) => f.name === "Margherita");
    expect(Object.values(margherita?.prices ?? {}).sort()).toEqual([3290, 5290]);
    expect(margherita?.ingredients).toEqual(["molho de tomate", "muçarela", "manjericão"]);
    expect(menu.promotions).toHaveLength(5);
    expect(menu.promotions).toContainEqual(expect.objectContaining({ listCents: 4790, promoCents: 3832 }));
    expect(menu.products).toHaveLength(3);
    expect(menu.crusts).toHaveLength(3);
    expect(menu.addons).toHaveLength(4);
  });

  it("item pausado continua no cardápio, marcado como pausado", async () => {
    await db`update flavors set paused = true where name = 'Calabresa'`;
    try {
      const { body } = await get("/api/menu");
      const calabresa = (body.flavors as { name: string; paused: boolean }[]).find((f) => f.name === "Calabresa");
      expect(calabresa?.paused).toBe(true);
    } finally {
      await db`update flavors set paused = false where name = 'Calabresa'`;
    }
  });

  it("GET /api/privacy-policy devolve o modelo de política", async () => {
    const { body } = await get("/api/privacy-policy");
    expect(String(body.text)).toContain("PRECISA DE REVISÃO JURÍDICA");
    expect(body.version).toBe(1);
  });

  it("caminho com prefixo /functions/v1 também funciona", async () => {
    const res = await app(new Request("http://localhost/functions/v1/api/health"));
    expect(res.status).toBe(200);
  });
});
