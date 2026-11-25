// Aberto ou fechado, pelos horários do ADM, no fuso da loja (RN-07, RN-08).
// Horário que passa da meia-noite (ex.: 18:00 às 01:00) conta para o dia em que abre.
// Fechar às 00:00 significa fechar à meia-noite.

export interface OpeningHour {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  /** "HH:MM" */
  opens: string;
  /** "HH:MM" */
  closes: string;
  closed: boolean;
}

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export function parseHHMM(value: string): number {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!m) throw new RangeError(`Horário inválido: ${value}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Dia da semana e minutos desde a meia-noite no fuso informado. */
export function localClock(now: Date, timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = WEEKDAY_INDEX[get("weekday")];
  if (weekday === undefined) throw new Error("Não foi possível ler o dia da semana.");
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export interface StoreStatus {
  open: boolean;
  /** horário de fechamento do período atual, quando aberto */
  closesAt: string | null;
  /** próxima abertura, quando fechado (null se não houver nenhum dia aberto) */
  nextOpen: { weekday: number; time: string; inDays: number } | null;
  todayWeekday: number;
}

export function storeStatus(
  hours: OpeningHour[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): StoreStatus {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const { weekday: d, minutes: m } = localClock(now, timeZone);
  const opened = (closesAt: string): StoreStatus => ({ open: true, closesAt, nextOpen: null, todayWeekday: d });

  // 1) Período de ontem que passou da meia-noite e ainda não terminou.
  const yesterday = byDay.get((d + 6) % 7);
  if (yesterday && !yesterday.closed) {
    const o = parseHHMM(yesterday.opens);
    const c = parseHHMM(yesterday.closes);
    if (c <= o && m < c) return opened(yesterday.closes);
  }

  // 2) Período de hoje.
  const today = byDay.get(d);
  if (today && !today.closed) {
    const o = parseHHMM(today.opens);
    const c = parseHHMM(today.closes);
    if (c > o ? m >= o && m < c : m >= o) return opened(today.closes);
  }

  // 3) Fechado: procura a próxima abertura (até uma semana à frente).
  for (let i = 0; i <= 7; i++) {
    const day = (d + i) % 7;
    const h = byDay.get(day);
    if (!h || h.closed) continue;
    if (i === 0 && m >= parseHHMM(h.opens)) continue;
    return { open: false, closesAt: null, nextOpen: { weekday: day, time: h.opens, inDays: i }, todayWeekday: d };
  }
  return { open: false, closesAt: null, nextOpen: null, todayWeekday: d };
}

/** Texto da barra do topo: "Aberto agora · fechamos às 23:00" / "Fechado agora · abrimos hoje às 18:00". */
export function storeStatusText(status: StoreStatus): string {
  if (status.open) return `Aberto agora · fechamos às ${status.closesAt}`;
  const n = status.nextOpen;
  if (!n) return "Fechado no momento";
  const when =
    n.inDays === 0
      ? "hoje"
      : n.inDays === 1
        ? "amanhã"
        : `${n.weekday === 0 || n.weekday === 6 ? "no" : "na"} ${(WEEKDAY_NAMES[n.weekday] ?? "").toLowerCase()}`;
  return `Fechado agora · abrimos ${when} às ${n.time}`;
}
