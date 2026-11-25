// Status do pedido e transições permitidas (DATABASE.md §4, RN-05, RN-06).
// O servidor valida toda mudança com estas funções; não dá para pular etapas.

export const ORDER_STATUSES = [
  "awaiting_payment",
  "received",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "expired",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Fulfillment = "delivery" | "pickup";
export type Actor = "owner" | "system" | "gateway" | "customer";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  received: "Recebido",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Pronto para retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export const FINAL_STATUSES: ReadonlySet<OrderStatus> = new Set(["delivered", "cancelled", "expired"]);

/** Pedidos que a cozinha vê na fila (PIX não pago fica de fora). */
export const KITCHEN_STATUSES: ReadonlySet<OrderStatus> = new Set([
  "received",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
]);

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function allowedTransitions(from: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  switch (from) {
    case "awaiting_payment":
      return ["received", "expired", "cancelled"];
    case "received":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["preparing", "cancelled"];
    case "preparing":
      return [fulfillment === "delivery" ? "out_for_delivery" : "ready_for_pickup", "cancelled"];
    case "out_for_delivery":
    case "ready_for_pickup":
      return ["delivered", "cancelled"];
    default:
      return [];
  }
}

/** Quem pode fazer cada mudança: o gateway confirma o PIX, o sistema expira, o dono faz o resto. */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  fulfillment: Fulfillment,
  actor: Actor,
): boolean {
  if (!allowedTransitions(from, fulfillment).includes(to)) return false;
  if (from === "awaiting_payment") {
    if (to === "received") return actor === "gateway";
    if (to === "expired") return actor === "system";
    return actor === "owner" || actor === "system"; // cancelar PIX não pago
  }
  return actor === "owner";
}

export interface OwnerStep {
  to: OrderStatus;
  label: string;
}

/** Botão do "próximo passo" no ADM (ETAPA 9). */
export function nextOwnerStep(status: OrderStatus, fulfillment: Fulfillment): OwnerStep | null {
  switch (status) {
    case "received":
      return { to: "confirmed", label: "Confirmar" };
    case "confirmed":
      return { to: "preparing", label: "Iniciar preparo" };
    case "preparing":
      return fulfillment === "delivery"
        ? { to: "out_for_delivery", label: "Saiu para entrega" }
        : { to: "ready_for_pickup", label: "Pronto para retirada" };
    case "out_for_delivery":
    case "ready_for_pickup":
      return { to: "delivered", label: "Entregue" };
    default:
      return null;
  }
}

export function canCancel(status: OrderStatus): boolean {
  return !FINAL_STATUSES.has(status);
}

export interface TimelineStep {
  label: string;
  state: "done" | "current" | "todo";
}

/**
 * Linha do tempo da página de acompanhamento (5 etapas):
 * pedido criado → aguardando confirmação → em preparo → saiu para entrega / pronto para retirada → entregue.
 */
export function customerTimeline(
  status: OrderStatus,
  fulfillment: Fulfillment,
): { steps: TimelineStep[]; ended: "cancelled" | "expired" | null } {
  const labels = [
    "Pedido criado",
    "Aguardando confirmação",
    "Em preparo",
    fulfillment === "delivery" ? "Saiu para entrega" : "Pronto para retirada",
    "Entregue",
  ];
  const currentIndex: Record<OrderStatus, number> = {
    awaiting_payment: 0,
    received: 1,
    confirmed: 2,
    preparing: 2,
    out_for_delivery: 3,
    ready_for_pickup: 3,
    delivered: 5,
    cancelled: -1,
    expired: -1,
  };
  const idx = currentIndex[status];
  const steps = labels.map((label, i): TimelineStep => ({
    label,
    state: idx === -1 ? "todo" : i < idx ? "done" : i === idx ? "current" : "todo",
  }));
  return { steps, ended: status === "cancelled" || status === "expired" ? status : null };
}
