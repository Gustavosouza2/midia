import type { DiaDeVenda, Pagamento, Pedido } from "@/local-db";
import { diasAtivos } from "./dias";
import { dataLocal, diasEntre, rotuloDia } from "./formato";
import { DIAS_PENDENTE_ANTIGO, type DadosPainel, type Periodo } from "./painel";

/** Pendentes lê as mesmas tabelas do Painel. */
export type DadosPendentes = DadosPainel;

export type FormaPagamento = Pagamento["forma"];

export type SituacaoLinha =
  | { tipo: "aberto" }
  /** Recebido nesta sessão: continua na lista com "Desfazer" até a tela ser recarregada. */
  | { tipo: "pago"; pagamentoId: string; forma: FormaPagamento };

export type LinhaPendente = {
  pedidoId: string;
  nome: string;
  /** "2× Espeto de carne · 01 nov" */
  descricao: string;
  idadeDias: number;
  /** Em aberto, ou o valor recebido quando a linha está paga. */
  valor: number;
  situacao: SituacaoLinha;
};

export type GrupoPendentes = {
  chave: "antigos" | "recentes";
  titulo: string;
  linhas: LinhaPendente[];
  /** Pessoas e total só das linhas ainda em aberto. */
  pessoas: number;
  total: number;
};

export type Pendentes = {
  dias: DiaDeVenda[];
  /** O período pedido, ou "todos" se o dia escolhido não existe mais. */
  periodo: Periodo;
  numeros: {
    emAberto: number;
    pedidosEmAberto: number;
    pessoas: number;
    pessoasAntigas: number;
    valorAntigo: number;
    recebidoAgora: number;
  };
  /** Só os grupos com alguma linha, "Há mais de 2 semanas" antes de "Recentes". */
  grupos: GrupoPendentes[];
};

/**
 * Monta a tela Pendentes: pedidos vendidos (não reservas) com valor em aberto, no período e
 * com o nome buscado. `recebidosNaSessao` (pedido → pagamento) mantém na lista, como pagos,
 * os pedidos recebidos nesta sessão enquanto o pagamento não for estornado.
 *
 * "Recebido agora" soma os pagamentos não estornados registrados hoje (data local do
 * aparelho) em pedidos que já estavam pendentes: fica de fora o pagamento feito junto com a
 * venda (registrado no mesmo instante do pedido).
 */
export function montarPendentes(
  dados: DadosPendentes,
  filtro: { periodo: Periodo; busca: string },
  hoje: string,
  recebidosNaSessao: ReadonlyMap<string, string> = new Map(),
): Pendentes {
  const dias = diasAtivos(dados.dias);
  const diaPorId = new Map(dias.map((d) => [d.id, d]));
  const produtoPorId = new Map(dados.produtos.map((p) => [p.id, p]));
  const clientePorId = new Map(dados.clientes.map((c) => [c.id, c]));
  const pagamentoPorId = new Map(dados.pagamentos.map((p) => [p.id, p]));
  const periodo = diaPorId.has(filtro.periodo) ? filtro.periodo : "todos";
  const termo = normalizar(filtro.busca);

  const nomeDe = (p: Pedido) => (p.clienteId && clientePorId.get(p.clienteId)?.nome) || "Sem nome";
  const pedidos = dados.pedidos.filter(
    (p) =>
      p.status !== "cancelado" &&
      p.status !== "recebido" &&
      diaPorId.has(p.diaId) &&
      (periodo === "todos" || periodo === p.diaId) &&
      normalizar(nomeDe(p)).includes(termo),
  );

  const linhas: { linha: LinhaPendente; pessoa: string; total: number }[] = [];
  let recebidoAgora = 0;
  for (const pedido of pedidos) {
    const itens = dados.itens.filter((i) => i.pedidoId === pedido.id && !i.canceladoEm);
    const pagamentos = dados.pagamentos.filter((p) => p.pedidoId === pedido.id && !p.estornadoEm);
    const total = itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitarioCentavos, 0);
    const pago = pagamentos.reduce((soma, p) => soma + p.valorCentavos, 0);
    const aberto = Math.max(0, total - pago);

    for (const p of pagamentos) {
      // O pagamento feito junto com a venda tem o mesmo instante do pedido (registrarPedido).
      const depoisDaVenda = p.registradoEm > pedido.criadoEm;
      if (depoisDaVenda && dataLocal(p.registradoEm) === hoje) recebidoAgora += p.valorCentavos;
    }

    const recebido = pagamentoPorId.get(recebidosNaSessao.get(pedido.id) ?? "");
    let situacao: SituacaoLinha;
    let valor: number;
    if (aberto > 0) {
      situacao = { tipo: "aberto" };
      valor = aberto;
    } else if (recebido && !recebido.estornadoEm) {
      situacao = { tipo: "pago", pagamentoId: recebido.id, forma: recebido.forma };
      valor = recebido.valorCentavos;
    } else {
      continue;
    }

    const dia = diaPorId.get(pedido.diaId)!;
    const descricao = itens
      .map((i) => `${i.quantidade}× ${produtoPorId.get(i.produtoId)?.nome ?? "Item"}`)
      .join(", ");
    linhas.push({
      linha: {
        pedidoId: pedido.id,
        nome: nomeDe(pedido),
        descricao: `${descricao} · ${rotuloDia(dia.data)}`,
        idadeDias: Math.max(0, diasEntre(dia.data, hoje)),
        valor,
        situacao,
      },
      pessoa: pedido.clienteId ?? pedido.id,
      total,
    });
  }

  // O valor total do pedido (não o aberto) desempata, para a linha não pular ao ser paga.
  linhas.sort(
    (a, b) =>
      b.linha.idadeDias - a.linha.idadeDias || b.total - a.total || a.linha.pedidoId.localeCompare(b.linha.pedidoId),
  );

  const emAberto = linhas.filter((l) => l.linha.situacao.tipo === "aberto");
  const antigas = emAberto.filter((l) => l.linha.idadeDias >= DIAS_PENDENTE_ANTIGO);
  const grupo = (chave: GrupoPendentes["chave"], titulo: string, antigo: boolean): GrupoPendentes => {
    const doGrupo = linhas.filter((l) => l.linha.idadeDias >= DIAS_PENDENTE_ANTIGO === antigo);
    const abertas = doGrupo.filter((l) => l.linha.situacao.tipo === "aberto");
    return {
      chave,
      titulo,
      linhas: doGrupo.map((l) => l.linha),
      pessoas: contarPessoas(abertas),
      total: somar(abertas),
    };
  };

  return {
    dias,
    periodo,
    numeros: {
      emAberto: somar(emAberto),
      pedidosEmAberto: emAberto.length,
      pessoas: contarPessoas(emAberto),
      pessoasAntigas: contarPessoas(antigas),
      valorAntigo: somar(antigas),
      recebidoAgora,
    },
    grupos: [grupo("antigos", "Há mais de 2 semanas", true), grupo("recentes", "Recentes", false)].filter(
      (g) => g.linhas.length > 0,
    ),
  };
}

/** Busca sem diferença de maiúsculas, acentos e espaços nas pontas. */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

function somar(linhas: { linha: LinhaPendente }[]): number {
  return linhas.reduce((soma, l) => soma + l.linha.valor, 0);
}

function contarPessoas(linhas: { pessoa: string }[]): number {
  return new Set(linhas.map((l) => l.pessoa)).size;
}
