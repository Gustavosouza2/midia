import { expect, test, type Page } from "@playwright/test";
import { uuidV5 } from "../src/lib/uuid-v5";
import { date, writeLocalDb, id, readTable, row } from "./local-db";
import { dayFilter, filterLabel } from "./day-filter";

// page.route does not see requests that go through the service worker.
test.use({ serviceWorkers: "block" });

const SKEWER = id(1);
const SODA = id(2);
const DAY = id(10);

type OutboxItem = { table: string; recordId: string; payload: Record<string, unknown> };
type Product = { id: string; name: string; priceCents: number };
type DayMenuItem = { id: string; dayId: string; productId: string; priceCents: number; active: boolean };

async function openMenu(page: Page) {
  // The canteen comes from the test data, not from the server.
  await page.route("**/api/canteen", (route) => route.fulfill({ status: 500, json: { error: "server down" } }));
  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Cardápio", level: 1 })).toBeVisible();
}

/** Espeto and Refrigerante for sale on the day; Bolo registered, but off the menu. 3 skewers sold and 5 canceled. */
async function saveMenu(page: Page, dayDate = date(0)) {
  const dayMenuItemId = (productId: string) => uuidV5(productId, DAY);
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [
      row.product(1, "Espeto de carne", 1200),
      row.product(2, "Refrigerante lata", 600),
      row.product(3, "Bolo", 500),
      row.product(4, "Item antigo", 100, false),
    ],
    saleDays: [row.day(10, dayDate)],
    dayMenuItems: [
      { ...row.dayMenuItem(0, DAY, SKEWER, 1200), id: await dayMenuItemId(SKEWER) },
      { ...row.dayMenuItem(0, DAY, SODA, 600), id: await dayMenuItemId(SODA) },
    ],
    orders: [row.order(30, DAY, null, "entregue"), { ...row.order(31, DAY, null, "entregue"), status: "cancelado" }],
    orderItems: [row.item(40, id(30), SKEWER, 3, 1200), row.item(41, id(31), SKEWER, 5, 1200)],
  });
  await page.reload();
}

const rowOf = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });
const priceOf = (page: Page, name: string) =>
  rowOf(page, name).getByRole("textbox", { name: `Preço de ${name} neste dia` });

test("edits the price in the row and takes an item off the day's menu", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  await expect(dayFilter(page).trigger).toContainText(filterLabel(date(0)));
  await expect(dayFilter(page).trigger).toContainText("hoje");
  await expect(page.getByRole("heading", { name: /^Itens em / })).toBeVisible();
  await expect(page.getByText("2 de 3 itens à venda")).toBeVisible();
  await expect(page.getByText("Item antigo")).toHaveCount(0);

  const skewer = rowOf(page, "Espeto de carne");
  await expect(skewer.getByText("3 vendidos", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(priceOf(page, "Espeto de carne")).toHaveValue("12");
  // The default price only shows when the day's price differs from it.
  await expect(skewer.getByText(/^padrão /)).toHaveCount(0);
  // With no row for the day, Bolo shows the default price.
  await expect(priceOf(page, "Bolo")).toHaveValue("5");

  await priceOf(page, "Espeto de carne").fill("10,50");
  await priceOf(page, "Espeto de carne").press("Enter");
  await expect(priceOf(page, "Espeto de carne")).toHaveValue("10,50");
  await expect(skewer.getByText("padrão R$ 12")).toBeVisible();

  await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
  await expect(page.getByRole("switch", { name: "Colocar Refrigerante lata no cardápio deste dia" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(rowOf(page, "Refrigerante lata").getByText("Fora")).toBeVisible();
  await expect(page.getByText("1 de 3 itens à venda")).toBeVisible();

  const outbox = await readTable<OutboxItem>(page, "outbox");
  expect(outbox.map((o) => [o.table, o.recordId, o.payload.priceCents, o.payload.active])).toEqual([
    ["dayMenuItems", await uuidV5(SKEWER, DAY), 1050, true],
    ["dayMenuItems", await uuidV5(SODA, DAY), 600, false],
  ]);
});

test("an invalid price reverts with a warning and Esc drops the edit", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  const skewer = rowOf(page, "Espeto de carne");
  const price = priceOf(page, "Espeto de carne");
  await price.fill("doze");
  await price.press("Enter");
  await expect(skewer.getByRole("alert")).toHaveText("Preço inválido. Use reais, como 12 ou 12,50.");
  await expect(price).toHaveValue("12");

  await price.fill("99");
  await price.press("Escape");
  await expect(price).toHaveValue("12");
  await price.blur();
  expect(await readTable(page, "outbox")).toEqual([]);
});

test("adds items inline and puts them on sale on the selected day", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  const form = page.getByRole("form", { name: "Novo item" });
  await form.getByLabel("Nome do item").fill("  Pão de  queijo ");
  await form.getByLabel("Preço padrão").fill("4,5");
  await form.getByLabel("Preço padrão").press("Enter");

  await expect(form.getByRole("status")).toHaveText("Pão de queijo entrou no cardápio.");
  await expect(form.getByLabel("Nome do item")).toHaveValue("");
  await expect(form.getByLabel("Nome do item")).toBeFocused();
  await expect(priceOf(page, "Pão de queijo")).toHaveValue("4,50");
  await expect(rowOf(page, "Pão de queijo").getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("3 de 4 itens à venda")).toBeVisible();

  const product = (await readTable<Product>(page, "products")).find((p) => p.name === "Pão de queijo");
  expect(product?.priceCents).toBe(450);
  const prices = await readTable<DayMenuItem>(page, "dayMenuItems");
  expect(prices.find((p) => p.productId === product?.id)).toMatchObject({ dayId: DAY, priceCents: 450, active: true });
});

test("with no sale day today, offers to open it and the picker still reaches other days", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page, date(3));

  await expect(page.getByText("Vendas de hoje ainda não abertas")).toBeVisible();
  await expect(page.getByText(`Copia os itens e preços de`)).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Itens em / })).toHaveCount(0);

  await dayFilter(page).select(filterLabel(date(3)));
  await expect(dayFilter(page).trigger).toContainText("próximo");
  await expect(page.getByText("2 de 3 itens à venda")).toBeVisible();
});

test("with no day, opens today and shows the items at the default price", async ({ page }) => {
  await openMenu(page);
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [row.product(1, "Espeto de carne", 1200), row.product(2, "Refrigerante lata", 600)],
  });
  await page.reload();

  await expect(page.getByRole("list", { name: "Itens cadastrados" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Abrir vendas de hoje" }).click();

  await expect(dayFilter(page).trigger).toContainText("hoje");
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();
  await expect(priceOf(page, "Espeto de carne")).toHaveValue("12");
  await expect(page.getByRole("button", { name: "Remover dia" })).toBeVisible();
});

test("first use: the empty menu is the add row, focused", async ({ page }) => {
  await openMenu(page);
  await writeLocalDb(page, { canteens: [row.canteen()] });
  await page.reload();

  await expect(page.getByText("Nenhum item no cardápio ainda")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir vendas de hoje" })).toHaveCount(0);
  await expect(page.getByLabel("Nome do item")).toBeFocused();
  await page.getByLabel("Nome do item").fill("Pastel");
  await page.getByLabel("Preço padrão").fill("8");
  await page.getByLabel("Preço padrão").press("Enter");

  await expect(rowOf(page, "Pastel").getByText("R$ 8", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nome do item")).toBeFocused();
  await expect(page.getByRole("button", { name: "Abrir vendas de hoje" })).toBeVisible();
});

test.describe("on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("cards with switch, inline price and add row, without horizontal scroll", async ({ page }) => {
    await openMenu(page);
    await saveMenu(page);

    const soda = rowOf(page, "Refrigerante lata");
    await expect(soda.getByText("0 vendidos", { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
    await expect(priceOf(page, "Refrigerante lata")).toBeHidden();

    await priceOf(page, "Espeto de carne").fill("15");
    await priceOf(page, "Espeto de carne").press("Enter");
    await expect(priceOf(page, "Espeto de carne")).toHaveValue("15");

    await page.getByLabel("Nome do item").fill("Água");
    await page.getByLabel("Preço padrão").fill("3");
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(priceOf(page, "Água")).toHaveValue("3");
    await expect(page.getByText("2 de 4 itens à venda")).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const box = await rowOf(page, "Espeto de carne").locator("label").filter({ has: page.getByRole("switch") }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});
