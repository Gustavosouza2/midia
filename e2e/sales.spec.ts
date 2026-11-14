import { expect, test, type Page } from "@playwright/test";
import { date, writeLocalDb, id, readTable, row } from "./local-db";

type Row = Record<string, unknown>;

async function openWithMenu(page: Page) {
  await page.goto("/sales");
  // The first-use screen only appears after the first read, so the local database already exists.
  await expect(page.getByText("Cadastre os itens no Cardápio")).toBeVisible();
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [row.product(1, "Espeto de carne", 1000), row.product(2, "Refrigerante", 600)],
    saleDays: [row.day(10, date(0))],
    dayMenuItems: [row.dayMenuItem(20, id(10), id(1), 1200), row.dayMenuItem(21, id(10), id(2), 600, false)],
  });
  await page.reload();
}

const tables = async (page: Page) => (await readTable<Row>(page, "outbox")).map((i) => i.table);

test.describe("desktop", () => {
  test("records sales, changes the payment and delivers a reservation", async ({ page }) => {
    await openWithMenu(page);
    const form = page.getByRole("form", { name: "Nova venda ou reserva" });

    // Only what is for sale on the day, at the day's price.
    await expect(form.getByLabel("Item").locator("option")).toHaveText(["Espeto de carne · R$ 12"]);
    await expect(form.getByLabel("Preço un.")).toHaveValue("12");

    await form.getByLabel("Quem").fill("Ana");
    await form.getByRole("button", { name: "Aumentar" }).click();
    await form.getByRole("button", { name: "Registrar · R$ 24" }).click();
    await expect(page.getByRole("row", { name: /Ana/ })).toContainText("Pendente");
    await expect(form.getByLabel("Quem")).toHaveValue("");

    await form.getByLabel("Quem").fill("Bia");
    await form.getByLabel("Preço un.").fill("10");
    await form.getByRole("radio", { name: "Pix" }).click();
    await form.getByRole("button", { name: "Registrar · R$ 10" }).click();
    await expect(page.getByRole("row", { name: /Bia/ })).toContainText("Pago · Pix");
    await expect(page.getByRole("row", { name: /Bia/ })).toContainText("R$ 10 cada");

    await expect(page.getByText("R$ 34 no total")).toBeVisible();
    await expect(page.getByText("1 pedido em aberto")).toBeVisible();
    expect(await tables(page)).toEqual(
      expect.arrayContaining(["customers", "orders", "orderItems", "payments"]),
    );
    expect(await readTable(page, "payments")).toHaveLength(1);

    const ana = page.getByRole("row", { name: /Ana/ });
    await ana.getByRole("button", { name: "Pendente. Tocar para marcar como pago" }).click();
    await ana.getByRole("button", { name: "Dinheiro" }).click();
    await expect(ana).toContainText("Pago · Dinheiro");
    await expect(page.getByText("nada em aberto")).toBeVisible();

    await ana.getByRole("button", { name: "Pago · Dinheiro. Tocar para desfazer" }).click();
    await ana.getByRole("button", { name: "Desfazer" }).click();
    await expect(ana).toContainText("Pendente");
    const payments = await readTable<Row>(page, "payments");
    expect(payments.filter((p) => p.method === "dinheiro").map((p) => p.refundedAt !== null)).toEqual([true]);

    await form.getByRole("radio", { name: "Reserva" }).click();
    await form.getByLabel("Quem").fill("Caio");
    await form.getByRole("button", { name: "Reservar · R$ 12" }).click();
    const caio = page.getByRole("row", { name: /Caio/ });
    await expect(caio).toContainText("Reservado");
    await expect(page.getByText("1 item · R$ 12")).toBeVisible();

    await caio.getByRole("button", { name: "Entregar" }).click();
    await expect(caio).toContainText("Pendente");
    await expect(page.getByText("nenhuma para este dia")).toBeVisible();
    const orders = await readTable<Row>(page, "orders");
    expect(orders.map((p) => p.status)).toEqual(["entregue", "entregue", "entregue"]);
  });

  test("filters, search and board", async ({ page }) => {
    await openWithMenu(page);
    await writeLocalDb(page, {
      customers: [row.customer(30, "Júlia"), row.customer(31, "Marcos"), row.customer(32, "Nina")],
      orders: [
        row.order(40, id(10), id(30), "entregue"),
        row.order(41, id(10), id(31), "entregue"),
        row.order(42, id(10), id(32), "recebido"),
      ],
      orderItems: [
        row.item(50, id(40), id(1), 1, 1200),
        row.item(51, id(41), id(1), 2, 1200),
        row.item(52, id(42), id(1), 1, 1200),
      ],
      payments: [row.payment(60, id(40), 1200)],
    });
    await page.reload();

    await page.getByRole("tab", { name: "Pendentes" }).click();
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row", { name: /Marcos/ })).toBeVisible();

    await page.getByRole("tab", { name: "Todos" }).click();
    await page.getByLabel("Buscar cliente").fill("julia");
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row", { name: /Júlia/ })).toBeVisible();
    await page.getByLabel("Buscar cliente").fill("");

    await page.getByRole("tab", { name: "Quadro" }).click();
    const paidOrders = page.getByRole("region", { name: "Pagos" });
    await expect(paidOrders).toContainText("Júlia");
    await paidOrders.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("region", { name: "Pendentes" })).toContainText("Júlia");
    await expect(page.getByRole("region", { name: "Reservas" })).toContainText("Nina");
  });

  test("a day with no items for sale points to the Menu", async ({ page }) => {
    await openWithMenu(page);
    await writeLocalDb(page, { dayMenuItems: [row.dayMenuItem(20, id(10), id(1), 1200, false)] });
    await page.reload();
    await expect(page.getByText("Nenhum item à venda neste dia.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Monte o cardápio do dia" })).toHaveAttribute("href", "/menu");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("records through the Nova venda sheet and undoes the payment on the card", async ({ page }) => {
    await openWithMenu(page);

    await page.getByRole("button", { name: "Nova venda" }).click();
    const sheet = page.getByRole("dialog", { name: "Novo pedido" });
    await sheet.getByLabel("Quem").fill("Davi");
    await sheet.getByRole("radio", { name: "Pix" }).click();
    await sheet.getByRole("button", { name: "Registrar · R$ 12" }).click();
    await expect(sheet).toBeHidden();

    const card = page.getByRole("listitem").filter({ hasText: "Davi" });
    await expect(card).toContainText("Pago · Pix");
    await card.getByRole("button", { name: "Desfazer" }).click();
    await expect(card).toContainText("Pendente");
    await card.getByRole("button", { name: "Marcar pago" }).click();
    await card.getByRole("button", { name: "Dinheiro" }).click();
    await expect(card).toContainText("Pago · Dinheiro");
    expect(await tables(page)).toEqual(expect.arrayContaining(["orders", "orderItems", "payments"]));
  });
});
