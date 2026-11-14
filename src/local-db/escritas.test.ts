import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidV5 } from "@/lib/uuid-v5";
import {
  adicionarProduto,
  criarDia,
  definirNoCardapio,
  definirPrecoNoDia,
  definirQuantidadeNoDia,
  diaTemPedidos,
  entregarReserva,
  ErroDeEscrita,
  estornarPagamento,
  registrarPagamento,
  registrarPedido,
  removerDia,
  type NovoPedido,
} from "./escritas";
import { CantinaLocalDb } from "./index";

const CANTINA = "c0000000-0000-4000-8000-000000000001";
let db: CantinaLocalDb;

beforeEach(async () => {
  await Dexie.delete("cantina");
  db = new CantinaLocalDb();
});
afterEach(() => db.close());

async function comCantina() {
  await db.cantinas.put({ id: CANTINA, nome: "Mídia", slug: "midia", atualizadoEm: "2026-11-01T00:00:00Z", seq: 1 });
}

async function produto(nome: string, precoCentavos: number, ativo = true) {
  const id = crypto.randomUUID();
  await db.produtos.put({ id, cantinaId: CANTINA, nome, precoCentavos, ativo, atualizadoEm: "2026-11-01T00:00:00Z", seq: 1 });
  return id;
}

async function cardapio(diaId: string) {
  const precos = await db.precosDoDia.where("diaId").equals(diaId).toArray();
  return Object.fromEntries(precos.filter((p) => p.ativo).map((p) => [p.produtoId, p.precoCentavos]));
}

const outbox = () => db.outbox.orderBy("id").toArray();

async function rejeita(promessa: Promise<unknown>, codigo: ErroDeEscrita["codigo"]) {
  const erro = await promessa.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(ErroDeEscrita);
  expect((erro as ErroDeEscrita).codigo).toBe(codigo);
}

describe("sem cantina no aparelho", () => {
  it("recusa escrever e pede para conectar uma vez", async () => {
    await rejeita(criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } }), "sem-cantina");
    await rejeita(adicionarProduto(db, { nome: "Espeto", precoCentavos: 1000 }), "sem-cantina");
    expect(await outbox()).toEqual([]);
  });
});

describe("criarDia", () => {
  beforeEach(comCantina);

  it("deriva o id da cantina + data e põe dia e cardápio na outbox, uma linha por item", async () => {
    const carne = await produto("Carne", 1000);
    const frango = await produto("Frango", 900);
    await produto("Antigo", 500, false);

    const diaId = await criarDia(db, { data: "2026-11-15", nome: "  Culto de jovens ", cardapio: { tipo: "padrao" } });

    expect(diaId).toBe(await uuidV5("2026-11-15", CANTINA));
    const dia = await db.diasDeVenda.get(diaId);
    expect(dia).toMatchObject({ data: "2026-11-15", nome: "Culto de jovens", cantinaId: CANTINA, canceladoEm: null, seq: 0 });
    expect(await cardapio(diaId)).toEqual({ [carne]: 1000, [frango]: 900 });

    const fila = await outbox();
    expect(fila.map((i) => [i.tabela, i.operacao])).toEqual([
      ["diasDeVenda", "inserir"],
      ["precosDoDia", "inserir"],
      ["precosDoDia", "inserir"],
    ]);
    expect(fila[0].payload).toEqual(dia);
    const precoCarne = await db.precosDoDia.get(await uuidV5(carne, diaId));
    expect(precoCarne?.precoCentavos).toBe(1000);
  });

  it("copia os itens à venda e os preços do dia escolhido", async () => {
    const carne = await produto("Carne", 1000);
    const frango = await produto("Frango", 900);
    await produto("Pão de alho", 600);
    const origem = await criarDia(db, { data: "2026-11-08", cardapio: { tipo: "padrao" } });
    await definirPrecoNoDia(db, origem, carne, 1200);
    await definirNoCardapio(db, origem, frango, true);
    const paoDeAlho = (await db.produtos.toArray()).find((p) => p.nome === "Pão de alho")!.id;
    await definirNoCardapio(db, origem, paoDeAlho, false);

    const novo = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "copiar", diaId: origem } });

    expect(await cardapio(novo)).toEqual({ [carne]: 1200, [frango]: 900 });
  });

  it("copiar leva a quantidade de cada item; com os preços padrão, o dia nasce sem limite", async () => {
    const carne = await produto("Carne", 1000);
    const origem = await criarDia(db, { data: "2026-11-08", cardapio: { tipo: "padrao" } });
    expect((await db.precosDoDia.get(await uuidV5(carne, origem)))?.quantidade).toBeNull();
    await definirQuantidadeNoDia(db, origem, carne, 50);

    const novo = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "copiar", diaId: origem } });

    expect((await db.precosDoDia.get(await uuidV5(carne, novo)))?.quantidade).toBe(50);
  });

  it("recusa uma data que já tem dia", async () => {
    await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    await rejeita(criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } }), "dia-ja-existe");
  });

  it("criar de novo uma data removida reativa o mesmo registro com o cardápio novo", async () => {
    const carne = await produto("Carne", 1000);
    const frango = await produto("Frango", 900);
    const origem = await criarDia(db, { data: "2026-11-08", cardapio: { tipo: "padrao" } });
    await definirNoCardapio(db, origem, frango, false);

    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    await removerDia(db, diaId);
    expect((await db.diasDeVenda.get(diaId))?.canceladoEm).not.toBeNull();

    const reativado = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "copiar", diaId: origem } });

    expect(reativado).toBe(diaId);
    expect(await db.diasDeVenda.count()).toBe(2);
    expect((await db.diasDeVenda.get(diaId))?.canceladoEm).toBeNull();
    expect(await cardapio(diaId)).toEqual({ [carne]: 1000 });
  });
});

describe("removerDia", () => {
  beforeEach(comCantina);

  it("recusa quando o dia tem pedidos", async () => {
    const carne = await produto("Carne", 1000);
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    expect(await diaTemPedidos(db, diaId)).toBe(false);
    await registrarPedido(db, pedido(diaId, carne));

    expect(await diaTemPedidos(db, diaId)).toBe(true);
    await rejeita(removerDia(db, diaId), "dia-com-pedidos");
    expect((await db.diasDeVenda.get(diaId))?.canceladoEm).toBeNull();
  });
});

describe("cardápio do dia", () => {
  beforeEach(comCantina);

  it("pôr à venda um item sem linha usa o preço padrão; mudar o preço não muda se está à venda", async () => {
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    const novo = await adicionarProduto(db, { nome: "Linguiça", precoCentavos: 800 });
    await definirPrecoNoDia(db, diaId, novo, 700);
    expect(await cardapio(diaId)).toEqual({});

    await definirNoCardapio(db, diaId, novo, true);
    expect(await cardapio(diaId)).toEqual({ [novo]: 700 });
  });

  it("um item novo pode nascer à venda no dia, numa escrita só", async () => {
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    await db.outbox.clear();
    const novo = await adicionarProduto(db, { nome: "Linguiça", precoCentavos: 800, aVendaNoDia: diaId });

    expect(await cardapio(diaId)).toEqual({ [novo]: 800 });
    expect((await outbox()).map((i) => i.tabela)).toEqual(["produtos", "precosDoDia"]);
  });

  it("definir a quantidade não põe o item à venda; vazio volta a ser sem limite", async () => {
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    const novo = await adicionarProduto(db, { nome: "Linguiça", precoCentavos: 800 });
    const linha = async () => db.precosDoDia.get(await uuidV5(novo, diaId));

    await definirQuantidadeNoDia(db, diaId, novo, 30);
    expect(await linha()).toMatchObject({ ativo: false, quantidade: 30, precoCentavos: 800 });

    await definirNoCardapio(db, diaId, novo, true);
    await definirQuantidadeNoDia(db, diaId, novo, null);
    expect(await linha()).toMatchObject({ ativo: true, quantidade: null });
  });

  it("recusa quantidade negativa ou quebrada", async () => {
    const carne = await produto("Carne", 1000);
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    await rejeita(definirQuantidadeNoDia(db, diaId, carne, -1), "valor-invalido");
    await rejeita(definirQuantidadeNoDia(db, diaId, carne, 1.5), "valor-invalido");
  });

  it("repetir a mesma mudança não gera item novo na outbox", async () => {
    const carne = await produto("Carne", 1000);
    const diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    const antes = (await outbox()).length;

    await definirNoCardapio(db, diaId, carne, true);
    expect(await outbox()).toHaveLength(antes);

    await definirNoCardapio(db, diaId, carne, false);
    const fila = await outbox();
    expect(fila).toHaveLength(antes + 1);
    expect(fila.at(-1)).toMatchObject({ tabela: "precosDoDia", operacao: "atualizar" });
  });
});

function pedido(diaId: string, produtoId: string, mudanca: Partial<NovoPedido> = {}): NovoPedido {
  return {
    diaId,
    nomeCliente: "Melina",
    tipo: "venda",
    produtoId,
    quantidade: 3,
    precoUnitarioCentavos: 1000,
    pagamento: "pendente",
    ...mudanca,
  };
}

describe("pedidos e pagamentos", () => {
  let diaId: string;
  let carne: string;
  beforeEach(async () => {
    await comCantina();
    carne = await produto("Carne", 1000);
    diaId = await criarDia(db, { data: "2026-11-15", cardapio: { tipo: "padrao" } });
    await db.outbox.clear();
  });

  it("venda pendente: pedido entregue, um item, nenhum pagamento", async () => {
    const id = await registrarPedido(db, pedido(diaId, carne));

    expect(await db.pedidos.get(id)).toMatchObject({ status: "entregue", diaId, cantinaId: CANTINA });
    expect((await db.pedidos.get(id))?.entregueEm).not.toBeNull();
    expect(await db.itensPedido.where("pedidoId").equals(id).toArray()).toMatchObject([
      { produtoId: carne, quantidade: 3, precoUnitarioCentavos: 1000 },
    ]);
    expect(await db.pagamentos.count()).toBe(0);
    expect((await outbox()).map((i) => i.tabela)).toEqual(["clientes", "pedidos", "itensPedido"]);
  });

  it("venda no Pix registra o pagamento do total junto", async () => {
    const id = await registrarPedido(db, pedido(diaId, carne, { pagamento: "pix" }));

    expect(await db.pagamentos.where("pedidoId").equals(id).toArray()).toMatchObject([
      { valorCentavos: 3000, forma: "pix", estornadoEm: null },
    ]);
    expect((await outbox()).map((i) => i.tabela)).toEqual(["clientes", "pedidos", "itensPedido", "pagamentos"]);
    const [pagamento] = await db.pagamentos.toArray();
    expect(pagamento.registradoEm).toBe((await db.pedidos.get(id))?.criadoEm);
  });

  it("reserva nasce recebida e é entregue depois", async () => {
    const id = await registrarPedido(db, pedido(diaId, carne, { tipo: "reserva" }));
    expect(await db.pedidos.get(id)).toMatchObject({ status: "recebido", entregueEm: null });

    await entregarReserva(db, id);
    expect((await db.pedidos.get(id))?.status).toBe("entregue");
    expect((await db.pedidos.get(id))?.entregueEm).not.toBeNull();
  });

  it("reaproveita o cliente pelo nome, sem diferença de maiúsculas e espaços", async () => {
    const a = await registrarPedido(db, pedido(diaId, carne, { nomeCliente: "Melina" }));
    const b = await registrarPedido(db, pedido(diaId, carne, { nomeCliente: "  melina " }));
    const c = await registrarPedido(db, pedido(diaId, carne, { nomeCliente: "Gustavo" }));

    const clienteDe = async (id: string) => (await db.pedidos.get(id))?.clienteId;
    expect(await clienteDe(b)).toBe(await clienteDe(a));
    expect(await clienteDe(c)).not.toBe(await clienteDe(a));
    expect(await db.clientes.count()).toBe(2);
  });

  it("receber paga só o que está em aberto e recusa quando não há nada", async () => {
    const id = await registrarPedido(db, pedido(diaId, carne));
    await db.pagamentos.put({
      id: crypto.randomUUID(),
      pedidoId: id,
      cantinaId: CANTINA,
      valorCentavos: 1000,
      forma: "dinheiro",
      vendedorId: null,
      registradoEm: "2026-11-15T20:00:00Z",
      estornadoEm: null,
      atualizadoEm: "2026-11-15T20:00:00Z",
      seq: 5,
    });

    const pagamentoId = await registrarPagamento(db, id, "pix");

    expect(await db.pagamentos.get(pagamentoId)).toMatchObject({ valorCentavos: 2000, forma: "pix" });
    await rejeita(registrarPagamento(db, id, "dinheiro"), "nada-em-aberto");
  });

  it("com quantidade no dia, recusa vender mais do que resta e diz quanto resta", async () => {
    await definirQuantidadeNoDia(db, diaId, carne, 5);
    await registrarPedido(db, pedido(diaId, carne, { tipo: "reserva", quantidade: 2 }));

    const erro = await registrarPedido(db, pedido(diaId, carne, { quantidade: 4 })).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDeEscrita);
    expect(erro).toMatchObject({ codigo: "sem-estoque", message: "Só restam 3 de Carne." });

    await registrarPedido(db, pedido(diaId, carne, { quantidade: 3 }));
    await expect(registrarPedido(db, pedido(diaId, carne, { quantidade: 1 }))).rejects.toMatchObject({
      codigo: "sem-estoque",
      message: "Carne esgotou.",
    });
    expect(await db.pedidos.count()).toBe(2);
  });

  it("pedido cancelado devolve a quantidade ao dia", async () => {
    await definirQuantidadeNoDia(db, diaId, carne, 3);
    const id = await registrarPedido(db, pedido(diaId, carne, { quantidade: 3 }));
    await db.pedidos.update(id, { status: "cancelado" });

    await registrarPedido(db, pedido(diaId, carne, { quantidade: 3 }));
  });

  it("desfazer estorna o pagamento e o pedido volta a ter valor em aberto", async () => {
    const id = await registrarPedido(db, pedido(diaId, carne, { pagamento: "dinheiro" }));
    const [pago] = await db.pagamentos.where("pedidoId").equals(id).toArray();

    await estornarPagamento(db, pago.id);

    expect((await db.pagamentos.get(pago.id))?.estornadoEm).not.toBeNull();
    expect((await outbox()).at(-1)).toMatchObject({ tabela: "pagamentos", registroId: pago.id, operacao: "atualizar" });
    expect(await db.pagamentos.get(await registrarPagamento(db, id, "pix"))).toMatchObject({ valorCentavos: 3000 });
  });
});
