import { describe, expect, it } from "vitest";
import type { Cliente, ItemPedido, Pagamento, Pedido, PrecoDoDia, Produto } from "@/local-db";
import { lerPreco, montarVendas, paginar, rotuloPago, textoDoPreco, type DadosVendas } from "./sales";

const CANTINA = "c0000000-0000-4000-8000-000000000000";
const DIA = "d0000000-0000-4000-8000-000000000001";
const OUTRO_DIA = "d0000000-0000-4000-8000-000000000002";
const sync = { atualizadoEm: "2026-11-01T00:00:00.000Z", seq: 1 };
let contador = 0;
const novoId = () => `00000000-0000-4000-8000-${String(++contador).padStart(12, "0")}`;

/** Hora local do aparelho em ISO, para os testes não dependerem do fuso. */
const as = (hora: number, minuto: number, dia = 1) => new Date(2026, 10, dia, hora, minuto).toISOString();

function banco() {
  const dados: DadosVendas = { pedidos: [], itens: [], pagamentos: [], produtos: [], clientes: [], precosDoDia: [] };

  const produto = (nome: string, preco: number, ativo = true): Produto => {
    const p: Produto = { id: novoId(), cantinaId: CANTINA, nome, precoCentavos: preco, ativo, ...sync };
    dados.produtos.push(p);
    return p;
  };
  const noCardapio = (p: Produto, preco: number, ativo = true, diaId = DIA, quantidade: number | null = null) => {
    const linha: PrecoDoDia = {
      id: novoId(),
      cantinaId: CANTINA,
      diaId,
      produtoId: p.id,
      precoCentavos: preco,
      ativo,
      quantidade,
      ...sync,
    };
    dados.precosDoDia.push(linha);
  };
  const pagar = (pedidoId: string, valor: number, forma: "pix" | "dinheiro" = "pix", estornado = false) => {
    const pg: Pagamento = {
      id: novoId(),
      pedidoId,
      cantinaId: CANTINA,
      valorCentavos: valor,
      forma,
      vendedorId: null,
      registradoEm: sync.atualizadoEm,
      estornadoEm: estornado ? sync.atualizadoEm : null,
      ...sync,
    };
    dados.pagamentos.push(pg);
    return pg;
  };
  const pedido = (
    nome: string | null,
    itens: [Produto, number, number][],
    opcoes: { reserva?: boolean; criadoEm?: string; diaId?: string; cancelado?: boolean } = {},
  ): Pedido => {
    let clienteId: string | null = null;
    if (nome) {
      const cliente: Cliente = { id: novoId(), cantinaId: CANTINA, nome, telefone: null, ...sync };
      dados.clientes.push(cliente);
      clienteId = cliente.id;
    }
    const p: Pedido = {
      id: novoId(),
      cantinaId: CANTINA,
      diaId: opcoes.diaId ?? DIA,
      clienteId,
      origem: "balcao",
      status: opcoes.cancelado ? "cancelado" : opcoes.reserva ? "recebido" : "entregue",
      vendedorId: null,
      criadoEm: opcoes.criadoEm ?? as(20, 0),
      entregueEm: null,
      ...sync,
    };
    dados.pedidos.push(p);
    for (const [prod, qtd, preco] of itens) {
      const item: ItemPedido = {
        id: novoId(),
        pedidoId: p.id,
        cantinaId: CANTINA,
        produtoId: prod.id,
        quantidade: qtd,
        precoUnitarioCentavos: preco,
        canceladoEm: null,
        ...sync,
      };
      dados.itens.push(item);
    }
    return p;
  };
  return { dados, produto, noCardapio, pedido, pagar };
}

describe("montarVendas", () => {
  it("deriva o status: pago, pendente (inclusive parcial ou estornado) e reservado", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    const pago = b.pedido("Ana", [[espeto, 2, 1200]]);
    b.pagar(pago.id, 2400, "dinheiro");
    const parcial = b.pedido("Bia", [[espeto, 2, 1200]]);
    b.pagar(parcial.id, 1000);
    const estornado = b.pedido("Caio", [[espeto, 1, 1200]]);
    b.pagar(estornado.id, 1200, "pix", true);
    const reserva = b.pedido("Davi", [[espeto, 3, 1200]], { reserva: true });
    b.pagar(reserva.id, 3600);

    const porId = new Map(montarVendas(b.dados, DIA).pedidos.map((p) => [p.id, p]));

    expect(porId.get(pago.id)).toMatchObject({ status: "pago", aberto: 0, formas: ["dinheiro"] });
    expect(porId.get(parcial.id)).toMatchObject({ status: "pendente", aberto: 1400, formas: ["pix"] });
    expect(porId.get(estornado.id)).toMatchObject({ status: "pendente", aberto: 1200, formas: [], pagamentosAtivos: [] });
    expect(porId.get(reserva.id)).toMatchObject({ status: "reservado", aberto: 0 });
  });

  it("soma os números do dia sem contar reservas como vendidas", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    const pago = b.pedido("Ana", [[espeto, 2, 1200]]);
    b.pagar(pago.id, 2400);
    b.pedido("Bia", [[espeto, 1, 1000]]);
    // Pagamento maior que o pedido não aumenta o recebido.
    const aMais = b.pedido("Caio", [[espeto, 1, 1200]]);
    b.pagar(aMais.id, 5000);
    b.pedido("Davi", [[espeto, 3, 1200]], { reserva: true });
    b.pedido("Eva", [[espeto, 9, 1200]], { diaId: OUTRO_DIA });
    b.pedido("Fábio", [[espeto, 9, 1200]], { cancelado: true });

    const { numeros, totalDoDia } = montarVendas(b.dados, DIA);

    expect(numeros).toEqual({
      itens: 4,
      vendido: 4600,
      recebido: 3600,
      pendente: 1000,
      pedidosPendentes: 1,
      reservas: 1,
      itensReservados: 3,
      valorReservas: 3600,
    });
    expect(totalDoDia).toBe(4);
  });

  it("descreve o pedido com nome, itens, preço unitário e hora local", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    const refri = b.produto("Refri", 600);
    const um = b.pedido("Ana", [[espeto, 2, 1100]], { criadoEm: as(20, 5) });
    const dois = b.pedido(null, [[espeto, 1, 1200], [refri, 2, 600]], { criadoEm: as(9, 30) });
    const reserva = b.pedido("Bia", [[espeto, 1, 1200]], { reserva: true, criadoEm: as(10, 0, 8) });

    const porId = new Map(montarVendas(b.dados, DIA).pedidos.map((p) => [p.id, p]));

    expect(porId.get(um.id)).toMatchObject({
      nome: "Ana",
      descricao: "2× Espeto",
      valor: 2200,
      precoUnitario: 1100,
      hora: "20:05",
    });
    expect(porId.get(dois.id)).toMatchObject({
      nome: "Sem nome",
      descricao: "1× Espeto, 2× Refri",
      valor: 2400,
      precoUnitario: null,
      hora: "09:30",
    });
    expect(porId.get(reserva.id)?.hora).toBe("reservou 08 nov");
  });

  it("ordena do mais novo para o mais antigo", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    b.pedido("Primeiro", [[espeto, 1, 1200]], { criadoEm: as(18, 0) });
    b.pedido("Terceiro", [[espeto, 1, 1200]], { criadoEm: as(21, 0) });
    b.pedido("Segundo", [[espeto, 1, 1200]], { criadoEm: as(19, 0) });

    expect(montarVendas(b.dados, DIA).pedidos.map((p) => p.nome)).toEqual(["Terceiro", "Segundo", "Primeiro"]);
  });

  it("busca pelo nome sem diferenciar maiúsculas e acentos, e filtra pelo status", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    const pago = b.pedido("Júlia", [[espeto, 1, 1200]]);
    b.pagar(pago.id, 1200);
    b.pedido("Julio", [[espeto, 1, 1200]]);
    b.pedido("Ana", [[espeto, 1, 1200]], { reserva: true });

    const nomes = (busca: string, filtro?: "todos" | "reservado" | "pendente" | "pago") =>
      montarVendas(b.dados, DIA, { busca, filtro }).pedidos.map((p) => p.nome).sort();

    expect(nomes("JULI")).toEqual(["Julio", "Júlia"]);
    expect(nomes(" júl ")).toEqual(["Julio", "Júlia"]);
    expect(nomes("", "pago")).toEqual(["Júlia"]);
    expect(nomes("", "pendente")).toEqual(["Julio"]);
    expect(nomes("", "reservado")).toEqual(["Ana"]);
    expect(nomes("ana", "pago")).toEqual([]);
  });

  it("monta o quadro com a busca, sem o filtro de status, e soma o que falta nos pendentes", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1000);
    const parcial = b.pedido("Ana", [[espeto, 2, 1000]]);
    b.pagar(parcial.id, 500);
    const pago = b.pedido("Bia", [[espeto, 1, 1000]]);
    b.pagar(pago.id, 1000);
    b.pedido("Caio", [[espeto, 3, 1000]], { reserva: true });

    const quadro = montarVendas(b.dados, DIA, { filtro: "pago" }).quadro;

    expect(quadro.map((c) => [c.status, c.pedidos.length, c.total])).toEqual([
      ["reservado", 1, 3000],
      ["pendente", 1, 1500],
      ["pago", 1, 1000],
    ]);
    expect(montarVendas(b.dados, DIA, { busca: "bia" }).quadro.map((c) => c.pedidos.length)).toEqual([0, 0, 1]);
  });

  it("o cardápio do dia traz só itens à venda, com o preço do dia, por nome", () => {
    const b = banco();
    const refri = b.produto("Refri", 600);
    const espeto = b.produto("Espeto", 1200);
    const fora = b.produto("Pastel", 800);
    const inativo = b.produto("Suco", 500, false);
    b.noCardapio(refri, 700);
    b.noCardapio(espeto, 1000);
    b.noCardapio(fora, 800, false);
    b.noCardapio(inativo, 500);
    b.noCardapio(fora, 800, true, OUTRO_DIA);

    expect(montarVendas(b.dados, DIA).cardapio).toEqual([
      { produtoId: espeto.id, nome: "Espeto", precoCentavos: 1000, restantes: null },
      { produtoId: refri.id, nome: "Refri", precoCentavos: 700, restantes: null },
    ]);
  });

  it("cada item do cardápio diz quanto resta no dia, descontando vendas e reservas", () => {
    const b = banco();
    const espeto = b.produto("Espeto", 1200);
    const refri = b.produto("Refri", 600);
    b.noCardapio(espeto, 1200, true, DIA, 5);
    b.noCardapio(refri, 600, true, DIA, 2);
    b.pedido("Ana", [[espeto, 2, 1200]]);
    b.pedido("Bia", [[espeto, 1, 1200]], { reserva: true });
    b.pedido("Caio", [[refri, 2, 600]]);

    expect(montarVendas(b.dados, DIA).cardapio.map((i) => [i.nome, i.restantes])).toEqual([
      ["Espeto", 2],
      ["Refri", 0],
    ]);
  });
});

describe("paginar", () => {
  const lista = Array.from({ length: 13 }, (_, i) => i + 1);

  it("corta de 6 em 6 e descreve a faixa", () => {
    expect(paginar(lista, 1)).toEqual({ itens: [1, 2, 3, 4, 5, 6], pagina: 1, totalPaginas: 3, faixa: "Mostrando 1–6 de 13" });
    expect(paginar(lista, 3)).toMatchObject({ itens: [13], faixa: "Mostrando 13–13 de 13" });
  });

  it("limita a página ao intervalo válido", () => {
    expect(paginar(lista, 9).pagina).toBe(3);
    expect(paginar(lista, 0).pagina).toBe(1);
    expect(paginar([], 1)).toEqual({ itens: [], pagina: 1, totalPaginas: 1, faixa: "Nenhum pedido" });
  });
});

describe("preço digitado", () => {
  it("lê reais com vírgula ou ponto em centavos", () => {
    expect(lerPreco("12")).toBe(1200);
    expect(lerPreco(" 12,5 ")).toBe(1250);
    expect(lerPreco("12.05")).toBe(1205);
    expect(lerPreco("0")).toBe(0);
  });

  it("recusa o que não é um valor", () => {
    for (const texto of ["", "abc", "-3", "1,234", "1.2.3"]) expect(lerPreco(texto)).toBeNull();
  });

  it("escreve o preço do cardápio no campo", () => {
    expect(textoDoPreco(1200)).toBe("12");
    expect(textoDoPreco(1250)).toBe("12,50");
    expect(textoDoPreco(5)).toBe("0,05");
  });
});

it("rotuloPago mostra a forma", () => {
  expect(rotuloPago(["pix"])).toBe("Pago · Pix");
  expect(rotuloPago(["pix", "dinheiro"])).toBe("Pago · Pix + Dinheiro");
  expect(rotuloPago([])).toBe("Pago");
});
