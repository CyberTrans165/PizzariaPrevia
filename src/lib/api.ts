// Cliente da API (mesma origem: /api/...). Erros chegam no formato padrão do servidor.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string | null,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; requestId?: string; fields?: Record<string, string> };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Sem conexão. Confira a internet e tente de novo.", null);
  }
  if (res.ok) return (await res.json()) as T;
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  throw new ApiError(
    res.status,
    body.error?.code ?? "HTTP_" + res.status,
    body.error?.message ?? "Algo deu errado. Tente novamente em instantes.",
    body.error?.requestId ?? res.headers.get("X-Request-Id"),
    body.error?.fields,
  );
}

export const apiGet = <T>(path: string) => request<T>(path);

export const apiPost = <T>(path: string, data: unknown, headers: Record<string, string> = {}) =>
  request<T>(path, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json", ...headers },
  });
