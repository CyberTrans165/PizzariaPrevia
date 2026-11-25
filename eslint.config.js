import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage", "supabase/.temp"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Texto do usuário nunca vira HTML (SECURITY.md, XSS).
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Não use dangerouslySetInnerHTML." },
      ],
    },
  },
  {
    files: ["supabase/functions/**/*.ts"],
    languageOptions: { globals: { ...globals.browser, Deno: "readonly" } },
    rules: {
      // Logs passam pelo logger, que remove dados pessoais.
      "no-console": ["error", { allow: [] }],
    },
  },
  {
    files: ["supabase/functions/api/http/log.ts", "**/*.test.ts", "scripts/**", "tests/**"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
);
