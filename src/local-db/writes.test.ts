import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { uuidV5 } from "@/lib/uuid-v5";
import {
  addProduct,
  createDay,
  setOnMenu,
  setDayPrice,
  setDayQuantity,
  dayHasOrders,
  deliverReservation,
  WriteError,
  refundPayment,
  recordPayment,
  placeOrder,
  removeDay,
  type NewOrder,
} from "./writes";
import { CanteenLocalDb } from "./index";

const CANTEEN = "c0000000-0000-4000-8000-000000000001";
let db: CanteenLocalDb;

beforeEach(async () => {
  await Dexie.delete("canteen");
  db = new CanteenLocalDb();
});
afterEach(() => db.close());

async function withCanteen() {
  await db.canteens.put({ id: CANTEEN, name: "Mídia", slug: "midia", updatedAt: "2026-11-01T00:00:00Z", seq: 1 });
}

async function product(name: string, priceCents: number, active = true) {
  const id = crypto.randomUUID();
  await db.products.put({ id, canteenId: CANTEEN, name, priceCents, active, updatedAt: "2026-11-01T00:00:00Z", seq: 1 });
  return id;
}

async function menu(dayId: string) {
  const prices = await db.dayMenuItems.where("dayId").equals(dayId).toArray();
  return Object.fromEntries(prices.filter((p) => p.active).map((p) => [p.productId, p.priceCents]));
}

const outbox = () => db.outbox.orderBy("id").toArray();

async function expectRejection(promise: Promise<unknown>, code: WriteError["code"]) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(WriteError);
  expect((error as WriteError).code).toBe(code);
}

describe("no canteen on the device", () => {
  it("refuses to write and asks to connect once", async () => {
    await expectRejection(createDay(db, { date: "2026-11-15", menu: { type: "default" } }), "no-canteen");
    await expectRejection(addProduct(db, { name: "Espeto", priceCents: 1000 }), "no-canteen");
    expect(await outbox()).toEqual([]);
  });
});

describe("createDay", () => {
  beforeEach(withCanteen);

  it("derives the id from canteen + date and puts the day and menu in the outbox, one row per item", async () => {
    const beef = await product("Carne", 1000);
    const chicken = await product("Frango", 900);
    await product("Antigo", 500, false);

    const dayId = await createDay(db, { date: "2026-11-15", name: "  Culto de jovens ", menu: { type: "default" } });

    expect(dayId).toBe(await uuidV5("2026-11-15", CANTEEN));
    const day = await db.saleDays.get(dayId);
    expect(day).toMatchObject({ date: "2026-11-15", name: "Culto de jovens", canteenId: CANTEEN, canceledAt: null, seq: 0 });
    expect(await menu(dayId)).toEqual({ [beef]: 1000, [chicken]: 900 });

    const queue = await outbox();
    expect(queue.map((i) => [i.table, i.operation])).toEqual([
      ["saleDays", "insert"],
      ["dayMenuItems", "insert"],
      ["dayMenuItems", "insert"],
    ]);
    expect(queue[0].payload).toEqual(day);
    const beefPrice = await db.dayMenuItems.get(await uuidV5(beef, dayId));
    expect(beefPrice?.priceCents).toBe(1000);
  });

  it("copies the items for sale and the prices of the chosen day", async () => {
    const beef = await product("Carne", 1000);
    const chicken = await product("Frango", 900);
    await product("Pão de alho", 600);
    const origin = await createDay(db, { date: "2026-11-08", menu: { type: "default" } });
    await setDayPrice(db, origin, beef, 1200);
    await setOnMenu(db, origin, chicken, true);
    const garlicBread = (await db.products.toArray()).find((p) => p.name === "Pão de alho")!.id;
    await setOnMenu(db, origin, garlicBread, false);

    const created = await createDay(db, { date: "2026-11-15", menu: { type: "copy", dayId: origin } });

    expect(await menu(created)).toEqual({ [beef]: 1200, [chicken]: 900 });
  });

  it("copying carries each item's quantity; with the default prices, the day starts without a limit", async () => {
    const beef = await product("Carne", 1000);
    const origin = await createDay(db, { date: "2026-11-08", menu: { type: "default" } });
    expect((await db.dayMenuItems.get(await uuidV5(beef, origin)))?.quantity).toBeNull();
    await setDayQuantity(db, origin, beef, 50);

    const created = await createDay(db, { date: "2026-11-15", menu: { type: "copy", dayId: origin } });

    expect((await db.dayMenuItems.get(await uuidV5(beef, created)))?.quantity).toBe(50);
  });

  it("refuses a date that already has a day", async () => {
    await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    await expectRejection(createDay(db, { date: "2026-11-15", menu: { type: "default" } }), "day-exists");
  });

  it("creating a removed date again reactivates the same record with the new menu", async () => {
    const beef = await product("Carne", 1000);
    const chicken = await product("Frango", 900);
    const origin = await createDay(db, { date: "2026-11-08", menu: { type: "default" } });
    await setOnMenu(db, origin, chicken, false);

    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    await removeDay(db, dayId);
    expect((await db.saleDays.get(dayId))?.canceledAt).not.toBeNull();

    const reactivated = await createDay(db, { date: "2026-11-15", menu: { type: "copy", dayId: origin } });

    expect(reactivated).toBe(dayId);
    expect(await db.saleDays.count()).toBe(2);
    expect((await db.saleDays.get(dayId))?.canceledAt).toBeNull();
    expect(await menu(dayId)).toEqual({ [beef]: 1000 });
  });
});

describe("removeDay", () => {
  beforeEach(withCanteen);

  it("refuses when the day has orders", async () => {
    const beef = await product("Carne", 1000);
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    expect(await dayHasOrders(db, dayId)).toBe(false);
    await placeOrder(db, order(dayId, beef));

    expect(await dayHasOrders(db, dayId)).toBe(true);
    await expectRejection(removeDay(db, dayId), "day-has-orders");
    expect((await db.saleDays.get(dayId))?.canceledAt).toBeNull();
  });
});

describe("day menu", () => {
  beforeEach(withCanteen);

  it("putting an item without a row on sale uses the default price; changing the price does not change whether it is for sale", async () => {
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    const created = await addProduct(db, { name: "Linguiça", priceCents: 800 });
    await setDayPrice(db, dayId, created, 700);
    expect(await menu(dayId)).toEqual({});

    await setOnMenu(db, dayId, created, true);
    expect(await menu(dayId)).toEqual({ [created]: 700 });
  });

  it("a new item can start on sale on the day, in a single write", async () => {
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    await db.outbox.clear();
    const created = await addProduct(db, { name: "Linguiça", priceCents: 800, forSaleOnDay: dayId });

    expect(await menu(dayId)).toEqual({ [created]: 800 });
    expect((await outbox()).map((i) => i.table)).toEqual(["products", "dayMenuItems"]);
  });

  it("setting the quantity does not put the item on sale; empty goes back to no limit", async () => {
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    const created = await addProduct(db, { name: "Linguiça", priceCents: 800 });
    const row = async () => db.dayMenuItems.get(await uuidV5(created, dayId));

    await setDayQuantity(db, dayId, created, 30);
    expect(await row()).toMatchObject({ active: false, quantity: 30, priceCents: 800 });

    await setOnMenu(db, dayId, created, true);
    await setDayQuantity(db, dayId, created, null);
    expect(await row()).toMatchObject({ active: true, quantity: null });
  });

  it("refuses a negative or fractional quantity", async () => {
    const beef = await product("Carne", 1000);
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    await expectRejection(setDayQuantity(db, dayId, beef, -1), "invalid-value");
    await expectRejection(setDayQuantity(db, dayId, beef, 1.5), "invalid-value");
  });

  it("repeating the same change does not add a new outbox item", async () => {
    const beef = await product("Carne", 1000);
    const dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    const before = (await outbox()).length;

    await setOnMenu(db, dayId, beef, true);
    expect(await outbox()).toHaveLength(before);

    await setOnMenu(db, dayId, beef, false);
    const queue = await outbox();
    expect(queue).toHaveLength(before + 1);
    expect(queue.at(-1)).toMatchObject({ table: "dayMenuItems", operation: "update" });
  });
});

function order(dayId: string, productId: string, change: Partial<NewOrder> = {}): NewOrder {
  return {
    dayId,
    customerName: "Melina",
    type: "sale",
    productId,
    quantity: 3,
    unitPriceCents: 1000,
    payment: "pending",
    ...change,
  };
}

describe("orders and payments", () => {
  let dayId: string;
  let beef: string;
  beforeEach(async () => {
    await withCanteen();
    beef = await product("Carne", 1000);
    dayId = await createDay(db, { date: "2026-11-15", menu: { type: "default" } });
    await db.outbox.clear();
  });

  it("pending sale: delivered order, one item, no payment", async () => {
    const id = await placeOrder(db, order(dayId, beef));

    expect(await db.orders.get(id)).toMatchObject({ status: "entregue", dayId, canteenId: CANTEEN });
    expect((await db.orders.get(id))?.deliveredAt).not.toBeNull();
    expect(await db.orderItems.where("orderId").equals(id).toArray()).toMatchObject([
      { productId: beef, quantity: 3, unitPriceCents: 1000 },
    ]);
    expect(await db.payments.count()).toBe(0);
    expect((await outbox()).map((i) => i.table)).toEqual(["customers", "orders", "orderItems"]);
  });

  it("a Pix sale records the payment of the total with it", async () => {
    const id = await placeOrder(db, order(dayId, beef, { payment: "pix" }));

    expect(await db.payments.where("orderId").equals(id).toArray()).toMatchObject([
      { amountCents: 3000, method: "pix", refundedAt: null },
    ]);
    expect((await outbox()).map((i) => i.table)).toEqual(["customers", "orders", "orderItems", "payments"]);
    const [payment] = await db.payments.toArray();
    expect(payment.recordedAt).toBe((await db.orders.get(id))?.createdAt);
  });

  it("a reservation starts received and is delivered later", async () => {
    const id = await placeOrder(db, order(dayId, beef, { type: "reservation" }));
    expect(await db.orders.get(id)).toMatchObject({ status: "recebido", deliveredAt: null });

    await deliverReservation(db, id);
    expect((await db.orders.get(id))?.status).toBe("entregue");
    expect((await db.orders.get(id))?.deliveredAt).not.toBeNull();
  });

  it("reuses the customer by name, ignoring case and spaces", async () => {
    const a = await placeOrder(db, order(dayId, beef, { customerName: "Melina" }));
    const b = await placeOrder(db, order(dayId, beef, { customerName: "  melina " }));
    const c = await placeOrder(db, order(dayId, beef, { customerName: "Gustavo" }));

    const customerOf = async (id: string) => (await db.orders.get(id))?.customerId;
    expect(await customerOf(b)).toBe(await customerOf(a));
    expect(await customerOf(c)).not.toBe(await customerOf(a));
    expect(await db.customers.count()).toBe(2);
  });

  it("receiving pays only what is outstanding and refuses when there is nothing", async () => {
    const id = await placeOrder(db, order(dayId, beef));
    await db.payments.put({
      id: crypto.randomUUID(),
      orderId: id,
      canteenId: CANTEEN,
      amountCents: 1000,
      method: "dinheiro",
      sellerId: null,
      recordedAt: "2026-11-15T20:00:00Z",
      refundedAt: null,
      updatedAt: "2026-11-15T20:00:00Z",
      seq: 5,
    });

    const paymentId = await recordPayment(db, id, "pix");

    expect(await db.payments.get(paymentId)).toMatchObject({ amountCents: 2000, method: "pix" });
    await expectRejection(recordPayment(db, id, "dinheiro"), "nothing-due");
  });

  it("with a quantity on the day, refuses selling more than what remains and says how much remains", async () => {
    await setDayQuantity(db, dayId, beef, 5);
    await placeOrder(db, order(dayId, beef, { type: "reservation", quantity: 2 }));

    const error = await placeOrder(db, order(dayId, beef, { quantity: 4 })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WriteError);
    expect(error).toMatchObject({ code: "out-of-stock", message: "Só restam 3 de Carne." });

    await placeOrder(db, order(dayId, beef, { quantity: 3 }));
    await expect(placeOrder(db, order(dayId, beef, { quantity: 1 }))).rejects.toMatchObject({
      code: "out-of-stock",
      message: "Carne esgotou.",
    });
    expect(await db.orders.count()).toBe(2);
  });

  it("a canceled order gives the quantity back to the day", async () => {
    await setDayQuantity(db, dayId, beef, 3);
    const id = await placeOrder(db, order(dayId, beef, { quantity: 3 }));
    await db.orders.update(id, { status: "cancelado" });

    await placeOrder(db, order(dayId, beef, { quantity: 3 }));
  });

  it("undo refunds the payment and the order is outstanding again", async () => {
    const id = await placeOrder(db, order(dayId, beef, { payment: "dinheiro" }));
    const [paid] = await db.payments.where("orderId").equals(id).toArray();

    await refundPayment(db, paid.id);

    expect((await db.payments.get(paid.id))?.refundedAt).not.toBeNull();
    expect((await outbox()).at(-1)).toMatchObject({ table: "payments", recordId: paid.id, operation: "update" });
    expect(await db.payments.get(await recordPayment(db, id, "pix"))).toMatchObject({ amountCents: 3000 });
  });
});
