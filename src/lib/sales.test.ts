import { describe, expect, it } from "vitest";
import type { Customer, OrderItem, Payment, Order, DayMenuItem, Product } from "@/local-db";
import { buildSales, paidLabel, type SalesData } from "./sales";

const CANTEEN = "c0000000-0000-4000-8000-000000000000";
const DAY = "d0000000-0000-4000-8000-000000000001";
const OTHER_DAY = "d0000000-0000-4000-8000-000000000002";
const sync = { updatedAt: "2026-11-01T00:00:00.000Z", seq: 1 };
let badgeCount = 0;
const newId = () => `00000000-0000-4000-8000-${String(++badgeCount).padStart(12, "0")}`;

/** The device's local time in ISO, so the tests do not depend on the time zone. */
const at = (time: number, minute: number, day = 1) => new Date(2026, 10, day, time, minute).toISOString();

function fixtures() {
  const data: SalesData = { orders: [], items: [], payments: [], products: [], customers: [], dayMenuItems: [] };

  const product = (name: string, price: number, active = true): Product => {
    const p: Product = { id: newId(), canteenId: CANTEEN, name, priceCents: price, active, ...sync };
    data.products.push(p);
    return p;
  };
  const onMenu = (p: Product, price: number, active = true, dayId = DAY, quantity: number | null = null) => {
    const row: DayMenuItem = {
      id: newId(),
      canteenId: CANTEEN,
      dayId,
      productId: p.id,
      priceCents: price,
      active,
      quantity,
      ...sync,
    };
    data.dayMenuItems.push(row);
  };
  const pay = (orderId: string, amount: number, method: "pix" | "dinheiro" = "pix", refunded = false) => {
    const pg: Payment = {
      id: newId(),
      orderId,
      canteenId: CANTEEN,
      amountCents: amount,
      method,
      sellerId: null,
      recordedAt: sync.updatedAt,
      refundedAt: refunded ? sync.updatedAt : null,
      ...sync,
    };
    data.payments.push(pg);
    return pg;
  };
  const order = (
    name: string | null,
    items: [Product, number, number][],
    options: { reservation?: boolean; createdAt?: string; dayId?: string; canceled?: boolean } = {},
  ): Order => {
    let customerId: string | null = null;
    if (name) {
      const customer: Customer = { id: newId(), canteenId: CANTEEN, name, phone: null, ...sync };
      data.customers.push(customer);
      customerId = customer.id;
    }
    const p: Order = {
      id: newId(),
      canteenId: CANTEEN,
      dayId: options.dayId ?? DAY,
      customerId,
      origin: "balcao",
      status: options.canceled ? "cancelado" : options.reservation ? "recebido" : "entregue",
      sellerId: null,
      createdAt: options.createdAt ?? at(20, 0),
      deliveredAt: null,
      ...sync,
    };
    data.orders.push(p);
    for (const [prod, qty, price] of items) {
      const item: OrderItem = {
        id: newId(),
        orderId: p.id,
        canteenId: CANTEEN,
        productId: prod.id,
        quantity: qty,
        unitPriceCents: price,
        canceledAt: null,
        ...sync,
      };
      data.items.push(item);
    }
    return p;
  };
  return { data, product, onMenu, order, pay };
}

describe("buildSales", () => {
  it("derives the status: paid, pending (including partial or refunded) and reserved", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    const paid = b.order("Ana", [[skewer, 2, 1200]]);
    b.pay(paid.id, 2400, "dinheiro");
    const partial = b.order("Bia", [[skewer, 2, 1200]]);
    b.pay(partial.id, 1000);
    const refunded = b.order("Caio", [[skewer, 1, 1200]]);
    b.pay(refunded.id, 1200, "pix", true);
    const reservation = b.order("Davi", [[skewer, 3, 1200]], { reservation: true });
    b.pay(reservation.id, 3600);

    const byId = new Map(buildSales(b.data, DAY).orders.map((p) => [p.id, p]));

    expect(byId.get(paid.id)).toMatchObject({ status: "paid", due: 0, methods: ["dinheiro"] });
    expect(byId.get(partial.id)).toMatchObject({ status: "pending", due: 1400, methods: ["pix"] });
    expect(byId.get(refunded.id)).toMatchObject({ status: "pending", due: 1200, methods: [], activePayments: [] });
    expect(byId.get(reservation.id)).toMatchObject({ status: "reserved", due: 0 });
  });

  it("sums the day's stats without counting reservations as sold", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    const paid = b.order("Ana", [[skewer, 2, 1200]]);
    b.pay(paid.id, 2400);
    b.order("Bia", [[skewer, 1, 1000]]);
    // A payment larger than the order does not increase the received amount.
    const extra = b.order("Caio", [[skewer, 1, 1200]]);
    b.pay(extra.id, 5000);
    b.order("Davi", [[skewer, 3, 1200]], { reservation: true });
    b.order("Eva", [[skewer, 9, 1200]], { dayId: OTHER_DAY });
    b.order("Fábio", [[skewer, 9, 1200]], { canceled: true });

    const { stats, dayTotal } = buildSales(b.data, DAY);

    expect(stats).toEqual({
      items: 4,
      sold: 4600,
      received: 3600,
      pending: 1000,
      pendingOrders: 1,
      reservations: 1,
      reservedItems: 3,
      reservationsAmount: 3600,
    });
    expect(dayTotal).toBe(4);
  });

  it("describes the order with name, items by name, unit price and local time", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    const soda = b.product("Refri", 600);
    const one = b.order("Ana", [[skewer, 2, 1100]], { createdAt: at(20, 5) });
    const two = b.order(null, [[soda, 2, 600], [skewer, 1, 1200]], { createdAt: at(9, 30) });
    const reservation = b.order("Bia", [[skewer, 1, 1200]], { reservation: true, createdAt: at(10, 0, 8) });

    const byId = new Map(buildSales(b.data, DAY).orders.map((p) => [p.id, p]));

    expect(byId.get(one.id)).toMatchObject({
      name: "Ana",
      description: "2× Espeto",
      amount: 2200,
      unitPrice: 1100,
      time: "20:05",
    });
    expect(byId.get(two.id)).toMatchObject({
      name: "Sem nome",
      description: "1× Espeto, 2× Refri",
      amount: 2400,
      unitPrice: null,
      time: "09:30",
    });
    expect(byId.get(reservation.id)?.time).toBe("reservou 08 nov");
  });

  it("sorts newest first", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    b.order("Primeiro", [[skewer, 1, 1200]], { createdAt: at(18, 0) });
    b.order("Terceiro", [[skewer, 1, 1200]], { createdAt: at(21, 0) });
    b.order("Segundo", [[skewer, 1, 1200]], { createdAt: at(19, 0) });

    expect(buildSales(b.data, DAY).orders.map((p) => p.name)).toEqual(["Terceiro", "Segundo", "Primeiro"]);
  });

  it("searches by name ignoring case and accents, and filters by status", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    const paid = b.order("Júlia", [[skewer, 1, 1200]]);
    b.pay(paid.id, 1200);
    b.order("Julio", [[skewer, 1, 1200]]);
    b.order("Ana", [[skewer, 1, 1200]], { reservation: true });

    const names = (search: string, filter?: "all" | "reserved" | "pending" | "paid") =>
      buildSales(b.data, DAY, { search, filter }).orders.map((p) => p.name).sort();

    expect(names("JULI")).toEqual(["Julio", "Júlia"]);
    expect(names(" júl ")).toEqual(["Julio", "Júlia"]);
    expect(names("", "paid")).toEqual(["Júlia"]);
    expect(names("", "pending")).toEqual(["Julio"]);
    expect(names("", "reserved")).toEqual(["Ana"]);
    expect(names("ana", "paid")).toEqual([]);
  });

  it("counts the orders under each filter, with the search applied", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1000);
    const partial = b.order("Ana", [[skewer, 2, 1000]]);
    b.pay(partial.id, 500);
    const paid = b.order("Bia", [[skewer, 1, 1000]]);
    b.pay(paid.id, 1000);
    b.order("Caio", [[skewer, 3, 1000]], { reservation: true });

    expect(buildSales(b.data, DAY, { filter: "paid" }).counts).toEqual({ all: 3, reserved: 1, pending: 1, paid: 1 });
    expect(buildSales(b.data, DAY, { search: "bia" }).counts).toEqual({ all: 1, reserved: 0, pending: 0, paid: 1 });
  });

  it("the day's menu has only items for sale, at the day price, by name", () => {
    const b = fixtures();
    const soda = b.product("Refri", 600);
    const skewer = b.product("Espeto", 1200);
    const offMenu = b.product("Pastel", 800);
    const inactive = b.product("Suco", 500, false);
    b.onMenu(soda, 700);
    b.onMenu(skewer, 1000);
    b.onMenu(offMenu, 800, false);
    b.onMenu(inactive, 500);
    b.onMenu(offMenu, 800, true, OTHER_DAY);

    expect(buildSales(b.data, DAY).menu).toEqual([
      { productId: skewer.id, name: "Espeto", priceCents: 1000, remaining: null },
      { productId: soda.id, name: "Refri", priceCents: 700, remaining: null },
    ]);
  });

  it("each menu item says how much remains on the day, deducting sales and reservations", () => {
    const b = fixtures();
    const skewer = b.product("Espeto", 1200);
    const soda = b.product("Refri", 600);
    b.onMenu(skewer, 1200, true, DAY, 5);
    b.onMenu(soda, 600, true, DAY, 2);
    b.order("Ana", [[skewer, 2, 1200]]);
    b.order("Bia", [[skewer, 1, 1200]], { reservation: true });
    b.order("Caio", [[soda, 2, 600]]);

    expect(buildSales(b.data, DAY).menu.map((i) => [i.name, i.remaining])).toEqual([
      ["Espeto", 2],
      ["Refri", 0],
    ]);
  });
});

it("paidLabel shows the method", () => {
  expect(paidLabel(["pix"])).toBe("Pago · Pix");
  expect(paidLabel(["pix", "dinheiro"])).toBe("Pago · Pix + Dinheiro");
  expect(paidLabel([])).toBe("Pago");
});
