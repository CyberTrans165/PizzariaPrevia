// Componentes básicos: ícones de linha fina (1,5 px), janela lateral/modal, avisos e quantidade.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const PATHS: Record<string, string> = {
  cart: "M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M9.5 20h.01M17 20h.01",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  clock: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  phone: "M5 4h3l1.5 4-2 1.5a12 12 0 0 0 7 7L16 14.5l4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  trash: "M5 7h14M10 11v6M14 11v6M7 7l1 12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  bag: "M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  moto: "M5 17a2.5 2.5 0 1 0 0-.01M19 17a2.5 2.5 0 1 0 0-.01M7.5 17h7l2.5-5h-5L10 8H7M15 8h3l1.5 3",
  pix: "M12 3l4 4-4 4-4-4 4-4zM12 13l4 4-4 4-4-4 4-4zM3 12l4-4 4 4-4 4-4-4zM13 12l4-4 4 4-4 4-4-4z",
  cash: "M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 10v.01M18 14v.01",
  card: "M3 6h18v12H3zM3 10h18M7 15h4",
  chat: "M4 20l1.5-4A8 8 0 1 1 9 19.5L4 20z",
  print: "M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z",
  sound: "M5 10v4h3l5 4V6L8 10H5zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  home: "M4 11l8-7 8 7M6 9.5V20h12V9.5",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  pizza: "M12 3L3 19c5.5 2.5 12.5 2.5 18 0L12 3zM9 12h.01M13 15h.01M12 9h.01",
  palette: "M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3.5 3H16a2 2 0 0 0-1.5 3.3c.6.7.2 2.7-2.5 2.7zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1z",
  star: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  ext: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  split: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18",
  thirds: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12V3M12 12l7.8 4.5M12 12l-7.8 4.5",
};

export function Icon({ name, size = 22, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ""} />
    </svg>
  );
}

/** Janela sobreposta: lateral (direita), de baixo (celular) ou central. Esc e o fundo fecham. */
export function Sheet(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  variant?: "side" | "center";
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const { open, onClose } = props;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className={`overlay ${props.variant === "center" ? "overlay-center" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`sheet ${props.variant === "center" ? "sheet-center" : ""} ${props.className ?? ""}`} role="dialog" aria-modal="true" aria-label={props.title}>
        <header className="sheet-head">
          <h2>{props.title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet-body">{props.children}</div>
        {props.footer && <footer className="sheet-foot">{props.footer}</footer>}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 20, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuir">
        <Icon name="minus" size={18} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Aumentar">
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

type Toast = { id: number; text: string; tone: "ok" | "error" | "info" };
const ToastContext = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Mensagem de erro amigável a partir de qualquer erro. */
export function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Algo deu errado. Tente novamente.";
}
