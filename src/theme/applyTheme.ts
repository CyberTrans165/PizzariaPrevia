// Aplica as cores do tema no :root. Usa a API de estilo do DOM (CSSOM),
// o que funciona com a CSP sem 'unsafe-inline'.
import { tokensToCssVars, type ThemeTokens } from "@shared/domain/theme.ts";

export function applyTheme(tokens: ThemeTokens, root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(tokensToCssVars(tokens))) {
    root.style.setProperty(name, value);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tokens.bg);
}
