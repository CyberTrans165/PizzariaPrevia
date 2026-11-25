// Servidor simulado da VITRINE: roda no navegador e guarda os dados só neste aparelho.
// Usa as mesmas regras do servidor real (_shared/domain): preço, entrega, horário, status e tema.
// O que é simulado aqui (e real na versão instalada): distância pelo CEP, consulta de CEP,
// PIX (QR de mentira e botão "simular pagamento") e login do dono (conferido no servidor de verdade).
import { missingForMinimum, quoteDelivery, validateFeeBands } from "@shared/domain/delivery.ts";
import { storeStatus, storeStatusText } from "@shared/domain/hours.ts";
import { canCancel, canTransition, nextOwnerStep, type OrderStatus } from "@shared/domain/orderStatus.ts";
import { pizzaBasePrice, priceCart } from "@shared/domain/pricing.ts";
import { createOrderSchema } from "@shared/domain/schemas.ts";
import { canSaveTheme, resolveTheme } from "@shared/domain/theme.ts";
import { ApiError } from "../lib/api.ts";
import type {
  AdminOrder, AdminSettings, Backend, CreateOrderRequest, DashboardData, DeliveryQuoteResponse, OrderView, StoreResponse,
} from "../lib/backend.ts";
import { newId } from "../lib/format.ts";
import { catalogOf, seedState, type DemoState, type StoredOrder } from "./seed.ts";
import { readItem, removeItem, writeItem } from "./storage.ts";

const KEY = "fornobella.vitrine.v3";
const SESSION_KEY = "fornobella.vitrine.admin";
export const DEMO_LOGIN = { email: "dono@fornobella.demo", password: "forno-a-lenha-demo" };

const wait = (ms = 140) => new Promise((r) => setTimeout(r, ms));
const fail = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  new ApiError(status, code, message, null, fields);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Distância simulada a partir do CEP (sempre a mesma para o mesmo endereço). Final 9 = fora da área. */
export function simulatedDistanceKm(cep: string, number: string, radiusKm: number): number {
  const digits = cep.replace(/\D/g, "");
  if (digits.endsWith("9")) return Math.round((radiusKm + 1.4) * 10) / 10;
  let h = 7;
  for (const ch of digits + number) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return Math.round((0.6 + (h % 1000) / 1000 * (radiusKm - 0.8)) * 10) / 10;
}

function dateKey(iso: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export function createLocalBackend(): Backend {
  let state: DemoState = load();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  function load(): DemoState {
    try {
      const raw = readItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as DemoState) : null;
      if (parsed && parsed.v === 3) return parsed;
    } catch {
      /* dados corrompidos: recomeça */
    }
    const fresh = seedState();
    writeItem(KEY, JSON.stringify(fresh));
    return fresh;
  }

  function save() {
    writeItem(KEY, JSON.stringify(state));
    emit();
  }

  // Outra aba (ex.: o painel do dono) mudou os dados: recarrega e avisa as telas.
  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        state = load();
        emit();
      }
    });
  }

  function status() {
    const now = new Date();
    const real = storeStatus(state.hours, now, state.store.timezone);
    if (state.store.openMode === "aberta") return { ...real, open: true, closesAt: null, nextOpen: null, text: "Aberto agora · modo demonstração" };
    if (state.store.openMode === "fechada") {
      const s = real.open ? { ...real, open: false, closesAt: null } : real;
      return { ...s, text: real.open ? "Fechado agora (simulação da demonstração)" : storeStatusText(real) };
    }
    return { ...real, text: storeStatusText(real) };
  }

  /** PIX vencido vira "expirado" (o agendador faz isso no servidor real). */
  function expireStale(): boolean {
    let changed = false;
    const now = Date.now();
    for (const o of state.orders) {
      if (o.status === "awaiting_payment" && o.pix && new Date(o.pix.expiresAt).getTime() <= now) {
        o.status = "expired";
        o.paymentStatus = "expired";
        o.history.push({ to: "expired", at: new Date().toISOString() });
        changed = true;
      }
    }
    if (changed) save();
    return changed;
  }

  const view = (o: StoredOrder): OrderView => ({
    code: o.code, number: o.number, status: o.status, fulfillment: o.fulfillment, createdAt: o.createdAt, items: o.items,
    subtotalCents: o.subtotalCents, deliveryFeeCents: o.deliveryFeeCents, totalCents: o.totalCents, paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus, cashChangeForCents: o.cashChangeForCents, estimate: o.estimate, history: o.history,
    pix: o.status === "awaiting_payment" ? o.pix : null, customerFirstName: o.customerFirstName, cancelReason: o.cancelReason,
  });

  function findOrder(code: string): StoredOrder {
    const o = state.orders.find((x) => x.code === code);
    if (!o) throw fail(404, "NOT_FOUND", "Pedido não encontrado.");
    return o;
  }

  function findById(orderId: string): StoredOrder {
    const o = state.orders.find((x) => x.id === orderId);
    if (!o) throw fail(404, "NOT_FOUND", "Pedido não encontrado.");
    return o;
  }

  function transition(o: StoredOrder, to: OrderStatus, actor: "owner" | "system" | "gateway") {
    if (!canTransition(o.status, to, o.fulfillment, actor)) throw fail(409, "INVALID_STATUS", "Essa mudança de status não é permitida.");
    o.status = to;
    o.history.push({ to, at: new Date().toISOString() });
  }

  function quote(cep: string, number: string, subtotalCents: number): DeliveryQuoteResponse {
    if (cep.replace(/\D/g, "").length !== 8) return { ok: false, reason: "NOT_FOUND" };
    const distanceKm = simulatedDistanceKm(cep, number, state.store.radiusKm);
    const q = quoteDelivery({
      distanceKm, radiusKm: state.store.radiusKm, bands: state.bands, subtotalCents, freeShippingAboveCents: state.store.freeShippingAboveCents,
    });
    return q.ok
      ? { ok: true, distanceKm, feeCents: q.feeCents, bandFeeCents: q.bandFeeCents, freeShipping: q.freeShipping, missingForFreeCents: q.missingForFreeCents }
      : { ok: false, reason: "OUT_OF_AREA", distanceKm, radiusKm: state.store.radiusKm };
  }

  function makePix(o: StoredOrder) {
    o.pix = {
      code: `00020126DEMONSTRACAO-SEM-VALOR-FORNOBELLA-PEDIDO-${o.number}-5204000053039865802BR6009SAO PAULO`,
      expiresAt: new Date(Date.now() + state.store.pixExpiryMinutes * 60000).toISOString(),
    };
  }

  const requireAdmin = () => {
    if (readItem(SESSION_KEY, "session") !== DEMO_LOGIN.email) throw fail(401, "UNAUTHORIZED", "Entre novamente para continuar.");
  };

  const backend: Backend = {
    mode: "local",

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async getStore(): Promise<StoreResponse> {
      await wait(60);
      const s = state.store;
      return {
        store: { name: s.name, logoUrl: s.logoUrl, story: s.story, phone: s.phone, whatsapp: s.whatsapp, social: {}, addressText: s.addressText, location: { lat: s.lat, lng: s.lng }, isDemo: true },
        hours: clone(state.hours),
        status: status(),
        delivery: {
          radiusKm: s.radiusKm, bands: clone(state.bands), minOrderCents: s.minOrderCents, freeShippingAboveCents: s.freeShippingAboveCents,
          estimate: { delivery: s.estDelivery, pickup: s.estPickup },
        },
        payment: { pixExpiryMinutes: s.pixExpiryMinutes },
        theme: resolveTheme(s.theme),
        consent: { text: s.consentText, version: s.consentTextVersion },
        privacyPolicyVersion: s.privacyVersion,
      };
    },

    async getMenu() {
      await wait(60);
      const catalog = catalogOf(state);
      const promotions = state.promotions.filter((p) => p.active).flatMap((p) => {
        const price = pizzaBasePrice(catalog, p.sizeId, [p.flavorId]);
        return price?.promotionApplied ? [{ flavorId: p.flavorId, sizeId: p.sizeId, listCents: price.listCents, promoCents: price.finalCents, photoUrl: p.photoUrl ?? null }] : [];
      });
      return clone({
        sizes: state.sizes, categories: state.categories, flavors: state.flavors, promotions,
        crusts: state.crusts, addons: state.addons, products: state.products,
      });
    },

    async getPrivacyPolicy() {
      return { text: state.store.privacyText, version: state.store.privacyVersion };
    },

    async lookupCep(cep) {
      await wait(250);
      if (cep.replace(/\D/g, "").length !== 8) return null;
      // Simulado. Na versão instalada, o servidor consulta a BrasilAPI ou o ViaCEP.
      return { street: "Rua das Oliveiras", district: "Jardim Exemplo", city: "São Paulo", uf: "SP" };
    },

    async quoteDelivery({ cep, number, subtotalCents }) {
      await wait(300);
      return quote(cep, number, subtotalCents);
    },

    async createOrder(input: CreateOrderRequest) {
      await wait(400);
      const existing = state.orders.find((o) => o.idempotencyKey === input.idempotencyKey);
      if (existing) return { number: existing.number, code: existing.code };

      const parsed = createOrderSchema.safeParse(input);
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
        throw fail(400, "VALIDATION", "Confira os dados informados.", fields);
      }
      const data = parsed.data;
      if (!status().open) throw fail(409, "STORE_CLOSED", "A pizzaria está fechada agora. Tente no horário de funcionamento.");

      const priced = priceCart(catalogOf(state), data.items);
      if (!priced.ok) throw fail(409, "ITEMS_CHANGED", priced.issues[0]?.message ?? "Um item do carrinho mudou.");
      const missing = missingForMinimum(priced.subtotalCents, state.store.minOrderCents);
      if (missing > 0) throw fail(409, "MIN_ORDER", "O pedido ainda não alcançou o valor mínimo.");

      let fee = 0;
      let distanceKm: number | null = null;
      if (data.fulfillment === "delivery" && data.address) {
        const q = quote(data.address.cep, data.address.number, priced.subtotalCents);
        if (!q.ok) throw fail(409, "OUT_OF_AREA", "Não entregamos neste endereço. Escolha outro endereço ou retire na loja.");
        fee = q.feeCents;
        distanceKm = q.distanceKm;
      }

      const number = state.nextNumber++;
      const now = new Date().toISOString();
      const isPix = data.paymentMethod === "pix";
      const order: StoredOrder = {
        id: newId(), idempotencyKey: data.idempotencyKey, code: String(number), number,
        status: isPix ? "awaiting_payment" : "received", fulfillment: data.fulfillment, createdAt: now,
        items: priced.items, subtotalCents: priced.subtotalCents, deliveryFeeCents: fee, totalCents: priced.subtotalCents + fee,
        paymentMethod: data.paymentMethod, paymentStatus: isPix ? "pending" : "due_on_delivery",
        cashChangeForCents: data.cashChangeForCents ?? null,
        estimate: data.fulfillment === "delivery" ? state.store.estDelivery : state.store.estPickup,
        history: [{ to: isPix ? "awaiting_payment" : "received", at: now }], pix: null,
        customerFirstName: data.customer.name.split(" ")[0] ?? data.customer.name, cancelReason: null,
        customerName: data.customer.name, customerPhone: data.customer.phone,
        address: data.fulfillment === "delivery" && data.address ? { ...data.address, complement: data.address.complement ?? "" } : null,
        distanceKm, notes: data.notes ?? "", refundedCents: 0, consentWhatsapp: true, isSample: false,
      };
      if (order.cashChangeForCents !== null && order.cashChangeForCents < order.totalCents) {
        state.nextNumber--;
        throw fail(400, "VALIDATION", "O troco precisa ser para um valor maior que o total.", { cashChangeForCents: "Valor menor que o total." });
      }
      if (isPix) makePix(order);
      state.orders.push(order);
      save();
      return { number, code: order.code };
    },

    async getOrder(code) {
      await wait(40);
      expireStale();
      return clone(view(findOrder(code)));
    },

    async retryPix(code) {
      await wait(300);
      const old = findOrder(code);
      if (old.status !== "expired") throw fail(409, "INVALID_STATUS", "Este pedido não precisa de um novo PIX.");
      const number = state.nextNumber++;
      const now = new Date().toISOString();
      const copy: StoredOrder = {
        ...clone(old), id: newId(), idempotencyKey: newId(), code: String(number), number, status: "awaiting_payment",
        paymentStatus: "pending", createdAt: now, history: [{ to: "awaiting_payment", at: now }],
      };
      makePix(copy);
      state.orders.push(copy);
      save();
      return { number, code: copy.code };
    },

    async simulatePixPayment(code) {
      await wait(500);
      expireStale();
      const o = findOrder(code);
      if (o.status !== "awaiting_payment") throw fail(409, "INVALID_STATUS", "Este PIX não está mais aguardando pagamento.");
      transition(o, "received", "gateway");
      o.paymentStatus = "paid";
      save();
    },

    admin: {
      async me() {
        return readItem(SESSION_KEY, "session") === DEMO_LOGIN.email ? { email: DEMO_LOGIN.email } : null;
      },
      async login(email, password) {
        await wait(500);
        if (email.trim().toLowerCase() !== DEMO_LOGIN.email || password !== DEMO_LOGIN.password) {
          throw fail(401, "UNAUTHORIZED", "E-mail ou senha incorretos.");
        }
        writeItem(SESSION_KEY, DEMO_LOGIN.email, "session");
      },
      async logout() {
        removeItem(SESSION_KEY, "session");
      },
      async listOrders(): Promise<AdminOrder[]> {
        requireAdmin();
        expireStale();
        return clone([...state.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      },
      async advance(orderId) {
        requireAdmin();
        const o = findById(orderId);
        const step = nextOwnerStep(o.status, o.fulfillment);
        if (!step) throw fail(409, "INVALID_STATUS", "Este pedido não tem próximo passo.");
        transition(o, step.to, "owner");
        if (step.to === "delivered" && o.paymentStatus === "due_on_delivery") o.paymentStatus = "paid";
        save();
      },
      async cancel(orderId, reason) {
        requireAdmin();
        const o = findById(orderId);
        if (!canCancel(o.status)) throw fail(409, "INVALID_STATUS", "Este pedido não pode mais ser cancelado.");
        transition(o, "cancelled", "owner");
        o.cancelReason = reason.trim().slice(0, 300) || null;
        save();
      },
      async refund(orderId, amountCents) {
        requireAdmin();
        const o = findById(orderId);
        if (o.paymentMethod !== "pix" || !["paid", "partially_refunded"].includes(o.paymentStatus)) {
          throw fail(409, "NOT_REFUNDABLE", "Só pedidos pagos por PIX podem ser reembolsados aqui.");
        }
        const left = o.totalCents - o.refundedCents;
        if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > left) {
          throw fail(400, "VALIDATION", "Valor de reembolso inválido.", { amount: `Máximo ${(left / 100).toFixed(2).replace(".", ",")}` });
        }
        await wait(500); // na versão instalada: chamada ao Mercado Pago
        o.refundedCents += amountCents;
        o.paymentStatus = o.refundedCents === o.totalCents ? "refunded" : "partially_refunded";
        save();
      },
      async markPaid(orderId) {
        requireAdmin();
        const o = findById(orderId);
        if (o.paymentStatus !== "due_on_delivery") throw fail(409, "INVALID_STATUS", "Este pedido não está para pagar na entrega.");
        o.paymentStatus = "paid";
        save();
      },
      async dashboard(): Promise<DashboardData> {
        requireAdmin();
        const tz = state.store.timezone;
        const today = dateKey(new Date(), tz);
        const month = today.slice(0, 7);
        const valid = state.orders.filter((o) => !["cancelled", "expired", "awaiting_payment"].includes(o.status));
        const ofToday = valid.filter((o) => dateKey(o.createdAt, tz) === today);
        const ofMonth = valid.filter((o) => dateKey(o.createdAt, tz).startsWith(month));
        const sum = (list: StoredOrder[]) => list.reduce((s, o) => s + o.totalCents - o.refundedCents, 0);
        const counts = new Map<string, number>();
        for (const o of ofMonth) for (const it of o.items) if (it.kind === "pizza") for (const f of it.flavors) counts.set(f.name, (counts.get(f.name) ?? 0) + it.quantity);
        const byStatus: DashboardData["byStatus"] = {};
        for (const o of state.orders.filter((x) => dateKey(x.createdAt, tz) === today)) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
        return {
          today: { orders: ofToday.length, revenueCents: sum(ofToday) },
          month: { orders: ofMonth.length, revenueCents: sum(ofMonth), avgTicketCents: ofMonth.length ? Math.round(sum(ofMonth) / ofMonth.length) : 0 },
          topFlavors: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
          byStatus,
        };
      },
      async promotions() {
        requireAdmin();
        return clone(state.promotions);
      },
      async updateFlavor(flavorId, patch) {
        requireAdmin();
        const f = state.flavors.find((x) => x.id === flavorId);
        if (!f) throw fail(404, "NOT_FOUND", "Sabor não encontrado.");
        if (patch.prices) {
          for (const [size, cents] of Object.entries(patch.prices)) {
            if (!Number.isInteger(cents) || cents <= 0) throw fail(400, "VALIDATION", "Preço inválido.");
            f.prices[size] = cents;
          }
        }
        if (patch.paused !== undefined) f.paused = patch.paused;
        save();
      },
      async updateExtra(kind, itemId, patch) {
        requireAdmin();
        const list = state[kind] as Array<{ id: string; priceCents: number; paused: boolean }>;
        const item = list.find((x) => x.id === itemId);
        if (!item) throw fail(404, "NOT_FOUND", "Item não encontrado.");
        if (patch.priceCents !== undefined) {
          if (!Number.isInteger(patch.priceCents) || patch.priceCents < (kind === "products" ? 1 : 0)) throw fail(400, "VALIDATION", "Preço inválido.");
          item.priceCents = patch.priceCents;
        }
        if (patch.paused !== undefined) item.paused = patch.paused;
        save();
      },
      async setPromotion(promo) {
        requireAdmin();
        if (promo.kind === "percent" && !(promo.percent !== null && promo.percent > 0 && promo.percent < 100)) throw fail(400, "VALIDATION", "Use um percentual entre 1 e 99.");
        if (promo.kind === "manual" && !(promo.priceCents !== null && promo.priceCents > 0)) throw fail(400, "VALIDATION", "Informe o preço promocional.");
        const i = state.promotions.findIndex((p) => p.flavorId === promo.flavorId && p.sizeId === promo.sizeId);
        if (i >= 0) state.promotions[i] = promo;
        else state.promotions.push(promo);
        save();
      },
      async removePromotion(flavorId, sizeId) {
        requireAdmin();
        state.promotions = state.promotions.filter((p) => !(p.flavorId === flavorId && p.sizeId === sizeId));
        save();
      },
      async saveFlavor(flavorId, input) {
        requireAdmin();
        const name = input.name.trim().slice(0, 60);
        if (!name) throw fail(400, "VALIDATION", "Informe o nome do sabor.");
        for (const s of state.sizes) {
          const c = input.prices[s.id];
          if (!Number.isInteger(c) || (c ?? 0) <= 0) throw fail(400, "VALIDATION", `Informe o preço do tamanho ${s.name}.`);
        }
        const category = state.categories.find((c) => c.kind === input.kind);
        if (!category) throw fail(400, "VALIDATION", "Categoria não encontrada.");
        const data = {
          name, kind: input.kind, categoryId: category.id, description: input.description.trim().slice(0, 300),
          ingredients: input.ingredients.map((x) => x.trim().toLowerCase()).filter(Boolean).slice(0, 20),
          photoUrl: input.photoUrl, prices: { ...input.prices }, paused: input.paused,
        };
        if (flavorId) {
          const f = state.flavors.find((x) => x.id === flavorId);
          if (!f) throw fail(404, "NOT_FOUND", "Sabor não encontrado.");
          Object.assign(f, data);
        } else {
          flavorId = newId();
          state.flavors.push({ id: flavorId, ...data });
        }
        save();
        return flavorId;
      },
      async saveProduct(productId, input) {
        requireAdmin();
        const name = input.name.trim().slice(0, 60);
        if (!name) throw fail(400, "VALIDATION", "Informe o nome do produto.");
        if (!Number.isInteger(input.priceCents) || input.priceCents <= 0) throw fail(400, "VALIDATION", "Informe o preço.");
        const category = state.categories.find((c) => c.kind === "drink");
        const data = { name, description: input.description.trim().slice(0, 300), priceCents: input.priceCents, photoUrl: input.photoUrl, paused: input.paused };
        if (productId) {
          const p = state.products.find((x) => x.id === productId);
          if (!p) throw fail(404, "NOT_FOUND", "Produto não encontrado.");
          Object.assign(p, data);
        } else {
          productId = newId();
          state.products.push({ id: productId, categoryId: category?.id ?? "", ...data });
        }
        save();
        return productId;
      },
      async saveExtra(kind, extraId, input) {
        requireAdmin();
        const name = input.name.trim().slice(0, 60);
        if (!name) throw fail(400, "VALIDATION", "Informe o nome.");
        if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw fail(400, "VALIDATION", "Preço inválido.");
        const list = state[kind];
        if (extraId) {
          const x = list.find((e) => e.id === extraId);
          if (!x) throw fail(404, "NOT_FOUND", "Item não encontrado.");
          Object.assign(x, { name, priceCents: input.priceCents, paused: input.paused });
        } else {
          extraId = newId();
          list.push({ id: extraId, name, priceCents: input.priceCents, paused: input.paused });
        }
        save();
        return extraId;
      },
      async removeItem(kind, itemId) {
        requireAdmin();
        // Pedidos já feitos guardam uma cópia do item, então nada se perde.
        const list = state[kind] as Array<{ id: string }>;
        const i = list.findIndex((x) => x.id === itemId);
        if (i < 0) throw fail(404, "NOT_FOUND", "Item não encontrado.");
        list.splice(i, 1);
        if (kind === "flavors") state.promotions = state.promotions.filter((p) => p.flavorId !== itemId);
        save();
      },
      async settings(): Promise<AdminSettings> {
        requireAdmin();
        const s = state.store;
        return clone({
          name: s.name, story: s.story, addressText: s.addressText, phone: s.phone, radiusKm: s.radiusKm, bands: state.bands,
          minOrderCents: s.minOrderCents, freeShippingAboveCents: s.freeShippingAboveCents, estDelivery: s.estDelivery, estPickup: s.estPickup,
          pixExpiryMinutes: s.pixExpiryMinutes, botWebhookUrl: s.botWebhookUrl, hours: state.hours, theme: s.theme, openMode: s.openMode,
        });
      },
      async updateSettings(patch) {
        requireAdmin();
        await wait(200);
        const s = state.store;
        const radius = patch.radiusKm ?? s.radiusKm;
        const bands = patch.bands ?? state.bands;
        if (patch.radiusKm !== undefined || patch.bands) {
          const problems = validateFeeBands(bands, radius);
          if (problems.length) throw fail(400, "VALIDATION", problems[0] ?? "Faixas inválidas.");
        }
        for (const r of [patch.estDelivery, patch.estPickup]) {
          if (r && !(r.min > 0 && r.min <= r.max)) throw fail(400, "VALIDATION", "O tempo mínimo deve ser menor ou igual ao máximo.");
        }
        if (patch.pixExpiryMinutes !== undefined && !(patch.pixExpiryMinutes >= 5 && patch.pixExpiryMinutes <= 60)) {
          throw fail(400, "VALIDATION", "O prazo do PIX deve ficar entre 5 e 60 minutos.");
        }
        if (patch.theme) {
          const t = resolveTheme(patch.theme);
          if (t.preset !== patch.theme.preset || !canSaveTheme(t.tokens)) throw fail(400, "VALIDATION", "Essas cores ficam ilegíveis. Ajuste antes de salvar.");
        }
        if (patch.name !== undefined && !patch.name.trim()) throw fail(400, "VALIDATION", "Informe o nome da pizzaria.");
        if (patch.botWebhookUrl && !/^https:\/\//.test(patch.botWebhookUrl)) throw fail(400, "VALIDATION", "A URL do bot precisa começar com https://");
        Object.assign(s, {
          ...(patch.name !== undefined && { name: patch.name.trim().slice(0, 80) }),
          ...(patch.story !== undefined && { story: patch.story.slice(0, 4000) }),
          ...(patch.addressText !== undefined && { addressText: patch.addressText.slice(0, 200) }),
          ...(patch.phone !== undefined && { phone: patch.phone.slice(0, 20) }),
          ...(patch.radiusKm !== undefined && { radiusKm: patch.radiusKm }),
          ...(patch.minOrderCents !== undefined && { minOrderCents: patch.minOrderCents }),
          ...(patch.freeShippingAboveCents !== undefined && { freeShippingAboveCents: patch.freeShippingAboveCents }),
          ...(patch.estDelivery && { estDelivery: patch.estDelivery }),
          ...(patch.estPickup && { estPickup: patch.estPickup }),
          ...(patch.pixExpiryMinutes !== undefined && { pixExpiryMinutes: patch.pixExpiryMinutes }),
          ...(patch.botWebhookUrl !== undefined && { botWebhookUrl: patch.botWebhookUrl }),
          ...(patch.theme && { theme: patch.theme }),
          ...(patch.openMode && { openMode: patch.openMode }),
        });
        if (patch.bands) state.bands = [...patch.bands].sort((a, b) => a.fromKm - b.fromKm);
        if (patch.hours) state.hours = patch.hours;
        save();
      },
      async anonymizeByPhone(phone) {
        requireAdmin();
        const digits = phone.replace(/\D/g, "");
        let n = 0;
        for (const o of state.orders) {
          if (digits && o.customerPhone === digits) {
            o.customerName = "Cliente removido";
            o.customerFirstName = "Cliente";
            o.customerPhone = "";
            o.address = null;
            o.distanceKm = null;
            n++;
          }
        }
        save();
        return n;
      },
      async resetDemo() {
        requireAdmin();
        await wait(300);
        state = seedState();
        save();
      },
    },
  };
  return backend;
}
