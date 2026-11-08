import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createSerwistRoute } from "@serwist/turbopack";

// Versão do app shell: muda a cada deploy, para o service worker baixar as páginas novas.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "src/app/sw.ts",
  // Arquivos de build (inclusive a fonte) e tudo de public/ vão para o precache.
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,png,svg,webp,json,webmanifest,woff2}",
    "public/**/*",
  ],
  // Páginas do app shell: abrem offline desde a primeira visita.
  additionalPrecacheEntries: [
    { url: "/", revision },
    { url: "/codigo", revision },
    { url: "/~offline", revision },
  ],
  useNativeEsbuild: true,
});
