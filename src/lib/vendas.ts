import type { FormaPagamento } from "@/local-db/escritas";
import type { Cliente, ItemPedido, Pagamento, Pedido, PrecoDoDia, Produto } from "@/local-db";
import { estoqueDoDia } from "./estoque";
import { dataLocal, rotuloDia } from "./formato";

/** Tudo o que Vendas lê do banco local. */
export type DadosVendas = {
  pedidos: Pedido[];
  itens: ItemPedido[];
  pagamentos: Pagamento[];
  produtos: Produto[];
  clientes: Cliente[];
  precosDoDia: PrecoDoDia[];
};

/** Reserva = pedido ainda não entregue; os outros são pagos ou pendentes pelo que falta receber. */
export type StatusPedido = "reservado" | "pendente" | "pago";
export type FiltroStatus = "todos" | StatusPedido;

export const POR_PAGINA = 6;

export type ItemDoCardapio = {
  produtoId: string;
  nome: string;
  precoCentavos: number;
  /** Quanto ainda dá para vender ou reservar no dia. Nulo = sem limite. */
  restantes: number | null;
};

export type PedidoDoDia = {
  id: string;
  nome: string;
  /** "2× Espeto de carne", itens separados por vírgula. */
  descricao: string;
  quantidade: number;
  valor: number;
  /** Preço de cada item quando o pedido tem um item só. */
  precoUnitario: number | null;
  /** O que falta receber (0 quando pago). */
  aberto: number;
  status: StatusPedido;
  /** Formas dos pagamentos não estornados, sem repetir. */
  formas: FormaPagamento[];
  /** Pagamentos não estornados: o que "Desfazer" estorna. */
  pagamentosAtivos: string[];
  criadoEm: string;
  /** "20:15" para vendas; "reservou 08 nov" para reservas. Hora local do aparelho. */
  hora: string;
};

export type ColunaDoQuadro = { status: StatusPedido; pedidos: PedidoDoDia[]; total: number };

export type TelaVendas = {
  /** Itens à venda no dia, por nome. */
  cardapio: ItemDoCardapio[];
  numeros: {
    itens: number;
    vendido: number;
    recebido: number;
    pendente: number;
    /** Pedidos vendidos com valor em aberto. */
    pedidosPendentes: number;
    reservas: number;
    itensReservados: number;
    valorReservas: number;
  };
  /** Quantos pedidos o dia tem, sem busca nem filtro. */
  totalDoDia: number;
  /** Pedidos com a busca e o filtro aplicados, do mais novo para o mais antigo. */
  pedidos: PedidoDoDia[];
  /** Quadro: Reservas → Pendentes → Pagos, só com a busca aplicada. */
  quadro: ColunaDoQuadro[];
};

/**
 * Monta a tela Vendas de um dia a partir das linhas do banco local.
 * Reservas não contam como vendidas (mesma regra do Painel). Recebido é limitado ao valor do pedido.
 */
export function montarVendas(
  dados: DadosVendas,
  diaId: string,
  { busca = "", filtro = "todos" }: { busca?: string; filtro?: FiltroStatus } = {},
): TelaVendas {
  const produtoPorId = new Map(dados.produtos.map((p) => [p.id, p]));
  const clientePorId = new Map(dados.clientes.map((c) => [c.id, c]));

  const estoque = estoqueDoDia(dados, diaId);
  const cardapio = dados.precosDoDia
    .filter((p) => p.diaId === diaId && p.ativo && produtoPorId.get(p.produtoId)?.ativo)
    .map((p) => ({
      produtoId: p.produtoId,
      nome: produtoPorId.get(p.produtoId)!.nome,
      precoCentavos: p.precoCentavos,
      restantes: estoque(p.produtoId).restantes,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const doDia = dados.pedidos.filter((p) => p.diaId === diaId && p.status !== "cancelado");
  const ids = new Set(doDia.map((p) => p.id));
  const itensPorPedido = agrupar(
    dados.itens.filter((i) => !i.canceladoEm && ids.has(i.pedidoId)),
    (i) => i.pedidoId,
  );
  const pagamentosPorPedido = agrupar(
    dados.pagamentos.filter((p) => !p.estornadoEm && ids.has(p.pedidoId)),
    (p) => p.pedidoId,
  );

  const todos = doDia
    .map((p): PedidoDoDia => {
      const itens = itensPorPedido.get(p.id) ?? [];
      const pagamentos = pagamentosPorPedido.get(p.id) ?? [];
      const valor = somar(itens, (i) => i.quantidade * i.precoUnitarioCentavos);
      const recebido = Math.min(somar(pagamentos, (pg) => pg.valorCentavos), valor);
      const reserva = p.status === "recebido";
      return {
        id: p.id,
        nome: (p.clienteId && clientePorId.get(p.clienteId)?.nome) || "Sem nome",
        descricao: itens.map((i) => `${i.quantidade}× ${produtoPorId.get(i.produtoId)?.nome ?? "Item"}`).join(", "),
        quantidade: somar(itens, (i) => i.quantidade),
        valor,
        precoUnitario: itens.length === 1 ? itens[0].precoUnitarioCentavos : null,
        aberto: valor - recebido,
        status: reserva ? "reservado" : valor - recebido > 0 ? "pendente" : "pago",
        formas: [...new Set(pagamentos.map((pg) => pg.forma))],
        pagamentosAtivos: pagamentos.map((pg) => pg.id),
        criadoEm: p.criadoEm,
        hora: reserva ? `reservou ${rotuloDia(dataLocal(p.criadoEm))}` : horaLocal(p.criadoEm),
      };
    })
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const vendidos = todos.filter((p) => p.status !== "reservado");
  const reservas = todos.filter((p) => p.status === "reservado");
  const vendido = somar(vendidos, (p) => p.valor);
  const pendente = somar(vendidos, (p) => p.aberto);

  const termo = normalizar(busca);
  const buscados = termo ? todos.filter((p) => normalizar(p.nome).includes(termo)) : todos;
  const quadro = (["reservado", "pendente", "pago"] as const).map((status): ColunaDoQuadro => {
    const pedidos = buscados.filter((p) => p.status === status);
    return { status, pedidos, total: somar(pedidos, (p) => (status === "pendente" ? p.aberto : p.valor)) };
  });

  return {
    cardapio,
    numeros: {
      itens: somar(vendidos, (p) => p.quantidade),
      vendido,
      recebido: vendido - pendente,
      pendente,
      pedidosPendentes: vendidos.filter((p) => p.status === "pendente").length,
      reservas: reservas.length,
      itensReservados: somar(reservas, (p) => p.quantidade),
      valorReservas: somar(reservas, (p) => p.valor),
    },
    totalDoDia: todos.length,
    pedidos: filtro === "todos" ? buscados : buscados.filter((p) => p.status === filtro),
    quadro,
  };
}

export type Pagina<T> = {
  itens: T[];
  /** Página atual, limitada entre 1 e o total. */
  pagina: number;
  totalPaginas: number;
  /** "Mostrando 1–6 de 12". */
  faixa: string;
};

export function paginar<T>(lista: T[], pagina: number, porPagina = POR_PAGINA): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * porPagina;
  const itens = lista.slice(inicio, inicio + porPagina);
  return {
    itens,
    pagina: atual,
    totalPaginas,
    faixa: lista.length ? `Mostrando ${inicio + 1}–${inicio + itens.length} de ${lista.length}` : "Nenhum pedido",
  };
}

/** "12" ou "12,50", para o campo Preço un. */
export function textoDoPreco(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const resto = centavos % 100;
  return resto ? `${reais},${String(resto).padStart(2, "0")}` : String(reais);
}

/** Lê o que foi digitado em Preço un. ("12", "12,5", "12.50"). Inválido = null. */
export function lerPreco(texto: string): number | null {
  const limpo = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(limpo)) return null;
  return Math.round(Number(limpo) * 100);
}

const ROTULO_DA_FORMA: Record<FormaPagamento, string> = { pix: "Pix", dinheiro: "Dinheiro" };

/** "Pago · Pix", "Pago · Pix + Dinheiro" ou só "Pago". */
export function rotuloPago(formas: FormaPagamento[]): string {
  return formas.length ? `Pago · ${formas.map((f) => ROTULO_DA_FORMA[f]).join(" + ")}` : "Pago";
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

const doisDigitos = (n: number) => String(n).padStart(2, "0");

function horaLocal(iso: string): string {
  const d = new Date(iso);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
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
