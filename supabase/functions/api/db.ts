// Interface mínima do cliente Postgres usado pela função.
// Em produção é o postgres.js (Deno, `npm:postgres`); nos testes locais pode ser outro cliente
// compatível (postgres.js no Node ou Bun.SQL). Só usamos consultas com template parametrizado,
// nunca texto montado à mão: os valores viram parâmetros ($1, $2...) e não entram no SQL.

export type Row = Record<string, unknown>;

export interface Sql {
  <T extends Row = Row>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  begin<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
}
