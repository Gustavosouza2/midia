import { describe, expect, it } from "vitest";
import type { DiaDeVenda, Pagamento, Pedido } from "@/local-db";
import { montarPendentes, type DadosPendentes } from "./pendentes";

const CANTINA = "c0000000-0000-4000-8000-000000000000";
const sync = { atualizadoEm: "2026-11-01T00:00:00.000Z", seq: 1 };
let contador = 0;
const novoId = () => `00000000-0000-4000-8000-${String(++contador).padStart(12, "0")}`;

const HOJE = "2026-11-04";
/** Hora local de hoje, para o teste valer em qualquer fuso. */
const hojeAs = (hora: number) => new Date(2026, 10, 4, hora).toISOString();
const TODOS = { periodo: "todos", busca: "" };

/** Pendentes do protótipo (design/telas/Pendentes.dc.html): 18 out há 17 dias, 01 nov há 3. */
function exemplo() {
  const dados: DadosPendentes = { dias: [], pedidos: [], itens: [], pagamentos: [], produtos: [], clientes: [] };
  const espeto = { id: novoId(), cantinaId: CANTINA, nome: "Espeto de carne", precoCentavos: 1200, ativo: true, ...sync };
  dados.produtos.push(espeto);

  const dia = (data: string): DiaDeVenda => {
    const d: DiaDeVenda = { id: novoId(), cantinaId: CANTINA, data, nome: null, fechadoEm: null, canceladoEm: null, ...sync };
    dados.dias.push(d);
    return d;
  };
  const clientes = new Map<string, string>();
  const pedido = (d: DiaDeVenda, nome: string, qtd: number, preco: number, status: Pedido["status"] = "entregue") => {
    if (!clientes.has(nome)) {
      const id = novoId();
      clientes.set(nome, id);
      dados.clientes.push({ id, cantinaId: CANTINA, nome, telefone: null, ...sync });
    }
    const p: Pedido = {
      id: novoId(),
      cantinaId: CANTINA,
      diaId: d.id,
      clienteId: clientes.get(nome)!,
      origem: "balcao",
      status,
      vendedorId: null,
      criadoEm: `${d.data}T20:00:00.000Z`,
      entregueEm: null,
      ...sync,
    };
    dados.pedidos.push(p);
    dados.itens.push({
      id: novoId(),
      pedidoId: p.id,
      cantinaId: CANTINA,
      produtoId: espeto.id,
      quantidade: qtd,
      precoUnitarioCentavos: preco,
      canceladoEm: null,
      ...sync,
    });
    return p;
  };
  const pagar = (p: Pedido, valor: number, registradoEm: string, extra: Partial<Pagamento> = {}) => {
    const pagamento: Pagamento = {
      id: novoId(),
      pedidoId: p.id,
      cantinaId: CANTINA,
      valorCentavos: valor,
      forma: "pix",
      vendedorId: null,
      registradoEm,
      estornadoEm: null,
      ...sync,
      ...extra,
    };
    dados.pagamentos.push(pagamento);
    return pagamento;
  };

  const out18 = dia("2026-10-18");
  const melina = pedido(out18, "Melina", 3, 1000);
  pedido(out18, "Maju", 1, 1000);
  pedido(out18, "Aniello", 1, 1000);
  const pagoNaVenda = pedido(out18, "Charlene", 5, 1000);
  pagar(pagoNaVenda, 5000, pagoNaVenda.criadoEm);

  const nov01 = dia("2026-11-01");
  const elizete = pedido(nov01, "Elizete", 2, 1200);
  pedido(nov01, "Fernando", 2, 1200);
  pedido(nov01, "Angélica", 1, 1200);
  pedido(nov01, "Lorrayne", 1, 1200);

  const nov15 = dia("2026-11-15");
  pedido(nov15, "Gustavo", 3, 1200, "recebido");

  return { dados, out18, nov01, melina, elizete, pedido, pagar };
}

describe("montarPendentes", () => {
  it("separa os grupos por idade e soma os números como no protótipo", () => {
    const { dados } = exemplo();
    const { numeros, grupos } = montarPendentes(dados, TODOS, HOJE);

    expect(numeros).toEqual({
      emAberto: 3000 + 1000 + 1000 + 2400 + 2400 + 1200 + 1200,
      pedidosEmAberto: 7,
      pessoas: 7,
      pessoasAntigas: 3,
      valorAntigo: 5000,
      recebidoAgora: 0,
    });
    expect(grupos.map((g) => [g.titulo, g.pessoas, g.total])).toEqual([
      ["Há mais de 2 semanas", 3, 5000],
      ["Recentes", 4, 7200],
    ]);
    expect(grupos[0].linhas[0]).toEqual({
      pedidoId: expect.any(String),
      nome: "Melina",
      descricao: "3× Espeto de carne · 18 out",
      idadeDias: 17,
      valor: 3000,
      situacao: { tipo: "aberto" },
    });
  });

  it("não mostra reservas nem pedidos pagos", () => {
    const { dados } = exemplo();
    const nomes = montarPendentes(dados, TODOS, HOJE).grupos.flatMap((g) => g.linhas.map((l) => l.nome));

    expect(nomes).not.toContain("Gustavo");
    expect(nomes).not.toContain("Charlene");
  });

  it("desconta pagamento parcial e ignora pagamento estornado", () => {
    const { dados, melina, elizete, pagar } = exemplo();
    pagar(melina, 1000, hojeAs(10));
    pagar(elizete, 2400, hojeAs(11), { estornadoEm: hojeAs(12) });

    const linhas = montarPendentes(dados, TODOS, HOJE).grupos.flatMap((g) => g.linhas);
    expect(linhas.find((l) => l.nome === "Melina")?.valor).toBe(2000);
    expect(linhas.find((l) => l.nome === "Elizete")?.valor).toBe(2400);
  });

  it("conta a mesma pessoa uma vez só", () => {
    const { dados, nov01, pedido } = exemplo();
    pedido(nov01, "Melina", 1, 1200);

    const { numeros, grupos } = montarPendentes(dados, TODOS, HOJE);
    expect(numeros.pedidosEmAberto).toBe(8);
    expect(numeros.pessoas).toBe(7);
    expect(grupos[1].pessoas).toBe(5);
  });

  it("filtra por dia e busca por nome sem diferença de acento e maiúscula", () => {
    const { dados, out18 } = exemplo();

    const doDia = montarPendentes(dados, { periodo: out18.id, busca: "" }, HOJE);
    expect(doDia.grupos.map((g) => g.chave)).toEqual(["antigos"]);
    expect(doDia.numeros.emAberto).toBe(5000);

    const removido = montarPendentes(dados, { periodo: "dia-que-nao-existe", busca: "" }, HOJE);
    expect(removido.periodo).toBe("todos");
    expect(removido.numeros.pedidosEmAberto).toBe(7);

    const busca = montarPendentes(dados, { periodo: "todos", busca: "  ANGELICA " }, HOJE);
    expect(busca.grupos.flatMap((g) => g.linhas.map((l) => l.nome))).toEqual(["Angélica"]);
    expect(busca.numeros.emAberto).toBe(1200);
  });

  it("Recebido agora soma o que foi recebido hoje de quem estava pendente", () => {
    const { dados, melina, elizete, out18, nov01, pedido, pagar } = exemplo();
    pagar(melina, 3000, hojeAs(10));
    pagar(elizete, 2400, hojeAs(11), { estornadoEm: hojeAs(12) });
    pagar(pedido(nov01, "Ontem", 1, 1200), 1200, new Date(2026, 10, 3, 12).toISOString());
    // Venda feita hoje já paga: o pagamento sai junto com o pedido.
    const vendaPaga = pedido(nov01, "Na hora", 1, 1200);
    vendaPaga.criadoEm = hojeAs(9);
    pagar(vendaPaga, 1200, vendaPaga.criadoEm);

    expect(montarPendentes(dados, TODOS, HOJE).numeros.recebidoAgora).toBe(3000);
    expect(montarPendentes(dados, { periodo: nov01.id, busca: "" }, HOJE).numeros.recebidoAgora).toBe(0);
    expect(montarPendentes(dados, { periodo: out18.id, busca: "mel" }, HOJE).numeros.recebidoAgora).toBe(3000);
  });

  it("mantém o pedido recebido na sessão como pago até o pagamento ser estornado", () => {
    const { dados, melina, pagar } = exemplo();
    const pagamento = pagar(melina, 3000, hojeAs(10), { forma: "dinheiro" });
    const naSessao = new Map([[melina.id, pagamento.id]]);

    const pago = montarPendentes(dados, TODOS, HOJE, naSessao);
    expect(pago.grupos[0].linhas[0]).toMatchObject({
      nome: "Melina",
      valor: 3000,
      situacao: { tipo: "pago", pagamentoId: pagamento.id, forma: "dinheiro" },
    });
    expect(pago.grupos[0].pessoas).toBe(2);
    expect(pago.numeros.emAberto).toBe(2000 + 7200);
    // Sem a sessão (tela recarregada), o pedido pago some da lista.
    expect(montarPendentes(dados, TODOS, HOJE).grupos[0].linhas.map((l) => l.nome)).not.toContain("Melina");

    pagamento.estornadoEm = hojeAs(11);
    const desfeito = montarPendentes(dados, TODOS, HOJE, naSessao);
    expect(desfeito.grupos[0].linhas[0]).toMatchObject({ nome: "Melina", valor: 3000, situacao: { tipo: "aberto" } });
  });

  it("ignora pedido cancelado e dia removido", () => {
    const { dados, nov01, pedido } = exemplo();
    pedido(nov01, "Cancelado", 5, 1200, "cancelado");
    const removido = { ...nov01, id: novoId(), data: "2026-11-02", canceladoEm: "2026-11-02T00:00:00.000Z" };
    dados.dias.push(removido);
    pedido(removido, "Fantasma", 1, 1200);

    const { numeros, dias } = montarPendentes(dados, TODOS, HOJE);
    expect(numeros.pedidosEmAberto).toBe(7);
    expect(dias.map((d) => d.data)).not.toContain("2026-11-02");
  });

  it("funciona sem nenhum dado", () => {
    const vazio: DadosPendentes = { dias: [], pedidos: [], itens: [], pagamentos: [], produtos: [], clientes: [] };
    const { numeros, grupos } = montarPendentes(vazio, TODOS, HOJE);
    expect(numeros).toEqual({
      emAberto: 0,
      pedidosEmAberto: 0,
      pessoas: 0,
      pessoasAntigas: 0,
      valorAntigo: 0,
      recebidoAgora: 0,
    });
    expect(grupos).toEqual([]);
  });
});
