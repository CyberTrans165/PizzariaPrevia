// Temas editáveis (ETAPA 2): 5 paletas prontas e a Personalizada com 4 cores.
// As cores derivadas seguem exatamente a regra do protótipo aprovado no Design.
// Contraste conforme WCAG 2.x: 4,5:1 para texto normal, 3:1 para texto grande e contornos.

export interface ThemeTokens {
  bg: string;
  bgSection: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  secondary: string;
  footer: string;
  footerText: string;
  ok: string;
}

export const PRESET_IDS = [
  "forno-a-lenha",
  "trattoria-creme",
  "basilico",
  "moderno-claro",
  "napoli",
] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const PRESET_NAMES: Record<PresetId, string> = {
  "forno-a-lenha": "Forno a Lenha",
  "trattoria-creme": "Trattoria Creme",
  basilico: "Basílico",
  "moderno-claro": "Moderno Claro",
  napoli: "Napoli",
};

export const PRESETS: Record<PresetId, ThemeTokens> = {
  "forno-a-lenha": {
    bg: "#17100c", bgSection: "#1f1510", card: "#231913", border: "#3a2a20", text: "#f5ecdc",
    muted: "#d8c9b0", accent: "#c62828", accentText: "#ffffff", secondary: "#e9b872",
    footer: "#0f0a07", footerText: "#d8c9b0", ok: "#7fbf6a",
  },
  "trattoria-creme": {
    bg: "#f7f0e1", bgSection: "#efe3cb", card: "#fffaf0", border: "#e0d0b0", text: "#2b1d14",
    muted: "#5a4636", accent: "#b3261e", accentText: "#ffffff", secondary: "#2f6b3a",
    footer: "#1f4d2b", footerText: "#f7f0e1", ok: "#2f6b3a",
  },
  basilico: {
    bg: "#0f1f15", bgSection: "#13261a", card: "#172b1d", border: "#2a4632", text: "#eef3e6",
    muted: "#c3d3bf", accent: "#247a3f", accentText: "#ffffff", secondary: "#e9c46a",
    footer: "#08140d", footerText: "#c3d3bf", ok: "#8fd694",
  },
  "moderno-claro": {
    bg: "#ffffff", bgSection: "#f4efe8", card: "#faf7f2", border: "#e4ded5", text: "#141110",
    muted: "#5e5046", accent: "#d62f23", accentText: "#ffffff", secondary: "#1f5a2e",
    footer: "#141110", footerText: "#f1e8dc", ok: "#1f5a2e",
  },
  napoli: {
    bg: "#0d1626", bgSection: "#111d31", card: "#16233a", border: "#263652", text: "#eaf0fa",
    muted: "#b9c6dc", accent: "#cf3b27", accentText: "#ffffff", secondary: "#f2c14e",
    footer: "#080e1a", footerText: "#b9c6dc", ok: "#7bd88f",
  },
};

/** As 4 cores escolhidas na paleta Personalizada. */
export interface CustomColors {
  bg: string;
  text: string;
  accent: string;
  secondary: string;
}

/** Como o tema fica guardado em store_settings.theme. */
export type ThemeSetting =
  | { preset: PresetId }
  | { preset: "personalizada"; custom: CustomColors };

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mistura a com b; t = 0 dá a, t = 1 dá b. */
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return (
    "#" +
    [0, 1, 2]
      .map((i) => Math.round((x[i] ?? 0) * (1 - t) + (y[i] ?? 0) * t).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto sobre o botão: quase preto ou branco, o que contrastar mais (regra do protótipo). */
export function textOn(hex: string): string {
  return relativeLuminance(hex) > 0.4 ? "#141110" : "#ffffff";
}

/** Deriva todas as cores a partir das 4 escolhidas (mesma regra do protótipo). */
export function deriveTokens(c: CustomColors): ThemeTokens {
  return {
    bg: c.bg,
    bgSection: mix(c.bg, c.text, 0.03),
    card: mix(c.bg, c.text, 0.06),
    border: mix(c.bg, c.text, 0.14),
    text: c.text,
    muted: mix(c.text, c.bg, 0.25),
    accent: c.accent,
    accentText: textOn(c.accent),
    secondary: c.secondary,
    footer: mix(c.bg, "#000000", 0.35),
    footerText: mix(c.text, c.bg, 0.25),
    ok: "#7fbf6a",
  };
}

export function resolveTheme(setting: unknown): { preset: PresetId | "personalizada"; tokens: ThemeTokens } {
  const s = setting as Partial<{ preset: string; custom: Partial<CustomColors> }> | null;
  if (s?.preset === "personalizada" && s.custom) {
    const { bg, text, accent, secondary } = s.custom;
    if ([bg, text, accent, secondary].every(isHexColor)) {
      return {
        preset: "personalizada",
        tokens: deriveTokens({ bg, text, accent, secondary } as CustomColors),
      };
    }
  }
  const id = (PRESET_IDS as readonly string[]).includes(s?.preset ?? "")
    ? (s?.preset as PresetId)
    : "forno-a-lenha";
  return { preset: id, tokens: PRESETS[id] };
}

export interface ContrastCheck {
  pair: string;
  foreground: keyof ThemeTokens;
  background: keyof ThemeTokens;
  ratio: number;
  required: number;
  /** true: abaixo do mínimo impede salvar no ADM; false: só aviso */
  blocking: boolean;
  pass: boolean;
}

const PAIRS: Array<[string, keyof ThemeTokens, keyof ThemeTokens, number, boolean]> = [
  ["Texto principal sobre o fundo", "text", "bg", 4.5, true],
  ["Texto principal sobre os cartões", "text", "card", 4.5, true],
  ["Texto principal sobre as seções", "text", "bgSection", 4.5, true],
  ["Texto do botão sobre o destaque", "accentText", "accent", 4.5, true],
  ["Texto secundário sobre o fundo", "muted", "bg", 4.5, false],
  ["Texto secundário sobre os cartões", "muted", "card", 4.5, false],
  ["Cor secundária (rótulos) sobre o fundo", "secondary", "bg", 4.5, false],
  ["Texto do rodapé sobre o rodapé", "footerText", "footer", 4.5, false],
  ["Botão de destaque sobre o fundo (contorno)", "accent", "bg", 3, false],
];

export function checkContrast(tokens: ThemeTokens): ContrastCheck[] {
  return PAIRS.map(([pair, fg, bg, required, blocking]) => {
    const ratio = Math.round(contrastRatio(tokens[fg], tokens[bg]) * 100) / 100;
    return { pair, foreground: fg, background: bg, ratio, required, blocking, pass: ratio >= required };
  });
}

/** O ADM só salva se nenhum par obrigatório falhar. */
export function canSaveTheme(tokens: ThemeTokens): boolean {
  return checkContrast(tokens).every((c) => c.pass || !c.blocking);
}

/** Nomes das variáveis CSS usadas pelos componentes (`--bg`, `--text`, ...). */
export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--bg": tokens.bg,
    "--bg-section": tokens.bgSection,
    "--card": tokens.card,
    "--border": tokens.border,
    "--text": tokens.text,
    "--muted": tokens.muted,
    "--accent": tokens.accent,
    "--accent-text": tokens.accentText,
    "--secondary": tokens.secondary,
    "--footer": tokens.footer,
    "--footer-text": tokens.footerText,
    "--ok": tokens.ok,
  };
}
