// Dados de demonstração da vitrine: os mesmos de supabase/seed/demo.sql (cardápio, preços,
// horários, faixas, paletas), mais alguns pedidos de exemplo para o painel não começar vazio.
import { priceCart, type Catalog, type CartItemInput } from "@shared/domain/pricing.ts";
import type { OpeningHour } from "@shared/domain/hours.ts";
import type { FeeBand } from "@shared/domain/delivery.ts";
import type { ThemeSetting } from "@shared/domain/theme.ts";
import type { AdminMenuPromotion, AdminOrder, MenuFlavor, MenuResponse, OpenMode } from "../lib/backend.ts";

export interface StoredOrder extends AdminOrder {
  idempotencyKey: string;
}

export interface DemoState {
  v: 3;
  store: {
    name: string;
    logoUrl: string;
    story: string;
    phone: string;
    whatsapp: string | null;
    addressText: string;
    lat: number;
    lng: number;
    radiusKm: number;
    minOrderCents: number | null;
    freeShippingAboveCents: number | null;
    estDelivery: { min: number; max: number };
    estPickup: { min: number; max: number };
    pixExpiryMinutes: number;
    botWebhookUrl: string;
    theme: ThemeSetting;
    consentText: string;
    consentTextVersion: number;
    privacyText: string;
    privacyVersion: number;
    openMode: OpenMode;
    timezone: string;
  };
  hours: OpeningHour[];
  bands: FeeBand[];
  sizes: MenuResponse["sizes"];
  categories: MenuResponse["categories"];
  flavors: MenuFlavor[];
  promotions: AdminMenuPromotion[];
  crusts: MenuResponse["crusts"];
  addons: MenuResponse["addons"];
  products: MenuResponse["products"];
  orders: StoredOrder[];
  nextNumber: number;
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const BROTO = id(201);
export const GRANDE = id(202);
const SALGADAS = id(101);
const DOCES = id(102);
const BEBIDAS = id(103);

const PRIVACY = `MODELO DE POLÍTICA DE PRIVACIDADE · PRECISA DE REVISÃO JURÍDICA ANTES DE USO REAL

1. Quem somos
[Nome da pizzaria], [CNPJ], [endereço], é a responsável (controladora) pelos dados pessoais tratados neste site.

2. Quais dados coletamos e para quê
- Nome, telefone e endereço: para preparar, entregar e falar com você sobre o pedido.
- Telefone e aceite de mensagens: para enviar atualizações do pedido pelo WhatsApp.
- Dados do pagamento PIX (identificador, situação e valor): para confirmar e, se preciso, devolver o pagamento. Não recebemos nem guardamos dados de cartão.
- Dados técnicos (endereço IP e informações do navegador): para segurança e para evitar abuso, guardados de forma cifrada e por pouco tempo.

3. Com quem compartilhamos
Usamos serviços de terceiros para o site funcionar: hospedagem (Vercel e Supabase), pagamento (Mercado Pago), proteção contra robôs (Cloudflare Turnstile), conversão do endereço em localização (OpenStreetMap/Nominatim) e consulta de CEP. Se houver atendimento por WhatsApp, o seu nome e telefone também vão para esse serviço. Alguns desses serviços podem tratar dados fora do Brasil.

4. Por quanto tempo guardamos
[Defina o prazo. Hoje os dados dos pedidos ficam guardados sem prazo automático; você pode pedir a exclusão a qualquer momento.]

5. Seus direitos
Você pode pedir confirmação, acesso, correção, exclusão ou anonimização dos seus dados pelo contato: [e-mail ou telefone]. Responderemos nos prazos da LGPD.

6. Cookies e armazenamento no aparelho
Não usamos cookies de análise nem de publicidade. O carrinho fica guardado no seu próprio aparelho, e o painel do dono usa um cookie de sessão necessário para funcionar.

Última atualização: [data].`;

export function catalogOf(s: Pick<DemoState, "sizes" | "flavors" | "crusts" | "addons" | "products" | "promotions">): Catalog {
  return {
    sizes: s.sizes.map((x) => ({ ...x, active: true })),
    flavors: s.flavors.map((f) => ({ id: f.id, name: f.name, kind: f.kind, ingredients: f.ingredients, prices: f.prices, paused: f.paused, active: true })),
    crusts: s.crusts.map((x) => ({ ...x, active: true })),
    addons: s.addons.map((x) => ({ ...x, active: true })),
    products: s.products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, paused: p.paused, active: true })),
    promotions: s.promotions,
  };
}

export function seedState(now = new Date()): DemoState {
  const flavor = (n: number, cat: string, kind: MenuFlavor["kind"], name: string, description: string, ingredients: string[], photo: string, broto: number, grande: number): MenuFlavor => ({
    id: id(n), categoryId: cat, kind, name, description, ingredients, photoUrl: photo, paused: false, prices: { [BROTO]: broto, [GRANDE]: grande },
  });
  const state: DemoState = {
    v: 3,
    store: {
      name: "Forno Bella Pizzeria",
      logoUrl: "brand/logo.png",
      story:
        "Nascemos da paixão pela pizza napolitana feita sem pressa: massa de fermentação lenta, molho de tomate de verdade e o calor do forno a lenha. Cada pizza sai do forno do jeito que a nonna ensinou. Buon appetito!",
      phone: "(11) 4000-0000",
      whatsapp: null,
      addressText: "Rua de Exemplo, 123 · Centro · São Paulo/SP",
      lat: -23.55052,
      lng: -46.633308,
      radiusKm: 8,
      minOrderCents: null,
      freeShippingAboveCents: 12000,
      estDelivery: { min: 40, max: 60 },
      estPickup: { min: 20, max: 30 },
      pixExpiryMinutes: 15,
      botWebhookUrl: "",
      theme: { preset: "forno-a-lenha" },
      consentText:
        "Concordo com o uso dos meus dados (nome, telefone e endereço) para preparar e entregar este pedido, conforme a Política de privacidade, e aceito receber atualizações do pedido pelo WhatsApp.",
      consentTextVersion: 1,
      privacyText: PRIVACY,
      privacyVersion: 1,
      openMode: "aberta",
      timezone: "America/Sao_Paulo",
    },
    hours: [
      { weekday: 0, opens: "17:00", closes: "23:00", closed: false },
      { weekday: 1, opens: "18:00", closes: "23:00", closed: false },
      { weekday: 2, opens: "18:00", closes: "23:00", closed: false },
      { weekday: 3, opens: "18:00", closes: "23:00", closed: false },
      { weekday: 4, opens: "18:00", closes: "23:00", closed: false },
      { weekday: 5, opens: "18:00", closes: "00:00", closed: false },
      { weekday: 6, opens: "18:00", closes: "00:00", closed: false },
    ],
    bands: [
      { fromKm: 0, toKm: 3, feeCents: 500 },
      { fromKm: 3, toKm: 6, feeCents: 800 },
      { fromKm: 6, toKm: 8, feeCents: 1200 },
    ],
    sizes: [
      { id: BROTO, name: "Broto", slices: 4, maxFlavors: 1 },
      { id: GRANDE, name: "Grande", slices: 8, maxFlavors: 3 },
    ],
    categories: [
      { id: SALGADAS, name: "Pizzas salgadas", kind: "pizza_salgada" },
      { id: DOCES, name: "Pizzas doces", kind: "pizza_doce" },
      { id: BEBIDAS, name: "Bebidas", kind: "drink" },
    ],
    flavors: [
      flavor(301, SALGADAS, "pizza_salgada", "Margherita", "Molho de tomate, muçarela e manjericão.", ["molho de tomate", "muçarela", "manjericão"], "demo/pizza-salgada.webp", 3290, 5290),
      flavor(302, SALGADAS, "pizza_salgada", "Pepperoni", "Pepperoni, muçarela e orégano.", ["pepperoni", "muçarela", "orégano"], "demo/pizza-pepperoni.webp", 3690, 5690),
      flavor(303, SALGADAS, "pizza_salgada", "Calabresa", "Calabresa fatiada, cebola e muçarela.", ["calabresa", "cebola", "muçarela"], "demo/pizza-salgada.webp", 3490, 5490),
      flavor(304, SALGADAS, "pizza_salgada", "Quatro Queijos", "Muçarela, provolone, gorgonzola e parmesão.", ["muçarela", "provolone", "gorgonzola", "parmesão"], "demo/pizza-salgada.webp", 3890, 5890),
      flavor(305, DOCES, "pizza_doce", "Chocolate com Morango", "Creme de chocolate e morangos frescos.", ["creme de chocolate", "morango"], "demo/pizza-doce.webp", 2990, 4990),
      flavor(306, DOCES, "pizza_doce", "Banana com Canela", "Banana, canela e açúcar.", ["banana", "canela", "açúcar"], "demo/pizza-doce.webp", 2790, 4790),
    ],
    promotions: [
      { flavorId: id(301), sizeId: GRANDE, kind: "manual", percent: null, priceCents: 4490, active: true },
      { flavorId: id(302), sizeId: GRANDE, kind: "manual", percent: null, priceCents: 4790, active: true },
      { flavorId: id(305), sizeId: GRANDE, kind: "manual", percent: null, priceCents: 4190, active: true },
      { flavorId: id(304), sizeId: GRANDE, kind: "manual", percent: null, priceCents: 4990, active: true },
      { flavorId: id(306), sizeId: GRANDE, kind: "percent", percent: 20, priceCents: null, active: true },
    ],
    crusts: [
      { id: id(401), name: "Catupiry", priceCents: 990, paused: false },
      { id: id(402), name: "Cheddar", priceCents: 990, paused: false },
      { id: id(403), name: "Chocolate", priceCents: 1190, paused: false },
    ],
    addons: [
      { id: id(501), name: "Bacon", priceCents: 600, paused: false },
      { id: id(502), name: "Azeitonas", priceCents: 400, paused: false },
      { id: id(503), name: "Cebola caramelizada", priceCents: 500, paused: false },
      { id: id(504), name: "Muçarela extra", priceCents: 700, paused: false },
    ],
    products: [
      { id: id(601), categoryId: BEBIDAS, name: "Refrigerante lata 350 ml", description: "Vários sabores. Consulte na entrega.", priceCents: 800, photoUrl: "demo/bebida-generica.webp", paused: false },
      { id: id(602), categoryId: BEBIDAS, name: "Água mineral 500 ml", description: "Com ou sem gás.", priceCents: 500, photoUrl: "demo/bebida-generica.webp", paused: false },
      { id: id(603), categoryId: BEBIDAS, name: "Suco natural 500 ml", description: "Laranja ou limão, feito na hora.", priceCents: 1200, photoUrl: "demo/bebida-generica.webp", paused: false },
    ],
    orders: [],
    nextNumber: 1,
  };
  addSampleOrders(state, now);
  return state;
}

/** Pedidos de exemplo (nomes e telefones fictícios), marcados como isSample. */
function addSampleOrders(state: DemoState, now: Date): void {
  const catalog = catalogOf(state);
  const P = (sizeId: string, flavors: number[], extra: Partial<CartItemInput> = {}): CartItemInput =>
    ({ kind: "pizza", sizeId, flavorIds: flavors.map(id), quantity: 1, ...extra }) as CartItemInput;
  const D = (n: number, quantity = 1): CartItemInput => ({ kind: "product", productId: id(n), quantity });
  const samples: Array<{ ago: number; name: string; status: AdminOrder["status"]; f: "delivery" | "pickup"; pay: AdminOrder["paymentMethod"]; items: CartItemInput[] }> = [
    { ago: 9, name: "Marina Alves", status: "received", f: "delivery", pay: "pix", items: [P(GRANDE, [301, 303]), D(601, 2)] },
    { ago: 26, name: "Rafael Costa", status: "preparing", f: "pickup", pay: "cash", items: [P(GRANDE, [302], { crustId: id(401) })] },
    { ago: 55, name: "Juliana Prado", status: "delivered", f: "delivery", pay: "card_on_delivery", items: [P(BROTO, [305]), P(GRANDE, [304]), D(603)] },
    { ago: 60 * 26, name: "Bruno Teixeira", status: "delivered", f: "delivery", pay: "pix", items: [P(GRANDE, [301, 302, 304])] },
    { ago: 60 * 27, name: "Camila Rocha", status: "delivered", f: "pickup", pay: "cash", items: [P(GRANDE, [306]), D(602, 2)] },
    { ago: 60 * 50, name: "Diego Martins", status: "delivered", f: "delivery", pay: "pix", items: [P(GRANDE, [303], { addonIds: [id(501)] }), D(601)] },
    { ago: 60 * 74, name: "Patrícia Lima", status: "cancelled", f: "delivery", pay: "card_on_delivery", items: [P(BROTO, [301])] },
    { ago: 60 * 98, name: "Lucas Fernandes", status: "delivered", f: "delivery", pay: "pix", items: [P(GRANDE, [302, 303]), P(GRANDE, [305])] },
  ];
  samples.reverse().forEach((s, i) => {
    const priced = priceCart(catalog, s.items);
    if (!priced.ok) return;
    const created = new Date(now.getTime() - s.ago * 60000).toISOString();
    const fee = s.f === "delivery" ? (priced.subtotalCents >= 12000 ? 0 : 800) : 0;
    const number = state.nextNumber++;
    state.orders.push({
      id: `sample-${i}`,
      idempotencyKey: `sample-${i}`,
      code: String(number),
      number,
      status: s.status,
      fulfillment: s.f,
      createdAt: created,
      items: priced.items,
      subtotalCents: priced.subtotalCents,
      deliveryFeeCents: fee,
      totalCents: priced.subtotalCents + fee,
      paymentMethod: s.pay,
      paymentStatus: s.pay === "pix" ? "paid" : s.status === "delivered" ? "paid" : "due_on_delivery",
      cashChangeForCents: s.pay === "cash" ? Math.ceil((priced.subtotalCents + fee) / 5000) * 5000 : null,
      estimate: s.f === "delivery" ? state.store.estDelivery : state.store.estPickup,
      history: [{ to: s.status === "received" ? "received" : s.status, at: created }],
      pix: null,
      customerFirstName: s.name.split(" ")[0] ?? s.name,
      cancelReason: s.status === "cancelled" ? "Cliente desistiu do pedido" : null,
      customerName: s.name,
      customerPhone: `119000000${String(i + 10)}`,
      address: s.f === "delivery" ? { cep: "01001000", street: "Rua de Exemplo", number: String(40 + i * 7), complement: "", district: "Centro", city: "São Paulo", uf: "SP" } : null,
      distanceKm: s.f === "delivery" ? 3.4 : null,
      notes: i === 7 ? "Interfone com defeito, por favor ligar ao chegar." : "",
      refundedCents: 0,
      consentWhatsapp: true,
      isSample: true,
    });
  });
}
