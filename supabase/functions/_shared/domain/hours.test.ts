import { describe, expect, it } from "vitest";
import { localClock, parseHHMM, storeStatus, storeStatusText, type OpeningHour } from "./hours.ts";

// Horários de exemplo do protótipo: seg–qui 18–23, sex e sáb 18–00, dom 17–23.
const demo: OpeningHour[] = [
  { weekday: 0, opens: "17:00", closes: "23:00", closed: false },
  { weekday: 1, opens: "18:00", closes: "23:00", closed: false },
  { weekday: 2, opens: "18:00", closes: "23:00", closed: false },
  { weekday: 3, opens: "18:00", closes: "23:00", closed: false },
  { weekday: 4, opens: "18:00", closes: "23:00", closed: false },
  { weekday: 5, opens: "18:00", closes: "00:00", closed: false },
  { weekday: 6, opens: "18:00", closes: "00:00", closed: false },
];

// 25/11/2026 é quarta-feira. São Paulo é UTC-3 (sem horário de verão desde 2019).
const sp = (isoLocal: string) => new Date(`${isoLocal}-03:00`);

describe("relógio local", () => {
  it("E-17 usa o fuso America/Sao_Paulo", () => {
    expect(localClock(new Date("2026-11-26T01:30:00Z"), "America/Sao_Paulo")).toEqual({ weekday: 3, minutes: 22 * 60 + 30 });
  });

  it("lê HH:MM e recusa inválido", () => {
    expect(parseHHMM("18:30")).toBe(1110);
    expect(() => parseHHMM("24:00")).toThrow();
    expect(() => parseHHMM("7:00")).toThrow();
  });
});

describe("aberto ou fechado", () => {
  it("aberto no meio do período", () => {
    expect(storeStatus(demo, sp("2026-11-25T20:00:00"))).toMatchObject({ open: true, closesAt: "23:00" });
  });

  it("abre exatamente na hora e fecha exatamente na hora", () => {
    expect(storeStatus(demo, sp("2026-11-25T18:00:00")).open).toBe(true);
    expect(storeStatus(demo, sp("2026-11-25T23:00:00")).open).toBe(false);
  });

  it("fechado antes de abrir mostra a abertura de hoje", () => {
    const s = storeStatus(demo, sp("2026-11-25T15:00:00"));
    expect(s).toMatchObject({ open: false, nextOpen: { weekday: 3, time: "18:00", inDays: 0 } });
    expect(storeStatusText(s)).toBe("Fechado agora · abrimos hoje às 18:00");
  });

  it("fechado depois de fechar mostra a abertura de amanhã", () => {
    const s = storeStatus(demo, sp("2026-11-25T23:30:00"));
    expect(storeStatusText(s)).toBe("Fechado agora · abrimos amanhã às 18:00");
  });

  it("sexta até 00:00: aberto às 23:59 e fechado à 00:00 de sábado", () => {
    expect(storeStatus(demo, sp("2026-11-27T23:59:00"))).toMatchObject({ open: true, closesAt: "00:00" });
    expect(storeStatus(demo, sp("2026-11-28T00:00:00")).open).toBe(false);
  });

  it("E-16 horário que passa da meia-noite conta para o dia em que abre", () => {
    const late = demo.map((h) => (h.weekday === 5 ? { ...h, closes: "01:00" } : h));
    expect(storeStatus(late, sp("2026-11-28T00:30:00"))).toMatchObject({ open: true, closesAt: "01:00" });
    expect(storeStatus(late, sp("2026-11-28T01:00:00")).open).toBe(false);
  });

  it("dia fechado pula para o próximo dia aberto, com o nome do dia", () => {
    const closedThu = demo.map((h) => (h.weekday === 4 ? { ...h, closed: true } : h));
    const s = storeStatus(closedThu, sp("2026-11-25T23:30:00"));
    expect(s.nextOpen).toEqual({ weekday: 5, time: "18:00", inDays: 2 });
    expect(storeStatusText(s)).toBe("Fechado agora · abrimos na sexta-feira às 18:00");
  });

  it("todos os dias fechados", () => {
    const none = demo.map((h) => ({ ...h, closed: true }));
    const s = storeStatus(none, sp("2026-11-25T20:00:00"));
    expect(s).toMatchObject({ open: false, nextOpen: null });
    expect(storeStatusText(s)).toBe("Fechado no momento");
  });

  it("texto de aberto", () => {
    expect(storeStatusText(storeStatus(demo, sp("2026-11-25T20:00:00")))).toBe("Aberto agora · fechamos às 23:00");
  });
});
