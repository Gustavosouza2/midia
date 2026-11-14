import { expect, test, type Page } from "@playwright/test";
import { data, gravarNoBancoLocal, id, lerTabela, linha } from "./local-db";

type Linha = Record<string, unknown>;

async function abrirComCardapio(page: Page) {
  await page.goto("/vendas");
  // O primeiro uso só aparece depois da primeira leitura, então o banco local já existe.
  await expect(page.getByText("Cadastre os itens no Cardápio")).toBeVisible();
  await gravarNoBancoLocal(page, {
    cantinas: [linha.cantina()],
    produtos: [linha.produto(1, "Espeto de carne", 1000), linha.produto(2, "Refrigerante", 600)],
    diasDeVenda: [linha.dia(10, data(0))],
    precosDoDia: [linha.precoDoDia(20, id(10), id(1), 1200), linha.precoDoDia(21, id(10), id(2), 600, false)],
  });
  await page.reload();
}

const tabelas = async (page: Page) => (await lerTabela<Linha>(page, "outbox")).map((i) => i.tabela);

test.describe("desktop", () => {
  test("registra vendas, muda o pagamento e entrega uma reserva", async ({ page }) => {
    await abrirComCardapio(page);
    const form = page.getByRole("form", { name: "Nova venda ou reserva" });

    // Só o que está à venda no dia, com o preço do dia.
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
    expect(await tabelas(page)).toEqual(
      expect.arrayContaining(["clientes", "pedidos", "itensPedido", "pagamentos"]),
    );
    expect(await lerTabela(page, "pagamentos")).toHaveLength(1);

    const ana = page.getByRole("row", { name: /Ana/ });
    await ana.getByRole("button", { name: "Pendente. Tocar para marcar como pago" }).click();
    await ana.getByRole("button", { name: "Dinheiro" }).click();
    await expect(ana).toContainText("Pago · Dinheiro");
    await expect(page.getByText("nada em aberto")).toBeVisible();

    await ana.getByRole("button", { name: "Pago · Dinheiro. Tocar para desfazer" }).click();
    await ana.getByRole("button", { name: "Desfazer" }).click();
    await expect(ana).toContainText("Pendente");
    const pagamentos = await lerTabela<Linha>(page, "pagamentos");
    expect(pagamentos.filter((p) => p.forma === "dinheiro").map((p) => p.estornadoEm !== null)).toEqual([true]);

    await form.getByRole("radio", { name: "Reserva" }).click();
    await form.getByLabel("Quem").fill("Caio");
    await form.getByRole("button", { name: "Reservar · R$ 12" }).click();
    const caio = page.getByRole("row", { name: /Caio/ });
    await expect(caio).toContainText("Reservado");
    await expect(page.getByText("1 item · R$ 12")).toBeVisible();

    await caio.getByRole("button", { name: "Entregar" }).click();
    await expect(caio).toContainText("Pendente");
    await expect(page.getByText("nenhuma para este dia")).toBeVisible();
    const pedidos = await lerTabela<Linha>(page, "pedidos");
    expect(pedidos.map((p) => p.status)).toEqual(["entregue", "entregue", "entregue"]);
  });

  test("filtros, busca e quadro", async ({ page }) => {
    await abrirComCardapio(page);
    await gravarNoBancoLocal(page, {
      clientes: [linha.cliente(30, "Júlia"), linha.cliente(31, "Marcos"), linha.cliente(32, "Nina")],
      pedidos: [
        linha.pedido(40, id(10), id(30), "entregue"),
        linha.pedido(41, id(10), id(31), "entregue"),
        linha.pedido(42, id(10), id(32), "recebido"),
      ],
      itensPedido: [
        linha.item(50, id(40), id(1), 1, 1200),
        linha.item(51, id(41), id(1), 2, 1200),
        linha.item(52, id(42), id(1), 1, 1200),
      ],
      pagamentos: [linha.pagamento(60, id(40), 1200)],
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
    const pagos = page.getByRole("region", { name: "Pagos" });
    await expect(pagos).toContainText("Júlia");
    await pagos.getByRole("button", { name: "Desfazer" }).click();
    await expect(page.getByRole("region", { name: "Pendentes" })).toContainText("Júlia");
    await expect(page.getByRole("region", { name: "Reservas" })).toContainText("Nina");
  });

  test("dia sem itens à venda manda para o Cardápio", async ({ page }) => {
    await abrirComCardapio(page);
    await gravarNoBancoLocal(page, { precosDoDia: [linha.precoDoDia(20, id(10), id(1), 1200, false)] });
    await page.reload();
    await expect(page.getByText("Nenhum item à venda neste dia.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Monte o cardápio do dia" })).toHaveAttribute("href", "/cardapio");
  });
});

test.describe("celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("registra pela folha Nova venda e desfaz o pagamento no cartão", async ({ page }) => {
    await abrirComCardapio(page);

    await page.getByRole("button", { name: "Nova venda" }).click();
    const folha = page.getByRole("dialog", { name: "Novo pedido" });
    await folha.getByLabel("Quem").fill("Davi");
    await folha.getByRole("radio", { name: "Pix" }).click();
    await folha.getByRole("button", { name: "Registrar · R$ 12" }).click();
    await expect(folha).toBeHidden();

    const cartao = page.getByRole("listitem").filter({ hasText: "Davi" });
    await expect(cartao).toContainText("Pago · Pix");
    await cartao.getByRole("button", { name: "Desfazer" }).click();
    await expect(cartao).toContainText("Pendente");
    await cartao.getByRole("button", { name: "Marcar pago" }).click();
    await cartao.getByRole("button", { name: "Dinheiro" }).click();
    await expect(cartao).toContainText("Pago · Dinheiro");
    expect(await tabelas(page)).toEqual(expect.arrayContaining(["pedidos", "itensPedido", "pagamentos"]));
  });
});
