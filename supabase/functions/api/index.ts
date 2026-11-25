// Ponto de entrada da função `api` no Supabase (Deno).
// Toda a lógica está em app.ts; aqui só ligamos o banco e as variáveis de ambiente.
import postgres from "postgres";
import { createApp } from "./app.ts";
import type { Sql } from "./db.ts";
import { readEnv } from "./env.ts";
import { consoleLogger } from "./http/log.ts";

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
if (!dbUrl) throw new Error("SUPABASE_DB_URL não definida");

// prepare: false é necessário com o pooler do Supabase (modo transação).
const sql = postgres(dbUrl, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 });

const app = createApp({
  sql: sql as unknown as Sql,
  env: readEnv((name) => Deno.env.get(name)),
  log: consoleLogger(),
  now: () => new Date(),
});

Deno.serve(app);
