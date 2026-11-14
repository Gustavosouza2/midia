import type { SaleDay, Payment, Order } from "@/local-db";
import { activeDays } from "./days";
import { localDate, daysBetween, shortDate } from "./format";
import { OLD_PENDING_DAYS, type DashboardData, type Period } from "./dashboard";

/** Pending reads the same tables as the Dashboard. */
export type PendingData = DashboardData;

export type PaymentMethod = Payment["method"];

export type RowState =
  | { type: "open" }
  /** Received in this session: stays in the list with "Desfazer" until the screen is reloaded. */
  | { type: "paid"; paymentId: string; method: PaymentMethod };

export type PendingRow = {
  orderId: string;
  name: string;
  /** "2× Espeto de carne · 01 nov" */
  description: string;
  ageDays: number;
  /** Outstanding, or the received amount when the row is paid. */
  amount: number;
  state: RowState;
};

export type PendingGroupData = {
  key: "old" | "recent";
  title: string;
  rows: PendingRow[];
  /** People and total from the rows still outstanding only. */
  people: number;
  total: number;
};

export type Pending = {
  days: SaleDay[];
  /** The requested period, or "all" if the selected day no longer exists. */
  period: Period;
  stats: {
    outstanding: number;
    outstandingOrders: number;
    people: number;
    overduePeople: number;
    overdueAmount: number;
    receivedNow: number;
  };
  /** Only groups with some row, "Há mais de 2 semanas" before "Recentes". */
  groups: PendingGroupData[];
};

/**
 * Builds the Pending screen: sold orders (not reservations) with an outstanding amount, in the period and
 * matching the searched name. `receivedInSession` (order → payment) keeps in the list, as paid,
 * the orders received in this session while the payment is not refunded.
 *
 * "Recebido agora" sums the non-refunded payments recorded today (the device's local
 * date) on orders that were already pending: the payment made with the
 * sale (recorded at the same instant as the order) is left out.
 */
export function buildPending(
  data: PendingData,
  filter: { period: Period; search: string },
  today: string,
  receivedInSession: ReadonlyMap<string, string> = new Map(),
): Pending {
  const days = activeDays(data.days);
  const dayById = new Map(days.map((d) => [d.id, d]));
  const productById = new Map(data.products.map((p) => [p.id, p]));
  const customerById = new Map(data.customers.map((c) => [c.id, c]));
  const paymentById = new Map(data.payments.map((p) => [p.id, p]));
  const period = dayById.has(filter.period) ? filter.period : "all";
  const term = normalize(filter.search);

  const nameOf = (p: Order) => (p.customerId && customerById.get(p.customerId)?.name) || "Sem nome";
  const orders = data.orders.filter(
    (p) =>
      p.status !== "cancelado" &&
      p.status !== "recebido" &&
      dayById.has(p.dayId) &&
      (period === "all" || period === p.dayId) &&
      normalize(nameOf(p)).includes(term),
  );

  const rows: { row: PendingRow; person: string; total: number }[] = [];
  let receivedNow = 0;
  for (const order of orders) {
    const items = data.items.filter((i) => i.orderId === order.id && !i.canceledAt);
    const payments = data.payments.filter((p) => p.orderId === order.id && !p.refundedAt);
    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
    const paid = payments.reduce((sum, p) => sum + p.amountCents, 0);
    const due = Math.max(0, total - paid);

    for (const p of payments) {
      // The payment made with the sale has the same instant as the order (placeOrder).
      const afterSale = p.recordedAt > order.createdAt;
      if (afterSale && localDate(p.recordedAt) === today) receivedNow += p.amountCents;
    }

    const received = paymentById.get(receivedInSession.get(order.id) ?? "");
    let state: RowState;
    let amount: number;
    if (due > 0) {
      state = { type: "open" };
      amount = due;
    } else if (received && !received.refundedAt) {
      state = { type: "paid", paymentId: received.id, method: received.method };
      amount = received.amountCents;
    } else {
      continue;
    }

    const day = dayById.get(order.dayId)!;
    const description = items
      .map((i) => `${i.quantity}× ${productById.get(i.productId)?.name ?? "Item"}`)
      .join(", ");
    rows.push({
      row: {
        orderId: order.id,
        name: nameOf(order),
        description: `${description} · ${shortDate(day.date)}`,
        ageDays: Math.max(0, daysBetween(day.date, today)),
        amount,
        state,
      },
      person: order.customerId ?? order.id,
      total,
    });
  }

  // The order's total amount (not the outstanding one) breaks ties, so the row does not jump when paid.
  rows.sort(
    (a, b) =>
      b.row.ageDays - a.row.ageDays || b.total - a.total || a.row.orderId.localeCompare(b.row.orderId),
  );

  const outstanding = rows.filter((l) => l.row.state.type === "open");
  const oldRows = outstanding.filter((l) => l.row.ageDays >= OLD_PENDING_DAYS);
  const group = (key: PendingGroupData["key"], title: string, old: boolean): PendingGroupData => {
    const inGroup = rows.filter((l) => l.row.ageDays >= OLD_PENDING_DAYS === old);
    const openRows = inGroup.filter((l) => l.row.state.type === "open");
    return {
      key,
      title,
      rows: inGroup.map((l) => l.row),
      people: countPeople(openRows),
      total: sumBy(openRows),
    };
  };

  return {
    days,
    period,
    stats: {
      outstanding: sumBy(outstanding),
      outstandingOrders: outstanding.length,
      people: countPeople(outstanding),
      overduePeople: countPeople(oldRows),
      overdueAmount: sumBy(oldRows),
      receivedNow,
    },
    groups: [group("old", "Há mais de 2 semanas", true), group("recent", "Recentes", false)].filter(
      (g) => g.rows.length > 0,
    ),
  };
}

/** Search that ignores case, accents and surrounding spaces. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

function sumBy(rows: { row: PendingRow }[]): number {
  return rows.reduce((sum, l) => sum + l.row.amount, 0);
}

function countPeople(rows: { person: string }[]): number {
  return new Set(rows.map((l) => l.person)).size;
}
