import type { Customer, SaleDay, OrderItem, Payment, Order, Product } from "@/local-db";
import { activeDays, upcomingDay } from "./days";
import { daysBetween } from "./format";

/** Everything the Dashboard reads from the local database. */
export type DashboardData = {
  days: SaleDay[];
  orders: Order[];
  items: OrderItem[];
  payments: Payment[];
  products: Product[];
  customers: Customer[];
};

/** "all" or the id of a sale day. */
export type Period = "all" | string;

/** Old pending order: outstanding for 14 days or more (DESIGN.md). */
export const OLD_PENDING_DAYS = 14;
/** "Vendido por dia" shows only the most recent days. */
export const CHART_DAYS = 8;

export type OrderSummary = {
  id: string;
  dayId: string;
  date: string;
  name: string;
  description: string;
  amount: number;
  due: number;
  ageDays: number;
};

export type DaySummary = {
  day: SaleDay;
  upcoming: boolean;
  sold: number;
  received: number;
  receivedPct: number;
  items: number;
  sales: number;
  reservations: number;
  reservationsAmount: number;
};

export type Dashboard = {
  days: SaleDay[];
  upcoming: SaleDay | null;
  upcomingReservations: number;
  stats: {
    sold: number;
    received: number;
    pending: number;
    receivedPct: number;
    pendingPeople: number;
    items: number;
    sales: number;
    reservations: number;
    reservationsAmount: number;
  };
  byDay: DaySummary[];
  reservations: OrderSummary[];
  pending: OrderSummary[];
};

/**
 * Computes the Dashboard stats from the local database rows.
 * Reservation = order with status "recebido"; the others (except canceled) count as sold.
 * Received = payments not refunded, capped at the order amount.
 */
export function buildDashboard(data: DashboardData, period: Period, today: string): Dashboard {
  const days = activeDays(data.days);
  const dayById = new Map(days.map((d) => [d.id, d]));
  const upcoming = upcomingDay(days, today);

  const productById = new Map(data.products.map((p) => [p.id, p]));
  const customerById = new Map(data.customers.map((c) => [c.id, c]));
  const itemsByOrder = groupBy(
    data.items.filter((i) => !i.canceledAt),
    (i) => i.orderId,
  );
  const paidByOrder = new Map<string, number>();
  for (const p of data.payments) {
    if (p.refundedAt) continue;
    paidByOrder.set(p.orderId, (paidByOrder.get(p.orderId) ?? 0) + p.amountCents);
  }

  const orders = data.orders
    .filter((p) => p.status !== "cancelado" && dayById.has(p.dayId))
    .map((p) => {
      const day = dayById.get(p.dayId)!;
      const items = itemsByOrder.get(p.id) ?? [];
      const amount = items.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0);
      const received = Math.min(paidByOrder.get(p.id) ?? 0, amount);
      return {
        order: p,
        reservation: p.status === "recebido",
        qty: items.reduce((sum, i) => sum + i.quantity, 0),
        amount,
        received,
        summary: {
          id: p.id,
          dayId: day.id,
          date: day.date,
          name: (p.customerId && customerById.get(p.customerId)?.name) || "Sem nome",
          description: items
            .map((i) => `${i.quantity}× ${productById.get(i.productId)?.name ?? "Item"}`)
            .join(", "),
          amount,
          due: amount - received,
          ageDays: Math.max(0, daysBetween(day.date, today)),
        } satisfies OrderSummary,
      };
    });

  const byDay: DaySummary[] = days.map((day) => {
    const ofDay = orders.filter((p) => p.order.dayId === day.id);
    const soldOrders = ofDay.filter((p) => !p.reservation);
    const reservations = ofDay.filter((p) => p.reservation);
    const sold = sumBy(soldOrders, (p) => p.amount);
    const received = sumBy(soldOrders, (p) => p.received);
    return {
      day,
      upcoming: day.id === upcoming?.id,
      sold,
      received,
      receivedPct: percent(received, sold),
      items: sumBy(soldOrders, (p) => p.qty),
      sales: soldOrders.length,
      reservations: reservations.length,
      reservationsAmount: sumBy(reservations, (p) => p.amount),
    };
  });

  const inPeriod = (dayId: string) => period === "all" || period === dayId;
  const selectedDays = byDay.filter((d) => inPeriod(d.day.id));
  const sold = sumBy(selectedDays, (d) => d.sold);
  const received = sumBy(selectedDays, (d) => d.received);

  const reservations = orders
    .filter((p) => p.reservation && inPeriod(p.order.dayId))
    .map((p) => p.summary)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pending = orders
    .filter((p) => !p.reservation && p.summary.due > 0 && inPeriod(p.order.dayId))
    .map((p) => p.summary)
    .sort((a, b) => b.ageDays - a.ageDays || b.due - a.due);
  const pendingPeople = new Set(
    orders
      .filter((p) => !p.reservation && p.summary.due > 0 && inPeriod(p.order.dayId))
      .map((p) => p.order.customerId ?? p.order.id),
  ).size;

  return {
    days,
    upcoming,
    upcomingReservations: byDay.find((d) => d.upcoming)?.reservations ?? 0,
    stats: {
      sold,
      received,
      pending: sold - received,
      receivedPct: percent(received, sold),
      pendingPeople,
      items: sumBy(selectedDays, (d) => d.items),
      sales: sumBy(selectedDays, (d) => d.sales),
      reservations: sumBy(selectedDays, (d) => d.reservations),
      reservationsAmount: sumBy(selectedDays, (d) => d.reservationsAmount),
    },
    byDay: byDay.slice(0, CHART_DAYS),
    reservations,
    pending,
  };
}

function percent(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
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
