// Leitura do corpo JSON com limite de tamanho (protege contra envios enormes).
import { HttpError, badRequest, payloadTooLarge } from "./errors.ts";

export const DEFAULT_MAX_BODY = 64 * 1024;

export async function readJson(req: Request, maxBytes = DEFAULT_MAX_BODY): Promise<unknown> {
  const type = req.headers.get("Content-Type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Envie os dados em JSON.");
  }
  const declared = Number(req.headers.get("Content-Length") ?? "0");
  if (declared > maxBytes) throw payloadTooLarge();

  const reader = req.body?.getReader();
  if (!reader) throw badRequest("Corpo da requisição vazio.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw payloadTooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw badRequest("JSON inválido.");
  }
}
