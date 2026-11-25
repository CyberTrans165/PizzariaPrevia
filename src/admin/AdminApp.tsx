// Painel do dono (ETAPA 9): login, pedidos quase em tempo real (consulta a cada ~5 s, ETAPA 11)
// com som e aviso, próximo passo, cancelar, reembolsar, comanda; início com o resumo.
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KITCHEN_STATUSES, STATUS_LABELS, canCancel, nextOwnerStep, type OrderStatus } from "@shared/domain/orderStatus.ts";
import { DEMO_LOGIN } from "../demo/localBackend.ts";
import { useBackend, useData, type AdminOrder } from "../lib/backend.ts";
import { clockTime, formatBRL, maskPhone, moneyInput, orderNumber, parseMoney, timeAgo } from "../lib/format.ts";
import { Icon, Sheet, errorText, useToast } from "../ui/ui.tsx";
import { itemDetails, itemTitle } from "../site/describe.ts";
import { Appearance, StoreSettings } from "./AdminConfig.tsx";
import { MenuAdmin, PromotionsAdmin } from "./MenuEditor.tsx";

type Tab = "pedidos" | "inicio" | "cardapio" | "promocoes" | "loja" | "aparencia";
const TABS: Array<[Tab, string, string]> = [
  ["pedidos", "Pedidos", "list"],
  ["inicio", "Início", "home"],
  ["cardapio", "Cardápio", "pizza"],
  ["promocoes", "Promoções", "star"],
  ["loja", "Loja", "gear"],
  ["aparencia", "Aparência", "palette"],
];

export default function AdminApp() {
  const backend = useBackend();
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined);
  const refresh = useCallback(() => backend.admin.me().then(setMe, () => setMe(null)), [backend]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  if (me === undefined) return <div className="adm"><p className="adm-pad">Carregando…</p></div>;
  if (!me) return <Login onDone={refresh} />;
  return <Shell onLogout={async () => { await backend.admin.logout(); refresh(); }} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const backend = useBackend();
  const demo = backend.mode === "local";
  const [email, setEmail] = useState(demo ? DEMO_LOGIN.email : "");
  const [password, setPassword] = useState(demo ? DEMO_LOGIN.password : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm adm-login">
      <form
        className="adm-card login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await backend.admin.login(email, password);
            onDone();
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Painel do dono</h1>
        <p className="adm-muted">Entre com o e-mail e a senha da pizzaria.</p>
        <label className="adm-field"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label className="adm-field"><span>Senha</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <button className="adm-btn primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        {demo && (
          <p className="adm-note">
            <strong>Acesso de demonstração</strong> já preenchido. Na versão instalada, a senha é conferida no servidor (guardada só como hash) e a sessão usa um cookie seguro.
          </p>
        )}
        <a className="adm-link" href="#">Voltar ao site</a>
      </form>
    </div>
  );
}

function useNewOrderAlert(orders: AdminOrder[] | undefined, onNew: (o: AdminOrder[]) => void) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders) return;
    const fresh = orders.filter((o) => o.status === "received");
    if (seen.current === null) {
      seen.current = new Set(fresh.map((o) => o.id));
      return;
    }
    const news = fresh.filter((o) => !seen.current?.has(o.id));
    news.forEach((o) => seen.current?.add(o.id));
    if (news.length) onNew(news);
  }, [orders, onNew]);
}

function beep(ctx: AudioContext) {
  const t = ctx.currentTime;
  [0, 0.22].forEach((d, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = i ? 1046 : 784;
    gain.gain.setValueAtTime(0.0001, t + d);
    gain.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + d);
    osc.stop(t + d + 0.22);
  });
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const backend = useBackend();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pedidos");
  const [audio, setAudio] = useState<AudioContext | null>(null);
  const [unseen, setUnseen] = useState(0);
  const orders = useData(() => backend.admin.listOrders(), [], 5000);

  const onNew = useCallback(
    (news: AdminOrder[]) => {
      if (audio) {
        try {
          beep(audio);
        } catch {
          /* som bloqueado pelo navegador */
        }
      }
      setUnseen((n) => n + news.length);
      toast(news.length === 1 ? `Pedido novo ${orderNumber(news[0]?.number ?? 0)}` : `${news.length} pedidos novos`, "info");
    },
    [audio, toast],
  );
  useNewOrderAlert(orders.data, onNew);

  useEffect(() => {
    document.title = unseen ? `(${unseen}) Pedido novo · Painel` : "Painel do dono";
    return () => { document.title = "Forno Bella Pizzeria"; };
  }, [unseen]);

  const enableSound = () => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audio ?? new Ctx();
      void ctx.resume();
      beep(ctx);
      setAudio(ctx);
      toast("Som ativado para pedidos novos");
    } catch {
      toast("O navegador bloqueou o som", "error");
    }
  };

  const kitchen = orders.data?.filter((o) => KITCHEN_STATUSES.has(o.status) && o.status === "received").length ?? 0;
  return (
    <div className="adm adm-shell">
      <header className="adm-top">
        <strong className="adm-brand">Painel · Forno Bella</strong>
        <div className="adm-top-actions">
          <button className={`adm-btn ${audio ? "" : "warn"}`} onClick={enableSound} aria-pressed={!!audio}>
            <Icon name="sound" size={18} /> {audio ? "Som ligado" : "Ativar som"}
          </button>
          <a className="adm-btn" href="#"><Icon name="ext" size={18} /> <span className="hide-sm">Ver site</span></a>
          <button className="adm-btn" onClick={onLogout} aria-label="Sair"><Icon name="logout" size={18} /> <span className="hide-sm">Sair</span></button>
        </div>
      </header>
      <nav className="adm-nav" aria-label="Seções do painel">
        {TABS.map(([k, label, icon], i) => (
          <Fragment key={k}>
          {i === 0 && <span className="adm-nav-group">Operação</span>}
          {i === 2 && <span className="adm-nav-group">Configurações</span>}
          <button className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => { setTab(k); if (k === "pedidos") setUnseen(0); }}>
            <Icon name={icon} size={20} />
            <span>{label}</span>
            {k === "pedidos" && kitchen > 0 && <span className="adm-badge">{kitchen}</span>}
          </button>
          </Fragment>
        ))}
      </nav>
      <main className="adm-main" onClick={() => unseen && tab === "pedidos" && setUnseen(0)}>
        {tab === "pedidos" && <Orders orders={orders.data} reload={orders.reload} soundOn={!!audio} onEnableSound={enableSound} />}
        {tab === "inicio" && <Dashboard />}
        {tab === "cardapio" && <MenuAdmin />}
        {tab === "promocoes" && <PromotionsAdmin />}
        {tab === "loja" && <StoreSettings />}
        {tab === "aparencia" && <Appearance />}
      </main>
    </div>
  );
}

const COLUMNS: Array<{ title: string; statuses: OrderStatus[] }> = [
  { title: "Recebidos", statuses: ["received"] },
  { title: "Confirmados", statuses: ["confirmed"] },
  { title: "Em preparo", statuses: ["preparing"] },
  { title: "Saiu / pronto", statuses: ["out_for_delivery", "ready_for_pickup"] },
];
const PAY = { pix: "PIX", cash: "Dinheiro", card_on_delivery: "Cartão na entrega" } as const;
const PAY_STATUS: Record<AdminOrder["paymentStatus"], string> = {
  pending: "aguardando", paid: "pago", expired: "expirado", due_on_delivery: "pagar na entrega", refunded: "reembolsado", partially_refunded: "reembolso parcial",
};

function Orders({ orders, reload, soundOn, onEnableSound }: { orders?: AdminOrder[]; reload: () => void; soundOn: boolean; onEnableSound: () => void }) {
  const backend = useBackend();
  const toast = useToast();
  const [view, setView] = useState<"cozinha" | "pix" | "fim">("cozinha");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const selected = orders?.find((o) => o.id === openId) ?? null;

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast(ok);
      reload();
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setBusy(null);
    }
  };
  const advance = (o: AdminOrder) => {
    const step = nextOwnerStep(o.status, o.fulfillment);
    if (step) void act(o.id, () => backend.admin.advance(o.id), `${orderNumber(o.number)}: ${STATUS_LABELS[step.to]}`);
  };

  if (!orders) return <p className="adm-pad" role="status">Carregando pedidos…</p>;
  const pix = orders.filter((o) => o.status === "awaiting_payment");
  const done = orders.filter((o) => ["delivered", "cancelled", "expired"].includes(o.status));
  return (
    <section>
      <div className="adm-head">
        <h1>Pedidos</h1>
        <div className="adm-chips" role="tablist">
          <button role="tab" aria-selected={view === "cozinha"} className={view === "cozinha" ? "on" : ""} onClick={() => setView("cozinha")}>Na cozinha</button>
          <button role="tab" aria-selected={view === "pix"} className={view === "pix" ? "on" : ""} onClick={() => setView("pix")}>Aguardando PIX ({pix.length})</button>
          <button role="tab" aria-selected={view === "fim"} className={view === "fim" ? "on" : ""} onClick={() => setView("fim")}>Concluídos</button>
        </div>
      </div>
      {!soundOn && (
        <p className="adm-banner"><Icon name="sound" size={18} /> Para ouvir os pedidos novos, toque em <button className="adm-link" onClick={onEnableSound}>Ativar som</button>. Deixe esta aba aberta e visível.</p>
      )}
      {orders.some((o) => o.isSample) && <p className="adm-muted small">Inclui pedidos de exemplo criados para a demonstração. Atualiza sozinho a cada 5 segundos.</p>}

      {view === "cozinha" && (
        <div className="board">
          {COLUMNS.map((col) => {
            const list = orders.filter((o) => col.statuses.includes(o.status)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            return (
              <div key={col.title} className="board-col">
                <h2>{col.title} <span>{list.length}</span></h2>
                {list.length === 0 && <p className="adm-muted small">Nenhum pedido.</p>}
                {list.map((o) => <OrderCard key={o.id} o={o} busy={busy === o.id} onOpen={() => setOpenId(o.id)} onAdvance={() => advance(o)} />)}
              </div>
            );
          })}
        </div>
      )}
      {view === "pix" && (
        <div className="adm-list">
          {pix.length === 0 && <p className="adm-muted">Nenhum PIX aguardando. Esses pedidos só vão para a cozinha depois de pagos.</p>}
          {pix.map((o) => <OrderCard key={o.id} o={o} busy={false} onOpen={() => setOpenId(o.id)} />)}
        </div>
      )}
      {view === "fim" && (
        <div className="adm-list">
          {done.length === 0 && <p className="adm-muted">Nenhum pedido concluído ainda.</p>}
          {done.map((o) => <OrderCard key={o.id} o={o} busy={false} onOpen={() => setOpenId(o.id)} />)}
        </div>
      )}

      {selected && (
        <OrderDetail
          o={selected}
          busy={busy === selected.id}
          onClose={() => setOpenId(null)}
          onAdvance={() => advance(selected)}
          act={act}
        />
      )}
    </section>
  );
}

function OrderCard({ o, busy, onOpen, onAdvance }: { o: AdminOrder; busy: boolean; onOpen: () => void; onAdvance?: () => void }) {
  const step = nextOwnerStep(o.status, o.fulfillment);
  const late = KITCHEN_STATUSES.has(o.status) && Date.now() - new Date(o.createdAt).getTime() > o.estimate.max * 60000;
  return (
    <article className={`order-card st-${o.status} ${late ? "late" : ""}`}>
      <button className="order-card-main" onClick={onOpen} aria-label={`Abrir pedido ${orderNumber(o.number)}`}>
        <div className="order-card-top">
          <strong>{orderNumber(o.number)}</strong>
          <span className={`adm-pill ${o.fulfillment}`}><Icon name={o.fulfillment === "delivery" ? "moto" : "bag"} size={14} /> {o.fulfillment === "delivery" ? "Entrega" : "Retirada"}</span>
          <span className={`adm-time ${late ? "late" : ""}`}>{timeAgo(o.createdAt)}</span>
        </div>
        <span className="order-card-name">{o.customerName}</span>
        <span className="adm-muted small">{o.items.map((it) => `${it.quantity}× ${itemTitle(it)}`).join(" · ")}</span>
        <span className="order-card-bottom">
          <strong>{formatBRL(o.totalCents)}</strong>
          <span className="adm-muted small">{PAY[o.paymentMethod]} · {PAY_STATUS[o.paymentStatus]}</span>
        </span>
        {!KITCHEN_STATUSES.has(o.status) && <span className={`adm-status st-${o.status}`}>{STATUS_LABELS[o.status]}</span>}
      </button>
      {step && onAdvance && (
        <button className="adm-btn primary full" onClick={onAdvance} disabled={busy}>{busy ? "Salvando…" : step.label}</button>
      )}
    </article>
  );
}

function OrderDetail({ o, busy, onClose, onAdvance, act }: {
  o: AdminOrder;
  busy: boolean;
  onClose: () => void;
  onAdvance: () => void;
  act: (id: string, fn: () => Promise<unknown>, ok: string) => Promise<void>;
}) {
  const backend = useBackend();
  const step = nextOwnerStep(o.status, o.fulfillment);
  const [dialog, setDialog] = useState<null | "cancel" | "refund" | "comanda">(null);
  const [reason, setReason] = useState("");
  const left = o.totalCents - o.refundedCents;
  const [amount, setAmount] = useState(moneyInput(left));
  const refundable = o.paymentMethod === "pix" && ["paid", "partially_refunded"].includes(o.paymentStatus);
  const addr = o.address;
  return (
    <>
      <Sheet open onClose={onClose} title={`Pedido ${orderNumber(o.number)}`} className="adm adm-sheet" footer={
        <div className="adm-actions">
          {step && <button className="adm-btn primary grow" onClick={onAdvance} disabled={busy}>{step.label}</button>}
          <button className="adm-btn" onClick={() => setDialog("comanda")}><Icon name="print" size={18} /> Comanda</button>
          {o.paymentStatus === "due_on_delivery" && o.status !== "cancelled" && (
            <button className="adm-btn" onClick={() => act(o.id, () => backend.admin.markPaid(o.id), "Marcado como pago")}>Marcar como pago</button>
          )}
          {refundable && <button className="adm-btn" onClick={() => setDialog("refund")}>Reembolsar</button>}
          {canCancel(o.status) && <button className="adm-btn danger" onClick={() => setDialog("cancel")}>Cancelar</button>}
        </div>
      }>
        <p className={`adm-status st-${o.status}`}>{STATUS_LABELS[o.status]}</p>
        <dl className="adm-dl">
          <dt>Cliente</dt><dd>{o.customerName}</dd>
          <dt>Telefone</dt><dd>{o.customerPhone ? maskPhone(o.customerPhone) : "—"}</dd>
          <dt>{o.fulfillment === "delivery" ? "Entrega" : "Retirada"}</dt>
          <dd>{addr ? `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ""} · ${addr.district} · CEP ${addr.cep}${o.distanceKm !== null ? ` · ${String(o.distanceKm).replace(".", ",")} km` : ""}` : "Na loja"}</dd>
          <dt>Pagamento</dt>
          <dd>{PAY[o.paymentMethod]} · {PAY_STATUS[o.paymentStatus]}{o.cashChangeForCents ? ` · troco para ${formatBRL(o.cashChangeForCents)}` : ""}{o.refundedCents ? ` · reembolsado ${formatBRL(o.refundedCents)}` : ""}</dd>
          <dt>WhatsApp</dt><dd>{o.consentWhatsapp ? "Aceitou receber atualizações" : "Não aceitou"}</dd>
          {o.notes && (<><dt>Observação</dt><dd className="adm-hl">{o.notes}</dd></>)}
          {o.cancelReason && (<><dt>Motivo</dt><dd>{o.cancelReason}</dd></>)}
        </dl>
        <h3>Itens</h3>
        <ul className="adm-items">
          {o.items.map((it, i) => (
            <li key={i}>
              <div><strong>{it.quantity}× {itemTitle(it)}</strong>{itemDetails(it).map((d) => <span key={d} className={d.startsWith("Sem") || d.startsWith("Obs") ? "adm-hl" : "adm-muted"}>{d}</span>)}</div>
              <span>{formatBRL(it.totalCents)}</span>
            </li>
          ))}
        </ul>
        <div className="adm-total"><span>Itens {formatBRL(o.subtotalCents)} · Entrega {formatBRL(o.deliveryFeeCents)}</span><strong>{formatBRL(o.totalCents)}</strong></div>
        <h3>Histórico</h3>
        <ol className="adm-history">
          {o.history.map((h, i) => <li key={i}><span>{clockTime(h.at)}</span> {STATUS_LABELS[h.to]}</li>)}
        </ol>
      </Sheet>

      <Sheet open={dialog === "cancel"} onClose={() => setDialog(null)} title="Cancelar pedido" variant="center" className="adm adm-sheet" footer={
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => setDialog(null)}>Voltar</button>
          <button className="adm-btn danger" disabled={busy || !reason.trim()} onClick={async () => { await act(o.id, () => backend.admin.cancel(o.id, reason), "Pedido cancelado"); setDialog(null); }}>Confirmar cancelamento</button>
        </div>
      }>
        <label className="adm-field"><span>Motivo (o cliente vê na página do pedido)</span><textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus /></label>
        {refundable && <p className="adm-note">Este pedido foi pago por PIX. Depois de cancelar, use Reembolsar para devolver o valor.</p>}
      </Sheet>

      <Sheet open={dialog === "refund"} onClose={() => setDialog(null)} title="Reembolsar PIX" variant="center" className="adm adm-sheet" footer={
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => setDialog(null)}>Voltar</button>
          <button className="adm-btn danger" disabled={busy} onClick={async () => {
            const cents = parseMoney(amount);
            await act(o.id, () => backend.admin.refund(o.id, cents ?? -1), "Reembolso registrado");
            setDialog(null);
          }}>Reembolsar</button>
        </div>
      }>
        <label className="adm-field"><span>Valor (máximo {formatBRL(left)})</span><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" data-autofocus /></label>
        {backend.mode === "local" && <p className="adm-note">Demonstração: nenhum dinheiro é movimentado. Na versão instalada, o reembolso é feito pelo Mercado Pago.</p>}
      </Sheet>

      <Sheet open={dialog === "comanda"} onClose={() => setDialog(null)} title="Comanda" variant="center" className="adm adm-sheet" footer={
        <div className="adm-actions">
          <button className="adm-btn primary" onClick={() => { try { window.print(); } catch { /* bloqueado */ } }}><Icon name="print" size={18} /> Imprimir</button>
        </div>
      }>
        <Comanda o={o} />
        {backend.mode === "local" && <p className="adm-note">Se a impressão não abrir aqui, é uma limitação da página de demonstração. No site instalado ela abre a impressão do navegador (papel comum ou térmico de 80 mm).</p>}
      </Sheet>
    </>
  );
}

function Comanda({ o }: { o: AdminOrder }) {
  return (
    <div className="comanda" id="comanda">
      <p className="c-big">{orderNumber(o.number)} · {o.fulfillment === "delivery" ? "ENTREGA" : "RETIRADA"}</p>
      <p>{new Date(o.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
      <p><strong>{o.customerName}</strong> · {o.customerPhone ? maskPhone(o.customerPhone) : ""}</p>
      {o.address && <p>{o.address.street}, {o.address.number} {o.address.complement} · {o.address.district}</p>}
      <hr />
      {o.items.map((it, i) => (
        <div key={i} className="c-item">
          <p className="c-big">{it.quantity}× {itemTitle(it)}</p>
          {itemDetails(it).map((d) => <p key={d}>  {d}</p>)}
        </div>
      ))}
      {o.notes && <p className="c-big">OBS: {o.notes}</p>}
      <hr />
      <p>Total {formatBRL(o.totalCents)} · {PAY[o.paymentMethod]} ({PAY_STATUS[o.paymentStatus]})</p>
      {o.cashChangeForCents && <p className="c-big">Troco para {formatBRL(o.cashChangeForCents)}</p>}
    </div>
  );
}

function Dashboard() {
  const backend = useBackend();
  const { data } = useData(() => backend.admin.dashboard(), [], 10000);
  const max = useMemo(() => Math.max(1, ...(data?.topFlavors.map((f) => f.qty) ?? [1])), [data]);
  if (!data) return <p className="adm-pad" role="status">Carregando…</p>;
  const stats: Array<[string, string]> = [
    ["Pedidos hoje", String(data.today.orders)],
    ["Faturamento hoje", formatBRL(data.today.revenueCents)],
    ["Pedidos no mês", String(data.month.orders)],
    ["Faturamento no mês", formatBRL(data.month.revenueCents)],
    ["Ticket médio no mês", formatBRL(data.month.avgTicketCents)],
  ];
  return (
    <section>
      <div className="adm-head"><h1>Início</h1></div>
      <div className="stats">
        {stats.map(([label, value]) => (
          <div key={label} className="adm-card stat"><span className="adm-muted small">{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <div className="adm-grid-2">
        <div className="adm-card">
          <h2>Sabores mais vendidos no mês</h2>
          {data.topFlavors.length === 0 && <p className="adm-muted">Ainda sem vendas no mês.</p>}
          <ul className="bars">
            {data.topFlavors.map((f) => (
              <li key={f.name}><span>{f.name}</span><span className="bar"><i style={{ width: `${(f.qty / max) * 100}%` }} /></span><strong>{f.qty}</strong></li>
            ))}
          </ul>
        </div>
        <div className="adm-card">
          <h2>Pedidos de hoje por situação</h2>
          <ul className="adm-status-list">
            {(Object.entries(data.byStatus) as Array<[OrderStatus, number]>).map(([s, n]) => (
              <li key={s}><span className={`adm-status st-${s}`}>{STATUS_LABELS[s]}</span><strong>{n}</strong></li>
            ))}
            {Object.keys(data.byStatus).length === 0 && <li className="adm-muted">Nenhum pedido hoje.</li>}
          </ul>
        </div>
      </div>
      <p className="adm-muted small">Faturamento considera pedidos válidos (sem cancelados, expirados ou aguardando PIX), descontando reembolsos.</p>
    </section>
  );
}
