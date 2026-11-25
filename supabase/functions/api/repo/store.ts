// Leitura da configuração da loja. Só campos que podem ser públicos saem daqui;
// URL e segredo do webhook do bot nunca são lidos por esta consulta.
import type { Sql } from "../db.ts";
import type { OpeningHour } from "../../_shared/domain/hours.ts";

export interface StoreRow {
  name: string;
  logoUrl: string | null;
  story: string;
  phone: string | null;
  whatsapp: string | null;
  social: Record<string, string>;
  addressText: string;
  lat: number | null;
  lng: number | null;
  radiusKm: number;
  minOrderCents: number | null;
  freeShippingAboveCents: number | null;
  estDeliveryMin: number;
  estDeliveryMax: number;
  estPickupMin: number;
  estPickupMax: number;
  pixExpiryMinutes: number;
  theme: unknown;
  consentText: string;
  consentTextVersion: number;
  privacyPolicyVersion: number;
  isDemo: boolean;
  timezone: string;
}

export async function loadStore(sql: Sql): Promise<StoreRow> {
  const rows = await sql<StoreRow & Record<string, unknown>>`
    select
      name,
      logo_url as "logoUrl",
      story_text as "story",
      phone,
      whatsapp,
      social,
      address_text as "addressText",
      lat::float8 as lat,
      lng::float8 as lng,
      delivery_radius_km::float8 as "radiusKm",
      min_order_cents as "minOrderCents",
      free_shipping_above_cents as "freeShippingAboveCents",
      est_delivery_min::int as "estDeliveryMin",
      est_delivery_max::int as "estDeliveryMax",
      est_pickup_min::int as "estPickupMin",
      est_pickup_max::int as "estPickupMax",
      pix_expiry_minutes::int as "pixExpiryMinutes",
      theme,
      consent_text as "consentText",
      consent_text_version as "consentTextVersion",
      privacy_policy_version as "privacyPolicyVersion",
      is_demo as "isDemo",
      timezone
    from store_settings
    where id
  `;
  const row = rows[0];
  if (!row) throw new Error("store_settings sem linha");
  return row;
}

export async function loadHours(sql: Sql): Promise<OpeningHour[]> {
  return await sql<OpeningHour & Record<string, unknown>>`
    select
      weekday::int as weekday,
      to_char(opens, 'HH24:MI') as opens,
      to_char(closes, 'HH24:MI') as closes,
      closed
    from opening_hours
    order by weekday
  `;
}

export async function loadPrivacyPolicy(sql: Sql): Promise<{ text: string; version: number }> {
  const rows = await sql<{ text: string; version: number }>`
    select privacy_policy_text as text, privacy_policy_version as version from store_settings where id
  `;
  return rows[0] ?? { text: "", version: 1 };
}
