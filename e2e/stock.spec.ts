import { expect, test, type Page } from "@playwright/test";
import { uuidV5 } from "../src/lib/uuid-v5";
import { date, writeLocalDb, id, readTable, row } from "./local-db";

// page.route does not see requests that go through the service worker.
test.use({ serviceWorkers: "block" });

const rowOf = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

async function onlyCanteen(page: Page) {
  await page.route("**/api/canteen", (route) => route.fulfill({ status: 500, json: { error: "server down" } }));
  await page.goto("/menu");
  await expect(page.getByText("Nenhum item no cardápio ainda")).toBeVisible();
  await writeLocalDb(page, { canteens: [row.canteen()] });
  await page.reload();
}

async function addItem(page: Page, name: string, price: string) {
  const form = page.getByRole("form", { name: "Novo item" });
  await form.getByLabel("Nome do item").fill(name);
  await form.getByLabel("Preço padrão").fill(price);
  await form.getByLabel("Preço padrão").press("Enter");
  await expect(form.getByRole("status")).toHaveText(`${name} entrou no cardápio.`);
}

const quantityOf = (page: Page, name: string) =>
  rowOf(page, name).getByRole("textbox", { name: `Quantidade de ${name} neste dia` });

test("first use: items before the day, quantity on the day and selling until sold out", async ({ page }) => {
  await onlyCanteen(page);

  await expect(page.getByRole("button", { name: "Abrir vendas de hoje" })).toHaveCount(0);
  await addItem(page, "Espeto de carne", "12");
  await expect(page.getByLabel("Nome do item")).toBeFocused();
  await expect(page.getByLabel("Nome do item")).toHaveValue("");
  await addItem(page, "Refrigerante", "6");

  const registered = page.getByRole("list", { name: "Itens cadastrados" });
  await expect(registered.getByRole("listitem")).toHaveText([/Espeto de carne/, /Refrigerante/]);

  await page.getByRole("button", { name: "Abrir vendas de hoje" }).click();
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();

  const skewer = rowOf(page, "Espeto de carne");
  await expect(quantityOf(page, "Espeto de carne")).toHaveValue("");
  await expect(quantityOf(page, "Espeto de carne")).toHaveAttribute("placeholder", "Sem limite");
  await quantityOf(page, "Espeto de carne").fill("2");
  await quantityOf(page, "Espeto de carne").press("Enter");
  await expect(skewer.getByText("restam 2")).toBeVisible();
  await expect(quantityOf(page, "Refrigerante")).toHaveValue("");

  await page.getByRole("link", { name: "Vendas" }).first().click();
  const tile = page.getByRole("button", { name: "Adicionar Espeto de carne" });
  await expect(tile).toContainText("restam 2");
  await tile.click();
  await tile.click();
  await expect(tile).toBeDisabled();
  const order = page.getByRole("form", { name: "Pedido" });
  await expect(order.getByRole("button", { name: "Aumentar Espeto de carne" })).toBeDisabled();
  await order.getByRole("button", { name: "Pix" }).click();

  await expect(tile).toContainText("esgotado");
  await expect(tile).toBeDisabled();
  expect((await readTable(page, "orders")).length).toBe(1);

  await page.getByRole("link", { name: "Cardápio" }).first().click();
  await expect(rowOf(page, "Espeto de carne").getByText("Esgotado")).toBeVisible();
});

test.describe("on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sets the day quantity in the card, Esc reverts and empty goes back to no limit", async ({ page }) => {
    await onlyCanteen(page);
    const day = id(10);
    const skewerId = id(1);
    await writeLocalDb(page, {
      products: [row.product(1, "Espeto de carne", 1200)],
      saleDays: [row.day(10, date(0))],
      dayMenuItems: [{ ...row.dayMenuItem(0, day, skewerId, 1200), id: await uuidV5(skewerId, day) }],
      orders: [row.order(30, day, null, "recebido")],
      orderItems: [row.item(40, id(30), skewerId, 3, 1200)],
    });
    await page.reload();

    const skewer = rowOf(page, "Espeto de carne");
    const field = quantityOf(page, "Espeto de carne");

    await field.fill("9");
    await field.press("Escape");
    await expect(field).toHaveValue("");
    await field.blur();

    await field.fill("-1");
    await field.press("Enter");
    await expect(skewer.getByRole("alert")).toContainText("Quantidade inválida");
    await expect(field).toHaveValue("");

    await field.fill("50");
    await field.press("Enter");
    await expect(field).toHaveValue("50");
    await expect(skewer.getByText("restam 47")).toBeVisible();
    await expect(skewer.getByRole("alert")).toHaveCount(0);

    await field.fill("");
    await field.press("Enter");
    await expect(field).toHaveValue("");
    await expect(skewer.getByText(/^restam/)).toHaveCount(0);
  });
});
