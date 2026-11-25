// Contrato entre as telas e o servidor. As telas só conhecem esta interface.
// Hoje existe a implementação local (modo vitrine, roda no navegador); a implementação HTTP,
// que fala com a função `api` do Supabase, entra nas próximas fases sem mudar as telas.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { FeeBand } from "@shared/domain/delivery.ts";
import type { OpeningHour, StoreStatus } from "@shared/domain/hours.ts";
import type { Fulfillment, OrderStatus } from "@shared/domain/orderStatus.ts";
import type { CartItemInput, FlavorKind, PricedItem } from "@shared/domain/pricing.ts";
import type { AddressInput } from "@shared/domain/schemas.ts";
import type { PresetId, ThemeSetting, ThemeTokens } from "@shared/domain/theme.ts";

export type OpenMode = "horarios" | "aberta" | "fechada";
export type PaymentMethod = "pix" | "cash" | "card_on_delivery";
export type PaymentStatus = "pending" | "paid" | "expired" | "due_on_delivery" | "refunded" | "partially_refunded";

export interface StoreResponse {
  store: {
    name: string;
    logoUrl: string | null;
    story: string;
    phone: string | null;
    whatsapp: string | null;
    social: Record<string, string>;
    addressText: string;
    location: { lat: number; lng: number } | null;
    isDemo: boolean;
  };
  hours: OpeningHour[];
  status: StoreStatus & { text: string };
  delivery: {
    radiusKm: number;
    bands: FeeBand[];
    minOrderCents: number | null;
    freeShippingAboveCents: number | null;
    estimate: { delivery: { min: number; max: number }; pickup: { min: number; max: number } };
  };
  payment: { pixExpiryMinutes: number };
  theme: { preset: PresetId | "personalizada"; tokens: ThemeTokens };
  consent: { text: string; version: number };
  privacyPolicyVersion: number;
}

export interface MenuFlavor {
  id: string;
  categoryId: string;
  kind: FlavorKind;
  name: string;
  description: string;
  ingredients: string[];
  photoUrl: string | null;
  paused: boolean;
  prices: Record<string, number>;
}

export interface MenuResponse {
  sizes: { id: string; name: string; slices: number; maxFlavors: number }[];
  categories: { id: string; name: string; kind: string }[];
  flavors: MenuFlavor[];
  promotions: { flavorId: string; sizeId: string; listCents: number; promoCents: number; photoUrl: string | null }[];
  crusts: { id: string; name: string; priceCents: number; paused: boolean }[];
  addons: { id: string; name: string; priceCents: number; paused: boolean }[];
  products: { id: string; categoryId: string; name: string; description: string; priceCents: number; photoUrl: string | null; paused: boolean }[];
}

export type DeliveryQuoteResponse =
  | { ok: true; distanceKm: number; feeCents: number; bandFeeCents: number; freeShipping: boolean; missingForFreeCents: number | null }
  | { ok: false; reason: "OUT_OF_AREA"; distanceKm: number; radiusKm: number }
  | { ok: false; reason: "NOT_FOUND" };

export interface CepResult {
  street: string;
  district: string;
  city: string;
  uf: string;
}

export interface CreateOrderRequest {
  idempotencyKey: string;
  items: CartItemInput[];
  fulfillment: Fulfillment;
  customer: { name: string; phone: string };
  address?: Omit<AddressInput, "complement"> & { complement?: string };
  paymentMethod: PaymentMethod;
  cashChangeForCents?: number;
  notes?: string;
  consent: true;
  consentTextVersion: number;
  turnstileToken: string;
}

export interface OrderView {
  code: string;
  number: number;
  status: OrderStatus;
  fulfillment: Fulfillment;
  createdAt: string;
  items: PricedItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashChangeForCents: number | null;
  estimate: { min: number; max: number };
  history: { to: OrderStatus; at: string }[];
  pix: { code: string; expiresAt: string } | null;
  customerFirstName: string;
  cancelReason: string | null;
}

export interface AdminOrder extends OrderView {
  id: string;
  customerName: string;
  customerPhone: string;
  address: (AddressInput & { complement: string }) | null;
  distanceKm: number | null;
  notes: string;
  refundedCents: number;
  consentWhatsapp: boolean;
  isSample: boolean;
}

export interface DashboardData {
  today: { orders: number; revenueCents: number };
  month: { orders: number; revenueCents: number; avgTicketCents: number };
  topFlavors: { name: string; qty: number }[];
  byStatus: Partial<Record<OrderStatus, number>>;
}

export interface AdminSettings {
  name: string;
  story: string;
  addressText: string;
  phone: string;
  radiusKm: number;
  bands: FeeBand[];
  minOrderCents: number | null;
  freeShippingAboveCents: number | null;
  estDelivery: { min: number; max: number };
  estPickup: { min: number; max: number };
  pixExpiryMinutes: number;
  botWebhookUrl: string;
  hours: OpeningHour[];
  theme: ThemeSetting;
  openMode: OpenMode;
}

export interface AdminMenuPromotion {
  flavorId: string;
  sizeId: string;
  kind: "percent" | "manual";
  percent: number | null;
  priceCents: number | null;
  active: boolean;
  /** foto própria da promoção; sem foto, usa a do sabor */
  photoUrl?: string | null;
}

export interface FlavorInput {
  name: string;
  kind: FlavorKind;
  description: string;
  ingredients: string[];
  photoUrl: string | null;
  prices: Record<string, number>;
  paused: boolean;
}

export interface ProductInput {
  name: string;
  description: string;
  priceCents: number;
  photoUrl: string | null;
  paused: boolean;
}

export interface ExtraInput {
  name: string;
  priceCents: number;
  paused: boolean;
}

export type MenuKind = "flavors" | "crusts" | "addons" | "products";

export interface AdminApi {
  me(): Promise<{ email: string } | null>;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  listOrders(): Promise<AdminOrder[]>;
  advance(id: string): Promise<void>;
  cancel(id: string, reason: string): Promise<void>;
  refund(id: string, amountCents: number): Promise<void>;
  markPaid(id: string): Promise<void>;
  dashboard(): Promise<DashboardData>;
  promotions(): Promise<AdminMenuPromotion[]>;
  updateFlavor(id: string, patch: { paused?: boolean; prices?: Record<string, number> }): Promise<void>;
  updateExtra(kind: "crusts" | "addons" | "products", id: string, patch: { paused?: boolean; priceCents?: number }): Promise<void>;
  setPromotion(promo: AdminMenuPromotion): Promise<void>;
  removePromotion(flavorId: string, sizeId: string): Promise<void>;
  saveFlavor(id: string | null, input: FlavorInput): Promise<string>;
  saveProduct(id: string | null, input: ProductInput): Promise<string>;
  saveExtra(kind: "crusts" | "addons", id: string | null, input: ExtraInput): Promise<string>;
  removeItem(kind: MenuKind, id: string): Promise<void>;
  settings(): Promise<AdminSettings>;
  updateSettings(patch: Partial<AdminSettings>): Promise<void>;
  anonymizeByPhone(phone: string): Promise<number>;
  resetDemo(): Promise<void>;
}

export interface Backend {
  mode: "local" | "http";
  getStore(): Promise<StoreResponse>;
  getMenu(): Promise<MenuResponse>;
  getPrivacyPolicy(): Promise<{ text: string; version: number }>;
  lookupCep(cep: string): Promise<CepResult | null>;
  quoteDelivery(input: { cep: string; number: string; subtotalCents: number }): Promise<DeliveryQuoteResponse>;
  createOrder(input: CreateOrderRequest): Promise<{ number: number; code: string }>;
  getOrder(code: string): Promise<OrderView>;
  retryPix(code: string): Promise<{ number: number; code: string }>;
  /** Só na demonstração: simula o aviso de pagamento do gateway. */
  simulatePixPayment?(code: string): Promise<void>;
  admin: AdminApi;
  /** Avisa quando os dados mudaram (outra aba, painel do dono). */
  subscribe(listener: () => void): () => void;
}

export const BackendContext = createContext<Backend | null>(null);

export function useBackend(): Backend {
  const b = useContext(BackendContext);
  if (!b) throw new Error("BackendContext ausente");
  return b;
}

/** Carrega dados e recarrega quando o backend avisa mudança (e, opcionalmente, a cada pollMs). */
export function useData<T>(load: () => Promise<T>, deps: unknown[], pollMs?: number) {
  const backend = useBackend();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>();
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(() => {
    loadRef.current().then(
      (d) => {
        setData(d);
        setError(undefined);
      },
      (e: unknown) => setError(e),
    );
  }, []);

  useEffect(() => {
    reload();
    const off = backend.subscribe(reload);
    const t = pollMs ? setInterval(reload, pollMs) : undefined;
    return () => {
      off();
      if (t) clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, reload, pollMs, ...deps]);

  return { data, error, loading: data === undefined && error === undefined, reload };
}
