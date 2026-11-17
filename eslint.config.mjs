import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // One component per file. The shadcn ones (ui/) group their parts (Card, CardHeader…) by convention.
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    rules: { "react/no-multi-comp": ["error", { ignoreStateless: false }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Agent worktrees are full checkouts of other branches.
    ".claude/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
