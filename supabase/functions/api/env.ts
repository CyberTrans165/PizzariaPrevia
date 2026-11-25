// Configuração lida das variáveis de ambiente (segredos do servidor).
// Nunca registrar estes valores em log nem devolver em resposta.

export interface Env {
  isDemo: boolean;
  siteUrl: string;
  appSecretKey: string | null;
  mpAccessToken: string | null;
  mpWebhookSecret: string | null;
  turnstileSecret: string | null;
  nominatimContact: string | null;
  geocoderProvider: "nominatim";
}

export function readEnv(get: (name: string) => string | undefined): Env {
  const opt = (name: string) => {
    const v = get(name)?.trim();
    return v ? v : null;
  };
  return {
    isDemo: (get("IS_DEMO") ?? "").toLowerCase() === "true",
    siteUrl: (get("SITE_URL") ?? "http://localhost:5173").replace(/\/+$/, ""),
    appSecretKey: opt("APP_SECRET_KEY"),
    mpAccessToken: opt("MP_ACCESS_TOKEN"),
    mpWebhookSecret: opt("MP_WEBHOOK_SECRET"),
    turnstileSecret: opt("TURNSTILE_SECRET"),
    nominatimContact: opt("NOMINATIM_CONTACT"),
    geocoderProvider: "nominatim",
  };
}
