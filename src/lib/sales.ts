import type { PaymentMethod } from "@/local-db/writes";
import type { Customer, OrderItem, Payment, Order, DayMenuItem, Product } from "@/local-db";
import { dayStock } from "./stock";
import { localDate, shortDate } from "./format";

/** Everything Sales reads from the local database. */
export type SalesData = {
  orders: Order[];
  items: OrderItem[];
  payments: Payment[];
  products: Product[];
  customers: Customer[];
  dayMenuItems: DayMenuItem[];
};

/** Reservation = order not delivered yet; the others are paid or pending by what is left to receive. */
export type OrderStatus = "reserved" | "pending" | "paid";
export type StatusFilter = "all" | OrderStatus;

export const PAGE_SIZE = 6;

export type MenuItem = {
  productId: string;
  name: string;
  priceCents: number;
  /** How much can still be sold or reserved on the day. Null = no limit. */
  remaining: number | null;
};

export type DayOrder = {
  id: string;
  name: string;
  /** "2× Espeto de carne", items separated by commas. */
  description: string;
  quantity: number;
  amount: number;
  /** Price of each item when the order has a single item. */
  unitPrice: number | null;
  /** What is left to receive (0 when paid). */
  due: number;
  status: OrderStatus;
  /** Methods of the non-refunded payments, without repeats. */
  methods: PaymentMethod[];
  /** Non-refunded payments: what "Desfazer" refunds. */
  activePayments: string[];
  createdAt: string;
  /** "20:15" for sales; "reservou 08 nov" for reservations. The device's local time. */
  time: string;
};

export type BoardColumn = { status: OrderStatus; orders: DayOrder[]; total: number };

export type SalesScreen = {
  /** Items for sale on the day, by name. */
  menu: MenuItem[];
  stats: {
    items: number;
    sold: number;
    received: number;
    pending: number;
    /** Sold orders with an outstanding amount. */
    pendingOrders: number;
    reservations: number;
    reservedItems: number;
    reservationsAmount: number;
  };
  /** How many orders the day has, without search or filter. */
  dayTotal: number;
  /** Orders with the search and filter applied, newest first. */
  orders: DayOrder[];
  /** Board: Reservas → Pendentes → Pagos, with only the search applied. */
  board: BoardColumn[];
};

/**
 * Builds a day's Sales screen from the local database rows.
 * Reservations do not count as sold (same rule as the Dashboard). Received is capped at the order amount.
 */
export function buildSales(
  data: SalesData,
  dayId: string,
  { search = "", filter = "all" }: { search?: string; filter?: StatusFilter } = {},
): SalesScreen {
  const productById = new Map(data.products.map((p) => [p.id, p]));
  const customerById = new Map(data.customers.map((c) => [c.id, c]));

  const stock = dayStock(data, dayId);
  const menu = data.dayMenuItems
    .filter((p) => p.dayId === dayId && p.active && productById.get(p.productId)?.active)
    .map((p) => ({
      productId: p.productId,
      name: productById.get(p.productId)!.name,
      priceCents: p.priceCents,
      remaining: stock(p.productId).remaining,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const ofDay = data.orders.filter((p) => p.dayId === dayId && p.status !== "cancelado");
  const ids = new Set(ofDay.map((p) => p.id));
  const itemsByOrder = groupBy(
    data.items.filter((i) => !i.canceledAt && ids.has(i.orderId)),
    (i) => i.orderId,
  );
  const paymentsByOrder = groupBy(
    data.payments.filter((p) => !p.refundedAt && ids.has(p.orderId)),
    (p) => p.orderId,
  );

  const all = ofDay
    .map((p): DayOrder => {
      const items = itemsByOrder.get(p.id) ?? [];
      const payments = paymentsByOrder.get(p.id) ?? [];
      const amount = sumBy(items, (i) => i.quantity * i.unitPriceCents);
      const received = Math.min(sumBy(payments, (pg) => pg.amountCents), amount);
      const reservation = p.status === "recebido";
      return {
        id: p.id,
        name: (p.customerId && customerById.get(p.customerId)?.name) || "Sem nome",
        description: items.map((i) => `${i.quantity}× ${productById.get(i.productId)?.name ?? "Item"}`).join(", "),
        quantity: sumBy(items, (i) => i.quantity),
        amount,
        unitPrice: items.length === 1 ? items[0].unitPriceCents : null,
        due: amount - received,
        status: reservation ? "reserved" : amount - received > 0 ? "pending" : "paid",
        methods: [...new Set(payments.map((pg) => pg.method))],
        activePayments: payments.map((pg) => pg.id),
        createdAt: p.createdAt,
        time: reservation ? `reservou ${shortDate(localDate(p.createdAt))}` : localTime(p.createdAt),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const soldOrders = all.filter((p) => p.status !== "reserved");
  const reservations = all.filter((p) => p.status === "reserved");
  const sold = sumBy(soldOrders, (p) => p.amount);
  const pending = sumBy(soldOrders, (p) => p.due);

  const term = normalize(search);
  const matching = term ? all.filter((p) => normalize(p.name).includes(term)) : all;
  const board = (["reserved", "pending", "paid"] as const).map((status): BoardColumn => {
    const orders = matching.filter((p) => p.status === status);
    return { status, orders, total: sumBy(orders, (p) => (status === "pending" ? p.due : p.amount)) };
  });

  return {
    menu,
    stats: {
      items: sumBy(soldOrders, (p) => p.quantity),
      sold,
      received: sold - pending,
      pending,
      pendingOrders: soldOrders.filter((p) => p.status === "pending").length,
      reservations: reservations.length,
      reservedItems: sumBy(reservations, (p) => p.quantity),
      reservationsAmount: sumBy(reservations, (p) => p.amount),
    },
    dayTotal: all.length,
    orders: filter === "all" ? matching : matching.filter((p) => p.status === filter),
    board,
  };
}

export type Paged<T> = {
  items: T[];
  /** Current page, clamped between 1 and the total. */
  page: number;
  totalPages: number;
  /** "Mostrando 1–6 de 12". */
  range: string;
};

export function paginate<T>(list: T[], page: number, perPage = PAGE_SIZE): Paged<T> {
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;
  const items = list.slice(start, start + perPage);
  return {
    items,
    page: current,
    totalPages,
    range: list.length ? `Mostrando ${start + 1}–${start + items.length} de ${list.length}` : "Nenhum pedido",
  };
}

/** "12" or "12,50", for the Preço un. input. */
export function formatPriceInput(cents: number): string {
  const reais = Math.floor(cents / 100);
  const remainder = cents % 100;
  return remainder ? `${reais},${String(remainder).padStart(2, "0")}` : String(reais);
}

/** Reads what was typed in Preço un. ("12", "12,5", "12.50"). Invalid = null. */
export function parsePrice(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

const METHOD_LABEL: Record<PaymentMethod, string> = { pix: "Pix", dinheiro: "Dinheiro" };

/** "Pago · Pix", "Pago · Pix + Dinheiro" or just "Pago". */
export function paidLabel(methods: PaymentMethod[]): string {
  return methods.length ? `Pago · ${methods.map((f) => METHOD_LABEL[f]).join(" + ")}` : "Pago";
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

const twoDigits = (n: number) => String(n).padStart(2, "0");

function localTime(iso: string): string {
  const d = new Date(iso);
  return `${twoDigits(d.getHours())}:${twoDigits(d.getMinutes())}`;
}

function sumBy<T>(list: T[], amount: (item: T) => number): number {
  return list.reduce((sum, item) => sum + amount(item), 0);
}

function groupBy<T>(list: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of list) {
    const k = key(item);
    const group = map.get(k);
    if (group) group.push(item);
    else map.set(k, [item]);
  }
  return map;
}
