import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES, canCancel, canTransition, customerTimeline, nextOwnerStep,
  type Fulfillment, type OrderStatus,
} from "./orderStatus.ts";

function walk(start: OrderStatus, f: Fulfillment): OrderStatus[] {
  const path: OrderStatus[] = [start];
  let s = start;
  for (let step = nextOwnerStep(s, f); step; step = nextOwnerStep(s, f)) {
    expect(canTransition(s, step.to, f, "owner")).toBe(true);
    s = step.to;
    path.push(s);
  }
  return path;
}

describe("fluxo de status", () => {
  it("S-01 entrega: recebido → confirmado → em preparo → saiu → entregue", () => {
    expect(walk("received", "delivery")).toEqual(["received", "confirmed", "preparing", "out_for_delivery", "delivered"]);
  });

  it("S-02 retirada termina em pronto para retirada → entregue", () => {
    expect(walk("received", "pickup")).toEqual(["received", "confirmed", "preparing", "ready_for_pickup", "delivered"]);
  });

  it("S-03 não dá para pular etapas nem trocar entrega por retirada", () => {
    expect(canTransition("received", "preparing", "delivery", "owner")).toBe(false);
    expect(canTransition("received", "delivered", "delivery", "owner")).toBe(false);
    expect(canTransition("preparing", "ready_for_pickup", "delivery", "owner")).toBe(false);
    expect(canTransition("preparing", "out_for_delivery", "pickup", "owner")).toBe(false);
  });

  it("S-04 cancelar é permitido até antes de entregue", () => {
    for (const s of ["received", "confirmed", "preparing", "out_for_delivery"] as const) {
      expect(canTransition(s, "cancelled", "delivery", "owner")).toBe(true);
      expect(canCancel(s)).toBe(true);
    }
    for (const s of ["delivered", "cancelled", "expired"] as const) {
      expect(canTransition(s, "cancelled", "delivery", "owner")).toBe(false);
      expect(canCancel(s)).toBe(false);
    }
  });

  it("PIX: só o gateway marca como pago e só o sistema expira", () => {
    expect(canTransition("awaiting_payment", "received", "delivery", "gateway")).toBe(true);
    expect(canTransition("awaiting_payment", "received", "delivery", "owner")).toBe(false);
    expect(canTransition("awaiting_payment", "expired", "delivery", "system")).toBe(true);
    expect(canTransition("awaiting_payment", "expired", "delivery", "owner")).toBe(false);
    expect(nextOwnerStep("awaiting_payment", "delivery")).toBeNull();
  });

  it("o cliente e o gateway não mudam pedidos da cozinha", () => {
    expect(canTransition("received", "confirmed", "delivery", "customer")).toBe(false);
    expect(canTransition("received", "confirmed", "delivery", "gateway")).toBe(false);
  });

  it("estados finais não têm próximo passo", () => {
    for (const s of ["delivered", "cancelled", "expired"] as const) expect(nextOwnerStep(s, "delivery")).toBeNull();
    expect(ORDER_STATUSES).toHaveLength(9);
  });
});

describe("linha do tempo do cliente", () => {
  it("mostra a etapa atual e as concluídas", () => {
    const t = customerTimeline("preparing", "delivery");
    expect(t.steps.map((s) => s.state)).toEqual(["done", "done", "current", "todo", "todo"]);
    expect(t.steps[3]?.label).toBe("Saiu para entrega");
  });

  it("retirada troca o rótulo da quarta etapa", () => {
    expect(customerTimeline("ready_for_pickup", "pickup").steps[3]).toEqual({ label: "Pronto para retirada", state: "current" });
  });

  it("entregue marca tudo como concluído; cancelado informa o fim", () => {
    expect(customerTimeline("delivered", "delivery").steps.every((s) => s.state === "done")).toBe(true);
    expect(customerTimeline("cancelled", "delivery").ended).toBe("cancelled");
  });
});
