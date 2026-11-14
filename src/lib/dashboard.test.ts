import { describe, expect, it } from "vitest";
import type { Customer, SaleDay, OrderItem, Payment, Order, Product } from "@/local-db";
import { buildDashboard, type DashboardData } from "./dashboard";

const CANTEEN = "c0000000-0000-4000-8000-000000000000";
const sync = { updatedAt: "2026-11-01T00:00:00.000Z", seq: 1 };
let badgeCount = 0;
const newId = () => `00000000-0000-4000-8000-${String(++badgeCount).padStart(12, "0")}`;

/** Builds the local database with the prototype's sample data (design/screens/Dashboard.dc.html). */
function example() {
  const data: DashboardData = { days: [], orders: [], items: [], payments: [], products: [], customers: [] };
  const skewer: Product = { id: newId(), canteenId: CANTEEN, name: "Espeto de carne", priceCents: 1200, active: true, ...sync };
  data.products.push(skewer);

  const day = (date: string): SaleDay => {
    const d: SaleDay = { id: newId(), canteenId: CANTEEN, date, name: null, closedAt: null, canceledAt: null, ...sync };
    data.days.push(d);
    return d;
  };
  const order = (
    d: SaleDay,
    name: string,
    qty: number,
    price: number,
    options: { paid?: boolean; reservation?: boolean } = {},
  ): Order => {
    const customer: Customer = { id: newId(), canteenId: CANTEEN, name, phone: null, ...sync };
    const p: Order = {
      id: newId(),
      canteenId: CANTEEN,
      dayId: d.id,
      customerId: customer.id,
      origin: "balcao",
      status: options.reservation ? "recebido" : "entregue",
      sellerId: null,
      createdAt: "2026-11-01T20:00:00.000Z",
      deliveredAt: null,
      ...sync,
    };
    const item: OrderItem = {
      id: newId(),
      orderId: p.id,
      canteenId: CANTEEN,
      productId: skewer.id,
      quantity: qty,
      unitPriceCents: price,
      canceledAt: null,
      ...sync,
    };
    data.customers.push(customer);
    data.orders.push(p);
    data.items.push(item);
    if (options.paid) data.payments.push(payment(p, qty * price));
    return p;
  };
  const payment = (p: Order, amount: number): Payment => ({
    id: newId(),
    orderId: p.id,
    canteenId: CANTEEN,
    amountCents: amount,
    method: "pix",
    sellerId: null,
    recordedAt: "2026-11-01T20:00:00.000Z",
    refundedAt: null,
    ...sync,
  });

  const oct18 = day("2026-10-18");
  const paid18: [string, number][] = [
    ["Charlene", 5], ["Mariana", 1], ["Paulinha", 3], ["Elised", 2], ["Evelyn", 1],
    ["Tamires", 1], ["Renan e Tay", 2], ["Júnior", 1], ["José", 1],
  ];
  for (const [name, qty] of paid18) order(oct18, name, qty, 1000, { paid: true });
  order(oct18, "Melina", 3, 1000);
  order(oct18, "Aniello", 1, 1000);
  order(oct18, "Maju", 1, 1000);

  const nov01 = day("2026-11-01");
  for (const [name, qty] of [["Elizete", 2], ["Fernando", 2], ["Angélica", 1], ["Lorrayne", 1]] as const) {
    order(nov01, name, qty, 1200);
  }

  const nov15 = day("2026-11-15");
  order(nov15, "Gustavo", 3, 1200, { reservation: true });

  return { data, oct18, nov01, nov15, order, payment };
}

// In the prototype, the pending orders from 18 out are "há 17 dias".
const TODAY = "2026-11-04";

describe("buildDashboard", () => {
  it("sums all days as in the prototype", () => {
    const { data, nov15 } = example();
    const dashboard = buildDashboard(data, "all", TODAY);

    expect(dashboard.stats).toEqual({
      sold: 29200,
      received: 17000,
      pending: 12200,
      receivedPct: 58,
      pendingPeople: 7,
      items: 28,
      sales: 16,
      reservations: 1,
      reservationsAmount: 3600,
    });
    expect(dashboard.upcoming?.id).toBe(nov15.id);
    expect(dashboard.upcomingReservations).toBe(1);
    expect(dashboard.days.map((d) => d.date)).toEqual(["2026-11-15", "2026-11-01", "2026-10-18"]);
    expect(dashboard.byDay.map((d) => d.receivedPct)).toEqual([0, 0, 77]);
  });

  it("sorts pending orders oldest first, and the largest amount first", () => {
    const { data } = example();
    const { pending, reservations } = buildDashboard(data, "all", TODAY);

    expect(pending.slice(0, 3).map((p) => [p.name, p.ageDays, p.due])).toEqual([
      ["Melina", 17, 3000],
      ["Aniello", 17, 1000],
      ["Maju", 17, 1000],
    ]);
    expect(pending[0].description).toBe("3× Espeto de carne");
    expect(reservations.map((r) => [r.name, r.amount, r.date])).toEqual([["Gustavo", 3600, "2026-11-15"]]);
  });

  it("filters by one day", () => {
    const { data, oct18 } = example();
    const { stats, reservations } = buildDashboard(data, oct18.id, TODAY);

    expect(stats.sold).toBe(22000);
    expect(stats.received).toBe(17000);
    expect(stats.receivedPct).toBe(77);
    expect(stats.pendingPeople).toBe(3);
    expect(stats.reservations).toBe(0);
    expect(reservations).toEqual([]);
  });

  it("ignores canceled orders, refunded payments and removed days", () => {
    const { data, nov01, order, payment } = example();
    order(nov01, "Cancelado", 5, 1200).status = "cancelado";
    const refunded = payment(data.orders.find((p) => p.dayId === nov01.id)!, 2400);
    refunded.refundedAt = "2026-11-02T00:00:00.000Z";
    data.payments.push(refunded);

    const removedDay = { ...nov01, id: newId(), date: "2026-11-08", canceledAt: "2026-11-02T00:00:00.000Z" };
    data.days.push(removedDay);
    order(removedDay, "Fantasma", 1, 1200);

    const { stats, days } = buildDashboard(data, "all", TODAY);
    expect(stats.sold).toBe(29200);
    expect(stats.received).toBe(17000);
    expect(days.map((d) => d.date)).not.toContain("2026-11-08");
  });

  it("counts partial payments and does not let received exceed the sold amount", () => {
    const { data, nov01, order, payment } = example();
    const partial = order(nov01, "Parcial", 2, 1200);
    data.payments.push(payment(partial, 1000));
    const extra = order(nov01, "A mais", 1, 1200);
    data.payments.push(payment(extra, 5000));

    const { stats, pending } = buildDashboard(data, nov01.id, TODAY);
    expect(stats.sold).toBe(7200 + 2400 + 1200);
    expect(stats.received).toBe(1000 + 1200);
    expect(pending.find((p) => p.name === "Parcial")?.due).toBe(1400);
    expect(pending.find((p) => p.name === "A mais")).toBeUndefined();
  });

  it("works with no data", () => {
    const emptyMessage: DashboardData = { days: [], orders: [], items: [], payments: [], products: [], customers: [] };
    const dashboard = buildDashboard(emptyMessage, "all", TODAY);
    expect(dashboard.upcoming).toBeNull();
    expect(dashboard.stats.receivedPct).toBe(0);
    expect(dashboard.byDay).toEqual([]);
  });
});
