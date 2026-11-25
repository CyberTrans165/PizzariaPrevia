// Erros com resposta padronizada: { "error": { "code", "message", "requestId" } }.
// A mensagem é para o usuário (português, sem detalhes internos).

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Não encontrado.") => new HttpError(404, "NOT_FOUND", message);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "VALIDATION", message, fields);
export const unauthorized = (message = "Entre novamente para continuar.") =>
  new HttpError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Ação não permitida.") => new HttpError(403, "FORBIDDEN", message);
export const tooManyRequests = (message = "Muitas tentativas. Tente de novo em instantes.") =>
  new HttpError(429, "RATE_LIMITED", message);
export const payloadTooLarge = () => new HttpError(413, "PAYLOAD_TOO_LARGE", "Envio grande demais.");
