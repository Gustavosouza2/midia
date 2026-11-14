import type { ItemPedido, Pedido, PrecoDoDia } from "@/local-db";

export type Estoque = {
  /** Unidades que o dia tem para vender. Nulo = sem limite. */
  quantidade: number | null;
  /** Itens não cancelados de pedidos não cancelados do dia, reservas incluídas. */
  vendidos: number;
  /** Nulo quando não há limite. Nunca negativo, mesmo se a quantidade baixou depois das vendas. */
  restantes: number | null;
  esgotado: boolean;
};

/**
 * Estoque de cada item num dia de venda. Usado pelas escritas (recusar venda acima do que resta)
 * e pelas telas, para as duas contarem igual.
 */
export function estoqueDoDia(
  dados: { precosDoDia: PrecoDoDia[]; pedidos: Pedido[]; itens: ItemPedido[] },
  diaId: string,
): (produtoId: string) => Estoque {
  const quantidadePorProduto = new Map(
    dados.precosDoDia.filter((p) => p.diaId === diaId).map((p) => [p.produtoId, p.quantidade ?? null]),
  );
  const pedidosDoDia = new Set(
    dados.pedidos.filter((p) => p.diaId === diaId && p.status !== "cancelado").map((p) => p.id),
  );
  const vendidosPorProduto = new Map<string, number>();
  for (const i of dados.itens) {
    if (i.canceladoEm || !pedidosDoDia.has(i.pedidoId)) continue;
    vendidosPorProduto.set(i.produtoId, (vendidosPorProduto.get(i.produtoId) ?? 0) + i.quantidade);
  }

  return (produtoId) => {
    const quantidade = quantidadePorProduto.get(produtoId) ?? null;
    const vendidos = vendidosPorProduto.get(produtoId) ?? 0;
    const restantes = quantidade === null ? null : Math.max(0, quantidade - vendidos);
    return { quantidade, vendidos, restantes, esgotado: restantes === 0 };
  };
}
