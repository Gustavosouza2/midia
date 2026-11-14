import { expect, test, type Page } from "@playwright/test";
import { data, gravarNoBancoLocal, id, lerTabela, linha, rotulo } from "./local-db";
import { filtroDeDia, rotuloDoFiltro } from "./day-filter";

/** Momento `dias` dias a partir de agora (negativo = no passado). */
const momento = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString();

/** Pedido entregue criado no próprio dia de venda, como se tivesse sido vendido lá. */
const pedido = (n: number, diaId: string, clienteId: string, diasAtras: number) => ({
  ...linha.pedido(n, diaId, clienteId, "entregue"),
  criadoEm: momento(-diasAtras),
});

async function abrirComDados(page: Page) {
  await page.goto("/pendentes");
  // O título só aparece depois da primeira leitura, então o banco local já existe.
  await expect(page.getByRole("heading", { name: "Pendentes", level: 1 })).toBeVisible();

  await gravarNoBancoLocal(page, {
    cantinas: [linha.cantina()],
    produtos: [linha.produto(1, "Espeto de carne", 1000)],
    diasDeVenda: [linha.dia(10, data(-17)), linha.dia(11, data(-3)), linha.dia(12, data(-10))],
    clientes: [
      linha.cliente(20, "Melina"),
      linha.cliente(21, "Maju"),
      linha.cliente(22, "Elizete"),
      linha.cliente(23, "Charlene"),
      linha.cliente(24, "Gustavo"),
    ],
    pedidos: [
      pedido(30, id(10), id(20), 17),
      pedido(31, id(10), id(21), 17),
      pedido(32, id(11), id(22), 3),
      pedido(33, id(12), id(23), 10),
      { ...linha.pedido(34, id(11), id(24), "recebido"), criadoEm: momento(-4) },
    ],
    itensPedido: [
      linha.item(40, id(30), id(1), 3, 1000),
      linha.item(41, id(31), id(1), 1, 1000),
      linha.item(42, id(32), id(1), 2, 1200),
      linha.item(43, id(33), id(1), 1, 1000),
      linha.item(44, id(34), id(1), 2, 1000),
    ],
    // Charlene pagou na hora da venda: não conta em "Recebido agora".
    pagamentos: [{ ...linha.pagamento(50, id(33), 1000), registradoEm: momento(-10) }],
  });
  await page.reload();
}

/** A coluna da faixa de números com este rótulo. */
const numero = (page: Page, rotulo: string) =>
  page.getByRole("region", { name: "Números" }).getByText(rotulo, { exact: true }).locator("..");

test.describe("Pendentes no desktop", () => {
  test("mostra os grupos e os números", async ({ page }) => {
    await abrirComDados(page);

    await expect(numero(page, "Em aberto")).toContainText("R$ 64");
    await expect(numero(page, "Pessoas devendo")).toContainText("3");
    await expect(numero(page, "Há mais de 2 semanas")).toContainText("R$ 40 em aberto");
    await expect(numero(page, "Recebido agora")).toContainText("R$ 0");

    const antigos = page.getByRole("region", { name: "Há mais de 2 semanas" });
    await expect(antigos).toContainText("2 pessoas");
    await expect(antigos.getByRole("group", { name: "Melina" })).toContainText(
      `3× Espeto de carne · ${rotulo(data(-17))}`,
    );
    await expect(antigos.getByRole("group", { name: "Melina" })).toContainText("há 17 dias");
    await expect(antigos.getByRole("group", { name: "Maju" })).toBeVisible();

    const recentes = page.getByRole("region", { name: "Recentes" });
    await expect(recentes.getByRole("group")).toHaveCount(1);
    await expect(recentes.getByRole("group", { name: "Elizete" })).toContainText("R$ 24");

    // Reserva e pedido pago não aparecem.
    await expect(page.getByRole("group", { name: "Gustavo" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Charlene" })).toHaveCount(0);
  });

  test("Receber com Pix grava o pagamento e Desfazer estorna", async ({ page }) => {
    await abrirComDados(page);
    const melina = page.getByRole("group", { name: "Melina" });

    await melina.getByRole("button", { name: "Receber R$ 30 de Melina" }).click();
    await melina.getByRole("button", { name: "Pix", exact: true }).click();

    await expect(melina.getByText("Pago via Pix")).toBeVisible();
    await expect(numero(page, "Em aberto")).toContainText("R$ 34");
    await expect(numero(page, "Recebido agora")).toContainText("R$ 30");
    const outbox = await lerTabela<{ tabela: string; payload: Record<string, unknown> }>(page, "outbox");
    expect(outbox.filter((i) => i.tabela === "pagamentos").map((i) => i.payload)).toEqual([
      expect.objectContaining({ pedidoId: id(30), forma: "pix", valorCentavos: 3000, estornadoEm: null }),
    ]);

    await melina.getByRole("button", { name: "Desfazer" }).click();

    await expect(melina.getByRole("button", { name: "Receber R$ 30 de Melina" })).toBeVisible();
    await expect(numero(page, "Em aberto")).toContainText("R$ 64");
    const pagamentos = await lerTabela<{ pedidoId: string; estornadoEm: string | null }>(page, "pagamentos");
    expect(pagamentos.find((p) => p.pedidoId === id(30))?.estornadoEm).toEqual(expect.any(String));
  });

  test("filtra por dia e busca por pessoa", async ({ page }) => {
    await abrirComDados(page);

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("eliz");
    await expect(page.getByRole("group", { name: "Elizete" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Melina" })).toHaveCount(0);
    await expect(numero(page, "Em aberto")).toContainText("R$ 24");

    await page.getByRole("searchbox", { name: "Buscar pessoa" }).fill("");
    await filtroDeDia(page).escolher(rotuloDoFiltro(data(-10)));
    await expect(page.getByText("Nada pendente aqui")).toBeVisible();
    await expect(page.getByText("Todo mundo deste período já pagou.")).toBeVisible();
  });

  test("sem nenhum dia, números zerados e link para Vendas", async ({ page }) => {
    await page.goto("/pendentes");

    await expect(page.getByRole("link", { name: "Criar o primeiro dia em Vendas" })).toHaveAttribute("href", "/vendas");
    await expect(numero(page, "Em aberto")).toContainText("R$ 0");
    await expect(numero(page, "Pessoas devendo")).toContainText("0");
    await expect(filtroDeDia(page).gatilho).toHaveCount(0);
  });
});

test.describe("Pendentes no celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("filtro de dia, resumo e receber em dinheiro", async ({ page }) => {
    await abrirComDados(page);

    const resumo = page.getByRole("region", { name: "Resumo" });
    await expect(resumo).toContainText("R$ 64");
    await expect(resumo).toContainText("3 pessoas · 2 há mais de 2 semanas");

    await filtroDeDia(page).escolher(rotuloDoFiltro(data(-3)));
    await expect(resumo).toContainText("R$ 24");
    await expect(page.getByRole("group", { name: "Melina" })).toHaveCount(0);

    const elizete = page.getByRole("group", { name: "Elizete" });
    await elizete.getByRole("button", { name: "Receber R$ 24 de Elizete" }).click();
    await elizete.getByRole("button", { name: "Dinheiro" }).click();

    await expect(elizete.getByText("Pago em dinheiro")).toBeVisible();
    await expect(resumo).toContainText("R$ 0");
    await expect(resumo).toContainText("R$ 24");
  });
});
