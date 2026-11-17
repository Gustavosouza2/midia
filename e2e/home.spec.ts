import { expect, test } from "@playwright/test";

test("the home page opens straight on Sales", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();
});

test("after one visit, the home page opens without internet", async ({ page, context }) => {
  await page.goto("/");

  // Waits for the service worker to take over the page (it is what stores the app shell).
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
  await expect(page.getByRole("heading", { name: "Vendas" })).toBeVisible();
});
