import { describe, expect, it } from "vitest";
import type { ItemPedido, Pedido, PrecoDoDia, Produto } from "@/local-db";
import { lerQuantidade, lerReais, montarCardapio, reaisParaCampo, type DadosCardapio } from "./cardapio";

const CANTINA = "c0000000-0000-4000-8000-000000000000";
const DIA = "d0000000-0000-4000-8000-000000000001";
const OUTRO_DIA = "d0000000-0000-4000-8000-000000000002";
const sync = { atualizadoEm: "2026-11-01T00:00:00.000Z", seq: 1 };

const produto = (id: string, nome: string, precoCentavos: number, ativo = true): Produto => ({
  id,
  cantinaId: CANTINA,
  nome,
  precoCentavos,
  ativo,
  ...sync,
});

const preco = (
  diaId: string,
  produtoId: string,
  precoCentavos: number,
  ativo = true,
  quantidade: number | null = null,
): PrecoDoDia => ({
  id: `${diaId}-${produtoId}`,
  cantinaId: CANTINA,
  diaId,
  produtoId,
  precoCentavos,
  ativo,
  quantidade,
  ...sync,
});

const pedido = (id: string, diaId: string, status: Pedido["status"] = "entregue"): Pedido => ({
  id,
  cantinaId: CANTINA,
  diaId,
  clienteId: null,
  origem: "balcao",
  status,
  vendedorId: null,
  criadoEm: "2026-11-01T20:00:00.000Z",
  entregueEm: null,
  ...sync,
});

const item = (pedidoId: string, produtoId: string, quantidade: number, canceladoEm: string | null = null): ItemPedido => ({
  id: `${pedidoId}-${produtoId}-${quantidade}`,
  pedidoId,
  cantinaId: CANTINA,
  produtoId,
  quantidade,
  precoUnitarioCentavos: 1000,
  canceladoEm,
  ...sync,
});

const vazio = (): DadosCardapio => ({ produtos: [], precosDoDia: [], pedidos: [], itens: [] });

describe("montarCardapio", () => {
  it("usa o preço do dia e, sem linha no dia, o preço padrão", () => {
    const dados = vazio();
    dados.produtos.push(produto("espeto", "Espeto de carne", 1200), produto("refri", "Refrigerante lata", 600));
    dados.precosDoDia.push(preco(DIA, "espeto", 1000), preco(OUTRO_DIA, "refri", 500));

    const { itens } = montarCardapio(dados, DIA);

    expect(itens.map((i) => [i.produto.nome, i.precoCentavos, i.aVenda])).toEqual([
      ["Espeto de carne", 1000, true],
      ["Refrigerante lata", 600, false],
    ]);
  });

  it("marca o item com preço diferente do padrão, à venda ou não", () => {
    const dados = vazio();
    dados.produtos.push(produto("a", "Água", 300), produto("b", "Bolo", 500), produto("c", "Café", 200));
    dados.precosDoDia.push(preco(DIA, "a", 300), preco(DIA, "b", 450), preco(DIA, "c", 250, false));

    const { itens } = montarCardapio(dados, DIA);

    expect(itens.map((i) => i.diferenteDoPadrao)).toEqual([false, true, true]);
  });

  it("conta os vendidos do dia sem pedidos ou itens cancelados", () => {
    const dados = vazio();
    dados.produtos.push(produto("espeto", "Espeto de carne", 1200));
    dados.pedidos.push(
      pedido("p1", DIA),
      pedido("p2", DIA, "recebido"),
      pedido("p3", DIA, "cancelado"),
      pedido("p4", OUTRO_DIA),
    );
    dados.itens.push(
      item("p1", "espeto", 3),
      item("p1", "espeto", 5, "2026-11-01T21:00:00.000Z"),
      item("p2", "espeto", 2),
      item("p3", "espeto", 7),
      item("p4", "espeto", 11),
    );

    expect(montarCardapio(dados, DIA).itens[0].estoque.vendidos).toBe(5);
  });

  it("traz a quantidade do dia e quanto resta; sem quantidade, sem limite", () => {
    const dados = vazio();
    dados.produtos.push(produto("espeto", "Espeto de carne", 1200), produto("refri", "Refrigerante", 600));
    dados.precosDoDia.push(preco(DIA, "espeto", 1200, true, 50), preco(DIA, "refri", 600, true, 2));
    dados.pedidos.push(pedido("p1", DIA), pedido("p2", DIA, "recebido"));
    dados.itens.push(item("p1", "espeto", 18), item("p1", "refri", 1), item("p2", "refri", 1));

    const [espeto, refri] = montarCardapio(dados, DIA).itens;
    expect(espeto.estoque).toMatchObject({ quantidade: 50, restantes: 32, esgotado: false });
    expect(refri.estoque).toMatchObject({ quantidade: 2, restantes: 0, esgotado: true });
    expect(montarCardapio(dados, OUTRO_DIA).itens[0].estoque).toMatchObject({ quantidade: null, restantes: null });
  });

  it("lista só os itens ativos, em ordem alfabética, e conta os que estão à venda", () => {
    const dados = vazio();
    dados.produtos.push(
      produto("r", "refrigerante", 600),
      produto("v", "Velho", 100, false),
      produto("e", "Espeto", 1200),
      produto("a", "Água", 300),
    );
    dados.precosDoDia.push(preco(DIA, "e", 1200), preco(DIA, "a", 300, false), preco(DIA, "v", 100));

    const cardapio = montarCardapio(dados, DIA);

    expect(cardapio.itens.map((i) => i.produto.nome)).toEqual(["Água", "Espeto", "refrigerante"]);
    expect(cardapio.aVenda).toBe(1);
  });
});

describe("lerQuantidade", () => {
  it("vazio é sem limite; inteiros ≥ 0 valem; o resto é inválido", () => {
    expect(lerQuantidade("  ")).toBeNull();
    expect(lerQuantidade("0")).toBe(0);
    expect(lerQuantidade(" 50 ")).toBe(50);
    for (const texto of ["-1", "2,5", "abc", "1e3"]) expect(lerQuantidade(texto)).toBeUndefined();
  });
});

describe("lerReais", () => {
  it.each([
    ["12", 1200],
    ["12,50", 1250],
    ["12,5", 1250],
    ["12.05", 1205],
    [" R$ 7 ", 700],
    ["0,01", 1],
  ])("%s → %i centavos", (texto, centavos) => {
    expect(lerReais(texto)).toBe(centavos);
  });

  it.each(["", "0", "0,00", "12,505", "-3", "abc", "1.000,00"])("recusa %j", (texto) => {
    expect(lerReais(texto)).toBeNull();
  });
});

describe("reaisParaCampo", () => {
  it("mostra centavos só quando existem", () => {
    expect(reaisParaCampo(1200)).toBe("12");
    expect(reaisParaCampo(1250)).toBe("12,50");
    expect(reaisParaCampo(1205)).toBe("12,05");
  });
});
