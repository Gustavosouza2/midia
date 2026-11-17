import type { SaleDay, Payment, Order } from "@/local-db";
import { activeDays } from "./days";
import { daysBetween, shortDate } from "./format";
import { OLD_PENDING_DAYS, type DashboardData, type Period } from "./dashboard";

/** Pending reads the same tables as the Dashboard. */
export type PendingData = DashboardData;

export type PaymentMethod = Payment["method"];

/** Received in this session: stays in the list with "Desfazer" until the screen is reloaded. */
export type OrderState = { type: "open" } | { type: "paid"; paymentId: string; method: PaymentMethod };

export type PendingOrder = {
  orderId: string;
  /** "2× Espeto de carne, 1× Refri" */
  items: string;
  /** "01 nov" */
  day: string;
  ageDays: number;
  /** Outstanding, or the received amount when the order is paid. */
  amount: number;
  state: OrderState;
};

/** Every order of the person was received in this session. `method` is null when they were mixed. */
export type PersonState =
  | { type: "open" }
  | { type: "paid"; paymentIds: string[]; method: PaymentMethod | null };

export type PendingPerson = {
  /** Customer id, or the order id for a sale with no name. */
  key: string;
  name: string;
  /** Age of the oldest order shown. */
  ageDays: number;
  /** Sum of the open orders, or what was received when the person is paid. */
  amount: number;
  /** Oldest first. */
  orders: PendingOrder[];
  state: PersonState;
};

export type Pending = {
  days: SaleDay[];
  /** The requested period, or "all" if the selected day no longer exists. */
  period: Period;
  /** From the orders still open only. */
  stats: { outstanding: number; people: number; overduePeople: number };
  /** Who owes longest first. */
  people: PendingPerson[];
};

/**
 * Builds the Pending screen: sold orders (not reservations) with an outstanding amount, in the period and
 * matching the searched name, one entry per person. `receivedInSession` (order → payment) keeps in the
 * list, as paid, the orders received in this session while the payment is not refunded.
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

  const byPerson = new Map<string, { name: string; orders: PendingOrder[]; total: number }>();
  for (const order of orders) {
    const items = data.items.filter((i) => i.orderId === order.id && !i.canceledAt);
    const total = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
    const paid = data.payments
      .filter((p) => p.orderId === order.id && !p.refundedAt)
      .reduce((sum, p) => sum + p.amountCents, 0);
    const due = Math.max(0, total - paid);

    const received = paymentById.get(receivedInSession.get(order.id) ?? "");
    let state: OrderState;
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
    const key = order.customerId ?? order.id;
    const person = byPerson.get(key) ?? { name: nameOf(order), orders: [], total: 0 };
    person.orders.push({
      orderId: order.id,
      items: items.map((i) => `${i.quantity}× ${productById.get(i.productId)?.name ?? "Item"}`).join(", "),
      day: shortDate(day.date),
      ageDays: Math.max(0, daysBetween(day.date, today)),
      amount,
      state,
    });
    // The orders' full totals (not the outstanding amount) break ties, so a person does not jump when paid.
    person.total += total;
    byPerson.set(key, person);
  }

  const people = [...byPerson].map(([key, { name, orders, total }]) => {
    orders.sort((a, b) => b.ageDays - a.ageDays || a.orderId.localeCompare(b.orderId));
    const open = orders.filter((o) => o.state.type === "open");
    return {
      total,
      overdue: open.some((o) => o.ageDays >= OLD_PENDING_DAYS),
      person: {
        key,
        name,
        ageDays: orders[0].ageDays,
        amount: sumAmounts(open.length > 0 ? open : orders),
        orders,
        state: open.length > 0 ? { type: "open" } : paidState(orders),
      } satisfies PendingPerson,
    };
  });
  people.sort(
    (a, b) =>
      b.person.ageDays - a.person.ageDays ||
      b.total - a.total ||
      a.person.name.localeCompare(b.person.name, "pt-BR") ||
      a.person.key.localeCompare(b.person.key),
  );

  const owing = people.filter((p) => p.person.state.type === "open");
  return {
    days,
    period,
    stats: {
      outstanding: sumAmounts(owing.map((p) => p.person)),
      people: owing.length,
      overduePeople: owing.filter((p) => p.overdue).length,
    },
    people: people.map((p) => p.person),
  };
}

function paidState(orders: PendingOrder[]): PersonState {
  const payments = orders.flatMap((o) => (o.state.type === "paid" ? [o.state] : []));
  const methods = new Set(payments.map((p) => p.method));
  return {
    type: "paid",
    paymentIds: payments.map((p) => p.paymentId),
    method: methods.size === 1 ? payments[0].method : null,
  };
}

/** Search that ignores case, accents and surrounding spaces. */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").trim();
}

function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
