import { expect, test, type Page } from "@playwright/test";
import { date, writeLocalDb, id, readTable, row } from "./local-db";

type Row = Record<string, unknown>;

// Only the test canteen on the device: page.route does not see requests that go through the service worker.
test.use({ serviceWorkers: "block" });
test.beforeEach(async ({ page }) => {
  await page.route("**/api/canteen", (route) => route.fulfill({ status: 500, json: { error: "offline" } }));
});

async function openWithMenu(page: Page, { today = true } = {}) {
  await page.goto("/");
  // The first-use screen only appears after the first read, so the local database already exists.
  await expect(page.getByText("Cadastre os itens no Cardápio")).toBeVisible();
  await writeLocalDb(page, {
    canteens: [row.canteen()],
    products: [
      row.product(1, "Espeto de carne", 1000),
      row.product(2, "Refrigerante", 600),
      row.product(3, "Pastel", 800),
    ],
    saleDays: [row.day(10, today ? date(0) : date(-7))],
    dayMenuItems: [
      row.dayMenuItem(20, id(10), id(1), 1200),
      row.dayMenuItem(21, id(10), id(2), 600, false),
      row.dayMenuItem(22, id(10), id(3), 800),
    ],
  });
  await page.reload();
}

const tables = async (page: Page) => (await readTable<Row>(page, "outbox")).map((i) => i.table);
const add = (page: Page, name: string) => page.getByRole("button", { name: `Adicionar ${name}` }).click();

test.describe("desktop", () => {
  test("a paid sale with two items takes three taps and can be undone", async ({ page }) => {
    await openWithMenu(page);

    // Only what is for sale on the day, at the day's price.
    await expect(page.getByRole("button", { name: /^Adicionar / })).toHaveText([/Espeto de carne.*R\$ 12/, /Pastel.*R\$ 8/]);

    await add(page, "Espeto de carne");
    await add(page, "Espeto de carne");
    await add(page, "Pastel");
    const order = page.getByRole("form", { name: "Pedido" });
    await expect(order.getByLabel("Total do pedido")).toHaveText("R$ 32");
    await expect(page.getByRole("button", { name: "Adicionar Espeto de carne" })).toContainText("2");

    await order.getByRole("button", { name: "Pix" }).click();
    await expect(page.getByRole("status")).toContainText("Venda registrada");
    await expect(order.getByLabel("Total do pedido")).toHaveText("R$ 0");
    const row = page.getByRole("row", { name: /Sem nome/ });
    await expect(row).toContainText("2× Espeto de carne, 1× Pastel");
    await expect(row).toContainText("Pago · Pix");
    expect(await tables(page)).toEqual(expect.arrayContaining(["orders", "orderItems", "payments"]));

    await page.getByRole("status").getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("row", { name: /Sem nome/ })).toHaveCount(0);
    await expect(order.getByLabel("Total do pedido")).toHaveText("R$ 32");
    const orders = await readTable<Row>(page, "orders");
    expect(orders.map((o) => o.status)).toEqual(["cancelado"]);
    expect((await readTable<Row>(page, "payments")).every((p) => p.refundedAt !== null)).toBe(true);
  });

  test("pending sales and reservations ask for a name, and the list receives in one tap", async ({ page }) => {
    await openWithMenu(page);
    const order = page.getByRole("form", { name: "Pedido" });

    await add(page, "Espeto de carne");
    await order.getByRole("button", { name: "Pendente" }).click();
    await expect(order.getByRole("alert")).toHaveText("Escreva o nome de quem vai pagar depois.");
    await expect(order.getByLabel("Nome")).toBeFocused();
    await order.getByLabel("Nome").fill("Ana");
    await order.getByRole("button", { name: "Pendente" }).click();

    const ana = page.getByRole("row", { name: /Ana/ });
    await expect(ana).toContainText("Pendente");
    await expect(page.getByRole("tab", { name: "Pendentes" })).toContainText("1");

    await ana.getByRole("button", { name: "Receber de Ana em dinheiro" }).click();
    await expect(ana).toContainText("Pago · Dinheiro");
    await ana.getByRole("button", { name: "Desfazer pagamento de Ana" }).click();
    await expect(ana).toContainText("Pendente");

    await order.getByRole("radio", { name: "Reserva" }).click();
    await add(page, "Pastel");
    await order.getByLabel("Nome").fill("Caio");
    await order.getByRole("button", { name: "Pendente" }).click();
    const caio = page.getByRole("row", { name: /Caio/ });
    await expect(caio).toContainText("Reservado");

    await caio.getByRole("button", { name: "Entregar" }).click();
    await expect(caio).toContainText("Pendente");
    const orders = await readTable<Row>(page, "orders");
    expect(orders.map((p) => p.status)).toEqual(["entregue", "entregue"]);
  });

  test("filters with counts and search", async ({ page }) => {
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

    await expect(page.getByRole("tab", { name: "Todos" })).toContainText("3");
    await page.getByRole("tab", { name: "Pendentes" }).click();
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row", { name: /Marcos/ })).toBeVisible();

    await page.getByRole("tab", { name: "Todos" }).click();
    await page.getByLabel("Buscar cliente").fill("julia");
    await expect(page.getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("row", { name: /Júlia/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pagos" })).toContainText("1");
  });

  test("without a sale day today, one tap opens it with the latest day's menu", async ({ page }) => {
    await openWithMenu(page, { today: false });

    await page.getByRole("button", { name: "Abrir vendas de hoje" }).click();

    await expect(page.getByRole("button", { name: /^Adicionar / })).toHaveText([/Espeto de carne.*R\$ 12/, /Pastel/]);
    const days = await readTable<Row>(page, "saleDays");
    expect(days.map((d) => d.date).sort()).toEqual([date(-7), date(0)]);
  });

  test("a day with no items for sale points to the Menu", async ({ page }) => {
    await openWithMenu(page);
    await writeLocalDb(page, {
      dayMenuItems: [row.dayMenuItem(20, id(10), id(1), 1200, false), row.dayMenuItem(22, id(10), id(3), 800, false)],
    });
    await page.reload();
    await expect(page.getByText("Nenhum item à venda neste dia.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Monte o cardápio do dia" })).toHaveAttribute("href", "/menu");
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("taps items, charges from the bar and receives on the card", async ({ page }) => {
    await openWithMenu(page);

    await add(page, "Espeto de carne");
    await add(page, "Pastel");
    await page.getByRole("button", { name: "Cobrar" }).click();
    const sheet = page.getByRole("dialog", { name: "Pedido" });
    await expect(sheet.getByLabel("Total do pedido")).toHaveText("R$ 20");
    await sheet.getByLabel("Nome").fill("Davi");
    await sheet.getByRole("button", { name: "Pendente" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: "Cobrar" })).toBeHidden();

    const card = page.getByRole("listitem").filter({ hasText: "Davi" });
    await expect(card).toContainText("Pendente");
    await card.getByRole("button", { name: "Receber de Davi no Pix" }).click();
    await expect(card).toContainText("Pago · Pix");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
