import type { Cliente, DiaDeVenda, ItemPedido, Pagamento, Pedido, Produto } from "@/local-db";
import { diasAtivos, proximoDia } from "./days";
import { diasEntre } from "./format";

/** Tudo o que o Painel lê do banco local. */
export type DadosPainel = {
  dias: DiaDeVenda[];
  pedidos: Pedido[];
  itens: ItemPedido[];
  pagamentos: Pagamento[];
  produtos: Produto[];
  clientes: Cliente[];
};

/** "todos" ou o id de um dia de venda. */
export type Periodo = "todos" | string;

/** Pendente antigo: em aberto há 14 dias ou mais (DESIGN.md). */
export const DIAS_PENDENTE_ANTIGO = 14;
/** "Vendido por dia" mostra só os dias mais recentes. */
export const DIAS_NO_GRAFICO = 8;

export type ResumoPedido = {
  id: string;
  diaId: string;
  data: string;
  nome: string;
  descricao: string;
  valor: number;
  aberto: number;
  idadeDias: number;
};

export type ResumoDia = {
  dia: DiaDeVenda;
  proximo: boolean;
  vendido: number;
  recebido: number;
  pctRecebido: number;
  itens: number;
  vendas: number;
  reservas: number;
  valorReservas: number;
};

export type Painel = {
  dias: DiaDeVenda[];
  proximo: DiaDeVenda | null;
  reservasDoProximo: number;
  numeros: {
    vendido: number;
    recebido: number;
    pendente: number;
    pctRecebido: number;
    pessoasPendentes: number;
    itens: number;
    vendas: number;
    reservas: number;
    valorReservas: number;
  };
  porDia: ResumoDia[];
  reservas: ResumoPedido[];
  pendentes: ResumoPedido[];
};

/**
 * Calcula os números do Painel a partir das linhas do banco local.
 * Reserva = pedido com status "recebido"; os outros (exceto cancelado) contam como vendidos.
 * Recebido = pagamentos não estornados, limitado ao valor do pedido.
 */
export function montarPainel(dados: DadosPainel, periodo: Periodo, hoje: string): Painel {
  const dias = diasAtivos(dados.dias);
  const diaPorId = new Map(dias.map((d) => [d.id, d]));
  const proximo = proximoDia(dias, hoje);

  const produtoPorId = new Map(dados.produtos.map((p) => [p.id, p]));
  const clientePorId = new Map(dados.clientes.map((c) => [c.id, c]));
  const itensPorPedido = agrupar(
    dados.itens.filter((i) => !i.canceladoEm),
    (i) => i.pedidoId,
  );
  const pagoPorPedido = new Map<string, number>();
  for (const p of dados.pagamentos) {
    if (p.estornadoEm) continue;
    pagoPorPedido.set(p.pedidoId, (pagoPorPedido.get(p.pedidoId) ?? 0) + p.valorCentavos);
  }

  const pedidos = dados.pedidos
    .filter((p) => p.status !== "cancelado" && diaPorId.has(p.diaId))
    .map((p) => {
      const dia = diaPorId.get(p.diaId)!;
      const itens = itensPorPedido.get(p.id) ?? [];
      const valor = itens.reduce((soma, i) => soma + i.quantidade * i.precoUnitarioCentavos, 0);
      const recebido = Math.min(pagoPorPedido.get(p.id) ?? 0, valor);
      return {
        pedido: p,
        reserva: p.status === "recebido",
        qtd: itens.reduce((soma, i) => soma + i.quantidade, 0),
        valor,
        recebido,
        resumo: {
          id: p.id,
          diaId: dia.id,
          data: dia.data,
          nome: (p.clienteId && clientePorId.get(p.clienteId)?.nome) || "Sem nome",
          descricao: itens
            .map((i) => `${i.quantidade}× ${produtoPorId.get(i.produtoId)?.nome ?? "Item"}`)
            .join(", "),
          valor,
          aberto: valor - recebido,
          idadeDias: Math.max(0, diasEntre(dia.data, hoje)),
        } satisfies ResumoPedido,
      };
    });

  const porDia: ResumoDia[] = dias.map((dia) => {
    const doDia = pedidos.filter((p) => p.pedido.diaId === dia.id);
    const vendidos = doDia.filter((p) => !p.reserva);
    const reservas = doDia.filter((p) => p.reserva);
    const vendido = somar(vendidos, (p) => p.valor);
    const recebido = somar(vendidos, (p) => p.recebido);
    return {
      dia,
      proximo: dia.id === proximo?.id,
      vendido,
      recebido,
      pctRecebido: percentual(recebido, vendido),
      itens: somar(vendidos, (p) => p.qtd),
      vendas: vendidos.length,
      reservas: reservas.length,
      valorReservas: somar(reservas, (p) => p.valor),
    };
  });

  const noPeriodo = (diaId: string) => periodo === "todos" || periodo === diaId;
  const selecionados = porDia.filter((d) => noPeriodo(d.dia.id));
  const vendido = somar(selecionados, (d) => d.vendido);
  const recebido = somar(selecionados, (d) => d.recebido);

  const reservas = pedidos
    .filter((p) => p.reserva && noPeriodo(p.pedido.diaId))
    .map((p) => p.resumo)
    .sort((a, b) => a.data.localeCompare(b.data));
  const pendentes = pedidos
    .filter((p) => !p.reserva && p.resumo.aberto > 0 && noPeriodo(p.pedido.diaId))
    .map((p) => p.resumo)
    .sort((a, b) => b.idadeDias - a.idadeDias || b.aberto - a.aberto);
  const pessoasPendentes = new Set(
    pedidos
      .filter((p) => !p.reserva && p.resumo.aberto > 0 && noPeriodo(p.pedido.diaId))
      .map((p) => p.pedido.clienteId ?? p.pedido.id),
  ).size;

  return {
    dias,
    proximo,
    reservasDoProximo: porDia.find((d) => d.proximo)?.reservas ?? 0,
    numeros: {
      vendido,
      recebido,
      pendente: vendido - recebido,
      pctRecebido: percentual(recebido, vendido),
      pessoasPendentes,
      itens: somar(selecionados, (d) => d.itens),
      vendas: somar(selecionados, (d) => d.vendas),
      reservas: somar(selecionados, (d) => d.reservas),
      valorReservas: somar(selecionados, (d) => d.valorReservas),
    },
    porDia: porDia.slice(0, DIAS_NO_GRAFICO),
    reservas,
    pendentes,
  };
}

function percentual(parte: number, total: number): number {
  return total ? Math.round((parte / total) * 100) : 0;
}

function somar<T>(lista: T[], valor: (item: T) => number): number {
  return lista.reduce((soma, item) => soma + valor(item), 0);
}

function agrupar<T>(lista: T[], chave: (item: T) => string): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of lista) {
    const k = chave(item);
    const grupo = mapa.get(k);
    if (grupo) grupo.push(item);
    else mapa.set(k, [item]);
  }
  return mapa;
}
