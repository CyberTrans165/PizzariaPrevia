// Conexão com o banco de TESTE para os testes de integração.
// No Node usa o pacote `postgres` (o mesmo cliente da função); no Bun usa o cliente embutido.
import type { Sql } from "../../supabase/functions/api/db.ts";

export const TEST_DATABASE_URL = process.env.DATABASE_URL ?? "";

export async function connectTestDb(): Promise<Sql & { close: () => Promise<void> }> {
  if (!TEST_DATABASE_URL) throw new Error("Defina DATABASE_URL para os testes de integração.");
  const g = globalThis as { Bun?: unknown };
  if (g.Bun) {
    const { SQL } = (await import("bun" as string)) as { SQL: new (url: string) => Sql & { close(): Promise<void> } };
    // O cliente do Bun já tem close().
    return new SQL(TEST_DATABASE_URL);
  }
  const { default: postgres } = (await import("postgres")) as unknown as {
    default: (url: string, o: object) => Sql & { end(): Promise<void> };
  };
  const sql = postgres(TEST_DATABASE_URL, { prepare: false, max: 2 });
  const end = sql.end.bind(sql);
  return Object.assign(sql, { close: () => end() });
}
