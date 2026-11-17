import { expect, test, type Page } from "@playwright/test";
import { date, writeLocalDb, id, readTable, row, label } from "./local-db";
import { dayFilter, filterLabel } from "./day-filter";

/** The moment `days` days from now (negative = in the past). */
const moment = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

/** Delivered order created on the sale day itself, as if it had been sold there. */
const order = (n: number, dayId: string, customerId: string, daysAgo: number) => ({
  ...row.order(n, dayId, customerId, "entregue"),
  createdAt: moment(-daysAgo),
});

/** Melina owes two orders (R$ 30 + R$ 12), Maju R$ 10 and Elizete R$ 24: R$ 76 from 3 people. */
async function openWithData(page: Page) {
  await page.goto("/pending");
  // The empty state only appears after the first read, so the local database already exists.
  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();

  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [row.product(1, "Espeto de carne", 1000)],
    saleDays: [row.day(10, date(-17)), row.day(11, date(-3)), row.day(12, date(-10))],
    customers: [
      row.customer(20, "Melina"),
      row.customer(21, "Maju"),
      row.customer(22, "Elizete"),
      row.customer(23, "Charlene"),
      row.customer(24, "Gustavo"),
    ],
    orders: [
      order(30, id(10), id(20), 17),
      order(31, id(10), id(21), 17),
      order(32, id(11), id(22), 3),
      order(33, id(12), id(23), 10),
      { ...row.order(34, id(11), id(24), "recebido"), createdAt: moment(-4) },
      order(35, id(11), id(20), 3),
    ],
    orderItems: [
      row.item(40, id(30), id(1), 3, 1000),
      row.item(41, id(31), id(1), 1, 1000),
      row.item(42, id(32), id(1), 2, 1200),
      row.item(43, id(33), id(1), 1, 1000),
      row.item(44, id(34), id(1), 2, 1000),
      row.item(45, id(35), id(1), 1, 1200),
    ],
    // Charlene paid at the time of the sale.
    payments: [{ ...row.payment(50, id(33), 1000), recordedAt: moment(-10) }],
  });
  await page.reload();
}

/** A number in the summary card, by its label. */
const stat = (page: Page, label: string) =>
  page.getByRole("region", { name: "Resumo" }).getByText(label, { exact: true }).locator("..");

/** The entry of one person in the list. */
const person = (page: Page, name: string) => page.getByRole("group", { name, exact: true });

test.describe("Pending on desktop", () => {
  test("lists one entry per person, who owes longest first", async ({ page }) => {
    await openWithData(page);

    await expect(stat(page, "Em aberto")).toContainText("R$ 76");
    await expect(stat(page, "Pessoas")).toContainText("3");
    await expect(stat(page, "Há mais de 2 semanas")).toContainText("2");

    const list = page.getByRole("region", { name: "Quem deve" });
    const names = await list
      .locator(':scope > [role="group"]')
      .evaluateAll((entries) => entries.map((e) => e.getAttribute("aria-label")));
    expect(names).toEqual(["Melina", "Maju", "Elizete"]);

    const melina = person(page, "Melina");
    await expect(melina).toContainText("R$ 42");
    await expect(melina).toContainText("2 pedidos");
    await expect(melina).toContainText("há 17 dias");
    const orders = melina.getByRole("list", { name: "Pedidos de Melina" }).getByRole("listitem");
    await expect(orders).toHaveCount(2);
    await expect(orders.first()).toContainText("3× Espeto de carne");
    await expect(orders.first()).toContainText(label(date(-17)));
    await expect(orders.last()).toContainText("1× Espeto de carne");
    await expect(orders.last()).toContainText(label(date(-3)));

    await expect(person(page, "Elizete")).toContainText(`2× Espeto de carne · ${label(date(-3))}`);

    // Reservations and paid orders do not appear.
    await expect(person(page, "Gustavo")).toHaveCount(0);
    await expect(person(page, "Charlene")).toHaveCount(0);
  });

  test("one tap receives every order of the person and Desfazer refunds them", async ({ page }) => {
    await openWithData(page);
    const melina = person(page, "Melina");

    await melina.getByRole("button", { name: "Receber de Melina no Pix", exact: true }).click();

    await expect(melina.getByRole("status")).toHaveText("Pago via Pix");
    await expect(stat(page, "Em aberto")).toContainText("R$ 34");
    await expect(stat(page, "Pessoas")).toContainText("2");
    const outbox = await readTable<{ table: string; payload: Record<string, unknown> }>(page, "outbox");
    expect(outbox.filter((i) => i.table === "payments").map((i) => i.payload)).toEqual([
      expect.objectContaining({ orderId: id(30), method: "pix", amountCents: 3000, refundedAt: null }),
      expect.objectContaining({ orderId: id(35), method: "pix", amountCents: 1200, refundedAt: null }),
    ]);

    await melina.getByRole("button", { name: "Desfazer" }).click();

    await expect(melina.getByRole("button", { name: "Receber de Melina no Pix", exact: true })).toBeVisible();
    await expect(stat(page, "Em aberto")).toContainText("R$ 76");
    const payments = await readTable<{ orderId: string; refundedAt: string | null }>(page, "payments");
    for (const orderId of [id(30), id(35)]) {
      expect(payments.find((p) => p.orderId === orderId)?.refundedAt).toEqual(expect.any(String));
    }
  });

  test("receives a single order of a person who owes more than one", async ({ page }) => {
    await openWithData(page);
    const melina = person(page, "Melina");

    await melina
      .getByRole("button", { name: `Receber de Melina: 1× Espeto de carne de ${label(date(-3))} em dinheiro` })
      .click();

    await expect(melina.getByRole("listitem").last().getByRole("status")).toHaveText("Pago em dinheiro");
    await expect(melina).toContainText("R$ 30");
    await expect(melina.getByRole("button", { name: "Receber de Melina no Pix", exact: true })).toBeVisible();
    await expect(stat(page, "Em aberto")).toContainText("R$ 64");
    await expect(stat(page, "Pessoas")).toContainText("3");
  });

  test("filters by day and searches by person", async ({ page }) => {
    await openWithData(page);

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("eliz");
    await expect(person(page, "Elizete")).toBeVisible();
    await expect(person(page, "Melina")).toHaveCount(0);
    await expect(stat(page, "Em aberto")).toContainText("R$ 24");

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("");
    await dayFilter(page).select(filterLabel(date(-10)));
    await expect(page.getByText("Nada pendente aqui")).toBeVisible();
    await expect(page.getByText("Todo mundo deste período já pagou.")).toBeVisible();

    await dayFilter(page).select("Todos os dias");
    await expect(stat(page, "Em aberto")).toContainText("R$ 76");
  });

  test("with no day, a link to Sales and no filter", async ({ page }) => {
    await page.goto("/pending");

    await expect(page.getByRole("link", { name: "Criar o primeiro dia em Vendas" })).toHaveAttribute("href", "/");
    await expect(dayFilter(page).trigger).toHaveCount(0);
    await expect(page.getByRole("searchbox", { name: "Buscar pessoa" })).toHaveCount(0);
  });
});

test.describe("Pending on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("day filter, big buttons and receiving in cash", async ({ page }) => {
    await openWithData(page);

    await dayFilter(page).select(filterLabel(date(-3)));
    await expect(stat(page, "Em aberto")).toContainText("R$ 36");
    await expect(person(page, "Maju")).toHaveCount(0);
    await expect(person(page, "Melina")).toContainText("R$ 12");

    const elizete = person(page, "Elizete");
    const cash = elizete.getByRole("button", { name: "Receber de Elizete em dinheiro", exact: true });
    expect((await cash.boundingBox())?.height).toBeGreaterThanOrEqual(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await cash.click();

    await expect(elizete.getByRole("status")).toHaveText("Pago em dinheiro");
    await expect(stat(page, "Em aberto")).toContainText("R$ 12");
  });
});
