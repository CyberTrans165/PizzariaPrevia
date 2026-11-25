// Acompanhamento do pedido por link (ETAPA 5) e tela do PIX (ETAPA 8).
// Atualiza sozinho: consulta o servidor a cada poucos segundos e ouve mudanças do painel.
import { useEffect, useMemo, useState } from "react";
import { customerTimeline, STATUS_LABELS } from "@shared/domain/orderStatus.ts";
import { useBackend, useData, type OrderView, type StoreResponse } from "../lib/backend.ts";
import { clockTime, formatBRL, orderNumber } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { Icon, errorText, useToast } from "../ui/ui.tsx";
import { itemDetails, itemTitle } from "./describe.ts";

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const PAY_LABEL = { pix: "PIX", cash: "Dinheiro na entrega", card_on_delivery: "Cartão na maquininha" } as const;

export function OrderPage({ code, store }: { code: string; store: StoreResponse }) {
  const backend = useBackend();
  const { data: order, error } = useData(() => backend.getOrder(code), [code], 3000);
  if (error) {
    return (
      <main className="wrap order-page">
        <h1>Pedido não encontrado</h1>
        <p className="muted">Confira o link que você recebeu.</p>
        <button className="btn btn-primary" onClick={() => navigate("")}>Voltar ao cardápio</button>
      </main>
    );
  }
  if (!order) return <main className="wrap order-page"><p className="muted" role="status">Carregando o pedido…</p></main>;
  return (
    <main className="wrap order-page">
      {order.status === "awaiting_payment" || (order.status === "expired" && order.paymentMethod === "pix") ? <PixPanel order={order} /> : <StatusPanel order={order} store={store} />}
      <OrderSummary order={order} />
      {store.store.isDemo && (
        <p className="demo-tip">
          <Icon name="ext" size={16} /> Para ver o outro lado, abra o <a href="#admin" className="link">painel do dono</a> em outra aba. Cada mudança de status aparece aqui em poucos segundos.
        </p>
      )}
      <button className="btn btn-ghost" onClick={() => navigate("")}>Voltar ao cardápio</button>
    </main>
  );
}

function StatusPanel({ order, store }: { order: OrderView; store: StoreResponse }) {
  const t = customerTimeline(order.status, order.fulfillment);
  const last = order.history[order.history.length - 1];
  return (
    <section className="card status-card" aria-labelledby="t-status">
      <p className="eyebrow">Pedido {orderNumber(order.number)}</p>
      <h1 id="t-status">
        {t.ended === "cancelled" ? "Pedido cancelado" : t.ended === "expired" ? "Pagamento não concluído" : order.status === "delivered" ? "Pedido entregue. Buon appetito!" : `Recebemos o seu pedido, ${order.customerFirstName}!`}
      </h1>
      {t.ended === "cancelled" ? (
        <p className="banner-error">
          {order.cancelReason ? `Motivo: ${order.cancelReason}. ` : ""}
          {order.paymentMethod === "pix" && order.paymentStatus !== "pending" ? "O reembolso do PIX é feito pela pizzaria." : "Se tiver dúvidas, fale com a pizzaria."}
        </p>
      ) : (
        <>
          <ol className="timeline" aria-label="Andamento do pedido">
            {t.steps.map((s, i) => (
              <li key={s.label} className={s.state} aria-current={s.state === "current" ? "step" : undefined}>
                <span className="dot">{s.state === "done" ? <Icon name="check" size={14} /> : i + 1}</span>
                <span>{s.label}</span>
              </li>
            ))}
          </ol>
          {order.status !== "delivered" && (
            <p className="hint"><Icon name="clock" size={16} /> {order.fulfillment === "delivery" ? "Entrega" : "Retirada"} estimada em {order.estimate.min} a {order.estimate.max} minutos.</p>
          )}
          {order.fulfillment === "pickup" && <p className="hint"><Icon name="pin" size={16} /> Retire em: {store.store.addressText}</p>}
        </>
      )}
      {last && <p className="small muted">Última atualização: {STATUS_LABELS[last.to]} às {clockTime(last.at)}</p>}
    </section>
  );
}

/** QR de demonstração: só o desenho, sem valor de pagamento. */
function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 25;
    let h = 2166136261;
    const out: Array<[number, number]> = [];
    const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        h = Math.imul(h ^ (seed.charCodeAt((x + y * n) % seed.length) + x * 7 + y * 13), 16777619);
        if (!finder(x, y) && (h >>> 0) % 100 < 46) out.push([x, y]);
      }
    }
    return out;
  }, [seed]);
  const box = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#111" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#111" />
    </g>
  );
  return (
    <svg className="qr" viewBox="-2 -2 29 29" role="img" aria-label="QR code de demonstração, sem valor">
      <rect x={-2} y={-2} width={29} height={29} fill="#fff" />
      {cells.map(([x, y]) => <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill="#111" />)}
      {box(0, 0)}
      {box(18, 0)}
      {box(0, 18)}
    </svg>
  );
}

function PixPanel({ order }: { order: OrderView }) {
  const backend = useBackend();
  const toast = useToast();
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const expired = order.status === "expired";
  const left = order.pix ? Math.max(0, new Date(order.pix.expiresAt).getTime() - now) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.pix?.code ?? "");
      toast("Código copiado");
    } catch {
      toast("Selecione o código e copie", "info");
    }
  };
  const simulate = async () => {
    setBusy(true);
    try {
      await backend.simulatePixPayment?.(order.code);
      toast("Pagamento confirmado");
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  };
  const retry = async () => {
    setBusy(true);
    try {
      const r = await backend.retryPix(order.code);
      navigate(`pedido-${r.code}`);
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (expired || left === 0) {
    return (
      <section className="card status-card">
        <p className="eyebrow">Pedido {orderNumber(order.number)}</p>
        <h1>O prazo do PIX acabou</h1>
        <p className="muted">O pedido não foi para a cozinha. Você pode gerar um novo PIX com os mesmos itens.</p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={retry} disabled={busy}>Gerar novo PIX</button>
          <button className="btn btn-ghost" onClick={() => navigate("")}>Voltar ao cardápio</button>
        </div>
      </section>
    );
  }
  return (
    <section className="card pix-card" aria-labelledby="t-pix">
      <p className="eyebrow">Pedido {orderNumber(order.number)} · aguardando pagamento</p>
      <h1 id="t-pix">Pague {formatBRL(order.totalCents)} com PIX</h1>
      <div className="pix-grid">
        <FakeQr seed={order.pix?.code ?? order.code} />
        <div className="pix-side">
          <p className="countdown" aria-live="off">Expira em <strong>{mm}:{ss}</strong></p>
          <label className="field">
            <span>PIX copia e cola</span>
            <textarea readOnly rows={3} value={order.pix?.code ?? ""} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <button className="btn btn-gold-outline" onClick={copy}><Icon name="copy" size={18} /> Copiar código</button>
          <p className="small muted">Assim que o pagamento for confirmado, o pedido vai para a cozinha e esta tela muda sozinha.</p>
        </div>
      </div>
      <div className="demo-box">
        <strong>PIX de demonstração: não pague.</strong>
        <span>Na versão instalada, o QR é do Mercado Pago e a confirmação chega sozinha. Aqui, simule:</span>
        <button className="btn btn-primary" onClick={simulate} disabled={busy} data-testid="simulate-pix">Simular pagamento aprovado</button>
      </div>
    </section>
  );
}

function OrderSummary({ order }: { order: OrderView }) {
  return (
    <section className="card summary-card" aria-labelledby="t-sum">
      <h2 id="t-sum">Resumo</h2>
      <ul className="summary-list">
        {order.items.map((it, i) => (
          <li key={i}>
            <div>
              <strong>{it.quantity}× {itemTitle(it)}</strong>
              {itemDetails(it).map((d) => <span key={d} className="small muted">{d}</span>)}
            </div>
            <span>{formatBRL(it.totalCents)}</span>
          </li>
        ))}
      </ul>
      <div className="total-row"><span>Itens</span><span>{formatBRL(order.subtotalCents)}</span></div>
      {order.fulfillment === "delivery" && <div className="total-row"><span>Entrega</span><span>{order.deliveryFeeCents ? formatBRL(order.deliveryFeeCents) : "Grátis"}</span></div>}
      <div className="total-row grand"><span>Total</span><strong>{formatBRL(order.totalCents)}</strong></div>
      <p className="small muted">
        Pagamento: {PAY_LABEL[order.paymentMethod]}
        {order.cashChangeForCents ? ` · troco para ${formatBRL(order.cashChangeForCents)}` : ""}
        {order.paymentStatus === "paid" ? " · pago" : ""}
      </p>
    </section>
  );
}
