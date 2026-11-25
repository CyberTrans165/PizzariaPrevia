// Monta a função `api`: roteamento, tratamento de erros, ID de correlação e log.
// Não depende do Deno: recebe o cliente do banco e a configuração por injeção,
// o que permite testar o mesmo código localmente contra um Postgres de teste.

import type { Sql } from "./db.ts";
import type { Env } from "./env.ts";
import { HttpError } from "./http/errors.ts";
import type { Logger } from "./http/log.ts";
import { json, withCommonHeaders } from "./http/respond.ts";
import { Router, normalizePath } from "./http/router.ts";
import { getHealth, getMenu, getPrivacyPolicy, getStore } from "./routes/public.ts";

export interface Deps {
  sql: Sql;
  env: Env;
  log: Logger;
  now: () => Date;
}

export interface Ctx {
  req: Request;
  url: URL;
  params: Record<string, string>;
  requestId: string;
  deps: Deps;
}

export type Handler = (ctx: Ctx) => Promise<Response>;

export function buildRouter(): Router<Handler> {
  return new Router<Handler>()
    .get("/api/health", getHealth)
    .get("/api/store", getStore)
    .get("/api/menu", getMenu)
    .get("/api/privacy-policy", getPrivacyPolicy);
}

interface ZodLikeError {
  name: string;
  issues: Array<{ path: Array<string | number>; message: string }>;
}

function isZodError(err: unknown): err is ZodLikeError {
  return (
    typeof err === "object" && err !== null && (err as { name?: string }).name === "ZodError" &&
    Array.isArray((err as { issues?: unknown }).issues)
  );
}

function errorBody(code: string, message: string, requestId: string, fields?: Record<string, string>) {
  return { error: { code, message, requestId, ...(fields ? { fields } : {}) } };
}

export function toErrorResponse(err: unknown, requestId: string, log: Logger, route: string): Response {
  if (err instanceof HttpError) {
    return json(errorBody(err.code, err.message, requestId, err.fields), { status: err.status });
  }
  if (isZodError(err)) {
    // Só o caminho do campo e a mensagem; o valor enviado nunca volta nem vai para o log.
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    return json(errorBody("VALIDATION", "Confira os dados informados.", requestId, fields), { status: 400 });
  }
  // A mensagem do erro NÃO vai para o log: erros do Postgres podem repetir o valor enviado
  // (um telefone, por exemplo). Ficam só o tipo, o código (SQLSTATE) e o local no código.
  const e = err as { name?: unknown; code?: unknown; stack?: unknown };
  const where = typeof e?.stack === "string" ? e.stack.split("\n").find((l) => l.trim().startsWith("at ")) : undefined;
  log.error("request.failed", {
    requestId,
    route,
    errorName: typeof e?.name === "string" ? e.name : "Error",
    errorCode: typeof e?.code === "string" ? e.code : undefined,
    errorWhere: where?.trim().replace(/\(.*\/(supabase\/functions\/[^)]*)\)/, "($1)"),
  });
  return json(errorBody("INTERNAL", "Algo deu errado. Tente novamente em instantes.", requestId), { status: 500 });
}

export function createApp(deps: Deps): (req: Request) => Promise<Response> {
  const router = buildRouter();

  return async (req: Request): Promise<Response> => {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    const url = new URL(req.url);
    const path = normalizePath(url.pathname);
    let route = "unmatched";
    let res: Response;

    try {
      if (req.method === "OPTIONS") {
        // Mesma origem: não há CORS liberado para outros sites.
        res = new Response(null, { status: 204 });
      } else {
        const method = req.method === "HEAD" ? "GET" : req.method;
        const m = router.match(method, path);
        if (m === null) {
          res = json(errorBody("NOT_FOUND", "Não encontrado.", requestId), { status: 404 });
        } else if (m === "method") {
          res = json(errorBody("METHOD_NOT_ALLOWED", "Método não permitido.", requestId), { status: 405 });
        } else {
          route = m.pattern;
          res = await m.handler({ req, url, params: m.params, requestId, deps });
          if (req.method === "HEAD") res = new Response(null, { status: res.status, headers: res.headers });
        }
      }
    } catch (err) {
      res = toErrorResponse(err, requestId, deps.log, route);
    }

    res = withCommonHeaders(res, requestId);
    deps.log.info("request", { requestId, method: req.method, route, status: res.status, ms: Date.now() - started });
    return res;
  };
}
