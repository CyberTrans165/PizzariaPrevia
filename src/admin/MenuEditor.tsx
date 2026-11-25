// Painel do dono: cadastro do cardápio (sabores, bordas, adicionais, bebidas) com fotos,
// preços e disponibilidade, e a aba de promoções (com sabor já cadastrado ou novo, e foto própria).
import { useEffect, useState } from "react";
import type { FlavorKind } from "@shared/domain/pricing.ts";
import { useBackend, useData, type AdminMenuPromotion, type FlavorInput, type MenuResponse, type ProductInput } from "../lib/backend.ts";
import { asset, formatBRL, moneyInput, parseMoney } from "../lib/format.ts";
import { Icon, Sheet, errorText, useToast } from "../ui/ui.tsx";

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

/** Lê a imagem escolhida, reduz para no máximo 640 px e devolve em JPEG (data URL). */
async function shrinkImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use uma imagem JPG, PNG ou WebP.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Imagem grande demais (máximo 10 MB).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("Não foi possível abrir a imagem."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const size = Math.min(640, side);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Navegador sem suporte a imagens.");
    // Recorte quadrado no centro (o site mostra as fotos quadradas).
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoInput({ value, onChange, label = "Foto" }: { value: string | null; onChange: (v: string | null) => void; label?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <div className="photo-input">
      <span className="photo-label">{label}</span>
      <div className="photo-row">
        {value ? <img src={asset(value)} alt="" /> : <span className="photo-empty"><Icon name="pizza" size={28} /></span>}
        <div className="photo-actions">
          <label className="adm-btn">
            {busy ? "Carregando…" : value ? "Trocar foto" : "Enviar foto"}
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              try {
                onChange(await shrinkImage(f));
              } catch (err) {
                toast(errorText(err), "error");
              } finally {
                setBusy(false);
              }
            }} />
          </label>
          {value && <button type="button" className="adm-link" onClick={() => onChange(null)}>Remover foto</button>}
          <span className="adm-muted small">JPG, PNG ou WebP. A foto é recortada quadrada.</span>
        </div>
      </div>
    </div>
  );
}

type Flavor = MenuResponse["flavors"][number];
type Product = MenuResponse["products"][number];
type Extra = MenuResponse["crusts"][number];

export function FlavorEditor({ menu, flavor, kind, onClose, onSaved }: {
  menu: MenuResponse;
  flavor: Flavor | null;
  kind?: FlavorKind;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const backend = useBackend();
  const toast = useToast();
  const [f, setF] = useState<FlavorInput>(() => ({
    name: flavor?.name ?? "", kind: flavor?.kind ?? kind ?? "pizza_salgada", description: flavor?.description ?? "",
    ingredients: flavor?.ingredients ?? [], photoUrl: flavor?.photoUrl ?? null, prices: { ...(flavor?.prices ?? {}) }, paused: flavor?.paused ?? false,
  }));
  const [ingredients, setIngredients] = useState((flavor?.ingredients ?? []).join(", "));
  const [prices, setPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(menu.sizes.map((s) => [s.id, flavor?.prices[s.id] ? moneyInput(flavor.prices[s.id]) : ""])),
  );
  const [confirmDel, setConfirmDel] = useState(false);
  const save = async () => {
    const p: Record<string, number> = {};
    for (const s of menu.sizes) p[s.id] = parseMoney(prices[s.id] ?? "") ?? 0;
    try {
      const id = await backend.admin.saveFlavor(flavor?.id ?? null, { ...f, prices: p, ingredients: ingredients.split(",") });
      toast(flavor ? "Sabor atualizado" : "Sabor cadastrado");
      onSaved(id);
    } catch (e) {
      toast(errorText(e), "error");
    }
  };
  return (
    <Sheet open onClose={onClose} title={flavor ? `Editar ${flavor.name}` : "Novo sabor"} className="adm adm-sheet" footer={
      <div className="adm-actions">
        {flavor && <button className="adm-btn danger" onClick={() => setConfirmDel(true)}>Remover</button>}
        <button className="adm-btn primary grow" onClick={save}>Salvar sabor</button>
      </div>
    }>
      <label className="adm-field"><span>Nome</span><input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} data-autofocus /></label>
      <div className="adm-chips" role="radiogroup" aria-label="Tipo">
        {([["pizza_salgada", "Salgada"], ["pizza_doce", "Doce"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={f.kind === k} className={f.kind === k ? "on" : ""} onClick={() => setF({ ...f, kind: k })}>{l}</button>
        ))}
      </div>
      <label className="adm-field"><span>Descrição</span><textarea rows={2} maxLength={300} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <label className="adm-field"><span>Ingredientes (separe por vírgula; o cliente pode pedir para retirar)</span><input value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="molho de tomate, muçarela, manjericão" /></label>
      <div className="adm-grid-2">
        {menu.sizes.map((s) => (
          <label key={s.id} className="adm-field"><span>Preço {s.name} (R$)</span><input inputMode="decimal" value={prices[s.id] ?? ""} onChange={(e) => setPrices({ ...prices, [s.id]: e.target.value })} placeholder="0,00" /></label>
        ))}
      </div>
      <PhotoInput value={f.photoUrl} onChange={(v) => setF({ ...f, photoUrl: v })} />
      <label className="inline-toggle"><Toggle on={!f.paused} label="Disponível" onChange={(v) => setF({ ...f, paused: !v })} /> {f.paused ? "Pausado (aparece como indisponível)" : "Disponível para pedir"}</label>
      {confirmDel && flavor && (
        <div className="adm-note">
          Remover {flavor.name} do cardápio? As promoções dele também saem. Pedidos já feitos não mudam.
          <div className="adm-actions"><button className="adm-btn" onClick={() => setConfirmDel(false)}>Voltar</button>
            <button className="adm-btn danger" onClick={async () => { await backend.admin.removeItem("flavors", flavor.id); toast("Sabor removido"); onClose(); }}>Remover</button></div>
        </div>
      )}
    </Sheet>
  );
}

function ProductEditor({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const backend = useBackend();
  const toast = useToast();
  const [p, setP] = useState<ProductInput>({
    name: product?.name ?? "", description: product?.description ?? "", priceCents: product?.priceCents ?? 0, photoUrl: product?.photoUrl ?? null, paused: product?.paused ?? false,
  });
  const [price, setPrice] = useState(product ? moneyInput(product.priceCents) : "");
  return (
    <Sheet open onClose={onClose} title={product ? `Editar ${product.name}` : "Nova bebida ou produto"} className="adm adm-sheet" footer={
      <div className="adm-actions">
        {product && <button className="adm-btn danger" onClick={async () => { await backend.admin.removeItem("products", product.id); toast("Produto removido"); onClose(); }}>Remover</button>}
        <button className="adm-btn primary grow" onClick={async () => {
          try {
            await backend.admin.saveProduct(product?.id ?? null, { ...p, priceCents: parseMoney(price) ?? 0 });
            toast(product ? "Produto atualizado" : "Produto cadastrado");
            onClose();
          } catch (e) {
            toast(errorText(e), "error");
          }
        }}>Salvar</button>
      </div>
    }>
      <label className="adm-field"><span>Nome</span><input value={p.name} maxLength={60} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Refrigerante 2 L" data-autofocus /></label>
      <label className="adm-field"><span>Descrição</span><input value={p.description} maxLength={300} onChange={(e) => setP({ ...p, description: e.target.value })} /></label>
      <label className="adm-field"><span>Preço (R$)</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" /></label>
      <PhotoInput value={p.photoUrl} onChange={(v) => setP({ ...p, photoUrl: v })} />
      <label className="inline-toggle"><Toggle on={!p.paused} label="Disponível" onChange={(v) => setP({ ...p, paused: !v })} /> {p.paused ? "Pausado" : "Disponível para pedir"}</label>
    </Sheet>
  );
}

function ExtraEditor({ kind, extra, onClose }: { kind: "crusts" | "addons"; extra: Extra | null; onClose: () => void }) {
  const backend = useBackend();
  const toast = useToast();
  const [name, setName] = useState(extra?.name ?? "");
  const [price, setPrice] = useState(extra ? moneyInput(extra.priceCents) : "");
  const [paused, setPaused] = useState(extra?.paused ?? false);
  return (
    <Sheet open onClose={onClose} title={extra ? `Editar ${extra.name}` : `Nova ${kind === "crusts" ? "borda" : "opção de adicional"}`} variant="center" className="adm adm-sheet" footer={
      <div className="adm-actions">
        {extra && <button className="adm-btn danger" onClick={async () => { await backend.admin.removeItem(kind, extra.id); toast("Removido"); onClose(); }}>Remover</button>}
        <button className="adm-btn primary grow" onClick={async () => {
          try {
            await backend.admin.saveExtra(kind, extra?.id ?? null, { name, priceCents: parseMoney(price) ?? -1, paused });
            toast(extra ? "Atualizado" : kind === "crusts" ? "Borda cadastrada" : "Adicional cadastrado");
            onClose();
          } catch (e) {
            toast(errorText(e), "error");
          }
        }}>Salvar</button>
      </div>
    }>
      <label className="adm-field"><span>Nome</span><input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-autofocus /></label>
      <label className="adm-field"><span>Preço (R$, o mesmo no Broto e na Grande)</span><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" /></label>
      <label className="inline-toggle"><Toggle on={!paused} label="Disponível" onChange={(v) => setPaused(!v)} /> {paused ? "Pausado" : "Disponível"}</label>
    </Sheet>
  );
}

type Editing =
  | { type: "flavor"; item: Flavor | null }
  | { type: "product"; item: Product | null }
  | { type: "extra"; kind: "crusts" | "addons"; item: Extra | null }
  | null;

export function MenuAdmin() {
  const backend = useBackend();
  const toast = useToast();
  const { data: menu, reload } = useData(() => backend.getMenu(), []);
  const [editing, setEditing] = useState<Editing>(null);
  const [tab, setTab] = useState<"sabores" | "bordas" | "adicionais" | "bebidas">("sabores");
  if (!menu) return <p className="adm-pad" role="status">Carregando…</p>;
  const close = () => { setEditing(null); reload(); };
  const pause = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); } catch (e) { toast(errorText(e), "error"); }
  };
  const tabs = [["sabores", "Sabores"], ["bordas", "Bordas"], ["adicionais", "Adicionais"], ["bebidas", "Bebidas"]] as const;
  return (
    <section>
      <div className="adm-head">
        <h1>Cardápio</h1>
        <button className="adm-btn primary" onClick={() => setEditing(
          tab === "sabores" ? { type: "flavor", item: null } : tab === "bebidas" ? { type: "product", item: null } : { type: "extra", kind: tab === "bordas" ? "crusts" : "addons", item: null },
        )}><Icon name="plus" size={18} /> Adicionar {tab === "sabores" ? "sabor" : tab === "bordas" ? "borda" : tab === "adicionais" ? "adicional" : "bebida"}</button>
      </div>
      <div className="adm-chips" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <p className="adm-muted small">Mudanças valem na hora para pedidos novos. Pedidos já feitos mantêm o preço de quando foram feitos.</p>

      {tab === "sabores" && (
        <ul className="item-list">
          {menu.flavors.map((f) => (
            <li key={f.id} className={f.paused ? "paused" : ""}>
              {f.photoUrl ? <img src={asset(f.photoUrl)} alt="" /> : <span className="photo-empty"><Icon name="pizza" /></span>}
              <div><strong>{f.name}</strong> <span className="adm-muted small">{f.kind === "pizza_doce" ? "Doce" : "Salgada"}</span>
                <span className="adm-muted small block">{menu.sizes.map((s) => `${s.name} ${formatBRL(f.prices[s.id] ?? 0)}`).join(" · ")}</span></div>
              <Toggle on={!f.paused} label={`${f.name} disponível`} onChange={(v) => pause(() => backend.admin.updateFlavor(f.id, { paused: !v }), v ? `${f.name} disponível` : `${f.name} pausado`)} />
              <button className="adm-btn" onClick={() => setEditing({ type: "flavor", item: f })}>Editar</button>
            </li>
          ))}
        </ul>
      )}
      {(tab === "bordas" || tab === "adicionais") && (() => {
        const kind = tab === "bordas" ? "crusts" : "addons";
        return (
          <ul className="item-list">
            {menu[kind].map((x) => (
              <li key={x.id} className={x.paused ? "paused" : ""}>
                <div><strong>{x.name}</strong><span className="adm-muted small block">+ {formatBRL(x.priceCents)}</span></div>
                <Toggle on={!x.paused} label={`${x.name} disponível`} onChange={(v) => pause(() => backend.admin.updateExtra(kind, x.id, { paused: !v }), v ? `${x.name} disponível` : `${x.name} pausado`)} />
                <button className="adm-btn" onClick={() => setEditing({ type: "extra", kind, item: x })}>Editar</button>
              </li>
            ))}
          </ul>
        );
      })()}
      {tab === "bebidas" && (
        <ul className="item-list">
          {menu.products.map((p) => (
            <li key={p.id} className={p.paused ? "paused" : ""}>
              {p.photoUrl ? <img src={asset(p.photoUrl)} alt="" /> : <span className="photo-empty"><Icon name="cart" /></span>}
              <div><strong>{p.name}</strong><span className="adm-muted small block">{formatBRL(p.priceCents)}{p.description ? ` · ${p.description}` : ""}</span></div>
              <Toggle on={!p.paused} label={`${p.name} disponível`} onChange={(v) => pause(() => backend.admin.updateExtra("products", p.id, { paused: !v }), v ? `${p.name} disponível` : `${p.name} pausado`)} />
              <button className="adm-btn" onClick={() => setEditing({ type: "product", item: p })}>Editar</button>
            </li>
          ))}
        </ul>
      )}

      {editing?.type === "flavor" && <FlavorEditor menu={menu} flavor={editing.item} onClose={close} onSaved={close} />}
      {editing?.type === "product" && <ProductEditor product={editing.item} onClose={close} />}
      {editing?.type === "extra" && <ExtraEditor kind={editing.kind} extra={editing.item} onClose={close} />}
    </section>
  );
}

type PromoDraft = { flavorId: string; sizeId: string; kind: "percent" | "manual"; value: string; photoUrl: string | null; active: boolean; editing: boolean };

export function PromotionsAdmin() {
  const backend = useBackend();
  const toast = useToast();
  const { data: menu, reload: reloadMenu } = useData(() => backend.getMenu(), []);
  const { data: promos, reload } = useData(() => backend.admin.promotions(), []);
  const [draft, setDraft] = useState<PromoDraft | null>(null);
  const [newFlavor, setNewFlavor] = useState(false);
  useEffect(() => {
    if (draft && menu && !draft.flavorId && menu.flavors[0]) setDraft({ ...draft, flavorId: menu.flavors[0].id });
  }, [draft, menu]);
  if (!menu || !promos) return <p className="adm-pad" role="status">Carregando…</p>;
  const flavor = (id: string) => menu.flavors.find((f) => f.id === id);
  const size = (id: string) => menu.sizes.find((s) => s.id === id);
  const refresh = () => { reload(); reloadMenu(); };
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast(msg); refresh(); return true; } catch (e) { toast(errorText(e), "error"); return false; }
  };
  const open = (p?: AdminMenuPromotion) => setDraft(p
    ? { flavorId: p.flavorId, sizeId: p.sizeId, kind: p.kind, value: p.kind === "percent" ? String(p.percent ?? "").replace(".", ",") : moneyInput(p.priceCents), photoUrl: p.photoUrl ?? null, active: p.active, editing: true }
    : { flavorId: menu.flavors[0]?.id ?? "", sizeId: menu.sizes[menu.sizes.length - 1]?.id ?? "", kind: "percent", value: "10", photoUrl: null, active: true, editing: false });

  const list = draft ? flavor(draft.flavorId)?.prices[draft.sizeId] ?? 0 : 0;
  const preview = draft ? (draft.kind === "percent" ? Math.round(list * (1 - Number(draft.value.replace(",", ".")) / 100)) : parseMoney(draft.value) ?? 0) : 0;
  return (
    <section>
      <div className="adm-head">
        <h1>Promoções</h1>
        <button className="adm-btn primary" onClick={() => open()}><Icon name="plus" size={18} /> Nova promoção</button>
      </div>
      <p className="adm-muted small">Aparecem no carrossel do site. Valem para a pizza de um sabor só, no tamanho escolhido, com desconto em percentual ou valor fixo.</p>
      <ul className="item-list">
        {promos.length === 0 && <li className="adm-muted">Nenhuma promoção cadastrada.</li>}
        {promos.map((p) => {
          const f = flavor(p.flavorId);
          const shown = menu.promotions.find((x) => x.flavorId === p.flavorId && x.sizeId === p.sizeId);
          const photo = p.photoUrl ?? f?.photoUrl;
          return (
            <li key={p.flavorId + p.sizeId} className={p.active ? "" : "paused"}>
              {photo ? <img src={asset(photo)} alt="" /> : <span className="photo-empty"><Icon name="pizza" /></span>}
              <div><strong>{f?.name ?? "Sabor removido"}</strong> <span className="adm-muted small">{size(p.sizeId)?.name}</span>
                <span className="adm-muted small block">
                  {p.kind === "percent" ? `${String(p.percent).replace(".", ",")}% de desconto` : "valor fixo"} · de {formatBRL(f?.prices[p.sizeId] ?? 0)} por {shown ? formatBRL(shown.promoCents) : "—"}
                  {p.photoUrl ? " · foto própria" : ""}
                </span></div>
              <Toggle on={p.active} label="Promoção ativa" onChange={(v) => run(() => backend.admin.setPromotion({ ...p, active: v }), v ? "Promoção ativada" : "Promoção desativada")} />
              <button className="adm-btn" onClick={() => open(p)}>Editar</button>
            </li>
          );
        })}
      </ul>

      {draft && !newFlavor && (
        <Sheet open onClose={() => setDraft(null)} title={draft.editing ? "Editar promoção" : "Nova promoção"} className="adm adm-sheet" footer={
          <div className="adm-actions">
            {draft.editing && <button className="adm-btn danger" onClick={async () => { if (await run(() => backend.admin.removePromotion(draft.flavorId, draft.sizeId), "Promoção removida")) setDraft(null); }}>Remover</button>}
            <button className="adm-btn primary grow" onClick={async () => {
              const promo: AdminMenuPromotion = {
                flavorId: draft.flavorId, sizeId: draft.sizeId, kind: draft.kind, active: draft.active, photoUrl: draft.photoUrl,
                percent: draft.kind === "percent" ? Number(draft.value.replace(",", ".")) : null,
                priceCents: draft.kind === "manual" ? parseMoney(draft.value) : null,
              };
              if (await run(() => backend.admin.setPromotion(promo), "Promoção salva")) setDraft(null);
            }}>Salvar promoção</button>
          </div>
        }>
          <label className="adm-field"><span>Sabor</span>
            <select value={draft.flavorId} disabled={draft.editing} onChange={(e) => setDraft({ ...draft, flavorId: e.target.value })}>
              {menu.flavors.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.kind === "pizza_doce" ? "doce" : "salgada"})</option>)}
            </select>
          </label>
          {!draft.editing && <button type="button" className="adm-link" onClick={() => setNewFlavor(true)}>+ Cadastrar um sabor novo para esta promoção</button>}
          <div className="adm-grid-2">
            <label className="adm-field"><span>Tamanho</span>
              <select value={draft.sizeId} disabled={draft.editing} onChange={(e) => setDraft({ ...draft, sizeId: e.target.value })}>{menu.sizes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </label>
            <label className="adm-field"><span>Tipo de desconto</span>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "percent" | "manual", value: e.target.value === "percent" ? "10" : "" })}>
                <option value="percent">Percentual (%)</option><option value="manual">Valor fixo da pizza (R$)</option>
              </select>
            </label>
          </div>
          <label className="adm-field"><span>{draft.kind === "percent" ? "Desconto (%)" : "Preço promocional (R$)"}</span><input inputMode="decimal" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} /></label>
          <p className="adm-note">De {formatBRL(list)} por <strong>{preview > 0 && preview < list ? formatBRL(preview) : "—"}</strong>{preview >= list && list > 0 ? " · o preço promocional precisa ser menor que o normal" : ""}</p>
          <PhotoInput label="Foto da promoção (opcional; sem foto, usa a do sabor)" value={draft.photoUrl} onChange={(v) => setDraft({ ...draft, photoUrl: v })} />
          <label className="inline-toggle"><Toggle on={draft.active} label="Ativa" onChange={(v) => setDraft({ ...draft, active: v })} /> {draft.active ? "Ativa no site" : "Desativada"}</label>
        </Sheet>
      )}
      {draft && newFlavor && (
        <FlavorEditor menu={menu} flavor={null} onClose={() => setNewFlavor(false)} onSaved={(id) => { setNewFlavor(false); reloadMenu(); setDraft({ ...draft, flavorId: id }); }} />
      )}
    </section>
  );
}
