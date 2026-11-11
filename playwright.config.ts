import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;
const URL_BASE = `http://localhost:${PORTA}`;

// Os testes rodam contra o build de produção (o service worker só existe nele).
// Rode `npm run build` antes, ou use `npm run test:e2e`, que já faz isso.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: URL_BASE,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Permite apontar para um Chromium já instalado (ex.: ambientes sem download).
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORTA}`,
    url: `${URL_BASE}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
