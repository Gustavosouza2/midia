import type { FORMAS_PAGAMENTO } from "@/db/schema";
import { estoqueDoDia } from "@/lib/estoque";
import { uuidV5 } from "@/lib/uuid-v5";
import type { Table } from "dexie";
import type { Cantina, CantinaLocalDb, TabelaSincronizada } from "./index";

/**
 * Escritas da interface no banco local. Cada função grava as linhas e, na mesma transação,
 * põe na outbox um item por linha gravada, com a linha inteira como payload.
 *
 * Linhas gravadas aqui saem com `seq: 0`, que quer dizer "ainda não sincronizada": o seq de
 * verdade é dado pelo trigger do servidor e volta na próxima leitura da API.
 *
 * Ids determinísticos (DESIGN.md, "Um dia de venda por data"):
 * - dia de venda = uuidV5(data, cantinaId)
 * - preço do dia = uuidV5(produtoId, diaId)
 */

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

const MENSAGENS = {
  "sem-cantina": "Conecte-se à internet uma vez para começar.",
  "dia-ja-existe": "Já existe um dia nessa data.",
  "dia-com-pedidos": "Este dia já tem pedidos e não pode ser removido.",
  "nada-em-aberto": "Este pedido já está pago.",
  "nao-encontrado": "Registro não encontrado no aparelho.",
  "valor-invalido": "Valor inválido.",
  "sem-estoque": "Não há quantidade suficiente deste item.",
} as const;

export type CodigoErroDeEscrita = keyof typeof MENSAGENS;

/** Recusa de uma escrita. `message` já está pronta para mostrar na tela. */
export class ErroDeEscrita extends Error {
  constructor(
    readonly codigo: CodigoErroDeEscrita,
    mensagem: string = MENSAGENS[codigo],
  ) {
    super(mensagem);
    this.name = "ErroDeEscrita";
  }
}

type LinhaDe<K extends TabelaSincronizada> = CantinaLocalDb[K] extends Table<infer L, string> ? L : never;

/** Grava a linha e a põe na outbox. Linha igual à que já existe não gera escrita nem item. */
async function gravar<K extends TabelaSincronizada>(
  db: CantinaLocalDb,
  tabela: K,
  dados: Omit<LinhaDe<K>, "atualizadoEm" | "seq"> & { id: string },
) {
  const existente: Record<string, unknown> | undefined = await db.table(tabela).get(dados.id);
  if (existente && Object.entries(dados).every(([campo, valor]) => existente[campo] === valor)) return;

  const agora = new Date().toISOString();
  const linha = { ...dados, atualizadoEm: agora, seq: 0 };
  await db.table(tabela).put(linha);
  await db.outbox.add({
    tabela,
    registroId: dados.id,
    operacao: existente ? "atualizar" : "inserir",
    payload: linha,
    criadoEm: agora,
  });
}

function transacao<T>(db: CantinaLocalDb, fn: () => Promise<T>): Promise<T> {
  return db.transaction("rw", db.tables, fn);
}

async function exigirCantina(db: CantinaLocalDb): Promise<Cantina> {
  const cantina = await db.cantinas.toCollection().first();
  if (!cantina) throw new ErroDeEscrita("sem-cantina");
  return cantina;
}

async function exigir<T>(linha: Promise<T | undefined>): Promise<T> {
  const encontrada = await linha;
  if (!encontrada) throw new ErroDeEscrita("nao-encontrado");
  return encontrada;
}

function exigirCentavos(valor: number) {
  if (!Number.isInteger(valor) || valor < 0) throw new ErroDeEscrita("valor-invalido");
}

const semEspacos = (texto: string) => texto.trim().replace(/\s+/g, " ");

/** Pedido conta para "tem pedidos" enquanto não for cancelado. */
export async function diaTemPedidos(db: CantinaLocalDb, diaId: string): Promise<boolean> {
  const pedidos = await db.pedidos.where("diaId").equals(diaId).toArray();
  return pedidos.some((p) => p.status !== "cancelado");
}

export type CardapioDoNovoDia = { tipo: "copiar"; diaId: string } | { tipo: "padrao" };

/**
 * Cria o dia de venda da data, com o cardápio copiado de outro dia ou com os preços padrão.
 * Se a data já teve um dia removido, reativa o mesmo registro. Devolve o id do dia.
 */
export async function criarDia(
  db: CantinaLocalDb,
  { data, nome, cardapio }: { data: string; nome?: string; cardapio: CardapioDoNovoDia },
): Promise<string> {
  const cantina = await exigirCantina(db);
  const diaId = await uuidV5(data, cantina.id);
  const produtos = await db.produtos.where("cantinaId").equals(cantina.id).toArray();
  const idDoPreco = new Map(
    await Promise.all(produtos.map(async (p) => [p.id, await uuidV5(p.id, diaId)] as const)),
  );

  return transacao(db, async () => {
    const existente = await db.diasDeVenda.get(diaId);
    if (existente && !existente.canceladoEm) throw new ErroDeEscrita("dia-ja-existe");

    await gravar(db, "diasDeVenda", {
      id: diaId,
      cantinaId: cantina.id,
      data,
      nome: nome ? semEspacos(nome) || null : null,
      fechadoEm: existente?.fechadoEm ?? null,
      canceladoEm: null,
    });

    const ativos = new Map(produtos.filter((p) => p.ativo).map((p) => [p.id, p]));
    const precos = new Map<string, { precoCentavos: number; quantidade: number | null }>();
    if (cardapio.tipo === "padrao") {
      for (const p of ativos.values()) precos.set(p.id, { precoCentavos: p.precoCentavos, quantidade: null });
    } else {
      const doOutroDia = await db.precosDoDia.where("diaId").equals(cardapio.diaId).toArray();
      for (const p of doOutroDia) {
        if (p.ativo && ativos.has(p.produtoId)) {
          precos.set(p.produtoId, { precoCentavos: p.precoCentavos, quantidade: p.quantidade ?? null });
        }
      }
    }

    // Um dia reativado pode ter linhas antigas: o cardápio fica exatamente igual ao escolhido.
    const antigos = await db.precosDoDia.where("diaId").equals(diaId).toArray();
    for (const antigo of antigos) {
      if (!precos.has(antigo.produtoId)) {
        await gravar(db, "precosDoDia", { ...antigo, ativo: false, quantidade: antigo.quantidade ?? null });
      }
    }
    for (const [produtoId, { precoCentavos, quantidade }] of precos) {
      await gravar(db, "precosDoDia", {
        id: idDoPreco.get(produtoId)!,
        cantinaId: cantina.id,
        diaId,
        produtoId,
        precoCentavos,
        ativo: true,
        quantidade,
      });
    }
    return diaId;
  });
}

/** "Remover dia": grava cancelado_em. Recusa se o dia tiver pedidos. */
export async function removerDia(db: CantinaLocalDb, diaId: string): Promise<void> {
  await transacao(db, async () => {
    const dia = await exigir(db.diasDeVenda.get(diaId));
    if (dia.canceladoEm) return;
    if (await diaTemPedidos(db, diaId)) throw new ErroDeEscrita("dia-com-pedidos");
    await gravar(db, "diasDeVenda", { ...dia, canceladoEm: new Date().toISOString() });
  });
}

/** Cadastra um item com o preço padrão e, se vier `aVendaNoDia`, já o põe à venda nesse dia. Devolve o id. */
export async function adicionarProduto(
  db: CantinaLocalDb,
  { nome, precoCentavos, aVendaNoDia }: { nome: string; precoCentavos: number; aVendaNoDia?: string },
): Promise<string> {
  exigirCentavos(precoCentavos);
  const cantina = await exigirCantina(db);
  const id = crypto.randomUUID();
  // O uuidV5 usa crypto.subtle, que não pode ser esperado dentro da transação do Dexie.
  const precoId = aVendaNoDia ? await uuidV5(id, aVendaNoDia) : null;
  await transacao(db, async () => {
    await gravar(db, "produtos", { id, cantinaId: cantina.id, nome: semEspacos(nome), precoCentavos, ativo: true });
    if (aVendaNoDia && precoId) {
      await exigir(db.diasDeVenda.get(aVendaNoDia));
      await gravar(db, "precosDoDia", {
        id: precoId,
        cantinaId: cantina.id,
        diaId: aVendaNoDia,
        produtoId: id,
        precoCentavos,
        ativo: true,
        quantidade: null,
      });
    }
  });
  return id;
}

type ItemNoCardapio = { precoCentavos: number; ativo: boolean; quantidade: number | null };

/** Cria ou altera a linha do item no cardápio do dia. */
async function mudarNoCardapio(
  db: CantinaLocalDb,
  diaId: string,
  produtoId: string,
  mudanca: (atual: ItemNoCardapio) => ItemNoCardapio,
) {
  const id = await uuidV5(produtoId, diaId);
  await transacao(db, async () => {
    const dia = await exigir(db.diasDeVenda.get(diaId));
    const produto = await exigir(db.produtos.get(produtoId));
    const linha = await db.precosDoDia.get(id);
    // Sem linha, o item está "Fora", custa o preço padrão e não tem limite.
    const atual: ItemNoCardapio = linha
      ? { precoCentavos: linha.precoCentavos, ativo: linha.ativo, quantidade: linha.quantidade ?? null }
      : { precoCentavos: produto.precoCentavos, ativo: false, quantidade: null };
    await gravar(db, "precosDoDia", {
      id,
      cantinaId: dia.cantinaId,
      diaId,
      produtoId,
      ...mudanca(atual),
    });
  });
}

/** Preço do item neste dia. Não muda se ele está à venda. */
export async function definirPrecoNoDia(db: CantinaLocalDb, diaId: string, produtoId: string, precoCentavos: number) {
  exigirCentavos(precoCentavos);
  await mudarNoCardapio(db, diaId, produtoId, (atual) => ({ ...atual, precoCentavos }));
}

/** Quantas unidades o item tem neste dia; nulo = sem limite. Não muda se ele está à venda. */
export async function definirQuantidadeNoDia(
  db: CantinaLocalDb,
  diaId: string,
  produtoId: string,
  quantidade: number | null,
) {
  if (quantidade !== null && (!Number.isInteger(quantidade) || quantidade < 0)) {
    throw new ErroDeEscrita("valor-invalido");
  }
  await mudarNoCardapio(db, diaId, produtoId, (atual) => ({ ...atual, quantidade }));
}

/** Switch "À venda / Fora" do Cardápio. */
export async function definirNoCardapio(db: CantinaLocalDb, diaId: string, produtoId: string, aVenda: boolean) {
  await mudarNoCardapio(db, diaId, produtoId, (atual) => ({ ...atual, ativo: aVenda }));
}

export type NovoPedido = {
  diaId: string;
  /** Busca o cliente por nome (sem diferença de maiúsculas e espaços) ou cria um novo. Vazio = sem cliente. */
  nomeCliente: string;
  /** Venda nasce entregue; reserva nasce "recebido" e é entregue depois. */
  tipo: "venda" | "reserva";
  produtoId: string;
  quantidade: number;
  precoUnitarioCentavos: number;
  /** Pix ou dinheiro registra o pagamento do total junto com o pedido. */
  pagamento: "pendente" | FormaPagamento;
};

/** Registra uma venda ou reserva de um item. Devolve o id do pedido. */
export async function registrarPedido(db: CantinaLocalDb, novo: NovoPedido): Promise<string> {
  exigirCentavos(novo.precoUnitarioCentavos);
  if (!Number.isInteger(novo.quantidade) || novo.quantidade <= 0) throw new ErroDeEscrita("valor-invalido");
  const nome = semEspacos(novo.nomeCliente);
  const chave = nome.toLocaleLowerCase("pt-BR");

  return transacao(db, async () => {
    const dia = await exigir(db.diasDeVenda.get(novo.diaId));
    if (dia.canceladoEm) throw new ErroDeEscrita("nao-encontrado");
    const cantinaId = dia.cantinaId;
    const agora = new Date().toISOString();
    await exigirEstoque(db, dia.id, novo.produtoId, novo.quantidade);

    let clienteId: string | null = null;
    if (nome) {
      const clientes = await db.clientes.where("cantinaId").equals(cantinaId).toArray();
      clienteId = clientes.find((c) => semEspacos(c.nome).toLocaleLowerCase("pt-BR") === chave)?.id ?? null;
      if (!clienteId) {
        clienteId = crypto.randomUUID();
        await gravar(db, "clientes", { id: clienteId, cantinaId, nome, telefone: null });
      }
    }

    const pedidoId = crypto.randomUUID();
    const venda = novo.tipo === "venda";
    await gravar(db, "pedidos", {
      id: pedidoId,
      cantinaId,
      diaId: dia.id,
      clienteId,
      origem: "balcao",
      status: venda ? "entregue" : "recebido",
      vendedorId: null,
      criadoEm: agora,
      entregueEm: venda ? agora : null,
    });
    await gravar(db, "itensPedido", {
      id: crypto.randomUUID(),
      pedidoId,
      cantinaId,
      produtoId: novo.produtoId,
      quantidade: novo.quantidade,
      precoUnitarioCentavos: novo.precoUnitarioCentavos,
      canceladoEm: null,
    });

    const total = novo.quantidade * novo.precoUnitarioCentavos;
    if (novo.pagamento !== "pendente" && total > 0) {
      // Mesmo instante do pedido: é assim que se distingue o pago na venda do recebido depois.
      await gravarPagamento(db, { pedidoId, cantinaId, valorCentavos: total, forma: novo.pagamento }, agora);
    }
    return pedidoId;
  });
}

/** Recusa pedir mais do que resta do item no dia. Reservas também consomem o estoque. */
async function exigirEstoque(db: CantinaLocalDb, diaId: string, produtoId: string, quantidade: number) {
  const [precosDoDia, pedidos, itens] = await Promise.all([
    db.precosDoDia.where("diaId").equals(diaId).toArray(),
    db.pedidos.where("diaId").equals(diaId).toArray(),
    db.itensPedido.where("produtoId").equals(produtoId).toArray(),
  ]);
  const { restantes } = estoqueDoDia({ precosDoDia, pedidos, itens }, diaId)(produtoId);
  if (restantes === null || quantidade <= restantes) return;
  const nome = (await db.produtos.get(produtoId))?.nome ?? "este item";
  throw new ErroDeEscrita(
    "sem-estoque",
    restantes === 0 ? `${nome} esgotou.` : `Só ${restantes === 1 ? "resta" : "restam"} ${restantes} de ${nome}.`,
  );
}

async function gravarPagamento(
  db: CantinaLocalDb,
  p: { pedidoId: string; cantinaId: string; valorCentavos: number; forma: FormaPagamento },
  registradoEm = new Date().toISOString(),
): Promise<string> {
  const id = crypto.randomUUID();
  await gravar(db, "pagamentos", {
    id,
    ...p,
    vendedorId: null,
    registradoEm,
    estornadoEm: null,
  });
  return id;
}

/** "Entregar" uma reserva. Pedido já entregue (ou cancelado) fica como está. */
export async function entregarReserva(db: CantinaLocalDb, pedidoId: string): Promise<void> {
  await transacao(db, async () => {
    const pedido = await exigir(db.pedidos.get(pedidoId));
    if (pedido.status === "entregue" || pedido.status === "cancelado") return;
    await gravar(db, "pedidos", { ...pedido, status: "entregue", entregueEm: new Date().toISOString() });
  });
}

/** "Receber": paga o que ainda está em aberto no pedido. Devolve o id do pagamento. */
export async function registrarPagamento(db: CantinaLocalDb, pedidoId: string, forma: FormaPagamento): Promise<string> {
  return transacao(db, async () => {
    const pedido = await exigir(db.pedidos.get(pedidoId));
    const itens = await db.itensPedido.where("pedidoId").equals(pedidoId).toArray();
    const pagamentos = await db.pagamentos.where("pedidoId").equals(pedidoId).toArray();
    const total = itens
      .filter((i) => !i.canceladoEm)
      .reduce((soma, i) => soma + i.quantidade * i.precoUnitarioCentavos, 0);
    const pago = pagamentos.filter((p) => !p.estornadoEm).reduce((soma, p) => soma + p.valorCentavos, 0);
    if (total - pago <= 0) throw new ErroDeEscrita("nada-em-aberto");
    return gravarPagamento(db, { pedidoId, cantinaId: pedido.cantinaId, valorCentavos: total - pago, forma });
  });
}

/** "Desfazer" um pagamento: grava estornado_em. */
export async function estornarPagamento(db: CantinaLocalDb, pagamentoId: string): Promise<void> {
  await transacao(db, async () => {
    const pagamento = await exigir(db.pagamentos.get(pagamentoId));
    if (pagamento.estornadoEm) return;
    await gravar(db, "pagamentos", { ...pagamento, estornadoEm: new Date().toISOString() });
  });
}
