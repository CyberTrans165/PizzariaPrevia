import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("./supabase/functions/_shared", import.meta.url)),
    },
  },
  test: {
    include: [
      "supabase/functions/**/*.test.ts",
      "src/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.ts",
    ],
    environment: "node",
    // Os testes de integração rodam em sequência porque compartilham o mesmo banco.
    fileParallelism: false,
  },
});
