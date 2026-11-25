import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { createLocalBackend } from "./demo/localBackend.ts";
import { BackendContext } from "./lib/backend.ts";
import "./styles.css";

// Modo vitrine: o "servidor" roda no navegador, com dados de demonstração.
// A implementação que fala com a função `api` do Supabase entra nas próximas fases;
// as telas não mudam, só a linha abaixo.
const backend = createLocalBackend();

const root = document.getElementById("root");
if (!root) throw new Error("Elemento #root não encontrado");

createRoot(root).render(
  <StrictMode>
    <BackendContext.Provider value={backend}>
      <App />
    </BackendContext.Provider>
  </StrictMode>,
);
