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

async function openWithData(page: Page) {
  await page.goto("/pending");
  // The title only appears after the first read, so the local database already exists.
  await expect(page.getByRole("heading", { name: "Pendentes", level: 1 })).toBeVisible();

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
    ],
    orderItems: [
      row.item(40, id(30), id(1), 3, 1000),
      row.item(41, id(31), id(1), 1, 1000),
      row.item(42, id(32), id(1), 2, 1200),
      row.item(43, id(33), id(1), 1, 1000),
      row.item(44, id(34), id(1), 2, 1000),
    ],
    // Charlene paid at the time of the sale: it does not count toward "Recebido agora".
    payments: [{ ...row.payment(50, id(33), 1000), recordedAt: moment(-10) }],
  });
  await page.reload();
}

/** The stat strip column with this label. */
const stat = (page: Page, label: string) =>
  page.getByRole("region", { name: "Números" }).getByText(label, { exact: true }).locator("..");

test.describe("Pending on desktop", () => {
  test("shows the groups and the stats", async ({ page }) => {
    await openWithData(page);

    await expect(stat(page, "Em aberto")).toContainText("R$ 64");
    await expect(stat(page, "Pessoas devendo")).toContainText("3");
    await expect(stat(page, "Há mais de 2 semanas")).toContainText("R$ 40 em aberto");
    await expect(stat(page, "Recebido agora")).toContainText("R$ 0");

    const staleRows = page.getByRole("region", { name: "Há mais de 2 semanas" });
    await expect(staleRows).toContainText("2 pessoas");
    await expect(staleRows.getByRole("group", { name: "Melina" })).toContainText(
      `3× Espeto de carne · ${label(date(-17))}`,
    );
    await expect(staleRows.getByRole("group", { name: "Melina" })).toContainText("há 17 dias");
    await expect(staleRows.getByRole("group", { name: "Maju" })).toBeVisible();

    const recent = page.getByRole("region", { name: "Recentes" });
    await expect(recent.getByRole("group")).toHaveCount(1);
    await expect(recent.getByRole("group", { name: "Elizete" })).toContainText("R$ 24");

    // Reservations and paid orders do not appear.
    await expect(page.getByRole("group", { name: "Gustavo" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Charlene" })).toHaveCount(0);
  });

  test("Receber with Pix records the payment and Desfazer refunds it", async ({ page }) => {
    await openWithData(page);
    const melina = page.getByRole("group", { name: "Melina" });

    await melina.getByRole("button", { name: "Receber R$ 30 de Melina" }).click();
    await melina.getByRole("button", { name: "Pix", exact: true }).click();

    await expect(melina.getByText("Pago via Pix")).toBeVisible();
    await expect(stat(page, "Em aberto")).toContainText("R$ 34");
    await expect(stat(page, "Recebido agora")).toContainText("R$ 30");
    const outbox = await readTable<{ table: string; payload: Record<string, unknown> }>(page, "outbox");
    expect(outbox.filter((i) => i.table === "payments").map((i) => i.payload)).toEqual([
      expect.objectContaining({ orderId: id(30), method: "pix", amountCents: 3000, refundedAt: null }),
    ]);

    await melina.getByRole("button", { name: "Desfazer" }).click();

    await expect(melina.getByRole("button", { name: "Receber R$ 30 de Melina" })).toBeVisible();
    await expect(stat(page, "Em aberto")).toContainText("R$ 64");
    const payments = await readTable<{ orderId: string; refundedAt: string | null }>(page, "payments");
    expect(payments.find((p) => p.orderId === id(30))?.refundedAt).toEqual(expect.any(String));
  });

  test("filters by day and searches by person", async ({ page }) => {
    await openWithData(page);

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("eliz");
    await expect(page.getByRole("group", { name: "Elizete" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Melina" })).toHaveCount(0);
    await expect(stat(page, "Em aberto")).toContainText("R$ 24");

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("");
    await dayFilter(page).select(filterLabel(date(-10)));
    await expect(page.getByText("Nada pendente aqui")).toBeVisible();
    await expect(page.getByText("Todo mundo deste período já pagou.")).toBeVisible();
  });

  test("with no day, zeroed stats and a link to Sales", async ({ page }) => {
    await page.goto("/pending");

    await expect(page.getByRole("link", { name: "Criar o primeiro dia em Vendas" })).toHaveAttribute("href", "/sales");
    await expect(stat(page, "Em aberto")).toContainText("R$ 0");
    await expect(stat(page, "Pessoas devendo")).toContainText("0");
    await expect(dayFilter(page).trigger).toHaveCount(0);
  });
});

test.describe("Pending on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("day filter, summary and receiving in cash", async ({ page }) => {
    await openWithData(page);

    const summary = page.getByRole("region", { name: "Resumo" });
    await expect(summary).toContainText("R$ 64");
    await expect(summary).toContainText("3 pessoas · 2 há mais de 2 semanas");

    await dayFilter(page).select(filterLabel(date(-3)));
    await expect(summary).toContainText("R$ 24");
    await expect(page.getByRole("group", { name: "Melina" })).toHaveCount(0);

    const elizete = page.getByRole("group", { name: "Elizete" });
    await elizete.getByRole("button", { name: "Receber R$ 24 de Elizete" }).click();
    await elizete.getByRole("button", { name: "Dinheiro" }).click();

    await expect(elizete.getByText("Pago em dinheiro")).toBeVisible();
    await expect(summary).toContainText("R$ 0");
    await expect(summary).toContainText("R$ 24");
  });
});
