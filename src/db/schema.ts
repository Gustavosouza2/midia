import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Regras do schema (ver AGENTS.md):
 * - IDs uuid; o cliente pode gerar o próprio ID (o default só vale se ele não mandar).
 * - Dinheiro sempre em centavos (integer).
 * - cantina_id em todas as tabelas de negócio.
 * - Nada é apagado: use ativo, fechado_em, cancelado_em, status "cancelado" ou estornado_em.
 * - atualizado_em e seq são preenchidos por trigger em todo insert e update.
 *   seq vem de uma sequência global e é o cursor da sincronização.
 */

export const syncSeq = pgSequence("sync_seq", { startWith: 1, increment: 1 });

const id = () => uuid("id").primaryKey().defaultRandom();
const cantinaId = () =>
  uuid("cantina_id")
    .notNull()
    .references(() => cantinas.id);
const sync = () => ({
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  seq: bigint("seq", { mode: "number" })
    .notNull()
    .default(sql`nextval('sync_seq')`),
});

export const ORIGENS_PEDIDO = ["balcao", "online"] as const;
export const STATUS_PEDIDO = ["recebido", "em_preparo", "pronto", "entregue", "cancelado"] as const;
export const FORMAS_PAGAMENTO = ["dinheiro", "pix"] as const;

export const cantinas = pgTable(
  "cantinas",
  {
    id: id(),
    nome: text("nome").notNull(),
    slug: text("slug").notNull(),
    ...sync(),
  },
  (t) => [uniqueIndex("cantinas_slug_idx").on(t.slug), index("cantinas_seq_idx").on(t.seq)],
).enableRLS();

export const vendedores = pgTable(
  "vendedores",
  {
    id: id(),
    cantinaId: cantinaId(),
    nome: text("nome").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    ...sync(),
  },
  (t) => [index("vendedores_cantina_seq_idx").on(t.cantinaId, t.seq)],
).enableRLS();

export const clientes = pgTable(
  "clientes",
  {
    id: id(),
    cantinaId: cantinaId(),
    nome: text("nome").notNull(),
    telefone: text("telefone"),
    ...sync(),
  },
  (t) => [index("clientes_cantina_seq_idx").on(t.cantinaId, t.seq)],
).enableRLS();

export const produtos = pgTable(
  "produtos",
  {
    id: id(),
    cantinaId: cantinaId(),
    nome: text("nome").notNull(),
    precoCentavos: integer("preco_centavos").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    ...sync(),
  },
  (t) => [
    index("produtos_cantina_seq_idx").on(t.cantinaId, t.seq),
    check("produtos_preco_centavos_check", sql`${t.precoCentavos} >= 0`),
  ],
).enableRLS();

export const diasDeVenda = pgTable(
  "dias_de_venda",
  {
    id: id(),
    cantinaId: cantinaId(),
    data: date("data").notNull(),
    nome: text("nome"),
    fechadoEm: timestamp("fechado_em", { withTimezone: true }),
    /** "Remover dia" (só sem pedidos). Criar a mesma data de novo reativa o registro. */
    canceladoEm: timestamp("cancelado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    // Um dia por data. O id do dia é derivado da data (UUID v5), então dois aparelhos
    // offline que criem o mesmo dia chegam ao mesmo registro.
    uniqueIndex("dias_de_venda_cantina_data_idx").on(t.cantinaId, t.data),
    index("dias_de_venda_cantina_seq_idx").on(t.cantinaId, t.seq),
  ],
).enableRLS();

/**
 * Cardápio de cada dia: quais itens estão à venda e por quanto. Sem linha (ou com
 * ativo = false), o item está "Fora" naquele dia. O preço padrão fica em produtos.
 * O id é derivado de dia + produto (UUID v5), pelo mesmo motivo dos dias de venda.
 */
export const precosDoDia = pgTable(
  "precos_do_dia",
  {
    id: id(),
    cantinaId: cantinaId(),
    diaId: uuid("dia_id")
      .notNull()
      .references(() => diasDeVenda.id),
    produtoId: uuid("produto_id")
      .notNull()
      .references(() => produtos.id),
    precoCentavos: integer("preco_centavos").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    ...sync(),
  },
  (t) => [
    uniqueIndex("precos_do_dia_dia_produto_idx").on(t.diaId, t.produtoId),
    index("precos_do_dia_produto_idx").on(t.produtoId),
    index("precos_do_dia_cantina_seq_idx").on(t.cantinaId, t.seq),
    check("precos_do_dia_preco_centavos_check", sql`${t.precoCentavos} >= 0`),
  ],
).enableRLS();

export const pedidos = pgTable(
  "pedidos",
  {
    id: id(),
    cantinaId: cantinaId(),
    diaId: uuid("dia_id")
      .notNull()
      .references(() => diasDeVenda.id),
    clienteId: uuid("cliente_id").references(() => clientes.id),
    origem: text("origem", { enum: ORIGENS_PEDIDO }).notNull().default("balcao"),
    status: text("status", { enum: STATUS_PEDIDO }).notNull().default("recebido"),
    vendedorId: uuid("vendedor_id").references(() => vendedores.id),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    /** Quando a reserva foi entregue (ou a venda, que já nasce entregue). */
    entregueEm: timestamp("entregue_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("pedidos_dia_idx").on(t.diaId),
    index("pedidos_cliente_idx").on(t.clienteId),
    index("pedidos_vendedor_idx").on(t.vendedorId),
    index("pedidos_cantina_seq_idx").on(t.cantinaId, t.seq),
    check("pedidos_origem_check", sql`${t.origem} in ('balcao', 'online')`),
    check(
      "pedidos_status_check",
      sql`${t.status} in ('recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado')`,
    ),
  ],
).enableRLS();

export const itensPedido = pgTable(
  "itens_pedido",
  {
    id: id(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id),
    cantinaId: cantinaId(),
    produtoId: uuid("produto_id")
      .notNull()
      .references(() => produtos.id),
    quantidade: integer("quantidade").notNull(),
    precoUnitarioCentavos: integer("preco_unitario_centavos").notNull(),
    canceladoEm: timestamp("cancelado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("itens_pedido_pedido_idx").on(t.pedidoId),
    index("itens_pedido_produto_idx").on(t.produtoId),
    index("itens_pedido_cantina_seq_idx").on(t.cantinaId, t.seq),
    check("itens_pedido_quantidade_check", sql`${t.quantidade} > 0`),
    check("itens_pedido_preco_check", sql`${t.precoUnitarioCentavos} >= 0`),
  ],
).enableRLS();

export const pagamentos = pgTable(
  "pagamentos",
  {
    id: id(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id),
    cantinaId: cantinaId(),
    valorCentavos: integer("valor_centavos").notNull(),
    forma: text("forma", { enum: FORMAS_PAGAMENTO }).notNull(),
    vendedorId: uuid("vendedor_id").references(() => vendedores.id),
    registradoEm: timestamp("registrado_em", { withTimezone: true }).notNull().defaultNow(),
    estornadoEm: timestamp("estornado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("pagamentos_pedido_idx").on(t.pedidoId),
    index("pagamentos_vendedor_idx").on(t.vendedorId),
    index("pagamentos_cantina_seq_idx").on(t.cantinaId, t.seq),
    check("pagamentos_valor_check", sql`${t.valorCentavos} > 0`),
    check("pagamentos_forma_check", sql`${t.forma} in ('dinheiro', 'pix')`),
  ],
).enableRLS();

/** Tabelas sincronizadas, na ordem em que podem ser criadas (respeitando as FKs). */
export const TABELAS_SINCRONIZADAS = [
  "cantinas",
  "vendedores",
  "clientes",
  "produtos",
  "dias_de_venda",
  "precos_do_dia",
  "pedidos",
  "itens_pedido",
  "pagamentos",
] as const;
