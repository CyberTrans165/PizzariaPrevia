import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// `npm run build:vitrine` gera a versão de demonstração que roda sozinha no navegador
// (caminhos relativos, fontes carregadas do Google Fonts). O site instalado usa fontes locais.
const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,600;0,700;1,500&display=swap">';

function vitrineFonts(enabled: boolean): Plugin {
  return {
    name: "vitrine-fonts",
    transformIndexHtml: (html) => (enabled ? html.replace("</head>", `${FONTS}</head>`) : html),
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === "vitrine" ? "./" : "/",
  plugins: [react(), tailwindcss(), vitrineFonts(mode === "vitrine")],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)),
    },
  },
  server: {
    // Em desenvolvimento, /api vai para a função local (`npm run fn:serve`),
    // repetindo o encaminhamento que a Vercel faz em produção (mesma origem para o cookie).
    proxy: {
      "/api": { target: "http://127.0.0.1:54321/functions/v1", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    sourcemap: mode !== "vitrine",
    outDir: mode === "vitrine" ? "dist-vitrine" : "dist",
  },
}));
