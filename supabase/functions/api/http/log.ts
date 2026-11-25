// Log estruturado (uma linha JSON por evento). Regra da ETAPA 10: nada de dados pessoais,
// senhas, tokens, corpos de requisição, query strings ou dados de pagamento.
// Por isso o log de requisição usa o PADRÃO da rota ("/api/orders/:code"), não o caminho real.

export interface Logger {
  info(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

const SAFE_KEYS = new Set([
  "requestId", "method", "route", "status", "ms", "errorName", "errorCode", "errorWhere", "job", "count",
]);

/** Mantém só campos permitidos e corta textos longos. */
export function sanitize(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!SAFE_KEYS.has(k)) continue;
    out[k] = typeof v === "string" ? v.slice(0, 200) : v;
  }
  return out;
}

export function consoleLogger(): Logger {
  const write = (level: "info" | "error", event: string, fields: Record<string, unknown> = {}) => {
    const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...sanitize(fields) });
    if (level === "error") console.error(line);
    else console.log(line);
  };
  return { info: (e, f) => write("info", e, f), error: (e, f) => write("error", e, f) };
}

export function silentLogger(): Logger & { lines: Array<{ level: string; event: string; fields: Record<string, unknown> }> } {
  const lines: Array<{ level: string; event: string; fields: Record<string, unknown> }> = [];
  return {
    lines,
    info: (event, fields = {}) => lines.push({ level: "info", event, fields: sanitize(fields) }),
    error: (event, fields = {}) => lines.push({ level: "error", event, fields: sanitize(fields) }),
  };
}
