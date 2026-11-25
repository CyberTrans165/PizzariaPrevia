// Rotas públicas (sem login) da Fase 1: dados da loja, cardápio, política e saúde.
import { storeStatus, storeStatusText } from "../../_shared/domain/hours.ts";
import { resolveTheme } from "../../_shared/domain/theme.ts";
import type { Handler } from "../app.ts";
import { json, publicCache } from "../http/respond.ts";
import { loadMenu } from "../repo/menu.ts";
import { loadHours, loadPrivacyPolicy, loadStore } from "../repo/store.ts";

export const getStore: Handler = async ({ deps }) => {
  const [store, hours] = await Promise.all([loadStore(deps.sql), loadHours(deps.sql)]);
  const status = storeStatus(hours, deps.now(), store.timezone);
  return json(
    {
      store: {
        name: store.name,
        logoUrl: store.logoUrl,
        story: store.story,
        phone: store.phone,
        whatsapp: store.whatsapp,
        social: store.social,
        addressText: store.addressText,
        location: store.lat !== null && store.lng !== null ? { lat: store.lat, lng: store.lng } : null,
        isDemo: store.isDemo,
      },
      hours,
      status: { ...status, text: storeStatusText(status) },
      delivery: {
        radiusKm: store.radiusKm,
        minOrderCents: store.minOrderCents,
        freeShippingAboveCents: store.freeShippingAboveCents,
        estimate: {
          delivery: { min: store.estDeliveryMin, max: store.estDeliveryMax },
          pickup: { min: store.estPickupMin, max: store.estPickupMax },
        },
      },
      payment: { pixExpiryMinutes: store.pixExpiryMinutes },
      theme: resolveTheme(store.theme),
      consent: { text: store.consentText, version: store.consentTextVersion },
      privacyPolicyVersion: store.privacyPolicyVersion,
    },
    // Curto, porque o "Aberto/Fechado" muda com o relógio.
    { headers: publicCache(30) },
  );
};

export const getMenu: Handler = async ({ deps }) => {
  const { menu } = await loadMenu(deps.sql);
  return json(menu, { headers: publicCache(60) });
};

export const getPrivacyPolicy: Handler = async ({ deps }) => {
  return json(await loadPrivacyPolicy(deps.sql), { headers: publicCache(300) });
};

export const getHealth: Handler = async ({ deps }) => {
  await deps.sql`select 1 as ok`;
  return json({ ok: true });
};
