import { expect, test, type Locator, type Page } from "@playwright/test";
import { mesPorExtenso } from "../src/lib/formato";
import { data, gravarNoBancoLocal, lerTabela, linha, rotulo } from "./banco-local";
import { filtroDeDia, rotuloDoFiltro } from "./filtro-de-dia";

// page.route não enxerga pedidos que passam pelo service worker.
test.use({ serviceWorkers: "block" });

test("ao abrir o app, a cantina do servidor vai para o banco local", async ({ page }) => {
  const cantina = {
    id: "c0000000-0000-4000-8000-000000000001",
    nome: "Mídia",
    slug: "midia",
    atualizadoEm: "2026-11-01T00:00:00.000Z",
    seq: 7,
  };
  await page.route("**/api/cantina", (rota) => rota.fulfill({ json: { cantina } }));

  await page.goto("/");
  // O título só aparece depois da primeira leitura, então o banco local já existe.
  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();

  await expect.poll(() => lerTabela(page, "cantinas")).toEqual([cantina]);
});

test("sem a cantina no servidor, o app abre do mesmo jeito", async ({ page }) => {
  await page.route("**/api/cantina", (rota) => rota.fulfill({ status: 500, json: { erro: "fora do ar" } }));

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Painel da Cantina" })).toBeVisible();
  expect(await lerTabela(page, "cantinas")).toEqual([]);
});

// 30 dias, um por semana: 3 no futuro, um hoje e 26 no passado, alguns com nome.
const TRINTA = Array.from({ length: 30 }, (_, i) => data(21 - i * 7));
const HOJE = data(0);

// O que cada tela mostra depois da primeira leitura do banco local (ainda sem dias).
const PRONTA: Record<string, (page: Page) => Locator> = {
  "/": (page) => page.getByRole("heading", { name: "Painel da Cantina" }),
  "/vendas": (page) => page.getByText("Cadastre os itens no Cardápio"),
  "/cardapio": (page) => page.getByText("Nenhum item no cardápio ainda"),
  "/pendentes": (page) => page.getByRole("link", { name: "Criar o primeiro dia em Vendas" }),
};

async function abrirComTrintaDias(page: Page, rota: string) {
  await page.route("**/api/cantina", (r) => r.fulfill({ status: 500, json: { erro: "fora do ar" } }));
  await page.goto(rota);
  await expect(PRONTA[rota](page)).toBeVisible();
  await gravarNoBancoLocal(page, {
    cantinas: [linha.cantina()],
    diasDeVenda: TRINTA.map((quando, i) => linha.dia(i + 1, quando, i % 4 === 0 ? "Culto de jovens com nome comprido" : null)),
  });
  await page.reload();
}

const meses = [...new Set(TRINTA.map(mesPorExtenso))];

test.describe("filtro de dia no celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("com 30 dias, nada passa da largura da tela", async ({ page }) => {
    await abrirComTrintaDias(page, "/");
    for (const rota of ["/", "/vendas", "/pendentes", "/cardapio"]) {
      await page.goto(rota);
      await expect(page.getByRole("group", { name: /^(Período|Dia de venda)$/ }).locator('[aria-haspopup="dialog"]')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), rota).toBe(true);
    }
  });

  test("abre no dia de hoje e a lista sobe numa folha agrupada por mês", async ({ page }) => {
    await abrirComTrintaDias(page, "/vendas");
    const filtro = filtroDeDia(page);
    await expect(filtro.gatilho).toContainText(rotuloDoFiltro(HOJE));
    await expect(filtro.gatilho).toContainText("hoje");

    await filtro.gatilho.click();
    await expect(filtro.lista).toHaveAttribute("data-slot", "sheet-content");
    await expect(filtro.lista.getByRole("group")).toHaveCount(meses.length);
    await expect(filtro.lista.getByRole("group").first()).toHaveAccessibleName(meses[0]);
    await expect(filtro.lista.getByRole("button", { pressed: true })).toBeInViewport();

    const maisAntigo = TRINTA.at(-1)!;
    await filtro.lista.getByRole("button", { name: new RegExp(`^${rotuloDoFiltro(maisAntigo)}`) }).click();
    await expect(filtro.lista).toBeHidden();
    await expect(filtro.gatilho).toContainText(rotuloDoFiltro(maisAntigo));
    await expect(filtro.anterior).toBeDisabled();

    await filtro.seguinte.click();
    await expect(filtro.gatilho).toContainText(rotuloDoFiltro(TRINTA.at(-2)!));
  });
});

test("as setas andam entre os dias e param nas pontas", async ({ page }) => {
  await abrirComTrintaDias(page, "/vendas");
  const filtro = filtroDeDia(page);
  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(HOJE));

  await filtro.anterior.click();
  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(data(-7)));
  await expect(filtro.gatilho).toContainText("Culto de jovens");
  await filtro.seguinte.click();
  await filtro.seguinte.click();
  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(data(7)));

  await filtro.seguinte.click();
  await filtro.seguinte.click();
  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(TRINTA[0]));
  await expect(filtro.seguinte).toBeDisabled();
});

test("no desktop, a lista abre num popover agrupado por mês e fecha ao escolher", async ({ page }) => {
  await abrirComTrintaDias(page, "/vendas");
  const filtro = filtroDeDia(page);

  await filtro.gatilho.click();
  await expect(filtro.lista).toHaveAttribute("data-slot", "popover-content");
  await expect(filtro.lista.getByRole("group")).toHaveCount(meses.length);
  await expect(filtro.lista.getByRole("button", { pressed: true })).toContainText(rotuloDoFiltro(HOJE));

  await filtro.lista.getByRole("button", { name: new RegExp(`^${rotuloDoFiltro(data(-70))}`) }).click();
  await expect(filtro.lista).toBeHidden();
  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(data(-70)));
});

test("em Vendas, \"Novo dia de venda\" no fim da lista cria um dia", async ({ page }) => {
  await abrirComTrintaDias(page, "/vendas");
  const filtro = filtroDeDia(page);

  await filtro.gatilho.click();
  await filtro.lista.getByRole("button", { name: "Novo dia de venda" }).click();
  await expect(filtro.lista).toBeHidden();
  await page.getByLabel("Data").fill(data(1));
  await page.getByRole("button", { name: `Criar dia · ${rotulo(data(1))}` }).click();

  await expect(filtro.gatilho).toContainText(rotuloDoFiltro(data(1)));
  await expect.poll(async () => (await lerTabela<{ data: string }>(page, "diasDeVenda")).length).toBe(31);
});

test("no Painel, \"Todos os dias\" esconde as setas", async ({ page }) => {
  await abrirComTrintaDias(page, "/");
  const filtro = filtroDeDia(page, "Período");

  await expect(filtro.gatilho).toHaveText("Todos os dias");
  await expect(filtro.anterior).toHaveCount(0);
  await expect(filtro.seguinte).toHaveCount(0);

  await filtro.escolher(rotuloDoFiltro(data(-7)));
  await expect(filtro.anterior).toBeVisible();
  await expect(filtro.seguinte).toBeVisible();

  await filtro.escolher("Todos os dias");
  await expect(filtro.gatilho).toHaveText("Todos os dias");
  await expect(filtro.anterior).toHaveCount(0);
});
