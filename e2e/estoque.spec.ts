import { expect, test, type Page } from "@playwright/test";
import { uuidV5 } from "../src/lib/uuid-v5";
import { data, gravarNoBancoLocal, id, lerTabela, linha } from "./banco-local";

// page.route não enxerga pedidos que passam pelo service worker.
test.use({ serviceWorkers: "block" });

const linhaDo = (page: Page, nome: string) => page.getByRole("listitem").filter({ hasText: nome });

async function soComACantina(page: Page) {
  await page.route("**/api/cantina", (rota) => rota.fulfill({ status: 500, json: { erro: "fora do ar" } }));
  await page.goto("/cardapio");
  await expect(page.getByText("Nenhum item no cardápio ainda")).toBeVisible();
  await gravarNoBancoLocal(page, { cantinas: [linha.cantina()] });
  await page.reload();
}

async function adicionarItem(page: Page, nome: string, preco: string) {
  const form = page.getByRole("form", { name: "Novo item" });
  await form.getByLabel("Nome do item").fill(nome);
  await form.getByLabel("Preço padrão").fill(preco);
  await form.getByRole("button", { name: "Salvar item" }).click();
  await expect(form.getByRole("status")).toHaveText(`${nome} entrou no cardápio. Adicione o próximo ou feche.`);
}

test("primeiro uso: itens antes do dia, quantidade no dia e venda até esgotar", async ({ page }) => {
  await soComACantina(page);

  await expect(page.getByText("Nenhum dia de venda ainda")).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar item" }).last().click();
  await adicionarItem(page, "Espeto de carne", "12");
  await expect(page.getByLabel("Nome do item")).toBeFocused();
  await expect(page.getByLabel("Nome do item")).toHaveValue("");
  await adicionarItem(page, "Refrigerante", "6");

  const cadastrados = page.getByRole("list", { name: "Itens cadastrados" });
  await expect(cadastrados.getByRole("listitem")).toHaveText([/Espeto de carne/, /Refrigerante/]);
  await page.getByRole("button", { name: "Fechar" }).click();
  await expect(page.getByRole("form", { name: "Novo item" })).toHaveCount(0);

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await page.getByRole("button", { name: "Criar dia de venda" }).click();
  await page.getByRole("button", { name: /^Criar dia · / }).click();
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();

  const espeto = linhaDo(page, "Espeto de carne");
  await expect(espeto.getByText("Sem limite")).toBeVisible();
  await espeto.getByRole("button", { name: "Mudar a quantidade de Espeto de carne neste dia" }).click();
  await espeto.getByRole("textbox", { name: "Quantidade neste dia" }).fill("2");
  await espeto.getByRole("textbox", { name: "Quantidade neste dia" }).press("Enter");
  await expect(espeto.getByText("· restam 2")).toBeVisible();
  await expect(linhaDo(page, "Refrigerante").getByText("Sem limite")).toBeVisible();

  await page.getByRole("link", { name: "Vendas" }).first().click();
  const form = page.getByRole("form", { name: "Nova venda ou reserva" });
  await expect(form.getByRole("option", { name: "Espeto de carne · R$ 12 · restam 2" })).toBeAttached();
  await form.getByLabel("Item").selectOption({ label: "Espeto de carne · R$ 12 · restam 2" });
  await form.getByRole("button", { name: "Aumentar" }).click();
  await expect(form.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  await form.getByRole("radio", { name: "Pix" }).click();
  await form.getByRole("button", { name: "Registrar · R$ 24" }).click();

  const esgotado = form.getByRole("option", { name: "Espeto de carne · R$ 12 · esgotado" });
  await expect(esgotado).toBeDisabled();
  await form.getByRole("radio", { name: "Pix" }).click();
  await form.getByRole("button", { name: "Registrar · R$ 12" }).click();
  await expect(form.getByRole("alert")).toHaveText("Espeto de carne esgotou.");
  expect((await lerTabela(page, "pedidos")).length).toBe(1);

  await page.getByRole("link", { name: "Cardápio" }).first().click();
  await expect(linhaDo(page, "Espeto de carne").getByText("Esgotado")).toBeVisible();
});

test.describe("no celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("define a quantidade do dia no cartão, Esc cancela e vazio volta a sem limite", async ({ page }) => {
    await soComACantina(page);
    const dia = id(10);
    const espetoId = id(1);
    await gravarNoBancoLocal(page, {
      produtos: [linha.produto(1, "Espeto de carne", 1200)],
      diasDeVenda: [linha.dia(10, data(0))],
      precosDoDia: [{ ...linha.precoDoDia(0, dia, espetoId, 1200), id: await uuidV5(espetoId, dia) }],
      pedidos: [linha.pedido(30, dia, null, "recebido")],
      itensPedido: [linha.item(40, id(30), espetoId, 3, 1200)],
    });
    await page.reload();

    const espeto = linhaDo(page, "Espeto de carne");
    const mudar = espeto.getByRole("button", { name: "Mudar a quantidade de Espeto de carne neste dia" });
    const campo = espeto.getByRole("textbox", { name: "Quantidade neste dia" });

    await mudar.click();
    await campo.fill("9");
    await campo.press("Escape");
    await expect(espeto.getByText("Sem limite")).toBeVisible();

    await mudar.click();
    await campo.fill("-1");
    await espeto.getByRole("button", { name: "Salvar" }).click();
    await expect(espeto.getByRole("alert")).toContainText("Quantidade inválida");

    await campo.fill("50");
    await espeto.getByRole("button", { name: "Salvar" }).click();
    await expect(espeto.getByText("50", { exact: true })).toBeVisible();
    await expect(espeto.getByText("· restam 47")).toBeVisible();

    await mudar.click();
    await campo.fill("");
    await campo.press("Enter");
    await expect(espeto.getByText("Sem limite")).toBeVisible();
  });
});
