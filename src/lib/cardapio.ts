import type { ItemPedido, Pedido, PrecoDoDia, Produto } from "@/local-db";
import { estoqueDoDia, type Estoque } from "./estoque";

/** Tudo o que o Cardápio lê do banco local. */
export type DadosCardapio = {
  produtos: Produto[];
  precosDoDia: PrecoDoDia[];
  pedidos: Pedido[];
  itens: ItemPedido[];
};

export type ItemDoCardapio = {
  produto: Produto;
  /** Preço neste dia; sem linha em precos_do_dia, o preço padrão. */
  precoCentavos: number;
  diferenteDoPadrao: boolean;
  aVenda: boolean;
  /** Quantidade, vendidos (reservas incluídas) e o que resta neste dia. */
  estoque: Estoque;
};

export type Cardapio = {
  /** Itens ativos em ordem alfabética, para a linha não mudar de lugar ao ligar ou desligar o switch. */
  itens: ItemDoCardapio[];
  aVenda: number;
};

/** Monta a lista do Cardápio de um dia a partir das linhas do banco local. */
export function montarCardapio(dados: DadosCardapio, diaId: string): Cardapio {
  const precoPorProduto = new Map(dados.precosDoDia.filter((p) => p.diaId === diaId).map((p) => [p.produtoId, p]));
  const estoque = estoqueDoDia(dados, diaId);

  const itens = dados.produtos
    .filter((p) => p.ativo)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
    .map((produto): ItemDoCardapio => {
      const linha = precoPorProduto.get(produto.id);
      const precoCentavos = linha?.precoCentavos ?? produto.precoCentavos;
      return {
        produto,
        precoCentavos,
        diferenteDoPadrao: precoCentavos !== produto.precoCentavos,
        aVenda: linha?.ativo ?? false,
        estoque: estoque(produto.id),
      };
    });

  return { itens, aVenda: itens.filter((i) => i.aVenda).length };
}

/** "12", "12,5", "12,50" ou "R$ 12,50" → centavos. Nulo se não for um valor em reais maior que zero. */
export function lerReais(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "");
  const partes = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(limpo);
  if (!partes) return null;
  const centavos = Number(partes[1]) * 100 + Number((partes[2] ?? "").padEnd(2, "0"));
  return centavos > 0 ? centavos : null;
}

/** Centavos → texto do campo de preço: "12" ou "12,50". */
export function reaisParaCampo(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;
  return resto ? `${reais},${String(resto).padStart(2, "0")}` : String(reais);
}

/** Texto do campo Quantidade: "" (sem limite) ou "50". Inteiro ≥ 0; outra coisa = undefined (inválido). */
export function lerQuantidade(texto: string): number | null | undefined {
  const limpo = texto.trim();
  if (!limpo) return null;
  return /^\d{1,5}$/.test(limpo) ? Number(limpo) : undefined;
}
