import { expect, test } from "@playwright/test";

test("a home carrega", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cantina da Mídia" })).toBeVisible();
});

test("depois de uma visita, a home abre sem internet", async ({ page, context }) => {
  await page.goto("/");

  // Espera o service worker assumir a página (é ele que guarda o app shell).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
      );
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cantina da Mídia" })).toBeVisible();
});
