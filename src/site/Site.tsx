// Site público: página única (ETAPA 3) com barra do topo, cabeçalho, hero, 3 galerias,
// história, horários/endereço/contato e rodapé. Os pedidos abrem em janelas por cima.
import { useEffect, useMemo, useRef, useState } from "react";
import { WEEKDAY_NAMES } from "@shared/domain/hours.ts";
import type { FlavorKind } from "@shared/domain/pricing.ts";
import { useBackend, useData, type MenuResponse, type StoreResponse } from "../lib/backend.ts";
import { useCart } from "../lib/cart.tsx";
import { asset, formatBRL } from "../lib/format.ts";
import { navigate, type Route } from "../lib/router.ts";
import { readItem, writeItem } from "../demo/storage.ts";
import { Icon, Sheet, useToast } from "../ui/ui.tsx";
import { CartDrawer, Checkout } from "./Checkout.tsx";
import { OrderPage } from "./OrderPage.tsx";
import { PizzaBuilder, type BuilderConfig } from "./PizzaBuilder.tsx";

const NAV = [
  ["promocoes", "Promoções"],
  ["monte", "Monte sua pizza"],
  ["cardapio", "Cardápio"],
  ["historia", "Nossa história"],
  ["horarios", "Horários"],
] as const;

function scrollToId(id: string) {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function Site({ route, store }: { route: Route; store: StoreResponse }) {
  const backend = useBackend();
  const { data: menu } = useData(() => backend.getMenu(), []);
  const cart = useCart();
  const toast = useToast();
  const [builder, setBuilder] = useState<BuilderConfig | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const open = store.status.open;

  const startBuilder = (c: BuilderConfig) => {
    if (!open) {
      toast(store.status.text, "info");
      return;
    }
    setBuilder(c);
  };

  if (route.name === "pedido") {
    return (
      <div className="site">
        <TopBar store={store} />
        <Header store={store} onCart={() => setCartOpen(true)} onMenu={() => setDrawer(true)} compact />
        <OrderPage code={route.code} store={store} />
        <Footer store={store} />
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} menu={menu} store={store} onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }} />
        {menu && <Checkout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} menu={menu} store={store} />}
        <MobileNav open={drawer} onClose={() => setDrawer(false)} store={store} />
      </div>
    );
  }

  return (
    <div className="site">
      <a className="skip" href="#cardapio" onClick={(e) => { e.preventDefault(); scrollToId("cardapio"); }}>Pular para o cardápio</a>
      <TopBar store={store} />
      <Header store={store} onCart={() => setCartOpen(true)} onMenu={() => setDrawer(true)} />
      <main>
        <Hero store={store} onOrder={() => scrollToId("cardapio")} onHalf={() => startBuilder({ mode: "meio", kind: "pizza_salgada" })} />
        {menu ? (
          <>
            <Promotions menu={menu} open={open} onPick={(flavorId, sizeId) => startBuilder({ mode: "inteira", kind: menu.flavors.find((f) => f.id === flavorId)?.kind ?? "pizza_salgada", flavorId, sizeId })} />
            <BuildYourPizza onPick={startBuilder} />
            <MenuSection
              menu={menu}
              open={open}
              onPizza={(flavorId, kind) => startBuilder({ mode: "inteira", kind, flavorId })}
              onProduct={(productId, name) => {
                if (!open) return toast(store.status.text, "info");
                cart.add({ kind: "product", productId, quantity: 1 });
                toast(`${name} no carrinho`);
              }}
            />
          </>
        ) : (
          <div className="band"><p className="muted" role="status">Carregando o cardápio…</p></div>
        )}
        <Story store={store} />
        <HoursContact store={store} />
      </main>
      <Footer store={store} />

      {cart.count > 0 && !cartOpen && !checkoutOpen && !builder && (
        <button className="cart-fab" onClick={() => setCartOpen(true)}>
          <Icon name="cart" size={20} /> Ver carrinho · {cart.count} {cart.count === 1 ? "item" : "itens"}
        </button>
      )}

      {menu && builder && (
        <PizzaBuilder
          config={builder}
          menu={menu}
          onClose={() => setBuilder(null)}
          onDone={(item, editUid) => {
            if (editUid) cart.replace(editUid, item);
            else cart.add(item);
            setBuilder(null);
            toast(editUid ? "Item atualizado" : "Pizza no carrinho");
          }}
        />
      )}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        menu={menu}
        store={store}
        onEdit={(uid, item) => { setCartOpen(false); setBuilder({ mode: item.flavorIds.length > 1 ? "meio" : "inteira", kind: menu?.flavors.find((f) => f.id === item.flavorIds[0])?.kind ?? "pizza_salgada", editUid: uid, initial: item }); }}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />
      {menu && <Checkout open={checkoutOpen} onClose={() => setCheckoutOpen(false)} menu={menu} store={store} />}
      <MobileNav open={drawer} onClose={() => setDrawer(false)} store={store} />
      <PrivacyModal open={route.name === "privacidade"} />
      <TermsGate store={store} />
    </div>
  );
}

function TopBar({ store }: { store: StoreResponse }) {
  return (
    <div className={`topbar ${store.status.open ? "is-open" : "is-closed"}`} role="status">
      <Icon name="clock" size={16} /> {store.status.text}
    </div>
  );
}

function Header({ store, onCart, onMenu, compact }: { store: StoreResponse; onCart: () => void; onMenu: () => void; compact?: boolean }) {
  const cart = useCart();
  return (
    <header className="header">
      <div className="wrap header-row">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate(""); }}>
          {store.store.logoUrl && <img src={asset(store.store.logoUrl)} alt="" width={44} height={46} />}
          <span>{store.store.name}</span>
        </a>
        {!compact && (
          <nav className="nav" aria-label="Seções">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollToId(id); }}>{label}</a>
            ))}
          </nav>
        )}
        <div className="header-actions">
          <button className="btn btn-ghost cart-btn" onClick={onCart} aria-label={`Carrinho, ${cart.count} itens`}>
            <Icon name="cart" /> <span className="hide-sm">Carrinho</span>
            {cart.count > 0 && <span className="badge">{cart.count}</span>}
          </button>
          <button className="icon-btn show-sm" onClick={onMenu} aria-label="Abrir menu">
            <Icon name="menu" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav({ open, onClose, store }: { open: boolean; onClose: () => void; store: StoreResponse }) {
  const go = (id: string) => {
    onClose();
    if (location.hash.startsWith("#pedido")) navigate("");
    setTimeout(() => scrollToId(id), 60);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Menu" className="drawer-nav">
      <nav className="drawer-links" aria-label="Seções">
        {NAV.map(([id, label]) => (
          <button key={id} onClick={() => go(id)}>{label}<Icon name="right" size={18} /></button>
        ))}
      </nav>
      <p className={`pill-status ${store.status.open ? "ok" : "no"}`}><Icon name="clock" size={16} /> {store.status.text}</p>
      <p className="muted small">{store.store.addressText}</p>
      {store.store.whatsapp && (
        <a className="link small" href={`https://wa.me/${store.store.whatsapp}`} target="_blank" rel="noreferrer">Falar com a pizzaria no WhatsApp</a>
      )}
      <a className="link small" href="#privacidade" onClick={onClose}>Política de privacidade</a>
    </Sheet>
  );
}

function Hero({ store, onOrder, onHalf }: { store: StoreResponse; onOrder: () => void; onHalf: () => void }) {
  const est = store.delivery.estimate.delivery;
  return (
    <section className="hero" aria-labelledby="hero-title">
      <img className="hero-img" src={asset("demo/hero.webp")} alt="Pizza de pepperoni saindo do forno, sobre tábua de madeira" />
      <div className="hero-shade" />
      <div className="wrap hero-content">
        <p className="eyebrow anim a1">Forno a lenha · massa de fermentação lenta</p>
        <h1 id="hero-title" className="anim a2">
          Pizza artesanal, <em>direto do forno</em> para a sua mesa
        </h1>
        <p className="hero-text anim a3">Massa leve, ingredientes frescos e o sabor do fogo de verdade. Peça para entregar ou retire na loja.</p>
        <div className="hero-ctas anim a4">
          <button className="btn btn-primary btn-lg" onClick={onOrder} disabled={!store.status.open}>
            {store.status.open ? "Pedir agora" : "Fechado no momento"}
          </button>
          <button className="btn btn-gold-outline btn-lg" onClick={onHalf} disabled={!store.status.open}>
            <Icon name="split" /> Monte meio a meio
          </button>
        </div>
        <ul className="hero-facts anim a5">
          <li><Icon name="moto" size={18} /> Entrega em {est.min}–{est.max} min</li>
          <li><Icon name="pix" size={18} /> PIX ou pagamento na entrega</li>
        </ul>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="section-title">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

function Promotions({ menu, open, onPick }: { menu: MenuResponse; open: boolean; onPick: (flavorId: string, sizeId: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const promos = useMemo(
    () => menu.promotions.flatMap((p) => {
      const f = menu.flavors.find((x) => x.id === p.flavorId);
      const s = menu.sizes.find((x) => x.id === p.sizeId);
      return f && s ? [{ ...p, flavor: f, size: s }] : [];
    }),
    [menu],
  );
  const step = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".promo-card");
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + 20), behavior: "smooth" });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const on = () => {
      const card = el.querySelector<HTMLElement>(".promo-card");
      setIndex(Math.round(el.scrollLeft / ((card?.offsetWidth ?? 300) + 20)));
    };
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  if (!promos.length) return null;
  return (
    <section className="band" id="promocoes" aria-labelledby="t-promo">
      <div className="wrap">
        <SectionTitle eyebrow="Promoções" title="Pizzas em promoção" id="t-promo" />
        <div className="carousel">
          <button className="round-btn prev" onClick={() => step(-1)} aria-label="Promoção anterior"><Icon name="left" /></button>
          <div className="carousel-track" ref={track} tabIndex={0} aria-label="Lista de promoções" onKeyDown={(e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); }}>
            {promos.map((p) => (
              <article key={p.flavorId + p.sizeId} className={`card promo-card ${p.flavor.paused ? "is-paused" : ""}`}>
                <img src={asset(p.photoUrl ?? p.flavor.photoUrl)} alt="" loading="lazy" className="card-img" />
                <div className="card-body">
                  <div className="tags">
                    <span className="tag tag-promo">Promoção</span>
                    <span className={`tag ${p.flavor.kind === "pizza_doce" ? "tag-sweet" : "tag-salty"}`}>{p.flavor.kind === "pizza_doce" ? "Doce" : "Salgada"}</span>
                  </div>
                  <h3>{p.flavor.name}</h3>
                  <p className="muted">{p.flavor.description}</p>
                  <p className="price-line">
                    <s>{formatBRL(p.listCents)}</s> <strong>{formatBRL(p.promoCents)}</strong>
                  </p>
                  <p className="small muted">{p.size.name} · {p.size.slices} fatias</p>
                  <button className="btn btn-primary" disabled={!open || p.flavor.paused} onClick={() => onPick(p.flavorId, p.sizeId)}>
                    {p.flavor.paused ? "Indisponível" : open ? "Adicionar" : "Fechado"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button className="round-btn next" onClick={() => step(1)} aria-label="Próxima promoção"><Icon name="right" /></button>
        </div>
        <div className="dots" aria-hidden="true">
          {promos.map((p, i) => <span key={p.flavorId} className={i === index ? "on" : ""} />)}
        </div>
      </div>
    </section>
  );
}

function BuildYourPizza({ onPick }: { onPick: (c: BuilderConfig) => void }) {
  const options: Array<{ title: string; text: string; icon: string; photo: string; config: BuilderConfig; gold?: boolean }> = [
    { title: "Pizza inteira", text: "Um sabor, no Broto (4 fatias) ou na Grande (8 fatias).", icon: "pizza", photo: "demo/pizza-salgada.webp", config: { mode: "inteira", kind: "pizza_salgada" } },
    { title: "Pizza meio a meio", text: "Até 3 sabores na Grande. Vale o preço do sabor mais caro.", icon: "split", photo: "demo/pizza-pepperoni.webp", config: { mode: "meio", kind: "pizza_salgada" }, gold: true },
    { title: "Pizza doce", text: "Para fechar a noite com chocolate, morango ou banana.", icon: "pizza", photo: "demo/pizza-doce.webp", config: { mode: "inteira", kind: "pizza_doce" } },
    { title: "Pizza doce meio a meio", text: "Combine até 3 sabores doces na Grande.", icon: "thirds", photo: "demo/pizza-doce.webp", config: { mode: "meio", kind: "pizza_doce" }, gold: true },
  ];
  return (
    <section className="band band-alt" id="monte" aria-labelledby="t-monte">
      <div className="wrap">
        <SectionTitle eyebrow="Monte sua pizza" title="Do seu jeito, do nosso forno" id="t-monte" />
        <div className="build-grid">
          {options.map((o) => (
            <button key={o.title} className="build-card" onClick={() => onPick(o.config)}>
              <span className="build-photo">
                <img src={asset(o.photo)} alt="" loading="lazy" className={o.config.mode === "meio" ? "half" : ""} />
                <span className="build-icon"><Icon name={o.icon} size={26} /></span>
              </span>
              <span className="build-text">
                <span className="build-title">{o.title}</span>
                <span className="muted">{o.text}</span>
                <span className={`btn ${o.gold ? "btn-gold" : "btn-ghost"} btn-sm`}>Montar</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function MenuSection(props: {
  menu: MenuResponse;
  open: boolean;
  onPizza: (flavorId: string, kind: FlavorKind) => void;
  onProduct: (productId: string, name: string) => void;
}) {
  const { menu, open } = props;
  const [tab, setTab] = useState<"pizza_salgada" | "pizza_doce" | "drink">("pizza_salgada");
  const tabs = [
    ["pizza_salgada", "Salgadas"],
    ["pizza_doce", "Doces"],
    ["drink", "Bebidas"],
  ] as const;
  const flavors = menu.flavors.filter((f) => f.kind === tab);
  const products = menu.products.filter((p) => menu.categories.find((c) => c.id === p.categoryId)?.kind === "drink");
  return (
    <section className="band" id="cardapio" aria-labelledby="t-menu">
      <div className="wrap">
        <SectionTitle eyebrow="Cardápio" title="Nossos sabores" id="t-menu" />
        <div className="tabs" role="tablist" aria-label="Categorias do cardápio">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        <ul className="menu-list" role="tabpanel">
          {tab !== "drink"
            ? flavors.map((f) => (
                <li key={f.id} className={`menu-row ${f.paused ? "is-paused" : ""}`}>
                  <img src={asset(f.photoUrl)} alt="" loading="lazy" />
                  <div className="menu-info">
                    <h3>{f.name} {f.paused && <span className="tag tag-off">Indisponível</span>}</h3>
                    <p className="muted">{f.description}</p>
                    <p className="sizes">
                      {menu.sizes.map((s) => (f.prices[s.id] ? <span key={s.id}>{s.name} <strong>{formatBRL(f.prices[s.id] ?? 0)}</strong></span> : null))}
                    </p>
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={!open || f.paused} onClick={() => props.onPizza(f.id, f.kind)}>
                    {f.paused ? "Indisponível" : open ? "Pedir" : "Fechado"}
                  </button>
                </li>
              ))
            : products.map((p) => (
                <li key={p.id} className={`menu-row ${p.paused ? "is-paused" : ""}`}>
                  <img src={asset(p.photoUrl)} alt="" loading="lazy" />
                  <div className="menu-info">
                    <h3>{p.name} {p.paused && <span className="tag tag-off">Indisponível</span>}</h3>
                    <p className="muted">{p.description}</p>
                    <p className="sizes"><strong>{formatBRL(p.priceCents)}</strong></p>
                  </div>
                  <button className="btn btn-primary btn-sm" disabled={!open || p.paused} onClick={() => props.onProduct(p.id, p.name)}>
                    {p.paused ? "Indisponível" : "Adicionar"}
                  </button>
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}

function Story({ store }: { store: StoreResponse }) {
  return (
    <section className="band band-alt" id="historia" aria-labelledby="t-story">
      <div className="wrap story">
        <div>
          <SectionTitle eyebrow="Nossa história" title="Tradição italiana, feita com paciência" id="t-story" />
          <p className="story-text">{store.store.story}</p>
        </div>
        <ul className="story-points">
          <li><span className="build-icon"><Icon name="pizza" size={28} /></span><div><strong>Forno a lenha</strong><p className="muted">Calor e sabor que só o fogo de verdade entrega.</p></div></li>
          <li><span className="build-icon"><Icon name="check" size={28} /></span><div><strong>Ingredientes frescos</strong><p className="muted">Tomate, manjericão e queijos escolhidos a dedo.</p></div></li>
        </ul>
      </div>
    </section>
  );
}

function HoursContact({ store }: { store: StoreResponse }) {
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.store.addressText)}`;
  const today = store.status.todayWeekday;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <section className="band" id="horarios" aria-labelledby="t-hours">
      <div className="wrap">
        <SectionTitle eyebrow="Horários, endereço e contato" title="Venha nos visitar" id="t-hours" />
        <div className="info-grid">
          <div className="card info-card">
            <h3><Icon name="clock" size={20} /> Horário de funcionamento</h3>
            <ul className="hours">
              {order.map((d) => {
                const h = store.hours.find((x) => x.weekday === d);
                return (
                  <li key={d} className={d === today ? "today" : ""}>
                    <span>{WEEKDAY_NAMES[d]} {d === today && <span className="tag tag-today">Hoje</span>}</span>
                    <span>{!h || h.closed ? "Fechado" : `${h.opens} – ${h.closes}`}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="card info-card">
            <h3><Icon name="pin" size={20} /> Endereço</h3>
            <p>{store.store.addressText}</p>
            <p className="muted small">Entregamos num raio de {String(store.delivery.radiusKm).replace(".", ",")} km da loja. Também dá para retirar no balcão.</p>
            <a className="btn btn-gold-outline btn-sm" href={maps} target="_blank" rel="noreferrer"><Icon name="ext" size={16} /> Como chegar</a>
          </div>
          <div className="card info-card">
            <h3><Icon name="phone" size={20} /> Contato</h3>
            {store.store.phone && <p>Telefone: {store.store.phone}</p>}
            {store.store.whatsapp ? (
              <a className="link small" href={`https://wa.me/${store.store.whatsapp}`} target="_blank" rel="noreferrer">Falar com a pizzaria no WhatsApp</a>
            ) : (
              <p className="muted small">O link do WhatsApp aparece aqui quando o número é cadastrado no painel.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ store }: { store: StoreResponse }) {
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <span className="brand">
          {store.store.logoUrl && <img src={asset(store.store.logoUrl)} alt="" width={40} height={42} />}
          <span>{store.store.name}</span>
        </span>
        <span className="footer-links">
          <a href="#privacidade">Política de privacidade</a>
          <a href="#admin">Área do dono</a>
        </span>
      </div>
      {store.store.isDemo && <p className="wrap demo-note">Versão de demonstração: pedidos, pagamentos e mensagens são simulados e ficam só neste aparelho.</p>}
    </footer>
  );
}

const TERMS_KEY = "fornobella.termos";

/** Caixa de aceite dos termos ao entrar no site (pedido do dono, 25/11/2026). */
function TermsGate({ store }: { store: StoreResponse }) {
  const backend = useBackend();
  const version = String(store.privacyPolicyVersion);
  const [accepted, setAccepted] = useState(() => readItem(TERMS_KEY) === version);
  const [policy, setPolicy] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (accepted) return;
    document.body.classList.add("no-scroll");
    box.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.body.classList.remove("no-scroll");
  }, [accepted]);
  if (accepted || location.hash === "#privacidade") return null;
  return (
    <div className="overlay overlay-center terms-overlay">
      <div ref={box} className="sheet sheet-center terms" role="dialog" aria-modal="true" aria-labelledby="t-terms">
        <div className="sheet-body">
          {store.store.logoUrl && <img src={asset(store.store.logoUrl)} alt="" width={64} height={67} className="terms-logo" />}
          <h2 id="t-terms">Bem-vindo à {store.store.name}</h2>
          <p className="muted">Para usar o site, confirme que você leu e aceita os nossos termos:</p>
          <ul className="terms-list">
            <li>Usamos o seu nome, telefone e endereço só para preparar, entregar e acompanhar os seus pedidos.</li>
            <li>Os preços e a taxa de entrega são confirmados pela pizzaria no momento do pedido.</li>
            <li>Não usamos cookies de propaganda nem de rastreamento. O carrinho fica guardado no seu aparelho.</li>
            <li>Você pode pedir a exclusão dos seus dados a qualquer momento.</li>
          </ul>
          {policy !== null && <div className="policy terms-policy">{policy}</div>}
          <div className="terms-actions">
            <button className="btn btn-primary btn-lg" onClick={() => { writeItem(TERMS_KEY, version); setAccepted(true); }}>Aceitar e continuar</button>
            {policy === null && (
              <button className="btn btn-ghost" onClick={() => backend.getPrivacyPolicy().then((p) => setPolicy(p.text), () => setPolicy("Não foi possível carregar a política."))}>Ler a política completa</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacyModal({ open }: { open: boolean }) {
  const backend = useBackend();
  const [text, setText] = useState("");
  useEffect(() => {
    if (open) backend.getPrivacyPolicy().then((p) => setText(p.text), () => setText("Não foi possível carregar a política."));
  }, [open, backend]);
  return (
    <Sheet open={open} onClose={() => navigate("", { top: false })} title="Política de privacidade" variant="center">
      <div className="policy">{text}</div>
    </Sheet>
  );
}
