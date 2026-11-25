// Fase 0 · mede o tempo do hash de senha com os parâmetros de produção.
// Uso local: `npx tsx scripts/bench-password.ts` (ou `bun scripts/bench-password.ts`).
// No Supabase, repita a medição dentro da função para confirmar o limite de CPU.
import { DEFAULT_ITERATIONS, hashPassword, verifyPassword } from "../supabase/functions/api/auth/password.ts";

const runs = 5;
const times: number[] = [];
let stored = "";
for (let i = 0; i < runs; i++) {
  const t0 = performance.now();
  stored = await hashPassword("medicao-de-tempo-forno-bella");
  times.push(performance.now() - t0);
}
const t1 = performance.now();
const r = await verifyPassword("medicao-de-tempo-forno-bella", stored);
const verifyMs = performance.now() - t1;

const sorted = [...times].sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      algoritmo: "PBKDF2-HMAC-SHA256",
      iteracoes: DEFAULT_ITERATIONS,
      hash_ms_mediana: Math.round(sorted[Math.floor(runs / 2)] ?? 0),
      hash_ms_max: Math.round(sorted[runs - 1] ?? 0),
      verificacao_ms: Math.round(verifyMs),
      confere: r.ok,
    },
    null,
    2,
  ),
);
