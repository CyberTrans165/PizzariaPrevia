import { describe, expect, it } from "vitest";
import {
  PRESETS, PRESET_IDS, canSaveTheme, checkContrast, contrastRatio, deriveTokens, mix, resolveTheme, textOn,
} from "./theme.ts";

describe("contraste", () => {
  it("valores de referência do WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("mistura de cores igual à do protótipo", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#17100c", "#f5ecdc", 0)).toBe("#17100c");
  });

  it("texto sobre o botão escolhe preto ou branco", () => {
    expect(textOn("#c62828")).toBe("#ffffff");
    expect(textOn("#f2c14e")).toBe("#141110");
  });
});

describe("as 5 paletas prontas", () => {
  for (const id of PRESET_IDS) {
    it(`${id}: todos os pares obrigatórios passam no nível AA`, () => {
      const failed = checkContrast(PRESETS[id]).filter((c) => c.blocking && !c.pass);
      expect(failed).toEqual([]);
      expect(canSaveTheme(PRESETS[id])).toBe(true);
    });
  }

  it("relatório de avisos (pares não obrigatórios abaixo do mínimo)", () => {
    const warnings = PRESET_IDS.flatMap((id) =>
      checkContrast(PRESETS[id])
        .filter((c) => !c.blocking && !c.pass)
        .map((c) => `${id}: ${c.pair} ${c.ratio}:1 (mínimo ${c.required}:1)`),
    );
    // Hoje nenhuma paleta pronta tem aviso. Se alguém mudar uma cor, este teste mostra qual par piorou.
    expect(warnings).toEqual([]);
  });
});

describe("paleta personalizada", () => {
  it("deriva as cores a partir das 4 escolhidas", () => {
    const t = deriveTokens({ bg: "#17100c", text: "#f5ecdc", accent: "#c62828", secondary: "#e9b872" });
    expect(t.accentText).toBe("#ffffff");
    expect(t.card).toBe(mix("#17100c", "#f5ecdc", 0.06));
    expect(canSaveTheme(t)).toBe(true);
  });

  it("A-07 combinação ilegível não pode ser salva", () => {
    const t = deriveTokens({ bg: "#777777", text: "#888888", accent: "#c62828", secondary: "#e9b872" });
    expect(canSaveTheme(t)).toBe(false);
  });

  it("resolve o tema guardado e cai no padrão quando o valor é inválido", () => {
    expect(resolveTheme({ preset: "napoli" }).tokens).toEqual(PRESETS.napoli);
    expect(resolveTheme({ preset: "inexistente" }).preset).toBe("forno-a-lenha");
    expect(resolveTheme(null).preset).toBe("forno-a-lenha");
    expect(resolveTheme({ preset: "personalizada", custom: { bg: "red" } }).preset).toBe("forno-a-lenha");
    expect(
      resolveTheme({ preset: "personalizada", custom: { bg: "#ffffff", text: "#111111", accent: "#d62f23", secondary: "#1f5a2e" } }).preset,
    ).toBe("personalizada");
  });
});
