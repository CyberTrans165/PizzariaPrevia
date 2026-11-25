// Roteador pequeno e sem dependências. Padrões como "/api/orders/:code".

export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteMatch<H> {
  handler: H;
  params: Record<string, string>;
  /** padrão da rota, usado no log no lugar do caminho real (que pode ter tokens) */
  pattern: string;
}

interface Route<H> {
  method: Method;
  pattern: string;
  regex: RegExp;
  keys: string[];
  handler: H;
}

export class Router<H> {
  private routes: Route<H>[] = [];

  add(method: Method, pattern: string, handler: H): this {
    const keys: string[] = [];
    const source = pattern
      .split("/")
      .map((part) => {
        if (part.startsWith(":")) {
          keys.push(part.slice(1));
          return "([^/]+)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("/");
    this.routes.push({ method, pattern, regex: new RegExp(`^${source}/?$`), keys, handler });
    return this;
  }

  get(pattern: string, handler: H) {
    return this.add("GET", pattern, handler);
  }
  post(pattern: string, handler: H) {
    return this.add("POST", pattern, handler);
  }
  put(pattern: string, handler: H) {
    return this.add("PUT", pattern, handler);
  }

  /** null = caminho desconhecido; "method" = caminho existe, mas não com esse método. */
  match(method: string, path: string): RouteMatch<H> | null | "method" {
    let pathExists = false;
    for (const r of this.routes) {
      const m = r.regex.exec(path);
      if (!m) continue;
      pathExists = true;
      if (r.method !== method) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1] ?? "");
      });
      return { handler: r.handler, params, pattern: r.pattern };
    }
    return pathExists ? "method" : null;
  }
}

/**
 * No Supabase o caminho chega como "/api/..." (o nome da função vem primeiro).
 * Pela Vercel ou em testes, pode vir com "/functions/v1" na frente.
 */
export function normalizePath(pathname: string): string {
  const p = pathname.replace(/^\/functions\/v1(?=\/)/, "");
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}
