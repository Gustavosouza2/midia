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
async function saveMenu(page: Page) {
  const dayMenuItemId = (productId: string) => uuidV5(productId, DAY);
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [
      row.product(1, "Espeto de carne", 1200),
      row.product(2, "Refrigerante lata", 600),
      row.product(3, "Bolo", 500),
      row.product(4, "Item antigo", 100, false),
    ],
    saleDays: [row.day(10, date(3))],
    dayMenuItems: [
      { ...row.dayMenuItem(0, DAY, SKEWER, 1200), id: await dayMenuItemId(SKEWER) },
      { ...row.dayMenuItem(0, DAY, SODA, 600), id: await dayMenuItemId(SODA) },
    ],
    orders: [row.order(30, DAY, null, "entregue"), { ...row.order(31, DAY, null, "entregue"), status: "cancelado" }],
    orderItems: [row.item(40, id(30), SKEWER, 3, 1200), row.item(41, id(31), SKEWER, 5, 1200)],
  });
  await page.reload();
}

const linhaDo = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

test("changes the price and takes an item off the day's menu", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  const trigger = dayFilter(page).trigger;
  await expect(trigger).toContainText(filterLabel(date(3)));
  await expect(trigger).toContainText("próximo");
  await expect(page.getByRole("heading", { name: /^Itens em / })).toBeVisible();
  await expect(page.getByText("2 de 3 itens à venda")).toBeVisible();
  await expect(page.getByText("Item antigo")).toHaveCount(0);

  const skewer = linhaDo(page, "Espeto de carne");
  await expect(skewer.getByText("3 vendidos", { exact: true })).toBeVisible();
  await expect(skewer.getByText("Preço padrão R$ 12")).toBeVisible();
  // With no row for the day, Bolo shows the default price.
  await expect(linhaDo(page, "Bolo").getByText("R$ 5", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
  const field = skewer.getByRole("textbox", { name: "Novo preço" });
  await expect(field).toHaveValue("12");
  await field.fill("10,50");
  await skewer.getByRole("button", { name: "Salvar" }).click();
  await expect(skewer.getByText("R$ 10,50", { exact: true })).toBeVisible();
  await expect(skewer.getByText("diferente do padrão")).toBeVisible();

  await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
  await expect(page.getByRole("switch", { name: "Colocar Refrigerante lata no cardápio deste dia" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(linhaDo(page, "Refrigerante lata").getByText("Fora")).toBeVisible();
  await expect(page.getByText("1 de 3 itens à venda")).toBeVisible();

  const outbox = await readTable<OutboxItem>(page, "outbox");
  expect(outbox.map((o) => [o.table, o.recordId, o.payload.priceCents, o.payload.active])).toEqual([
    ["dayMenuItems", await uuidV5(SKEWER, DAY), 1050, true],
    ["dayMenuItems", await uuidV5(SODA, DAY), 600, false],
  ]);
});

test("an invalid price is not saved", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  const skewer = linhaDo(page, "Espeto de carne");
  await page.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
  await skewer.getByRole("textbox", { name: "Novo preço" }).fill("doze");
  await skewer.getByRole("button", { name: "Salvar" }).click();
  await expect(skewer.getByRole("alert")).toHaveText("Preço inválido. Use reais, como 12 ou 12,50.");

  await skewer.getByRole("button", { name: "Cancelar" }).click();
  await expect(skewer.getByText("R$ 12", { exact: true })).toBeVisible();
  expect(await readTable(page, "outbox")).toEqual([]);
});

test("adds an item and puts it on sale on the open day", async ({ page }) => {
  await openMenu(page);
  await saveMenu(page);

  await page.getByRole("button", { name: "Adicionar item" }).click();
  const form = page.getByRole("form", { name: "Novo item" });
  await form.getByLabel("Nome do item").fill("  Pão de  queijo ");
  await form.getByLabel("Preço padrão").fill("4,5");
  await form.getByRole("button", { name: "Salvar item" }).click();

  await expect(form.getByLabel("Nome do item")).toHaveValue("");
  await form.getByRole("button", { name: "Fechar" }).click();
  await expect(form).toBeHidden();
  const bread = linhaDo(page, "Pão de queijo");
  await expect(bread.getByText("R$ 4,50", { exact: true })).toBeVisible();
  await expect(bread.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("3 de 4 itens à venda")).toBeVisible();

  const product = (await readTable<Product>(page, "products")).find((p) => p.name === "Pão de queijo");
  expect(product?.priceCents).toBe(450);
  const prices = await readTable<DayMenuItem>(page, "dayMenuItems");
  expect(prices.find((p) => p.productId === product?.id)).toMatchObject({ dayId: DAY, priceCents: 450, active: true });
});

test("with no day, creates the first one and shows the items at the default price", async ({ page }) => {
  await openMenu(page);
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [row.product(1, "Espeto de carne", 1200), row.product(2, "Refrigerante lata", 600)],
  });
  await page.reload();

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await page.getByRole("button", { name: "Criar dia de venda" }).click();
  await page.getByRole("button", { name: /^Criar dia · / }).click();

  await expect(dayFilter(page).trigger).toBeVisible();
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();
  await expect(linhaDo(page, "Espeto de carne").getByText("R$ 12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remover dia" })).toBeVisible();
});

test("with no day, the added item appears in the list at the default price", async ({ page }) => {
  await openMenu(page);
  await writeLocalDb(page, { canteens: [row.canteen()] });
  await page.reload();

  await page.getByRole("button", { name: "Adicionar item" }).first().click();
  await page.getByLabel("Nome do item").fill("Pastel");
  await page.getByLabel("Preço padrão").fill("8");
  await page.getByRole("button", { name: "Salvar item" }).click();

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await expect(linhaDo(page, "Pastel").getByText("R$ 8", { exact: true })).toBeVisible();
});

test.describe("on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("cards with switch and day price", async ({ page }) => {
    await openMenu(page);
    await saveMenu(page);

    const soda = linhaDo(page, "Refrigerante lata");
    await expect(soda.getByText("0 vendidos · padrão R$ 6")).toBeVisible();
    await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
    await expect(soda.getByRole("button", { name: /Mudar o preço/ })).toBeHidden();

    const skewer = linhaDo(page, "Espeto de carne");
    await skewer.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
    await skewer.getByRole("textbox", { name: "Novo preço" }).fill("15");
    await skewer.getByRole("button", { name: "Salvar" }).click();
    await expect(skewer.getByText("R$ 15", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Adicionar item" }).click();
    await page.getByLabel("Nome do item").fill("Água");
    await page.getByLabel("Preço padrão").fill("3");
    await page.getByRole("button", { name: "Salvar item" }).click();
    await expect(linhaDo(page, "Água").getByText("R$ 3", { exact: true })).toBeVisible();
    await expect(page.getByText("2 de 4 itens à venda")).toBeVisible();
  });
});
