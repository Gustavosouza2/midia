import { expect, test, type Page } from "@playwright/test";
import { uuidV5 } from "../src/lib/uuid-v5";
import { date, writeLocalDb, id, readTable, row } from "./local-db";

// page.route does not see requests that go through the service worker.
test.use({ serviceWorkers: "block" });

const linhaDo = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

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
  await form.getByRole("button", { name: "Salvar item" }).click();
  await expect(form.getByRole("status")).toHaveText(`${name} entrou no cardápio. Adicione o próximo ou feche.`);
}

test("first use: items before the day, quantity on the day and selling until sold out", async ({ page }) => {
  await onlyCanteen(page);

  await expect(page.getByText("Nenhum dia de venda ainda")).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar item" }).last().click();
  await addItem(page, "Espeto de carne", "12");
  await expect(page.getByLabel("Nome do item")).toBeFocused();
  await expect(page.getByLabel("Nome do item")).toHaveValue("");
  await addItem(page, "Refrigerante", "6");

  const registered = page.getByRole("list", { name: "Itens cadastrados" });
  await expect(registered.getByRole("listitem")).toHaveText([/Espeto de carne/, /Refrigerante/]);
  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("form", { name: "Novo item" })).toHaveCount(0);

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await page.getByRole("button", { name: "Criar dia de venda" }).click();
  await page.getByRole("button", { name: /^Criar dia · / }).click();
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();

  const skewer = linhaDo(page, "Espeto de carne");
  await expect(skewer.getByText("Sem limite")).toBeVisible();
  await skewer.getByRole("button", { name: "Mudar a quantidade de Espeto de carne neste dia" }).click();
  await skewer.getByRole("textbox", { name: "Quantidade neste dia" }).fill("2");
  await skewer.getByRole("textbox", { name: "Quantidade neste dia" }).press("Enter");
  await expect(skewer.getByText("· restam 2")).toBeVisible();
  await expect(linhaDo(page, "Refrigerante").getByText("Sem limite")).toBeVisible();

  await page.getByRole("link", { name: "Vendas" }).first().click();
  const form = page.getByRole("form", { name: "Nova venda ou reserva" });
  await expect(form.getByRole("option", { name: "Espeto de carne · R$ 12 · restam 2" })).toBeAttached();
  await form.getByLabel("Item").selectOption({ label: "Espeto de carne · R$ 12 · restam 2" });
  await form.getByRole("button", { name: "Aumentar" }).click();
  await expect(form.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  await form.getByRole("radio", { name: "Pix" }).click();
  await form.getByRole("button", { name: "Registrar · R$ 24" }).click();

  const soldOut = form.getByRole("option", { name: "Espeto de carne · R$ 12 · esgotado" });
  await expect(soldOut).toBeDisabled();
  await form.getByRole("radio", { name: "Pix" }).click();
  await form.getByRole("button", { name: "Registrar · R$ 12" }).click();
  await expect(form.getByRole("alert")).toHaveText("Espeto de carne esgotou.");
  expect((await readTable(page, "orders")).length).toBe(1);

  await page.getByRole("link", { name: "Cardápio" }).first().click();
  await expect(linhaDo(page, "Espeto de carne").getByText("Esgotado")).toBeVisible();
});

test.describe("on the phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("sets the day quantity on the card, Esc cancels and empty goes back to no limit", async ({ page }) => {
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

    const skewer = linhaDo(page, "Espeto de carne");
    const changeButton = skewer.getByRole("button", { name: "Mudar a quantidade de Espeto de carne neste dia" });
    const field = skewer.getByRole("textbox", { name: "Quantidade neste dia" });

    await changeButton.click();
    await field.fill("9");
    await field.press("Escape");
    await expect(skewer.getByText("Sem limite")).toBeVisible();

    await changeButton.click();
    await field.fill("-1");
    await skewer.getByRole("button", { name: "Salvar" }).click();
    await expect(skewer.getByRole("alert")).toContainText("Quantidade inválida");

    await field.fill("50");
    await skewer.getByRole("button", { name: "Salvar" }).click();
    await expect(skewer.getByText("50", { exact: true })).toBeVisible();
    await expect(skewer.getByText("· restam 47")).toBeVisible();

    await changeButton.click();
    await field.fill("");
    await field.press("Enter");
    await expect(skewer.getByText("Sem limite")).toBeVisible();
  });
});
