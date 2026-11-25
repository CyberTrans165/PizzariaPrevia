// Carrinho lembrado neste aparelho (ETAPA 5), com observação por item e do pedido.
// Os preços NÃO ficam guardados aqui: são sempre recalculados a partir do cardápio atual.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartItemInput } from "@shared/domain/pricing.ts";
import { readItem, writeItem } from "../demo/storage.ts";
import { newId } from "./format.ts";

export interface CartLine {
  uid: string;
  item: CartItemInput;
}

interface CartState {
  lines: CartLine[];
  note: string;
}

interface CartApi extends CartState {
  count: number;
  add(item: CartItemInput): void;
  replace(uid: string, item: CartItemInput): void;
  setQty(uid: string, quantity: number): void;
  remove(uid: string): void;
  setNote(note: string): void;
  clear(): void;
}

const KEY = "fornobella.cart.v1";
const CartContext = createContext<CartApi | null>(null);

function sameItem(a: CartItemInput, b: CartItemInput): boolean {
  const strip = (x: CartItemInput) => JSON.stringify({ ...x, quantity: 0 });
  return strip(a) === strip(b);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => {
    try {
      const raw = readItem(KEY);
      const v = raw ? (JSON.parse(raw) as CartState) : null;
      if (v && Array.isArray(v.lines)) return { lines: v.lines, note: v.note ?? "" };
    } catch {
      /* começa vazio */
    }
    return { lines: [], note: "" };
  });

  useEffect(() => writeItem(KEY, JSON.stringify(cart)), [cart]);

  const add = useCallback((item: CartItemInput) => {
    setCart((c) => {
      const found = c.lines.find((l) => sameItem(l.item, item));
      if (found) {
        return { ...c, lines: c.lines.map((l) => (l === found ? { ...l, item: { ...l.item, quantity: Math.min(20, l.item.quantity + item.quantity) } } : l)) };
      }
      return { ...c, lines: [...c.lines, { uid: newId(), item }] };
    });
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      ...cart,
      count: cart.lines.reduce((s, l) => s + l.item.quantity, 0),
      add,
      replace: (uid, item) => setCart((c) => ({ ...c, lines: c.lines.map((l) => (l.uid === uid ? { uid, item } : l)) })),
      setQty: (uid, quantity) =>
        setCart((c) => ({
          ...c,
          lines: quantity <= 0 ? c.lines.filter((l) => l.uid !== uid) : c.lines.map((l) => (l.uid === uid ? { ...l, item: { ...l.item, quantity } } : l)),
        })),
      remove: (uid) => setCart((c) => ({ ...c, lines: c.lines.filter((l) => l.uid !== uid) })),
      setNote: (note) => setCart((c) => ({ ...c, note: note.slice(0, 500) })),
      clear: () => setCart({ lines: [], note: "" }),
    }),
    [cart, add],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const c = useContext(CartContext);
  if (!c) throw new Error("CartProvider ausente");
  return c;
}
