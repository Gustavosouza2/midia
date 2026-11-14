import { describe, expect, it } from "vitest";
import type { Cliente, DiaDeVenda, ItemPedido, Pagamento, Pedido, Produto } from "@/local-db";
import { montarPainel, type DadosPainel } from "./painel";

const CANTINA = "c0000000-0000-4000-8000-000000000000";
const sync = { atualizadoEm: "2026-11-01T00:00:00.000Z", seq: 1 };
let contador = 0;
const novoId = () => `00000000-0000-4000-8000-${String(++contador).padStart(12, "0")}`;

/** Monta o banco local com os dados de exemplo do protótipo (design/telas/Painel.dc.html). */
function exemplo() {
  const dados: DadosPainel = { dias: [], pedidos: [], itens: [], pagamentos: [], produtos: [], clientes: [] };
  const espeto: Produto = { id: novoId(), cantinaId: CANTINA, nome: "Espeto de carne", precoCentavos: 1200, ativo: true, ...sync };
  dados.produtos.push(espeto);

  const dia = (data: string): DiaDeVenda => {
    const d: DiaDeVenda = { id: novoId(), cantinaId: CANTINA, data, nome: null, fechadoEm: null, canceladoEm: null, ...sync };
    dados.dias.push(d);
    return d;
  };
  const pedido = (
    d: DiaDeVenda,
    nome: string,
    qtd: number,
    preco: number,
    opcoes: { pago?: boolean; reserva?: boolean } = {},
  ): Pedido => {
    const cliente: Cliente = { id: novoId(), cantinaId: CANTINA, nome, telefone: null, ...sync };
    const p: Pedido = {
      id: novoId(),
      cantinaId: CANTINA,
      diaId: d.id,
      clienteId: cliente.id,
      origem: "balcao",
      status: opcoes.reserva ? "recebido" : "entregue",
      vendedorId: null,
      criadoEm: "2026-11-01T20:00:00.000Z",
      entregueEm: null,
      ...sync,
    };
    const item: ItemPedido = {
      id: novoId(),
      pedidoId: p.id,
      cantinaId: CANTINA,
      produtoId: espeto.id,
      quantidade: qtd,
      precoUnitarioCentavos: preco,
      canceladoEm: null,
      ...sync,
    };
    dados.clientes.push(cliente);
    dados.pedidos.push(p);
    dados.itens.push(item);
    if (opcoes.pago) dados.pagamentos.push(pagamento(p, qtd * preco));
    return p;
  };
  const pagamento = (p: Pedido, valor: number): Pagamento => ({
    id: novoId(),
    pedidoId: p.id,
    cantinaId: CANTINA,
    valorCentavos: valor,
    forma: "pix",
    vendedorId: null,
    registradoEm: "2026-11-01T20:00:00.000Z",
    estornadoEm: null,
    ...sync,
  });

  const out18 = dia("2026-10-18");
  const pagos18: [string, number][] = [
    ["Charlene", 5], ["Mariana", 1], ["Paulinha", 3], ["Elised", 2], ["Evelyn", 1],
    ["Tamires", 1], ["Renan e Tay", 2], ["Júnior", 1], ["José", 1],
  ];
  for (const [nome, qtd] of pagos18) pedido(out18, nome, qtd, 1000, { pago: true });
  pedido(out18, "Melina", 3, 1000);
  pedido(out18, "Aniello", 1, 1000);
  pedido(out18, "Maju", 1, 1000);

  const nov01 = dia("2026-11-01");
  for (const [nome, qtd] of [["Elizete", 2], ["Fernando", 2], ["Angélica", 1], ["Lorrayne", 1]] as const) {
    pedido(nov01, nome, qtd, 1200);
  }

  const nov15 = dia("2026-11-15");
  pedido(nov15, "Gustavo", 3, 1200, { reserva: true });

  return { dados, out18, nov01, nov15, pedido, pagamento };
}

// No protótipo, os pendentes de 18 out estão "há 17 dias".
const HOJE = "2026-11-04";

describe("montarPainel", () => {
  it("soma todos os dias como no protótipo", () => {
    const { dados, nov15 } = exemplo();
    const painel = montarPainel(dados, "todos", HOJE);

    expect(painel.numeros).toEqual({
      vendido: 29200,
      recebido: 17000,
      pendente: 12200,
      pctRecebido: 58,
      pessoasPendentes: 7,
      itens: 28,
      vendas: 16,
      reservas: 1,
      valorReservas: 3600,
    });
    expect(painel.proximo?.id).toBe(nov15.id);
    expect(painel.reservasDoProximo).toBe(1);
    expect(painel.dias.map((d) => d.data)).toEqual(["2026-11-15", "2026-11-01", "2026-10-18"]);
    expect(painel.porDia.map((d) => d.pctRecebido)).toEqual([0, 0, 77]);
  });

  it("ordena os pendentes do mais antigo para o mais novo, e o maior valor primeiro", () => {
    const { dados } = exemplo();
    const { pendentes, reservas } = montarPainel(dados, "todos", HOJE);

    expect(pendentes.slice(0, 3).map((p) => [p.nome, p.idadeDias, p.aberto])).toEqual([
      ["Melina", 17, 3000],
      ["Aniello", 17, 1000],
      ["Maju", 17, 1000],
    ]);
    expect(pendentes[0].descricao).toBe("3× Espeto de carne");
    expect(reservas.map((r) => [r.nome, r.valor, r.data])).toEqual([["Gustavo", 3600, "2026-11-15"]]);
  });

  it("filtra por um dia", () => {
    const { dados, out18 } = exemplo();
    const { numeros, reservas } = montarPainel(dados, out18.id, HOJE);

    expect(numeros.vendido).toBe(22000);
    expect(numeros.recebido).toBe(17000);
    expect(numeros.pctRecebido).toBe(77);
    expect(numeros.pessoasPendentes).toBe(3);
    expect(numeros.reservas).toBe(0);
    expect(reservas).toEqual([]);
  });

  it("ignora pedido cancelado, pagamento estornado e dia removido", () => {
    const { dados, nov01, pedido, pagamento } = exemplo();
    pedido(nov01, "Cancelado", 5, 1200).status = "cancelado";
    const estornado = pagamento(dados.pedidos.find((p) => p.diaId === nov01.id)!, 2400);
    estornado.estornadoEm = "2026-11-02T00:00:00.000Z";
    dados.pagamentos.push(estornado);

    const diaRemovido = { ...nov01, id: novoId(), data: "2026-11-08", canceladoEm: "2026-11-02T00:00:00.000Z" };
    dados.dias.push(diaRemovido);
    pedido(diaRemovido, "Fantasma", 1, 1200);

    const { numeros, dias } = montarPainel(dados, "todos", HOJE);
    expect(numeros.vendido).toBe(29200);
    expect(numeros.recebido).toBe(17000);
    expect(dias.map((d) => d.data)).not.toContain("2026-11-08");
  });

  it("conta pagamento parcial e não deixa o recebido passar do valor vendido", () => {
    const { dados, nov01, pedido, pagamento } = exemplo();
    const parcial = pedido(nov01, "Parcial", 2, 1200);
    dados.pagamentos.push(pagamento(parcial, 1000));
    const aMais = pedido(nov01, "A mais", 1, 1200);
    dados.pagamentos.push(pagamento(aMais, 5000));

    const { numeros, pendentes } = montarPainel(dados, nov01.id, HOJE);
    expect(numeros.vendido).toBe(7200 + 2400 + 1200);
    expect(numeros.recebido).toBe(1000 + 1200);
    expect(pendentes.find((p) => p.nome === "Parcial")?.aberto).toBe(1400);
    expect(pendentes.find((p) => p.nome === "A mais")).toBeUndefined();
  });

  it("funciona sem nenhum dado", () => {
    const vazio: DadosPainel = { dias: [], pedidos: [], itens: [], pagamentos: [], produtos: [], clientes: [] };
    const painel = montarPainel(vazio, "todos", HOJE);
    expect(painel.proximo).toBeNull();
    expect(painel.numeros.pctRecebido).toBe(0);
    expect(painel.porDia).toEqual([]);
  });
});
