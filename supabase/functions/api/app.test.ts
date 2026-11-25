import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import type { Sql } from "./db.ts";
import { readEnv } from "./env.ts";
import { silentLogger } from "./http/log.ts";
import { Router, normalizePath } from "./http/router.ts";

describe("roteador", () => {
  const r = new Router<string>().get("/api/orders/:code", "detalhe").post("/api/orders", "criar");

  it("extrai parâmetros e diferencia caminho desconhecido de método errado", () => {
    expect(r.match("GET", "/api/orders/AbC-123")).toMatchObject({ handler: "detalhe", params: { code: "AbC-123" } });
    expect(r.match("GET", "/api/orders/x/")).toMatchObject({ handler: "detalhe" });
    expect(r.match("DELETE", "/api/orders")).toBe("method");
    expect(r.match("GET", "/api/nada")).toBeNull();
    expect(r.match("GET", "/api/orders/a/b")).toBeNull();
  });

  it("normaliza o caminho vindo do Supabase ou da Vercel", () => {
    expect(normalizePath("/functions/v1/api/store")).toBe("/api/store");
    expect(normalizePath("/api/store/")).toBe("/api/store");
    expect(normalizePath("/")).toBe("/");
  });
});

function appWith(sql: Sql) {
  const log = silentLogger();
  const app = createApp({ sql, env: readEnv(() => undefined), log, now: () => new Date("2026-11-25T23:00:00Z") });
  return { app, log };
}

const failingSql = (async () => {
  throw Object.assign(new Error('invalid input syntax for type uuid: "11987654321"'), { code: "22P02" });
}) as unknown as Sql;

describe("tratamento de erros e cabeçalhos", () => {
  it("404 com formato padrão, ID da requisição e cabeçalhos de segurança", async () => {
    const { app } = appWith(failingSql);
    const res = await app(new Request("http://x/api/nao-existe"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; requestId: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(res.headers.get("X-Request-Id")).toBe(body.error.requestId);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("405 para método errado em rota existente", async () => {
    const { app } = appWith(failingSql);
    expect((await app(new Request("http://x/api/store", { method: "POST" }))).status).toBe(405);
  });

  it("OPTIONS responde 204 sem liberar outros sites (sem CORS)", async () => {
    const { app } = appWith(failingSql);
    const res = await app(new Request("http://x/api/store", { method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("X-25 erro interno: mensagem genérica e log sem o valor enviado", async () => {
    const { app, log } = appWith(failingSql);
    const res = await app(new Request("http://x/api/store?token=segredo"));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain("Algo deu errado");
    expect(text).not.toContain("11987654321");
    const logged = JSON.stringify(log.lines);
    expect(logged).not.toContain("11987654321");
    expect(logged).not.toContain("segredo");
    expect(logged).toContain('"errorCode":"22P02"');
    expect(logged).toContain('"route":"/api/store"');
  });
});
