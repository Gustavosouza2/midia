import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Um componente por arquivo. Os do shadcn (ui/) agrupam as partes (Card, CardHeader…) por convenção.
    files: ["src/**/*.tsx"],
    ignores: ["src/componentes/ui/**"],
    rules: { "react/no-multi-comp": ["error", { ignoreStateless: false }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
