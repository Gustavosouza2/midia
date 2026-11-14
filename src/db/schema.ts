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
 * Schema rules (see AGENTS.md):
 * - uuid IDs; the client may generate its own ID (the default only applies when it sends none).
 * - Money always in cents (integer).
 * - cantina_id on every business table.
 * - Nothing is deleted: use ativo, fechado_em, cancelado_em, status "cancelado" or estornado_em.
 * - atualizado_em and seq are filled by a trigger on every insert and update.
 *   seq comes from a global sequence and is the sync cursor.
 */

export const syncSeq = pgSequence("sync_seq", { startWith: 1, increment: 1 });

const id = () => uuid("id").primaryKey().defaultRandom();
const canteenId = () =>
  uuid("cantina_id")
    .notNull()
    .references(() => canteens.id);
const sync = () => ({
  updatedAt: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  seq: bigint("seq", { mode: "number" })
    .notNull()
    .default(sql`nextval('sync_seq')`),
});

export const ORDER_ORIGINS = ["balcao", "online"] as const;
export const ORDER_STATUSES = ["recebido", "em_preparo", "pronto", "entregue", "cancelado"] as const;
export const PAYMENT_METHODS = ["dinheiro", "pix"] as const;

export const canteens = pgTable(
  "cantinas",
  {
    id: id(),
    name: text("nome").notNull(),
    slug: text("slug").notNull(),
    ...sync(),
  },
  (t) => [uniqueIndex("cantinas_slug_idx").on(t.slug), index("cantinas_seq_idx").on(t.seq)],
).enableRLS();

export const sellers = pgTable(
  "vendedores",
  {
    id: id(),
    canteenId: canteenId(),
    name: text("nome").notNull(),
    active: boolean("ativo").notNull().default(true),
    ...sync(),
  },
  (t) => [index("vendedores_cantina_seq_idx").on(t.canteenId, t.seq)],
).enableRLS();

export const customers = pgTable(
  "clientes",
  {
    id: id(),
    canteenId: canteenId(),
    name: text("nome").notNull(),
    phone: text("telefone"),
    ...sync(),
  },
  (t) => [index("clientes_cantina_seq_idx").on(t.canteenId, t.seq)],
).enableRLS();

export const products = pgTable(
  "produtos",
  {
    id: id(),
    canteenId: canteenId(),
    name: text("nome").notNull(),
    priceCents: integer("preco_centavos").notNull(),
    active: boolean("ativo").notNull().default(true),
    ...sync(),
  },
  (t) => [
    index("produtos_cantina_seq_idx").on(t.canteenId, t.seq),
    check("produtos_preco_centavos_check", sql`${t.priceCents} >= 0`),
  ],
).enableRLS();

export const saleDays = pgTable(
  "dias_de_venda",
  {
    id: id(),
    canteenId: canteenId(),
    date: date("data").notNull(),
    name: text("nome"),
    closedAt: timestamp("fechado_em", { withTimezone: true }),
    /** "Remover dia" (only without orders). Creating the same date again reactivates the record. */
    canceledAt: timestamp("cancelado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    // One day per date. The day id is derived from the date (UUID v5), so two devices
    // that create the same day offline end up with the same record.
    uniqueIndex("dias_de_venda_cantina_data_idx").on(t.canteenId, t.date),
    index("dias_de_venda_cantina_seq_idx").on(t.canteenId, t.seq),
  ],
).enableRLS();

/**
 * Each day's menu: which items are for sale and at what price. With no row (or with
 * ativo = false), the item is "Fora" that day. The default price lives in produtos.
 * The id is derived from day + product (UUID v5), for the same reason as sale days.
 */
export const dayMenuItems = pgTable(
  "precos_do_dia",
  {
    id: id(),
    canteenId: canteenId(),
    dayId: uuid("dia_id")
      .notNull()
      .references(() => saleDays.id),
    productId: uuid("produto_id")
      .notNull()
      .references(() => products.id),
    priceCents: integer("preco_centavos").notNull(),
    active: boolean("ativo").notNull().default(true),
    /** How many units the day has to sell. Null = no limit. */
    quantity: integer("quantidade"),
    ...sync(),
  },
  (t) => [
    uniqueIndex("precos_do_dia_dia_produto_idx").on(t.dayId, t.productId),
    index("precos_do_dia_produto_idx").on(t.productId),
    index("precos_do_dia_cantina_seq_idx").on(t.canteenId, t.seq),
    check("precos_do_dia_preco_centavos_check", sql`${t.priceCents} >= 0`),
    check("precos_do_dia_quantidade_check", sql`${t.quantity} >= 0`),
  ],
).enableRLS();

export const orders = pgTable(
  "pedidos",
  {
    id: id(),
    canteenId: canteenId(),
    dayId: uuid("dia_id")
      .notNull()
      .references(() => saleDays.id),
    customerId: uuid("cliente_id").references(() => customers.id),
    origin: text("origem", { enum: ORDER_ORIGINS }).notNull().default("balcao"),
    status: text("status", { enum: ORDER_STATUSES }).notNull().default("recebido"),
    sellerId: uuid("vendedor_id").references(() => sellers.id),
    createdAt: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    /** When the reservation was delivered (or the sale, which is born delivered). */
    deliveredAt: timestamp("entregue_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("pedidos_dia_idx").on(t.dayId),
    index("pedidos_cliente_idx").on(t.customerId),
    index("pedidos_vendedor_idx").on(t.sellerId),
    index("pedidos_cantina_seq_idx").on(t.canteenId, t.seq),
    check("pedidos_origem_check", sql`${t.origin} in ('balcao', 'online')`),
    check(
      "pedidos_status_check",
      sql`${t.status} in ('recebido', 'em_preparo', 'pronto', 'entregue', 'cancelado')`,
    ),
  ],
).enableRLS();

export const orderItems = pgTable(
  "itens_pedido",
  {
    id: id(),
    orderId: uuid("pedido_id")
      .notNull()
      .references(() => orders.id),
    canteenId: canteenId(),
    productId: uuid("produto_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantidade").notNull(),
    unitPriceCents: integer("preco_unitario_centavos").notNull(),
    canceledAt: timestamp("cancelado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("itens_pedido_pedido_idx").on(t.orderId),
    index("itens_pedido_produto_idx").on(t.productId),
    index("itens_pedido_cantina_seq_idx").on(t.canteenId, t.seq),
    check("itens_pedido_quantidade_check", sql`${t.quantity} > 0`),
    check("itens_pedido_preco_check", sql`${t.unitPriceCents} >= 0`),
  ],
).enableRLS();

export const payments = pgTable(
  "pagamentos",
  {
    id: id(),
    orderId: uuid("pedido_id")
      .notNull()
      .references(() => orders.id),
    canteenId: canteenId(),
    amountCents: integer("valor_centavos").notNull(),
    method: text("forma", { enum: PAYMENT_METHODS }).notNull(),
    sellerId: uuid("vendedor_id").references(() => sellers.id),
    recordedAt: timestamp("registrado_em", { withTimezone: true }).notNull().defaultNow(),
    refundedAt: timestamp("estornado_em", { withTimezone: true }),
    ...sync(),
  },
  (t) => [
    index("pagamentos_pedido_idx").on(t.orderId),
    index("pagamentos_vendedor_idx").on(t.sellerId),
    index("pagamentos_cantina_seq_idx").on(t.canteenId, t.seq),
    check("pagamentos_valor_check", sql`${t.amountCents} > 0`),
    check("pagamentos_forma_check", sql`${t.method} in ('dinheiro', 'pix')`),
  ],
).enableRLS();

/** Synced tables, in the order they can be created (respecting the FKs). */
export const SYNCED_TABLES = [
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
