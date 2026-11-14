import { expect, test, type Page } from "@playwright/test";
import { uuidV5 } from "../src/lib/uuid-v5";
import { data, gravarNoBancoLocal, id, lerTabela, linha } from "./local-db";
import { filtroDeDia, rotuloDoFiltro } from "./day-filter";

// page.route não enxerga pedidos que passam pelo service worker.
test.use({ serviceWorkers: "block" });

const ESPETO = id(1);
const REFRI = id(2);
const DIA = id(10);

type ItemOutbox = { tabela: string; registroId: string; payload: Record<string, unknown> };
type Produto = { id: string; nome: string; precoCentavos: number };
type PrecoDoDia = { id: string; diaId: string; produtoId: string; precoCentavos: number; ativo: boolean };

async function abrirCardapio(page: Page) {
  // A cantina vem dos dados de teste, não do servidor.
  await page.route("**/api/cantina", (rota) => rota.fulfill({ status: 500, json: { erro: "fora do ar" } }));
  await page.goto("/cardapio");
  await expect(page.getByRole("heading", { name: "Cardápio", level: 1 })).toBeVisible();
}

/** Espeto e Refrigerante à venda no dia; Bolo cadastrado, mas fora. 3 espetos vendidos e 5 cancelados. */
async function gravarCardapio(page: Page) {
  const precoId = (produtoId: string) => uuidV5(produtoId, DIA);
  await gravarNoBancoLocal(page, {
    cantinas: [linha.cantina()],
    produtos: [
      linha.produto(1, "Espeto de carne", 1200),
      linha.produto(2, "Refrigerante lata", 600),
      linha.produto(3, "Bolo", 500),
      linha.produto(4, "Item antigo", 100, false),
    ],
    diasDeVenda: [linha.dia(10, data(3))],
    precosDoDia: [
      { ...linha.precoDoDia(0, DIA, ESPETO, 1200), id: await precoId(ESPETO) },
      { ...linha.precoDoDia(0, DIA, REFRI, 600), id: await precoId(REFRI) },
    ],
    pedidos: [linha.pedido(30, DIA, null, "entregue"), { ...linha.pedido(31, DIA, null, "entregue"), status: "cancelado" }],
    itensPedido: [linha.item(40, id(30), ESPETO, 3, 1200), linha.item(41, id(31), ESPETO, 5, 1200)],
  });
  await page.reload();
}

const linhaDo = (page: Page, nome: string) => page.getByRole("listitem").filter({ hasText: nome });

test("muda o preço e tira um item do cardápio do dia", async ({ page }) => {
  await abrirCardapio(page);
  await gravarCardapio(page);

  const gatilho = filtroDeDia(page).gatilho;
  await expect(gatilho).toContainText(rotuloDoFiltro(data(3)));
  await expect(gatilho).toContainText("próximo");
  await expect(page.getByRole("heading", { name: /^Itens em / })).toBeVisible();
  await expect(page.getByText("2 de 3 itens à venda")).toBeVisible();
  await expect(page.getByText("Item antigo")).toHaveCount(0);

  const espeto = linhaDo(page, "Espeto de carne");
  await expect(espeto.getByText("3 vendidos", { exact: true })).toBeVisible();
  await expect(espeto.getByText("Preço padrão R$ 12")).toBeVisible();
  // Sem linha no dia, o Bolo aparece com o preço padrão.
  await expect(linhaDo(page, "Bolo").getByText("R$ 5", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
  const campo = espeto.getByRole("textbox", { name: "Novo preço" });
  await expect(campo).toHaveValue("12");
  await campo.fill("10,50");
  await espeto.getByRole("button", { name: "Salvar" }).click();
  await expect(espeto.getByText("R$ 10,50", { exact: true })).toBeVisible();
  await expect(espeto.getByText("diferente do padrão")).toBeVisible();

  await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
  await expect(page.getByRole("switch", { name: "Colocar Refrigerante lata no cardápio deste dia" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await expect(linhaDo(page, "Refrigerante lata").getByText("Fora")).toBeVisible();
  await expect(page.getByText("1 de 3 itens à venda")).toBeVisible();

  const outbox = await lerTabela<ItemOutbox>(page, "outbox");
  expect(outbox.map((o) => [o.tabela, o.registroId, o.payload.precoCentavos, o.payload.ativo])).toEqual([
    ["precosDoDia", await uuidV5(ESPETO, DIA), 1050, true],
    ["precosDoDia", await uuidV5(REFRI, DIA), 600, false],
  ]);
});

test("um preço inválido não é salvo", async ({ page }) => {
  await abrirCardapio(page);
  await gravarCardapio(page);

  const espeto = linhaDo(page, "Espeto de carne");
  await page.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
  await espeto.getByRole("textbox", { name: "Novo preço" }).fill("doze");
  await espeto.getByRole("button", { name: "Salvar" }).click();
  await expect(espeto.getByRole("alert")).toHaveText("Preço inválido. Use reais, como 12 ou 12,50.");

  await espeto.getByRole("button", { name: "Cancelar" }).click();
  await expect(espeto.getByText("R$ 12", { exact: true })).toBeVisible();
  expect(await lerTabela(page, "outbox")).toEqual([]);
});

test("adiciona um item e já o põe à venda no dia aberto", async ({ page }) => {
  await abrirCardapio(page);
  await gravarCardapio(page);

  await page.getByRole("button", { name: "Adicionar item" }).click();
  const form = page.getByRole("form", { name: "Novo item" });
  await form.getByLabel("Nome do item").fill("  Pão de  queijo ");
  await form.getByLabel("Preço padrão").fill("4,5");
  await form.getByRole("button", { name: "Salvar item" }).click();

  await expect(form.getByLabel("Nome do item")).toHaveValue("");
  await form.getByRole("button", { name: "Fechar" }).click();
  await expect(form).toBeHidden();
  const pao = linhaDo(page, "Pão de queijo");
  await expect(pao.getByText("R$ 4,50", { exact: true })).toBeVisible();
  await expect(pao.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("3 de 4 itens à venda")).toBeVisible();

  const produto = (await lerTabela<Produto>(page, "produtos")).find((p) => p.nome === "Pão de queijo");
  expect(produto?.precoCentavos).toBe(450);
  const precos = await lerTabela<PrecoDoDia>(page, "precosDoDia");
  expect(precos.find((p) => p.produtoId === produto?.id)).toMatchObject({ diaId: DIA, precoCentavos: 450, ativo: true });
});

test("sem nenhum dia, cria o primeiro e mostra os itens com o preço padrão", async ({ page }) => {
  await abrirCardapio(page);
  await gravarNoBancoLocal(page, {
    cantinas: [linha.cantina()],
    produtos: [linha.produto(1, "Espeto de carne", 1200), linha.produto(2, "Refrigerante lata", 600)],
  });
  await page.reload();

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await page.getByRole("button", { name: "Criar dia de venda" }).click();
  await page.getByRole("button", { name: /^Criar dia · / }).click();

  await expect(filtroDeDia(page).gatilho).toBeVisible();
  await expect(page.getByText("2 de 2 itens à venda")).toBeVisible();
  await expect(linhaDo(page, "Espeto de carne").getByText("R$ 12", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remover dia" })).toBeVisible();
});

test("sem nenhum dia, o item adicionado aparece na lista com o preço padrão", async ({ page }) => {
  await abrirCardapio(page);
  await gravarNoBancoLocal(page, { cantinas: [linha.cantina()] });
  await page.reload();

  await page.getByRole("button", { name: "Adicionar item" }).first().click();
  await page.getByLabel("Nome do item").fill("Pastel");
  await page.getByLabel("Preço padrão").fill("8");
  await page.getByRole("button", { name: "Salvar item" }).click();

  await expect(page.getByText("Nenhum dia de venda ainda")).toBeVisible();
  await expect(linhaDo(page, "Pastel").getByText("R$ 8", { exact: true })).toBeVisible();
});

test.describe("no celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("cartões com switch e preço do dia", async ({ page }) => {
    await abrirCardapio(page);
    await gravarCardapio(page);

    const refri = linhaDo(page, "Refrigerante lata");
    await expect(refri.getByText("0 vendidos · padrão R$ 6")).toBeVisible();
    await page.getByRole("switch", { name: "Tirar Refrigerante lata do cardápio deste dia" }).click();
    await expect(refri.getByRole("button", { name: /Mudar o preço/ })).toBeHidden();

    const espeto = linhaDo(page, "Espeto de carne");
    await espeto.getByRole("button", { name: "Mudar o preço de Espeto de carne neste dia" }).click();
    await espeto.getByRole("textbox", { name: "Novo preço" }).fill("15");
    await espeto.getByRole("button", { name: "Salvar" }).click();
    await expect(espeto.getByText("R$ 15", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Adicionar item" }).click();
    await page.getByLabel("Nome do item").fill("Água");
    await page.getByLabel("Preço padrão").fill("3");
    await page.getByRole("button", { name: "Salvar item" }).click();
    await expect(linhaDo(page, "Água").getByText("R$ 3", { exact: true })).toBeVisible();
    await expect(page.getByText("2 de 4 itens à venda")).toBeVisible();
  });
});
