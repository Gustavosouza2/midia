import { expect, test, type Locator, type Page } from "@playwright/test";
import { longMonth } from "../src/lib/format";
import { date, writeLocalDb, readTable, row, label } from "./local-db";
import { dayFilter, filterLabel } from "./day-filter";

// page.route does not see requests that go through the service worker.
test.use({ serviceWorkers: "block" });

test("when the app opens, the server's canteen goes into the local database", async ({ page }) => {
  const canteen = {
    id: "c0000000-0000-4000-8000-000000000001",
    name: "Mídia",
    slug: "midia",
    updatedAt: "2026-11-01T00:00:00.000Z",
    seq: 7,
  };
  await page.route("**/api/canteen", (route) => route.fulfill({ json: { canteen } }));

  await page.goto("/");
  // The title only appears after the first read, so the local database already exists.
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();

  await expect.poll(() => readTable(page, "canteens")).toEqual([canteen]);
});

test("without the canteen on the server, the app opens all the same", async ({ page }) => {
  await page.route("**/api/canteen", (route) => route.fulfill({ status: 500, json: { error: "server down" } }));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();
  expect(await readTable(page, "canteens")).toEqual([]);
});

// 30 days, one per week: 3 in the future, one today and 26 in the past, some with a name.
const THIRTY = Array.from({ length: 30 }, (_, i) => date(21 - i * 7));
const TODAY = date(0);

// What each screen shows after the first read of the local database (still without days).
const READY: Record<string, (page: Page) => Locator> = {
  "/": (page) => page.getByRole("heading", { name: "Painel da Cantina" }),
  "/sales": (page) => page.getByText("Cadastre os itens no Cardápio"),
  "/menu": (page) => page.getByText("Nenhum item no cardápio ainda"),
  "/pending": (page) => page.getByRole("link", { name: "Criar o primeiro dia em Vendas" }),
};

async function openWithThirtyDays(page: Page, route: string) {
  await page.route("**/api/canteen", (r) => r.fulfill({ status: 500, json: { error: "server down" } }));
  await page.goto(route);
  await expect(READY[route](page)).toBeVisible();
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    saleDays: THIRTY.map((when, i) => row.day(i + 1, when, i % 4 === 0 ? "Culto de jovens com nome comprido" : null)),
  });
  await page.reload();
}

const months = [...new Set(THIRTY.map(longMonth))];

test.describe("day filter on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("with 30 days, nothing overflows the screen width", async ({ page }) => {
    await openWithThirtyDays(page, "/");
    for (const route of ["/", "/sales", "/pending", "/menu"]) {
      await page.goto(route);
      await expect(page.getByRole("group", { name: /^(Período|Dia de venda)$/ }).locator('[aria-haspopup="dialog"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    }
  });

  test("opens on today and the list rises in a sheet grouped by month", async ({ page }) => {
    await openWithThirtyDays(page, "/sales");
    const filter = dayFilter(page);
    await expect(filter.trigger).toContainText(filterLabel(TODAY));
    await expect(filter.trigger).toContainText("hoje");

    await filter.trigger.click();
    await expect(filter.list).toHaveAttribute("data-slot", "sheet-content");
    await expect(filter.list.getByRole("group")).toHaveCount(months.length);
    await expect(filter.list.getByRole("group").first()).toHaveAccessibleName(months[0]);
    await expect(filter.list.getByRole("button", { pressed: true })).toBeInViewport();

    const oldest = THIRTY.at(-1)!;
    await filter.list.getByRole("button", { name: new RegExp(`^${filterLabel(oldest)}`) }).click();
    await expect(filter.list).toBeHidden();
    await expect(filter.trigger).toContainText(filterLabel(oldest));
    await expect(filter.previous).toBeDisabled();

    await filter.next.click();
    await expect(filter.trigger).toContainText(filterLabel(THIRTY.at(-2)!));
  });
});

test("the arrows move between days and stop at the ends", async ({ page }) => {
  await openWithThirtyDays(page, "/sales");
  const filter = dayFilter(page);
  await expect(filter.trigger).toContainText(filterLabel(TODAY));

  await filter.previous.click();
  await expect(filter.trigger).toContainText(filterLabel(date(-7)));
  await expect(filter.trigger).toContainText("Culto de jovens");
  await filter.next.click();
  await filter.next.click();
  await expect(filter.trigger).toContainText(filterLabel(date(7)));

  await filter.next.click();
  await filter.next.click();
  await expect(filter.trigger).toContainText(filterLabel(THIRTY[0]));
  await expect(filter.next).toBeDisabled();
});

test("on desktop, the list opens in a popover grouped by month and closes on selection", async ({ page }) => {
  await openWithThirtyDays(page, "/sales");
  const filter = dayFilter(page);

  await filter.trigger.click();
  await expect(filter.list).toHaveAttribute("data-slot", "popover-content");
  await expect(filter.list.getByRole("group")).toHaveCount(months.length);
  await expect(filter.list.getByRole("button", { pressed: true })).toContainText(filterLabel(TODAY));

  await filter.list.getByRole("button", { name: new RegExp(`^${filterLabel(date(-70))}`) }).click();
  await expect(filter.list).toBeHidden();
  await expect(filter.trigger).toContainText(filterLabel(date(-70)));
});

test("in Sales, \"Novo dia de venda\" at the end of the list creates a day", async ({ page }) => {
  await openWithThirtyDays(page, "/sales");
  const filter = dayFilter(page);

  await filter.trigger.click();
  await filter.list.getByRole("button", { name: "Novo dia de venda" }).click();
  await expect(filter.list).toBeHidden();
  await page.getByLabel("Data").fill(date(1));
  await page.getByRole("button", { name: `Criar dia · ${label(date(1))}` }).click();

  await expect(filter.trigger).toContainText(filterLabel(date(1)));
  await expect.poll(async () => (await readTable<{ date: string }>(page, "saleDays")).length).toBe(31);
});

test("on the Dashboard, \"Todos os dias\" hides the arrows", async ({ page }) => {
  await openWithThirtyDays(page, "/");
  const filter = dayFilter(page, "Período");

  await expect(filter.trigger).toHaveText("Todos os dias");
  await expect(filter.previous).toHaveCount(0);
  await expect(filter.next).toHaveCount(0);

  await filter.select(filterLabel(date(-7)));
  await expect(filter.previous).toBeVisible();
  await expect(filter.next).toBeVisible();

  await filter.select("Todos os dias");
  await expect(filter.trigger).toHaveText("Todos os dias");
  await expect(filter.previous).toHaveCount(0);
});
