// Painel do dono: loja (horários, entrega, tempos, PIX,
// privacidade, demonstração) e aparência (paletas, cores personalizadas com checagem de contraste).
import { useEffect, useState } from "react";
import { WEEKDAY_NAMES, type OpeningHour } from "@shared/domain/hours.ts";
import type { FeeBand } from "@shared/domain/delivery.ts";
import {
  PRESETS, PRESET_IDS, PRESET_NAMES, canSaveTheme, checkContrast, isHexColor, resolveTheme, type CustomColors, type ThemeSetting,
} from "@shared/domain/theme.ts";
import { useBackend, useData, type AdminSettings, type OpenMode } from "../lib/backend.ts";
import { moneyInput, parseMoney } from "../lib/format.ts";
import { Sheet, errorText, useToast } from "../ui/ui.tsx";

export function StoreSettings() {
  const backend = useBackend();
  const toast = useToast();
  const { data } = useData(() => backend.admin.settings(), []);
  const [s, setS] = useState<AdminSettings | null>(null);
  const [freeOn, setFreeOn] = useState(false);
  const [minOn, setMinOn] = useState(false);
  const [phone, setPhone] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data && !s) {
      setS(data);
      setFreeOn(data.freeShippingAboveCents !== null);
      setMinOn(data.minOrderCents !== null);
    }
  }, [data, s]);
  if (!s) return <p className="adm-pad" role="status">Carregando…</p>;

  const setHour = (i: number, patch: Partial<OpeningHour>) => setS({ ...s, hours: s.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  const setBand = (i: number, patch: Partial<FeeBand>) => setS({ ...s, bands: s.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) });
  const save = async (patch: Partial<AdminSettings>, ok = "Configurações salvas") => {
    setSaving(true);
    try {
      await backend.admin.updateSettings(patch);
      toast(ok);
    } catch (e) {
      toast(errorText(e), "error");
    } finally {
      setSaving(false);
    }
  };
  const num = (v: string) => Number(v.replace(",", "."));
  return (
    <section>
      <div className="adm-head"><h1>Loja, entrega e horários</h1></div>

      {backend.mode === "local" && (
        <div className="adm-card">
          <h2>Funcionamento na demonstração</h2>
          <p className="adm-muted small">Para apresentar a qualquer hora. No site instalado, vale sempre o horário de funcionamento.</p>
          <div className="adm-chips" role="radiogroup">
            {([["aberta", "Sempre aberta"], ["horarios", "Seguir os horários"], ["fechada", "Simular fechada"]] as Array<[OpenMode, string]>).map(([k, label]) => (
              <button key={k} role="radio" aria-checked={s.openMode === k} className={s.openMode === k ? "on" : ""} onClick={() => { setS({ ...s, openMode: k }); void save({ openMode: k }, label); }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <div className="adm-card">
        <h2>Horários de funcionamento</h2>
        <p className="adm-muted small">Se fechar depois da meia-noite (ex.: 18:00 às 01:00), o horário conta para o dia em que abre.</p>
        <ul className="hours-admin">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const i = s.hours.findIndex((h) => h.weekday === d);
            const h = s.hours[i];
            if (!h) return null;
            return (
              <li key={d}>
                <strong>{WEEKDAY_NAMES[d]}</strong>
                <label className="inline"><input type="checkbox" checked={!h.closed} onChange={(e) => setHour(i, { closed: !e.target.checked })} /> Abre</label>
                <input type="time" aria-label={`Abre ${WEEKDAY_NAMES[d]}`} value={h.opens} disabled={h.closed} onChange={(e) => setHour(i, { opens: e.target.value })} />
                <span>às</span>
                <input type="time" aria-label={`Fecha ${WEEKDAY_NAMES[d]}`} value={h.closes} disabled={h.closed} onChange={(e) => setHour(i, { closes: e.target.value })} />
              </li>
            );
          })}
        </ul>
        <button className="adm-btn primary" disabled={saving} onClick={() => save({ hours: s.hours }, "Horários salvos")}>Salvar horários</button>
      </div>

      <div className="adm-card">
        <h2>Entrega</h2>
        <div className="adm-grid-3">
          <label className="adm-field"><span>Raio máximo (km)</span><input inputMode="decimal" value={String(s.radiusKm).replace(".", ",")} onChange={(e) => setS({ ...s, radiusKm: num(e.target.value) || 0 })} /></label>
          <label className="adm-field"><span><input type="checkbox" checked={freeOn} onChange={(e) => setFreeOn(e.target.checked)} /> Entrega grátis acima de (R$)</span>
            <input inputMode="decimal" disabled={!freeOn} value={moneyInput(s.freeShippingAboveCents ?? 12000)} onChange={(e) => setS({ ...s, freeShippingAboveCents: parseMoney(e.target.value) })} /></label>
          <label className="adm-field"><span><input type="checkbox" checked={minOn} onChange={(e) => setMinOn(e.target.checked)} /> Pedido mínimo (R$)</span>
            <input inputMode="decimal" disabled={!minOn} value={moneyInput(s.minOrderCents ?? 4000)} onChange={(e) => setS({ ...s, minOrderCents: parseMoney(e.target.value) })} /></label>
        </div>
        <h3>Taxa por faixa de distância</h3>
        <table className="adm-table bands">
          <thead><tr><th>De (km)</th><th>Até (km)</th><th className="num">Taxa (R$)</th><th /></tr></thead>
          <tbody>
            {s.bands.map((b, i) => (
              <tr key={i}>
                <td><input inputMode="decimal" aria-label="De" value={String(b.fromKm).replace(".", ",")} onChange={(e) => setBand(i, { fromKm: num(e.target.value) || 0 })} /></td>
                <td><input inputMode="decimal" aria-label="Até" value={String(b.toKm).replace(".", ",")} onChange={(e) => setBand(i, { toKm: num(e.target.value) || 0 })} /></td>
                <td className="num"><input inputMode="decimal" aria-label="Taxa" value={moneyInput(b.feeCents)} onChange={(e) => setBand(i, { feeCents: parseMoney(e.target.value) ?? 0 })} /></td>
                <td><button className="adm-link" onClick={() => setS({ ...s, bands: s.bands.filter((_, j) => j !== i) })}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="adm-link" onClick={() => { const last = s.bands[s.bands.length - 1]; setS({ ...s, bands: [...s.bands, { fromKm: last?.toKm ?? 0, toKm: (last?.toKm ?? 0) + 2, feeCents: 1000 }] }); }}>+ Adicionar faixa</button>
        <p className="adm-muted small">As faixas precisam começar em 0 km, não ter buracos e terminar no raio máximo.</p>
        <div className="adm-grid-3">
          <label className="adm-field"><span>Entrega: de (min)</span><input type="number" value={s.estDelivery.min} onChange={(e) => setS({ ...s, estDelivery: { ...s.estDelivery, min: +e.target.value } })} /></label>
          <label className="adm-field"><span>até (min)</span><input type="number" value={s.estDelivery.max} onChange={(e) => setS({ ...s, estDelivery: { ...s.estDelivery, max: +e.target.value } })} /></label>
          <label className="adm-field"><span>Prazo do PIX (min)</span><input type="number" value={s.pixExpiryMinutes} onChange={(e) => setS({ ...s, pixExpiryMinutes: +e.target.value })} /></label>
          <label className="adm-field"><span>Retirada: de (min)</span><input type="number" value={s.estPickup.min} onChange={(e) => setS({ ...s, estPickup: { ...s.estPickup, min: +e.target.value } })} /></label>
          <label className="adm-field"><span>até (min)</span><input type="number" value={s.estPickup.max} onChange={(e) => setS({ ...s, estPickup: { ...s.estPickup, max: +e.target.value } })} /></label>
        </div>
        <button className="adm-btn primary" disabled={saving} onClick={() => save({
          radiusKm: s.radiusKm, bands: s.bands, freeShippingAboveCents: freeOn ? s.freeShippingAboveCents ?? 12000 : null,
          minOrderCents: minOn ? s.minOrderCents ?? 4000 : null, estDelivery: s.estDelivery, estPickup: s.estPickup, pixExpiryMinutes: s.pixExpiryMinutes,
        }, "Entrega salva")}>Salvar entrega</button>
      </div>

      <div className="adm-card">
        <h2>Bot de WhatsApp</h2>
        <label className="adm-field"><span>URL do webhook do bot</span>
          <input value={s.botWebhookUrl} placeholder="https://seu-bot.exemplo.com/webhook" disabled={backend.mode === "local"} onChange={(e) => setS({ ...s, botWebhookUrl: e.target.value })} />
        </label>
        <p className="adm-muted small">{backend.mode === "local" ? "Na demonstração nenhuma mensagem é enviada. Na versão oficial, cada mudança de status vai para esta URL com assinatura de segurança." : "Cada mudança de status é enviada para esta URL com assinatura de segurança."}</p>
      </div>

      <div className="adm-card">
        <h2>Privacidade</h2>
        <p className="adm-muted small">Se um cliente pedir, apague os dados pessoais dele. Os valores dos pedidos continuam no resumo.</p>
        <div className="promo-new">
          <label className="adm-field"><span>Telefone do cliente</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></label>
          <button className="adm-btn" onClick={async () => {
            try {
              const n = await backend.admin.anonymizeByPhone(phone);
              toast(n ? `Dados apagados em ${n} pedido(s)` : "Nenhum pedido com esse telefone", n ? "ok" : "info");
              setPhone("");
            } catch (e) {
              toast(errorText(e), "error");
            }
          }}>Apagar dados</button>
        </div>
      </div>

      {backend.mode === "local" && (
        <div className="adm-card">
          <h2>Dados de demonstração</h2>
          <p className="adm-muted small">Apaga os pedidos de teste e volta o cardápio, as configurações e as cores ao estado inicial.</p>
          <button className="adm-btn danger" onClick={() => setConfirmReset(true)}>Restaurar dados de demonstração</button>
        </div>
      )}
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Restaurar demonstração?" variant="center" className="adm adm-sheet" footer={
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => setConfirmReset(false)}>Voltar</button>
          <button className="adm-btn danger" onClick={async () => { await backend.admin.resetDemo(); setConfirmReset(false); toast("Demonstração restaurada"); setS(null); }}>Restaurar</button>
        </div>
      }>
        <p>Os pedidos feitos neste aparelho serão apagados, e preços, horários e cores voltam ao padrão.</p>
      </Sheet>
    </section>
  );
}

export function Appearance() {
  const backend = useBackend();
  const toast = useToast();
  const { data } = useData(() => backend.admin.settings(), []);
  const [theme, setTheme] = useState<ThemeSetting | null>(null);
  const [custom, setCustom] = useState<CustomColors>({ bg: "#17100c", text: "#f5ecdc", accent: "#c62828", secondary: "#e9b872" });
  const [name, setName] = useState("");
  const [story, setStory] = useState("");
  useEffect(() => {
    if (data && !theme) {
      setTheme(data.theme);
      if (data.theme.preset === "personalizada") setCustom(data.theme.custom);
      setName(data.name);
      setStory(data.story);
    }
  }, [data, theme]);
  if (!theme) return <p className="adm-pad" role="status">Carregando…</p>;
  const current: ThemeSetting = theme.preset === "personalizada" ? { preset: "personalizada", custom } : theme;
  const tokens = resolveTheme(current).tokens;
  const checks = checkContrast(tokens);
  const ok = canSaveTheme(tokens) && (current.preset !== "personalizada" || Object.values(custom).every(isHexColor));
  const save = async (patch: Partial<AdminSettings>, msg: string) => {
    try {
      await backend.admin.updateSettings(patch);
      toast(msg);
    } catch (e) {
      toast(errorText(e), "error");
    }
  };
  return (
    <section>
      <div className="adm-head"><h1>Aparência do site</h1></div>
      <div className="adm-card">
        <h2>Paleta de cores</h2>
        <div className="palettes">
          {PRESET_IDS.map((id) => {
            const t = PRESETS[id];
            return (
              <button key={id} className={`palette ${theme.preset === id ? "on" : ""}`} aria-pressed={theme.preset === id} onClick={() => setTheme({ preset: id })}>
                <span className="swatches">{[t.bg, t.card, t.accent, t.secondary, t.text].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                {PRESET_NAMES[id]}
              </button>
            );
          })}
          <button className={`palette ${theme.preset === "personalizada" ? "on" : ""}`} aria-pressed={theme.preset === "personalizada"} onClick={() => setTheme({ preset: "personalizada", custom })}>
            <span className="swatches">{[custom.bg, custom.text, custom.accent, custom.secondary].map((c, i) => <i key={i} style={{ background: c }} />)}</span>
            Personalizada
          </button>
        </div>
        {theme.preset === "personalizada" && (
          <div className="adm-grid-4">
            {([["bg", "Fundo"], ["text", "Texto"], ["accent", "Destaque (botões)"], ["secondary", "Secundária (rótulos)"]] as Array<[keyof CustomColors, string]>).map(([k, label]) => (
              <label key={k} className="adm-field color"><span>{label}</span>
                <input type="color" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
              </label>
            ))}
          </div>
        )}
        <div className="preview" style={{ background: tokens.bg, color: tokens.text, borderColor: tokens.border }}>
          <span style={{ color: tokens.secondary }} className="preview-eyebrow">Prévia</span>
          <strong className="preview-title">{name || "Sua pizzaria"}</strong>
          <span className="preview-card" style={{ background: tokens.card, borderColor: tokens.border }}>
            <span>Margherita</span><span style={{ color: tokens.muted }}>Molho de tomate, muçarela e manjericão.</span>
            <span className="preview-btn" style={{ background: tokens.accent, color: tokens.accentText }}>Adicionar</span>
          </span>
        </div>
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.pair} className={c.pass ? "pass" : c.blocking ? "fail" : "warn"}>
              <span>{c.pass ? "OK" : c.blocking ? "Ilegível" : "Atenção"}</span> {c.pair}: {String(c.ratio).replace(".", ",")}:1 <span className="adm-muted">(mínimo {String(c.required).replace(".", ",")}:1)</span>
            </li>
          ))}
        </ul>
        <button className="adm-btn primary" disabled={!ok} onClick={() => save({ theme: current }, "Cores aplicadas ao site")}>{ok ? "Aplicar ao site" : "Ajuste as cores para salvar"}</button>
      </div>
      <div className="adm-card">
        <h2>Nome e história</h2>
        <label className="adm-field"><span>Nome da pizzaria</span><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
        <label className="adm-field"><span>Texto "Nossa história"</span><textarea rows={5} maxLength={4000} value={story} onChange={(e) => setStory(e.target.value)} /></label>
        <button className="adm-btn primary" onClick={() => save({ name, story }, "Textos salvos")}>Salvar textos</button>
        <p className="adm-muted small">Logo, fotos, contatos e redes sociais também ficam aqui na versão instalada (envio de imagens pelo servidor).</p>
      </div>
    </section>
  );
}
