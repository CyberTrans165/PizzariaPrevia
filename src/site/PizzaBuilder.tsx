// Montar a pizza (ETAPA 4): tamanho, 1 sabor (inteira) ou até 3 (meio a meio, só na Grande),
// retirar ingredientes, borda, adicionais, observação e quantidade. O preço mostrado usa a mesma
// regra do servidor (sabor mais caro); o valor final é sempre conferido no servidor.
import { useMemo, useState } from "react";
import { MAX_ITEM_NOTE, priceCart, type FlavorKind, type PizzaItemInput } from "@shared/domain/pricing.ts";
import type { MenuResponse } from "../lib/backend.ts";
import { asset, formatBRL } from "../lib/format.ts";
import { Sheet, Stepper } from "../ui/ui.tsx";
import { menuCatalog } from "./describe.ts";

export interface BuilderConfig {
  mode: "inteira" | "meio";
  kind: FlavorKind;
  flavorId?: string;
  sizeId?: string;
  editUid?: string;
  initial?: PizzaItemInput;
}

export function PizzaBuilder({ config, menu, onClose, onDone }: {
  config: BuilderConfig;
  menu: MenuResponse;
  onClose: () => void;
  onDone: (item: PizzaItemInput, editUid?: string) => void;
}) {
  const [mode, setMode] = useState(config.mode);
  const multi = menu.sizes.filter((s) => s.maxFlavors > 1);
  const biggest = [...menu.sizes].sort((a, b) => b.slices - a.slices)[0];
  const init = config.initial;
  const [sizeId, setSizeId] = useState(init?.sizeId ?? config.sizeId ?? (mode === "meio" ? multi[0]?.id : biggest?.id) ?? "");
  const [flavorIds, setFlavorIds] = useState<string[]>(init?.flavorIds ?? (config.flavorId ? [config.flavorId] : []));
  const [crustId, setCrustId] = useState<string | null>(init?.crustId ?? null);
  const [addonIds, setAddonIds] = useState<string[]>(init?.addonIds ?? []);
  const [removed, setRemoved] = useState<string[]>(init?.removedIngredients ?? []);
  const [note, setNote] = useState(init?.note ?? "");
  const [qty, setQty] = useState(init?.quantity ?? 1);

  const size = menu.sizes.find((s) => s.id === sizeId);
  const max = mode === "meio" ? size?.maxFlavors ?? 1 : 1;
  const kindFlavors = menu.flavors.filter((f) => f.kind === config.kind);
  const chosen = flavorIds.map((id) => menu.flavors.find((f) => f.id === id)).filter((f) => !!f);
  const ingredients = [...new Set(chosen.flatMap((f) => f.ingredients))];
  const catalog = useMemo(() => menuCatalog(menu), [menu]);

  const item: PizzaItemInput = {
    kind: "pizza", sizeId, flavorIds, crustId, addonIds, quantity: qty,
    removedIngredients: removed.filter((r) => ingredients.includes(r)), note: note.trim(),
  };
  const priced = flavorIds.length ? priceCart(catalog, [item]) : null;
  const unit = priced?.ok ? priced.items[0] : null;
  const needMore = mode === "meio" && flavorIds.length < 2;
  const problem = !flavorIds.length ? "Escolha um sabor." : needMore ? "Escolha pelo menos 2 sabores para o meio a meio." : priced && !priced.ok ? priced.issues[0]?.message : null;

  const pickSize = (id: string) => {
    setSizeId(id);
    const s = menu.sizes.find((x) => x.id === id);
    if (s && flavorIds.length > s.maxFlavors) setFlavorIds(flavorIds.slice(0, s.maxFlavors));
  };
  const toggleFlavor = (id: string) => {
    if (max === 1) return setFlavorIds([id]);
    setFlavorIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < max ? [...list, id] : list));
  };
  const switchMode = (m: "inteira" | "meio") => {
    setMode(m);
    if (m === "meio") {
      if (size && size.maxFlavors < 2 && multi[0]) setSizeId(multi[0].id);
    } else setFlavorIds((l) => l.slice(0, 1));
  };

  const title = config.editUid ? "Editar pizza" : `${config.kind === "pizza_doce" ? "Pizza doce" : "Pizza"} ${mode === "meio" ? "meio a meio" : "inteira"}`;
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="builder-foot">
          <Stepper value={qty} onChange={setQty} label="Quantidade" />
          <button className="btn btn-primary btn-grow" disabled={!unit || needMore} onClick={() => onDone(item, config.editUid)} data-testid="builder-add">
            {config.editUid ? "Salvar" : "Adicionar"} {unit && !needMore ? `· ${formatBRL(unit.totalCents)}` : ""}
          </button>
        </div>
      }
    >
      <div className="seg" role="radiogroup" aria-label="Tipo de pizza">
        <button role="radio" aria-checked={mode === "inteira"} className={mode === "inteira" ? "on" : ""} onClick={() => switchMode("inteira")}>Inteira (1 sabor)</button>
        <button role="radio" aria-checked={mode === "meio"} className={mode === "meio" ? "on" : ""} onClick={() => switchMode("meio")} disabled={!multi.length}>Meio a meio</button>
      </div>

      <fieldset className="field-group">
        <legend>Tamanho</legend>
        <div className="choice-row">
          {menu.sizes.map((s) => {
            const disabled = mode === "meio" && s.maxFlavors < 2;
            return (
              <label key={s.id} className={`choice ${sizeId === s.id ? "on" : ""} ${disabled ? "disabled" : ""}`}>
                <input type="radio" name="size" checked={sizeId === s.id} disabled={disabled} onChange={() => pickSize(s.id)} />
                <span className="choice-main">{s.name}</span>
                <span className="small muted">{s.slices} fatias · {s.maxFlavors === 1 ? "1 sabor" : `até ${s.maxFlavors} sabores`}</span>
              </label>
            );
          })}
        </div>
        {mode === "meio" && <p className="hint">O meio a meio é só na {multi.map((s) => s.name).join(" ou ")}. O preço é o do sabor mais caro.</p>}
      </fieldset>

      <fieldset className="field-group">
        <legend>
          {max === 1 ? "Sabor" : "Sabores"} {max > 1 && <span className="counter">{flavorIds.length} de {max}</span>}
        </legend>
        <ul className="flavor-pick">
          {kindFlavors.map((f) => {
            const price = f.prices[sizeId];
            const promo = menu.promotions.find((p) => p.flavorId === f.id && p.sizeId === sizeId);
            const on = flavorIds.includes(f.id);
            const full = !on && max > 1 && flavorIds.length >= max;
            return (
              <li key={f.id}>
                <label className={`flavor-opt ${on ? "on" : ""} ${f.paused || full ? "disabled" : ""}`}>
                  <input type={max === 1 ? "radio" : "checkbox"} name="flavor" checked={on} disabled={f.paused || full || price === undefined} onChange={() => toggleFlavor(f.id)} />
                  <img src={asset(f.photoUrl)} alt="" />
                  <span className="flavor-text">
                    <strong>{f.name}</strong>
                    <span className="small muted">{f.paused ? "Indisponível no momento" : f.description}</span>
                  </span>
                  <span className="flavor-price">
                    {promo && max === 1 ? <><s className="small">{formatBRL(promo.listCents)}</s> {formatBRL(promo.promoCents)}</> : price !== undefined ? formatBRL(price) : "—"}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {ingredients.length > 0 && (
        <fieldset className="field-group">
          <legend>Retirar ingredientes <span className="small muted">(toque para tirar)</span></legend>
          <div className="chips">
            {ingredients.map((ing) => {
              const off = removed.includes(ing);
              return (
                <button key={ing} type="button" className={`chip ${off ? "off" : ""}`} aria-pressed={off} onClick={() => setRemoved((r) => (off ? r.filter((x) => x !== ing) : [...r, ing]))}>
                  {off ? `Sem ${ing}` : ing}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset className="field-group">
        <legend>Borda recheada</legend>
        <div className="option-list">
          <label className="opt"><input type="radio" name="crust" checked={crustId === null} onChange={() => setCrustId(null)} /> <span>Sem borda recheada</span></label>
          {menu.crusts.map((c) => (
            <label key={c.id} className={`opt ${c.paused ? "disabled" : ""}`}>
              <input type="radio" name="crust" checked={crustId === c.id} disabled={c.paused} onChange={() => setCrustId(c.id)} />
              <span>{c.name}{c.paused && " (indisponível)"}</span>
              <span className="opt-price">+ {formatBRL(c.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>Adicionais</legend>
        <div className="option-list">
          {menu.addons.map((a) => (
            <label key={a.id} className={`opt ${a.paused ? "disabled" : ""}`}>
              <input type="checkbox" checked={addonIds.includes(a.id)} disabled={a.paused} onChange={(e) => setAddonIds((l) => (e.target.checked ? [...l, a.id] : l.filter((x) => x !== a.id)))} />
              <span>{a.name}{a.paused && " (indisponível)"}</span>
              <span className="opt-price">+ {formatBRL(a.priceCents)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>Observação <span className="small muted">(opcional)</span></span>
        <textarea rows={2} maxLength={MAX_ITEM_NOTE} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: bem assada, cortar em 12" />
      </label>
      {problem && flavorIds.length > 0 && <p className="hint warn" role="status">{problem}</p>}
    </Sheet>
  );
}
