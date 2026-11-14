import type { PAYMENT_METHODS } from "@/db/schema";
import { dayStock } from "@/lib/stock";
import { uuidV5 } from "@/lib/uuid-v5";
import type { Table } from "dexie";
import type { Canteen, CanteenLocalDb, SyncedTable } from "./index";

/**
 * UI writes to the local database. Each function saves the rows and, in the same transaction,
 * puts one outbox item per saved row, with the whole row as payload.
 *
 * Rows saved here go out with `seq: 0`, meaning "not synced yet": the real seq
 * is assigned by the server trigger and comes back on the next API read.
 *
 * Deterministic ids (DESIGN.md, "One sale day per date"):
 * - sale day = uuidV5(date, canteenId)
 * - day menu item = uuidV5(productId, dayId)
 */

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const MESSAGES = {
  "no-canteen": "Conecte-se à internet uma vez para começar.",
  "day-exists": "Já existe um dia nessa data.",
  "day-has-orders": "Este dia já tem pedidos e não pode ser removido.",
  "nothing-due": "Este pedido já está pago.",
  "not-found": "Registro não encontrado no aparelho.",
  "invalid-value": "Valor inválido.",
  "out-of-stock": "Não há quantidade suficiente deste item.",
} as const;

export type WriteErrorCode = keyof typeof MESSAGES;

/** A refused write. `message` is ready to show on screen. */
export class WriteError extends Error {
  constructor(
    readonly code: WriteErrorCode,
    message: string = MESSAGES[code],
  ) {
    super(message);
    this.name = "WriteError";
  }
}

type RowOf<K extends SyncedTable> = CanteenLocalDb[K] extends Table<infer L, string> ? L : never;

/** Saves the row and puts it in the outbox. A row equal to the existing one causes no write and no item. */
async function saveRow<K extends SyncedTable>(
  db: CanteenLocalDb,
  table: K,
  data: Omit<RowOf<K>, "updatedAt" | "seq"> & { id: string },
) {
  const existing: Record<string, unknown> | undefined = await db.table(table).get(data.id);
  if (existing && Object.entries(data).every(([field, value]) => existing[field] === value)) return;

  const now = new Date().toISOString();
  const row = { ...data, updatedAt: now, seq: 0 };
  await db.table(table).put(row);
  await db.outbox.add({
    table,
    recordId: data.id,
    operation: existing ? "update" : "insert",
    payload: row,
    createdAt: now,
  });
}

function transaction<T>(db: CanteenLocalDb, fn: () => Promise<T>): Promise<T> {
  return db.transaction("rw", db.tables, fn);
}

async function requireCanteen(db: CanteenLocalDb): Promise<Canteen> {
  const canteen = await db.canteens.toCollection().first();
  if (!canteen) throw new WriteError("no-canteen");
  return canteen;
}

async function mustExist<T>(row: Promise<T | undefined>): Promise<T> {
  const found = await row;
  if (!found) throw new WriteError("not-found");
  return found;
}

function requireCents(value: number) {
  if (!Number.isInteger(value) || value < 0) throw new WriteError("invalid-value");
}

const collapseSpaces = (text: string) => text.trim().replace(/\s+/g, " ");

/** An order counts toward "has orders" while it is not canceled. */
export async function dayHasOrders(db: CanteenLocalDb, dayId: string): Promise<boolean> {
  const orders = await db.orders.where("dayId").equals(dayId).toArray();
  return orders.some((p) => p.status !== "cancelado");
}

export type NewDayMenu = { type: "copy"; dayId: string } | { type: "default" };

/**
 * Creates the sale day for the date, with the menu copied from another day or with the default prices.
 * If the date already had a removed day, reactivates the same record. Returns the day id.
 */
export async function createDay(
  db: CanteenLocalDb,
  { date, name, menu }: { date: string; name?: string; menu: NewDayMenu },
): Promise<string> {
  const canteen = await requireCanteen(db);
  const dayId = await uuidV5(date, canteen.id);
  const products = await db.products.where("canteenId").equals(canteen.id).toArray();
  const dayMenuItemIds = new Map(
    await Promise.all(products.map(async (p) => [p.id, await uuidV5(p.id, dayId)] as const)),
  );

  return transaction(db, async () => {
    const existing = await db.saleDays.get(dayId);
    if (existing && !existing.canceledAt) throw new WriteError("day-exists");

    await saveRow(db, "saleDays", {
      id: dayId,
      canteenId: canteen.id,
      date,
      name: name ? collapseSpaces(name) || null : null,
      closedAt: existing?.closedAt ?? null,
      canceledAt: null,
    });

    const activeProducts = new Map(products.filter((p) => p.active).map((p) => [p.id, p]));
    const prices = new Map<string, { priceCents: number; quantity: number | null }>();
    if (menu.type === "default") {
      for (const p of activeProducts.values()) prices.set(p.id, { priceCents: p.priceCents, quantity: null });
    } else {
      const fromOtherDay = await db.dayMenuItems.where("dayId").equals(menu.dayId).toArray();
      for (const p of fromOtherDay) {
        if (p.active && activeProducts.has(p.productId)) {
          prices.set(p.productId, { priceCents: p.priceCents, quantity: p.quantity ?? null });
        }
      }
    }

    // A reactivated day may have old rows: the menu ends up exactly like the chosen one.
    const staleRows = await db.dayMenuItems.where("dayId").equals(dayId).toArray();
    for (const old of staleRows) {
      if (!prices.has(old.productId)) {
        await saveRow(db, "dayMenuItems", { ...old, active: false, quantity: old.quantity ?? null });
      }
    }
    for (const [productId, { priceCents, quantity }] of prices) {
      await saveRow(db, "dayMenuItems", {
        id: dayMenuItemIds.get(productId)!,
        canteenId: canteen.id,
        dayId,
        productId,
        priceCents,
        active: true,
        quantity,
      });
    }
    return dayId;
  });
}

/** "Remover dia": writes cancelado_em. Refuses if the day has orders. */
export async function removeDay(db: CanteenLocalDb, dayId: string): Promise<void> {
  await transaction(db, async () => {
    const day = await mustExist(db.saleDays.get(dayId));
    if (day.canceledAt) return;
    if (await dayHasOrders(db, dayId)) throw new WriteError("day-has-orders");
    await saveRow(db, "saleDays", { ...day, canceledAt: new Date().toISOString() });
  });
}

/** Registers an item with the default price and, if `forSaleOnDay` is given, puts it on sale that day. Returns the id. */
export async function addProduct(
  db: CanteenLocalDb,
  { name, priceCents, forSaleOnDay }: { name: string; priceCents: number; forSaleOnDay?: string },
): Promise<string> {
  requireCents(priceCents);
  const canteen = await requireCanteen(db);
  const id = crypto.randomUUID();
  // uuidV5 uses crypto.subtle, which cannot be awaited inside a Dexie transaction.
  const dayMenuItemId = forSaleOnDay ? await uuidV5(id, forSaleOnDay) : null;
  await transaction(db, async () => {
    await saveRow(db, "products", { id, canteenId: canteen.id, name: collapseSpaces(name), priceCents, active: true });
    if (forSaleOnDay && dayMenuItemId) {
      await mustExist(db.saleDays.get(forSaleOnDay));
      await saveRow(db, "dayMenuItems", {
        id: dayMenuItemId,
        canteenId: canteen.id,
        dayId: forSaleOnDay,
        productId: id,
        priceCents,
        active: true,
        quantity: null,
      });
    }
  });
  return id;
}

type MenuEntry = { priceCents: number; active: boolean; quantity: number | null };

/** Creates or changes the item's row on the day's menu. */
async function updateDayMenuItem(
  db: CanteenLocalDb,
  dayId: string,
  productId: string,
  change: (current: MenuEntry) => MenuEntry,
) {
  const id = await uuidV5(productId, dayId);
  await transaction(db, async () => {
    const day = await mustExist(db.saleDays.get(dayId));
    const product = await mustExist(db.products.get(productId));
    const row = await db.dayMenuItems.get(id);
    // With no row, the item is "Fora", costs the default price and has no limit.
    const current: MenuEntry = row
      ? { priceCents: row.priceCents, active: row.active, quantity: row.quantity ?? null }
      : { priceCents: product.priceCents, active: false, quantity: null };
    await saveRow(db, "dayMenuItems", {
      id,
      canteenId: day.canteenId,
      dayId,
      productId,
      ...change(current),
    });
  });
}

/** The item's price on this day. Does not change whether it is for sale. */
export async function setDayPrice(db: CanteenLocalDb, dayId: string, productId: string, priceCents: number) {
  requireCents(priceCents);
  await updateDayMenuItem(db, dayId, productId, (current) => ({ ...current, priceCents }));
}

/** How many units the item has on this day; null = no limit. Does not change whether it is for sale. */
export async function setDayQuantity(
  db: CanteenLocalDb,
  dayId: string,
  productId: string,
  quantity: number | null,
) {
  if (quantity !== null && (!Number.isInteger(quantity) || quantity < 0)) {
    throw new WriteError("invalid-value");
  }
  await updateDayMenuItem(db, dayId, productId, (current) => ({ ...current, quantity }));
}

/** The Menu's "À venda / Fora" switch. */
export async function setOnMenu(db: CanteenLocalDb, dayId: string, productId: string, forSale: boolean) {
  await updateDayMenuItem(db, dayId, productId, (current) => ({ ...current, active: forSale }));
}

export type NewOrder = {
  dayId: string;
  /** Finds the customer by name (ignoring case and spaces) or creates a new one. Empty = no customer. */
  customerName: string;
  /** A sale is born delivered; a reservation is born "recebido" and is delivered later. */
  type: "sale" | "reservation";
  productId: string;
  quantity: number;
  unitPriceCents: number;
  /** Pix or cash records the payment of the total together with the order. */
  payment: "pending" | PaymentMethod;
};

/** Records a sale or reservation of one item. Returns the order id. */
export async function placeOrder(db: CanteenLocalDb, order: NewOrder): Promise<string> {
  requireCents(order.unitPriceCents);
  if (!Number.isInteger(order.quantity) || order.quantity <= 0) throw new WriteError("invalid-value");
  const name = collapseSpaces(order.customerName);
  const key = name.toLocaleLowerCase("pt-BR");

  return transaction(db, async () => {
    const day = await mustExist(db.saleDays.get(order.dayId));
    if (day.canceledAt) throw new WriteError("not-found");
    const canteenId = day.canteenId;
    const now = new Date().toISOString();
    await requireStock(db, day.id, order.productId, order.quantity);

    let customerId: string | null = null;
    if (name) {
      const customers = await db.customers.where("canteenId").equals(canteenId).toArray();
      customerId = customers.find((c) => collapseSpaces(c.name).toLocaleLowerCase("pt-BR") === key)?.id ?? null;
      if (!customerId) {
        customerId = crypto.randomUUID();
        await saveRow(db, "customers", { id: customerId, canteenId, name, phone: null });
      }
    }

    const orderId = crypto.randomUUID();
    const sale = order.type === "sale";
    await saveRow(db, "orders", {
      id: orderId,
      canteenId,
      dayId: day.id,
      customerId,
      origin: "balcao",
      status: sale ? "entregue" : "recebido",
      sellerId: null,
      createdAt: now,
      deliveredAt: sale ? now : null,
    });
    await saveRow(db, "orderItems", {
      id: crypto.randomUUID(),
      orderId,
      canteenId,
      productId: order.productId,
      quantity: order.quantity,
      unitPriceCents: order.unitPriceCents,
      canceledAt: null,
    });

    const total = order.quantity * order.unitPriceCents;
    if (order.payment !== "pending" && total > 0) {
      // Same instant as the order: that is how a payment at sale time is told apart from one received later.
      await savePayment(db, { orderId, canteenId, amountCents: total, method: order.payment }, now);
    }
    return orderId;
  });
}

/** Refuses ordering more than what remains of the item on the day. Reservations also consume stock. */
async function requireStock(db: CanteenLocalDb, dayId: string, productId: string, quantity: number) {
  const [dayMenuItems, orders, items] = await Promise.all([
    db.dayMenuItems.where("dayId").equals(dayId).toArray(),
    db.orders.where("dayId").equals(dayId).toArray(),
    db.orderItems.where("productId").equals(productId).toArray(),
  ]);
  const { remaining } = dayStock({ dayMenuItems, orders, items }, dayId)(productId);
  if (remaining === null || quantity <= remaining) return;
  const name = (await db.products.get(productId))?.name ?? "este item";
  throw new WriteError(
    "out-of-stock",
    remaining === 0 ? `${name} esgotou.` : `Só ${remaining === 1 ? "resta" : "restam"} ${remaining} de ${name}.`,
  );
}

async function savePayment(
  db: CanteenLocalDb,
  p: { orderId: string; canteenId: string; amountCents: number; method: PaymentMethod },
  recordedAt = new Date().toISOString(),
): Promise<string> {
  const id = crypto.randomUUID();
  await saveRow(db, "payments", {
    id,
    ...p,
    sellerId: null,
    recordedAt,
    refundedAt: null,
  });
  return id;
}

/** "Entregar" a reservation. An order already delivered (or canceled) stays as is. */
export async function deliverReservation(db: CanteenLocalDb, orderId: string): Promise<void> {
  await transaction(db, async () => {
    const order = await mustExist(db.orders.get(orderId));
    if (order.status === "entregue" || order.status === "cancelado") return;
    await saveRow(db, "orders", { ...order, status: "entregue", deliveredAt: new Date().toISOString() });
  });
}

/** "Receber": pays what is still outstanding on the order. Returns the payment id. */
export async function recordPayment(db: CanteenLocalDb, orderId: string, method: PaymentMethod): Promise<string> {
  return transaction(db, async () => {
    const order = await mustExist(db.orders.get(orderId));
    const items = await db.orderItems.where("orderId").equals(orderId).toArray();
    const payments = await db.payments.where("orderId").equals(orderId).toArray();
    const total = items
      .filter((i) => !i.canceledAt)
      .reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
    const paid = payments.filter((p) => !p.refundedAt).reduce((sum, p) => sum + p.amountCents, 0);
    if (total - paid <= 0) throw new WriteError("nothing-due");
    return savePayment(db, { orderId, canteenId: order.canteenId, amountCents: total - paid, method });
  });
}

/** "Desfazer" a payment: writes estornado_em. */
export async function refundPayment(db: CanteenLocalDb, paymentId: string): Promise<void> {
  await transaction(db, async () => {
    const payment = await mustExist(db.payments.get(paymentId));
    if (payment.refundedAt) return;
    await saveRow(db, "payments", { ...payment, refundedAt: new Date().toISOString() });
  });
}
