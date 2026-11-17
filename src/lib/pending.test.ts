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
  it("lists one entry per person, who owes longest first, with the prototype's totals", () => {
    const { data } = example();
    const { stats, people } = buildPending(data, ALL, TODAY);

    expect(stats).toEqual({
      outstanding: 3000 + 1000 + 1000 + 2400 + 2400 + 1200 + 1200,
      people: 7,
      overduePeople: 3,
    });
    expect(people.map((p) => [p.name, p.amount, p.ageDays])).toEqual([
      ["Melina", 3000, 17],
      ["Aniello", 1000, 17],
      ["Maju", 1000, 17],
      ["Elizete", 2400, 3],
      ["Fernando", 2400, 3],
      ["Angélica", 1200, 3],
      ["Lorrayne", 1200, 3],
    ]);
    expect(people[0]).toEqual({
      key: expect.any(String),
      name: "Melina",
      ageDays: 17,
      amount: 3000,
      orders: [
        {
          orderId: expect.any(String),
          items: "3× Espeto de carne",
          day: "18 out",
          ageDays: 17,
          amount: 3000,
          state: { type: "open" },
        },
      ],
      state: { type: "open" },
    });
  });

  it("groups the orders of the same person under one entry, oldest order first", () => {
    const { data, nov01, order } = example();
    order(nov01, "Melina", 1, 1200);

    const { stats, people } = buildPending(data, ALL, TODAY);
    const melina = people.filter((p) => p.name === "Melina");
    expect(melina).toHaveLength(1);
    expect(melina[0].amount).toBe(4200);
    expect(melina[0].ageDays).toBe(17);
    expect(melina[0].orders.map((o) => [o.day, o.amount])).toEqual([
      ["18 out", 3000],
      ["01 nov", 1200],
    ]);
    expect(stats.people).toBe(7);
    expect(stats.outstanding).toBe(13400);
  });

  it("keeps sales with no name apart", () => {
    const { data, nov01, order } = example();
    for (const p of [order(nov01, "x", 1, 1200), order(nov01, "x", 1, 1200)]) p.customerId = null;

    const anonymous = buildPending(data, ALL, TODAY).people.filter((p) => p.name === "Sem nome");
    expect(anonymous.map((p) => p.orders.length)).toEqual([1, 1]);
  });

  it("does not show reservations or paid orders", () => {
    const { data } = example();
    const names = buildPending(data, ALL, TODAY).people.map((p) => p.name);

    expect(names).not.toContain("Gustavo");
    expect(names).not.toContain("Charlene");
  });

  it("deducts partial payments and ignores refunded payments", () => {
    const { data, melina, elizete, pay } = example();
    pay(melina, 1000, todayAt(10));
    pay(elizete, 2400, todayAt(11), { refundedAt: todayAt(12) });

    const { people } = buildPending(data, ALL, TODAY);
    expect(people.find((p) => p.name === "Melina")?.amount).toBe(2000);
    expect(people.find((p) => p.name === "Elizete")?.amount).toBe(2400);
  });

  it("counts as overdue only people with an open order older than 2 weeks", () => {
    const { data, melina, nov01, order, pay } = example();
    order(nov01, "Melina", 1, 1200);
    pay(melina, 3000, todayAt(10));

    const { stats, people } = buildPending(data, ALL, TODAY);
    expect(stats.overduePeople).toBe(2);
    expect(people.find((p) => p.name === "Melina")?.amount).toBe(1200);
  });

  it("filters by day and searches by name ignoring accents and case", () => {
    const { data, oct18 } = example();

    const ofDay = buildPending(data, { period: oct18.id, search: "" }, TODAY);
    expect(ofDay.people.map((p) => p.name)).toEqual(["Melina", "Aniello", "Maju"]);
    expect(ofDay.stats.outstanding).toBe(5000);

    const removed = buildPending(data, { period: "dia-que-nao-existe", search: "" }, TODAY);
    expect(removed.period).toBe("all");
    expect(removed.stats.people).toBe(7);

    const search = buildPending(data, { period: "all", search: "  ANGELICA " }, TODAY);
    expect(search.people.map((p) => p.name)).toEqual(["Angélica"]);
    expect(search.stats.outstanding).toBe(1200);
  });

  it("keeps the person received in the session as paid until the payment is refunded", () => {
    const { data, melina, pay } = example();
    const payment = pay(melina, 3000, todayAt(10), { method: "dinheiro" });
    const inSession = new Map([[melina.id, payment.id]]);

    const paid = buildPending(data, ALL, TODAY, inSession);
    expect(paid.people[0]).toMatchObject({
      name: "Melina",
      amount: 3000,
      state: { type: "paid", paymentIds: [payment.id], method: "dinheiro" },
    });
    expect(paid.people[0].orders[0].state).toEqual({ type: "paid", paymentId: payment.id, method: "dinheiro" });
    expect(paid.stats).toEqual({ outstanding: 2000 + 7200, people: 6, overduePeople: 2 });
    // Without the session (screen reloaded), the paid person leaves the list.
    expect(buildPending(data, ALL, TODAY).people.map((p) => p.name)).not.toContain("Melina");

    payment.refundedAt = todayAt(11);
    const undone = buildPending(data, ALL, TODAY, inSession);
    expect(undone.people[0]).toMatchObject({ name: "Melina", amount: 3000, state: { type: "open" } });
  });

  it("keeps the person open while one of their orders is still due", () => {
    const { data, melina, nov01, order, pay } = example();
    const second = order(nov01, "Melina", 1, 1200);
    const first = pay(melina, 3000, todayAt(10));

    const partly = buildPending(data, ALL, TODAY, new Map([[melina.id, first.id]]));
    expect(partly.people[0]).toMatchObject({ name: "Melina", amount: 1200, state: { type: "open" } });
    expect(partly.people[0].orders.map((o) => o.state.type)).toEqual(["paid", "open"]);

    const last = pay(second, 1200, todayAt(11), { method: "dinheiro" });
    const all = new Map([
      [melina.id, first.id],
      [second.id, last.id],
    ]);
    expect(buildPending(data, ALL, TODAY, all).people[0]).toMatchObject({
      name: "Melina",
      amount: 4200,
      state: { type: "paid", paymentIds: [first.id, last.id], method: null },
    });
  });

  it("ignores canceled orders and removed days", () => {
    const { data, nov01, order } = example();
    order(nov01, "Cancelado", 5, 1200, "cancelado");
    const removed = { ...nov01, id: newId(), date: "2026-11-02", canceledAt: "2026-11-02T00:00:00.000Z" };
    data.days.push(removed);
    order(removed, "Fantasma", 1, 1200);

    const { people, days } = buildPending(data, ALL, TODAY);
    expect(people.map((p) => p.name)).not.toContain("Cancelado");
    expect(people.map((p) => p.name)).not.toContain("Fantasma");
    expect(days.map((d) => d.date)).not.toContain("2026-11-02");
  });

  it("works with no data", () => {
    const empty: PendingData = { days: [], orders: [], items: [], payments: [], products: [], customers: [] };
    expect(buildPending(empty, ALL, TODAY)).toEqual({
      days: [],
      period: "all",
      stats: { outstanding: 0, people: 0, overduePeople: 0 },
      people: [],
    });
  });
});
