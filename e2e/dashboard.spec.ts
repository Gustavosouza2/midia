import { expect, test } from "@playwright/test";
import { data, gravarNoBancoLocal, id, linha } from "./local-db";
import { filtroDeDia, rotuloDoFiltro } from "./day-filter";

test("o Painel mostra os números do banco local", async ({ page }) => {
  await page.goto("/");
  // O título só aparece depois da primeira leitura, então o banco local já existe.
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();

  await gravarNoBancoLocal(page, {
    produtos: [linha.produto(1, "Espeto de carne", 1000)],
    diasDeVenda: [linha.dia(10, data(-17)), linha.dia(11, data(5))],
    clientes: [linha.cliente(20, "Charlene"), linha.cliente(21, "Melina"), linha.cliente(22, "Gustavo")],
    pedidos: [
      linha.pedido(30, id(10), id(20), "entregue"),
      linha.pedido(31, id(10), id(21), "entregue"),
      linha.pedido(32, id(11), id(22), "recebido"),
    ],
    itensPedido: [
      linha.item(40, id(30), id(1), 3, 1000),
      linha.item(41, id(31), id(1), 2, 1000),
      linha.item(42, id(32), id(1), 3, 1200),
    ],
    pagamentos: [linha.pagamento(50, id(30), 3000)],
  });
  await page.reload();

  await expect(page.getByText("60% de R$ 50 vendidos")).toBeVisible();
  await expect(page.getByText("R$ 30", { exact: true })).toBeVisible();
  await expect(page.getByText("R$ 36 a entregar")).toBeVisible();
  await expect(page.getByText("1 reserva feita")).toBeVisible();

  // "Precisa de atenção": o pendente antigo e a reserva do próximo dia.
  await expect(page.getByText("Melina")).toBeVisible();
  await expect(page.getByText("há 17 dias")).toBeVisible();
  await expect(page.getByText("Gustavo")).toBeVisible();

  // Filtrar pelo dia passado tira a reserva do próximo dia dos números.
  await filtroDeDia(page, "Período").escolher(rotuloDoFiltro(data(-17)));
  await expect(page.getByText("nenhuma neste período")).toBeVisible();
});

test("o menu conta os pendentes e o Painel leva para Pendentes e Vendas", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();
  await gravarNoBancoLocal(page, {
    produtos: [linha.produto(1, "Espeto de carne", 1000)],
    diasDeVenda: [linha.dia(10, data(-3))],
    clientes: [linha.cliente(20, "Melina")],
    pedidos: [linha.pedido(30, id(10), id(20), "entregue")],
    itensPedido: [linha.item(40, id(30), id(1), 2, 1000)],
  });
  await page.reload();

  const menu = page.getByRole("navigation", { name: "Menu principal" });
  await expect(menu.getByLabel("1 em aberto")).toBeVisible();

  await page.getByRole("link", { name: /Ver todos os pendentes/ }).click();
  await expect(page).toHaveURL(/\/pendentes$/);
  await expect(page.getByText("Melina")).toBeVisible();

  await menu.getByRole("link", { name: "Painel" }).click();
  await page.getByRole("link", { name: "Nova venda" }).click();
  await expect(page).toHaveURL(/\/vendas$/);
});
