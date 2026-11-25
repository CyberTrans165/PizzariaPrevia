// Rotas pelo "#nome" da página (funciona igual no site e na vitrine publicada):
//   (vazio) → site · #admin → painel do dono · #pedido-12 → acompanhamento · #privacidade → política
import { useEffect, useState } from "react";

export type Route =
  | { name: "home" }
  | { name: "admin" }
  | { name: "pedido"; code: string }
  | { name: "privacidade" };

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (h === "admin") return { name: "admin" };
  if (h === "privacidade") return { name: "privacidade" };
  const m = /^pedido-([0-9]+)$/.exec(h);
  if (m?.[1]) return { name: "pedido", code: m[1] };
  return { name: "home" };
}

export function navigate(hash: string, opts: { top?: boolean } = {}): void {
  const target = hash ? `#${hash}` : "#";
  if (location.hash === target || (!hash && !location.hash)) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    location.hash = target;
  }
  if (opts.top ?? true) window.scrollTo({ top: 0 });
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
