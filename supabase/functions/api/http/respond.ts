// Respostas JSON e cabeçalhos comuns a toda a API.

export function json(data: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...init.headers },
  });
}

/** Cache curto e público (cardápio, dados da loja). */
export const publicCache = (seconds: number) => ({
  "Cache-Control": `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${seconds}`,
});

/** Acrescenta os cabeçalhos de segurança e o ID da requisição em toda resposta. */
export function withCommonHeaders(res: Response, requestId: string): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
