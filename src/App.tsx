import { lazy, Suspense, useEffect } from "react";
import { useBackend, useData } from "./lib/backend.ts";
import { CartProvider } from "./lib/cart.tsx";
import { useRoute } from "./lib/router.ts";
import { Site } from "./site/Site.tsx";
import { applyTheme } from "./theme/applyTheme.ts";
import { ToastProvider } from "./ui/ui.tsx";

// O painel do dono fica num pacote separado, carregado só em #admin.
const AdminApp = lazy(() => import("./admin/AdminApp.tsx"));

export function App() {
  const backend = useBackend();
  const route = useRoute();
  // A cada 30 s o status Aberto/Fechado é recalculado; mudanças do painel chegam na hora.
  const { data: store, error } = useData(() => backend.getStore(), [], 30000);

  useEffect(() => {
    if (store) {
      applyTheme(store.theme.tokens);
      if (route.name !== "admin") document.title = store.store.name;
    }
  }, [store, route.name]);

  return (
    <ToastProvider>
      {route.name === "admin" ? (
        <Suspense fallback={<p className="adm-pad">Carregando painel…</p>}>
          <AdminApp />
        </Suspense>
      ) : error ? (
        <p className="wrap order-page" role="alert">Não foi possível carregar a pizzaria. Tente de novo em instantes.</p>
      ) : !store ? (
        <p className="wrap order-page muted" role="status">Carregando…</p>
      ) : (
        <CartProvider>
          <Site route={route} store={store} />
        </CartProvider>
      )}
    </ToastProvider>
  );
}
