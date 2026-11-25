// Carrinho e checkout (ETAPAS 5, 6 e 8): visitante sem conta, entrega ou retirada,
// endereço com CEP, taxa por faixa, frete grátis, PIX ou pagamento na entrega, aceite único.
import { useEffect, useMemo, useRef, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { missingForMinimum } from "@shared/domain/delivery.ts";
import { priceCart, type PizzaItemInput } from "@shared/domain/pricing.ts";
import { ApiError } from "../lib/api.ts";
import { useBackend, type DeliveryQuoteResponse, type MenuResponse, type PaymentMethod, type StoreResponse } from "../lib/backend.ts";
import { useCart } from "../lib/cart.tsx";
import { formatBRL, maskCep, maskPhone, newId, parseMoney } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { Icon, Sheet, Stepper, errorText } from "../ui/ui.tsx";
import { itemDetails, itemTitle, menuCatalog } from "./describe.ts";

function usePricedCart(menu: MenuResponse | undefined) {
  const cart = useCart();
  return useMemo(() => {
    if (!menu) return null;
    const catalog = menuCatalog(menu);
    const lines = cart.lines.map((l) => ({ line: l, result: priceCart(catalog, [l.item]) }));
    const subtotal = lines.reduce((s, x) => s + (x.result.ok ? x.result.subtotalCents : 0), 0);
    const broken = lines.filter((x) => !x.result.ok).length;
    return { lines, subtotal, broken };
  }, [menu, cart.lines]);
}

export function CartDrawer(props: {
  open: boolean;
  onClose: () => void;
  menu: MenuResponse | undefined;
  store: StoreResponse;
  onCheckout: () => void;
  onEdit?: (uid: string, item: PizzaItemInput) => void;
}) {
  const cart = useCart();
  const priced = usePricedCart(props.menu);
  const min = props.store.delivery.minOrderCents;
  const missing = priced ? missingForMinimum(priced.subtotal, min) : 0;
  const empty = cart.lines.length === 0;
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title="Seu carrinho"
      footer={
        !empty && priced ? (
          <div className="cart-foot">
            <div className="total-row"><span>Subtotal</span><strong>{formatBRL(priced.subtotal)}</strong></div>
            <button className="btn btn-primary btn-grow" disabled={missing > 0 || priced.broken > 0 || !props.store.status.open} onClick={props.onCheckout}>
              {!props.store.status.open ? "Loja fechada" : missing > 0 ? `Faltam ${formatBRL(missing)} para o pedido mínimo` : "Continuar para entrega e pagamento"}
            </button>
          </div>
        ) : undefined
      }
    >
      {empty ? (
        <div className="empty">
          <Icon name="cart" size={40} />
          <p>Seu carrinho está vazio.</p>
          <button className="btn btn-ghost" onClick={() => { props.onClose(); navigate("", { top: false }); setTimeout(() => document.getElementById("cardapio")?.scrollIntoView(), 50); }}>Ver o cardápio</button>
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {priced?.lines.map(({ line, result }) => {
              const it = result.ok ? result.items[0] : null;
              return (
                <li key={line.uid} className="cart-line">
                  <div className="cart-line-main">
                    <strong>{it ? itemTitle(it) : "Item indisponível"}</strong>
                    {it ? itemDetails(it).map((d) => <span key={d} className="small muted">{d}</span>) : <span className="small warn-text">{!result.ok && result.issues[0]?.message} Remova para continuar.</span>}
                    <div className="cart-line-actions">
                      <Stepper value={line.item.quantity} onChange={(q) => cart.setQty(line.uid, q)} label="Quantidade" />
                      {line.item.kind === "pizza" && props.onEdit && (
                        <button className="link small" onClick={() => props.onEdit?.(line.uid, line.item as PizzaItemInput)}>Editar</button>
                      )}
                      <button className="icon-btn" aria-label="Remover item" onClick={() => cart.remove(line.uid)}><Icon name="trash" size={18} /></button>
                    </div>
                  </div>
                  <strong className="cart-line-price">{it ? formatBRL(it.totalCents) : "—"}</strong>
                </li>
              );
            })}
          </ul>
          <label className="field">
            <span>Observação do pedido <span className="small muted">(opcional)</span></span>
            <textarea rows={2} maxLength={500} value={cart.note} onChange={(e) => cart.setNote(e.target.value)} placeholder="Ex.: sem talheres, interfone 12" />
          </label>
        </>
      )}
    </Sheet>
  );
}

type Errors = Record<string, string>;

export function Checkout({ open, onClose, menu, store }: { open: boolean; onClose: () => void; menu: MenuResponse; store: StoreResponse }) {
  const backend = useBackend();
  const cart = useCart();
  const priced = usePricedCart(menu);
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState({ cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" });
  const [quote, setQuote] = useState<DeliveryQuoteResponse | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [change, setChange] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState("");
  const [sending, setSending] = useState(false);
  const idem = useRef(newId());
  const subtotal = priced?.subtotal ?? 0;

  useEffect(() => {
    if (open) idem.current = newId();
  }, [open]);

  // CEP completo: busca rua e bairro.
  const cepDigits = addr.cep.replace(/\D/g, "");
  useEffect(() => {
    if (cepDigits.length !== 8) return;
    let alive = true;
    backend.lookupCep(cepDigits).then((r) => {
      if (alive && r) setAddr((a) => ({ ...a, street: a.street || r.street, district: a.district || r.district, city: a.city || r.city, uf: a.uf || r.uf }));
    });
    return () => { alive = false; };
  }, [cepDigits, backend]);

  // CEP e número preenchidos: calcula a entrega (o servidor confere de novo ao finalizar).
  useEffect(() => {
    if (fulfillment !== "delivery" || cepDigits.length !== 8 || !addr.number.trim()) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    const t = setTimeout(() => {
      backend.quoteDelivery({ cep: cepDigits, number: addr.number.trim(), subtotalCents: subtotal }).then(
        (q) => { if (alive) { setQuote(q); setQuoting(false); } },
        () => { if (alive) { setQuote({ ok: false, reason: "NOT_FOUND" }); setQuoting(false); } },
      );
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [fulfillment, cepDigits, addr.number, subtotal, backend]);

  const fee = fulfillment === "delivery" && quote?.ok ? quote.feeCents : 0;
  const total = subtotal + fee;
  const est = fulfillment === "delivery" ? store.delivery.estimate.delivery : store.delivery.estimate.pickup;
  const outOfArea = fulfillment === "delivery" && quote && !quote.ok && quote.reason === "OUT_OF_AREA";
  const canSend = !sending && consent && (fulfillment === "pickup" || quote?.ok === true) && cart.lines.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner("");
    const errs: Errors = {};
    if (name.trim().length < 2) errs["customer.name"] = "Informe o seu nome.";
    if (phone.replace(/\D/g, "").length < 10) errs["customer.phone"] = "Informe um telefone com DDD.";
    if (fulfillment === "delivery") {
      if (cepDigits.length !== 8) errs["address.cep"] = "CEP deve ter 8 números.";
      if (!addr.street.trim()) errs["address.street"] = "Informe a rua.";
      if (!addr.number.trim()) errs["address.number"] = "Informe o número.";
      if (!addr.district.trim()) errs["address.district"] = "Informe o bairro.";
    }
    const changeCents = payment === "cash" && change.trim() ? parseMoney(change) : null;
    if (payment === "cash" && change.trim() && (changeCents === null || changeCents < total)) errs["cashChangeForCents"] = "Informe um valor maior que o total.";
    if (!consent) errs["consent"] = "É preciso aceitar para continuar.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      const res = await backend.createOrder({
        idempotencyKey: idem.current,
        items: cart.lines.map((l) => l.item),
        fulfillment,
        customer: { name: name.trim(), phone },
        address: fulfillment === "delivery" ? { ...addr, cep: cepDigits, city: addr.city || "São Paulo", uf: addr.uf || "SP" } : undefined,
        paymentMethod: payment,
        ...(changeCents !== null ? { cashChangeForCents: changeCents } : {}),
        notes: cart.note,
        consent: true,
        consentTextVersion: store.consent.version,
        turnstileToken: "demonstracao",
      });
      cart.clear();
      onClose();
      navigate(`pedido-${res.code}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setBanner(errorText(err));
    } finally {
      setSending(false);
    }
  };

  const field = (key: keyof typeof addr, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`field ${errors[`address.${key}`] ? "has-error" : ""}`}>
      <span>{label}</span>
      <input value={addr[key]} onChange={(e) => setAddr({ ...addr, [key]: key === "cep" ? maskCep(e.target.value) : e.target.value })} aria-invalid={!!errors[`address.${key}`]} {...props} />
      {errors[`address.${key}`] && <em className="err">{errors[`address.${key}`]}</em>}
    </label>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Entrega e pagamento"
      className="sheet-wide"
      footer={
        <div className="cart-foot">
          <div className="totals">
            <div className="total-row"><span>Itens</span><span>{formatBRL(subtotal)}</span></div>
            {fulfillment === "delivery" && <div className="total-row"><span>Entrega</span><span>{quote?.ok ? (quote.freeShipping ? "Grátis" : formatBRL(fee)) : "—"}</span></div>}
            <div className="total-row grand"><span>Total</span><strong>{formatBRL(total)}</strong></div>
          </div>
          <button className="btn btn-primary btn-grow" form="checkout-form" type="submit" disabled={!canSend} data-testid="place-order">
            {sending ? "Enviando…" : payment === "pix" ? "Finalizar e pagar com PIX" : "Finalizar pedido"}
          </button>
        </div>
      }
    >
      <form id="checkout-form" onSubmit={submit} noValidate>
        <div className="seg" role="radiogroup" aria-label="Como receber">
          <button type="button" role="radio" aria-checked={fulfillment === "delivery"} className={fulfillment === "delivery" ? "on" : ""} onClick={() => setFulfillment("delivery")}><Icon name="moto" size={18} /> Entrega</button>
          <button type="button" role="radio" aria-checked={fulfillment === "pickup"} className={fulfillment === "pickup" ? "on" : ""} onClick={() => setFulfillment("pickup")}><Icon name="bag" size={18} /> Retirar na loja</button>
        </div>
        <p className="hint"><Icon name="clock" size={16} /> Tempo estimado: {est.min} a {est.max} minutos</p>

        <fieldset className="field-group">
          <legend>Seus dados</legend>
          <label className={`field ${errors["customer.name"] ? "has-error" : ""}`}>
            <span>Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} aria-invalid={!!errors["customer.name"]} />
            {errors["customer.name"] && <em className="err">{errors["customer.name"]}</em>}
          </label>
          <label className={`field ${errors["customer.phone"] ? "has-error" : ""}`}>
            <span>Telefone (WhatsApp)</span>
            <input value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" aria-invalid={!!errors["customer.phone"]} />
            {errors["customer.phone"] && <em className="err">{errors["customer.phone"]}</em>}
          </label>
        </fieldset>

        {fulfillment === "delivery" ? (
          <fieldset className="field-group">
            <legend>Endereço de entrega</legend>
            <div className="grid-2">
              {field("cep", "CEP", { inputMode: "numeric", autoComplete: "postal-code", placeholder: "00000-000" })}
              {field("number", "Número", { autoComplete: "address-line2", maxLength: 12 })}
            </div>
            {field("street", "Rua", { autoComplete: "address-line1", maxLength: 120 })}
            <div className="grid-2">
              {field("district", "Bairro", { maxLength: 80 })}
              {field("complement", "Complemento (opcional)", { maxLength: 60 })}
            </div>
            {store.store.isDemo && <p className="hint">Demonstração: a distância é simulada pelo CEP. CEPs terminados em 9 ficam fora da área de entrega.</p>}
            <div aria-live="polite">
              {quoting && <p className="quote">Calculando a entrega…</p>}
              {!quoting && quote?.ok && (
                <div className="quote ok">
                  <strong>{String(quote.distanceKm).replace(".", ",")} km da loja · {quote.freeShipping ? "Entrega grátis" : `Taxa de ${formatBRL(quote.feeCents)}`}</strong>
                  {quote.missingForFreeCents !== null && <span>Faltam {formatBRL(quote.missingForFreeCents)} para ganhar entrega grátis.</span>}
                </div>
              )}
              {!quoting && outOfArea && (
                <div className="quote bad">
                  <strong>Não entregamos neste endereço.</strong>
                  <span>Ele fica a {String(quote.distanceKm).replace(".", ",")} km, e o limite é {String(quote.radiusKm).replace(".", ",")} km.</span>
                  <div className="row-gap">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddr({ cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" })}>Usar outro endereço</button>
                    <button type="button" className="btn btn-gold-outline btn-sm" onClick={() => setFulfillment("pickup")}>Retirar na loja</button>
                  </div>
                </div>
              )}
              {!quoting && quote && !quote.ok && quote.reason === "NOT_FOUND" && <p className="quote bad">Não encontramos esse endereço. Confira o CEP.</p>}
            </div>
          </fieldset>
        ) : (
          <div className="quote ok">
            <strong>Retirada sem taxa</strong>
            <span>{store.store.addressText}</span>
          </div>
        )}

        <fieldset className="field-group">
          <legend>Pagamento</legend>
          <div className="option-list">
            <label className="opt"><input type="radio" name="pay" checked={payment === "pix"} onChange={() => setPayment("pix")} /><Icon name="pix" size={20} /><span>PIX agora <span className="small muted">· QR code na próxima tela</span></span></label>
            <label className="opt"><input type="radio" name="pay" checked={payment === "cash"} onChange={() => setPayment("cash")} /><Icon name="cash" size={20} /><span>Dinheiro na {fulfillment === "delivery" ? "entrega" : "retirada"}</span></label>
            <label className="opt"><input type="radio" name="pay" checked={payment === "card_on_delivery"} onChange={() => setPayment("card_on_delivery")} /><Icon name="card" size={20} /><span>Cartão na maquininha, na {fulfillment === "delivery" ? "entrega" : "retirada"}</span></label>
          </div>
          {payment === "cash" && (
            <label className={`field ${errors["cashChangeForCents"] ? "has-error" : ""}`}>
              <span>Troco para quanto? <span className="small muted">(deixe vazio se não precisar)</span></span>
              <input value={change} onChange={(e) => setChange(e.target.value)} inputMode="decimal" placeholder="Ex.: 100,00" />
              {errors["cashChangeForCents"] && <em className="err">{errors["cashChangeForCents"]}</em>}
            </label>
          )}
        </fieldset>

        {cart.note && <p className="hint">Observação do pedido: {cart.note}</p>}

        <label className={`consent ${errors["consent"] ? "has-error" : ""}`}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{store.consent.text} <a href="#privacidade" className="link">Ler a política</a></span>
        </label>
        {errors["consent"] && <em className="err">{errors["consent"]}</em>}
        {banner && <p className="banner-error" role="alert">{banner}</p>}
      </form>
    </Sheet>
  );
}
