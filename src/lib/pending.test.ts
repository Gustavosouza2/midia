import { describe, expect, it } from "vitest";
import type { SaleDay, Payment, Order } from "@/local-db";
import { buildPending, type PendingData } from "./pending";

const CANTEEN = "c0000000-0000-4000-8000-000000000000";
const sync = { updatedAt: "2026-11-01T00:00:00.000Z", seq: 1 };
let badgeCount = 0;
const newId = () => `00000000-0000-4000-8000-${String(++badgeCount).padStart(12, "0")}`;

const TODAY = "2026-11-04";
/** Today's local time, so the test holds in any time zone. */
const todayAt = (time: number) => new Date(2026, 10, 4, time).toISOString();
const ALL = { period: "all", search: "" };

/** The prototype's pending orders (design/screens/Pending.dc.html): 18 out 17 days ago, 01 nov 3 days ago. */
function example() {
  const data: PendingData = { days: [], orders: [], items: [], payments: [], products: [], customers: [] };
  const skewer = { id: newId(), canteenId: CANTEEN, name: "Espeto de carne", priceCents: 1200, active: true, ...sync };
  data.products.push(skewer);

  const day = (date: string): SaleDay => {
    const d: SaleDay = { id: newId(), canteenId: CANTEEN, date, name: null, closedAt: null, canceledAt: null, ...sync };
    data.days.push(d);
    return d;
  };
  const customers = new Map<string, string>();
  const order = (d: SaleDay, name: string, qty: number, price: number, status: Order["status"] = "entregue") => {
    if (!customers.has(name)) {
      const id = newId();
      customers.set(name, id);
      data.customers.push({ id, canteenId: CANTEEN, name, phone: null, ...sync });
    }
    const p: Order = {
      id: newId(),
      canteenId: CANTEEN,
      dayId: d.id,
      customerId: customers.get(name)!,
      origin: "balcao",
      status,
      sellerId: null,
      createdAt: `${d.date}T20:00:00.000Z`,
      deliveredAt: null,
      ...sync,
    };
    data.orders.push(p);
    data.items.push({
      id: newId(),
      orderId: p.id,
      canteenId: CANTEEN,
      productId: skewer.id,
      quantity: qty,
      unitPriceCents: price,
      canceledAt: null,
      ...sync,
    });
    return p;
  };
  const pay = (p: Order, amount: number, recordedAt: string, extra: Partial<Payment> = {}) => {
    const payment: Payment = {
      id: newId(),
      orderId: p.id,
      canteenId: CANTEEN,
      amountCents: amount,
      method: "pix",
      sellerId: null,
      recordedAt,
      refundedAt: null,
      ...sync,
      ...extra,
    };
    data.payments.push(payment);
    return payment;
  };

  const oct18 = day("2026-10-18");
  const melina = order(oct18, "Melina", 3, 1000);
  order(oct18, "Maju", 1, 1000);
  order(oct18, "Aniello", 1, 1000);
  const paidAtSale = order(oct18, "Charlene", 5, 1000);
  pay(paidAtSale, 5000, paidAtSale.createdAt);

  const nov01 = day("2026-11-01");
  const elizete = order(nov01, "Elizete", 2, 1200);
  order(nov01, "Fernando", 2, 1200);
  order(nov01, "Angélica", 1, 1200);
  order(nov01, "Lorrayne", 1, 1200);

  const nov15 = day("2026-11-15");
  order(nov15, "Gustavo", 3, 1200, "recebido");

  return { data, oct18, nov01, melina, elizete, order, pay };
}

describe("buildPending", () => {
  it("splits the groups by age and sums the stats as in the prototype", () => {
    const { data } = example();
    const { stats, groups } = buildPending(data, ALL, TODAY);

    expect(stats).toEqual({
      outstanding: 3000 + 1000 + 1000 + 2400 + 2400 + 1200 + 1200,
      outstandingOrders: 7,
      people: 7,
      overduePeople: 3,
      overdueAmount: 5000,
      receivedNow: 0,
    });
    expect(groups.map((g) => [g.title, g.people, g.total])).toEqual([
      ["Há mais de 2 semanas", 3, 5000],
      ["Recentes", 4, 7200],
    ]);
    expect(groups[0].rows[0]).toEqual({
      orderId: expect.any(String),
      name: "Melina",
      description: "3× Espeto de carne · 18 out",
      ageDays: 17,
      amount: 3000,
      state: { type: "open" },
    });
  });

  it("does not show reservations or paid orders", () => {
    const { data } = example();
    const names = buildPending(data, ALL, TODAY).groups.flatMap((g) => g.rows.map((l) => l.name));

    expect(names).not.toContain("Gustavo");
    expect(names).not.toContain("Charlene");
  });

  it("deducts partial payments and ignores refunded payments", () => {
    const { data, melina, elizete, pay } = example();
    pay(melina, 1000, todayAt(10));
    pay(elizete, 2400, todayAt(11), { refundedAt: todayAt(12) });

    const rows = buildPending(data, ALL, TODAY).groups.flatMap((g) => g.rows);
    expect(rows.find((l) => l.name === "Melina")?.amount).toBe(2000);
    expect(rows.find((l) => l.name === "Elizete")?.amount).toBe(2400);
  });

  it("counts the same person only once", () => {
    const { data, nov01, order } = example();
    order(nov01, "Melina", 1, 1200);

    const { stats, groups } = buildPending(data, ALL, TODAY);
    expect(stats.outstandingOrders).toBe(8);
    expect(stats.people).toBe(7);
    expect(groups[1].people).toBe(5);
  });

  it("filters by day and searches by name ignoring accents and case", () => {
    const { data, oct18 } = example();

    const ofDay = buildPending(data, { period: oct18.id, search: "" }, TODAY);
    expect(ofDay.groups.map((g) => g.key)).toEqual(["old"]);
    expect(ofDay.stats.outstanding).toBe(5000);

    const removed = buildPending(data, { period: "dia-que-nao-existe", search: "" }, TODAY);
    expect(removed.period).toBe("all");
    expect(removed.stats.outstandingOrders).toBe(7);

    const search = buildPending(data, { period: "all", search: "  ANGELICA " }, TODAY);
    expect(search.groups.flatMap((g) => g.rows.map((l) => l.name))).toEqual(["Angélica"]);
    expect(search.stats.outstanding).toBe(1200);
  });

  it("Recebido agora sums what was received today from people who were pending", () => {
    const { data, melina, elizete, oct18, nov01, order, pay } = example();
    pay(melina, 3000, todayAt(10));
    pay(elizete, 2400, todayAt(11), { refundedAt: todayAt(12) });
    pay(order(nov01, "Ontem", 1, 1200), 1200, new Date(2026, 10, 3, 12).toISOString());
    // Sale made today and already paid: the payment is recorded with the order.
    const paidSale = order(nov01, "Na hora", 1, 1200);
    paidSale.createdAt = todayAt(9);
    pay(paidSale, 1200, paidSale.createdAt);

    expect(buildPending(data, ALL, TODAY).stats.receivedNow).toBe(3000);
    expect(buildPending(data, { period: nov01.id, search: "" }, TODAY).stats.receivedNow).toBe(0);
    expect(buildPending(data, { period: oct18.id, search: "mel" }, TODAY).stats.receivedNow).toBe(3000);
  });

  it("keeps the order received in the session as paid until the payment is refunded", () => {
    const { data, melina, pay } = example();
    const payment = pay(melina, 3000, todayAt(10), { method: "dinheiro" });
    const inSession = new Map([[melina.id, payment.id]]);

    const paid = buildPending(data, ALL, TODAY, inSession);
    expect(paid.groups[0].rows[0]).toMatchObject({
      name: "Melina",
      amount: 3000,
      state: { type: "paid", paymentId: payment.id, method: "dinheiro" },
    });
    expect(paid.groups[0].people).toBe(2);
    expect(paid.stats.outstanding).toBe(2000 + 7200);
    // Without the session (screen reloaded), the paid order leaves the list.
    expect(buildPending(data, ALL, TODAY).groups[0].rows.map((l) => l.name)).not.toContain("Melina");

    payment.refundedAt = todayAt(11);
    const undone = buildPending(data, ALL, TODAY, inSession);
    expect(undone.groups[0].rows[0]).toMatchObject({ name: "Melina", amount: 3000, state: { type: "open" } });
  });

  it("ignores canceled orders and removed days", () => {
    const { data, nov01, order } = example();
    order(nov01, "Cancelado", 5, 1200, "cancelado");
    const removed = { ...nov01, id: newId(), date: "2026-11-02", canceledAt: "2026-11-02T00:00:00.000Z" };
    data.days.push(removed);
    order(removed, "Fantasma", 1, 1200);

    const { stats, days } = buildPending(data, ALL, TODAY);
    expect(stats.outstandingOrders).toBe(7);
    expect(days.map((d) => d.date)).not.toContain("2026-11-02");
  });

  it("works with no data", () => {
    const emptyMessage: PendingData = { days: [], orders: [], items: [], payments: [], products: [], customers: [] };
    const { stats, groups } = buildPending(emptyMessage, ALL, TODAY);
    expect(stats).toEqual({
      outstanding: 0,
      outstandingOrders: 0,
      people: 0,
      overduePeople: 0,
      overdueAmount: 0,
      receivedNow: 0,
    });
    expect(groups).toEqual([]);
  });
});
