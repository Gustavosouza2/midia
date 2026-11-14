import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { CanteenLocalDb } from "./index";

describe("local database", () => {
  it("keeps outbox items in arrival order", async () => {
    const db = new CanteenLocalDb();
    const now = new Date().toISOString();

    await db.outbox.add({
      table: "orders",
      recordId: crypto.randomUUID(),
      operation: "insert",
      payload: { status: "recebido" },
      createdAt: now,
    });
    await db.outbox.add({
      table: "payments",
      recordId: crypto.randomUUID(),
      operation: "insert",
      payload: { amountCents: 1200 },
      createdAt: now,
    });

    const queue = await db.outbox.orderBy("id").toArray();
    expect(queue.map((item) => item.table)).toEqual(["orders", "payments"]);
    db.close();
  });

  it("finds a day's menu in dayMenuItems", async () => {
    const db = new CanteenLocalDb();
    const canteenId = crypto.randomUUID();
    const [day, otherDay] = [crypto.randomUUID(), crypto.randomUUID()];
    const price = (dayId: string, priceCents: number) => ({
      id: crypto.randomUUID(),
      canteenId,
      dayId,
      productId: crypto.randomUUID(),
      priceCents,
      active: true,
      quantity: null,
      updatedAt: new Date().toISOString(),
      seq: 1,
    });

    await db.dayMenuItems.bulkAdd([price(day, 1200), price(day, 600), price(otherDay, 1000)]);

    const menu = await db.dayMenuItems.where("dayId").equals(day).toArray();
    expect(menu.map((p) => p.priceCents).sort()).toEqual([1200, 600].sort());
    db.close();
  });
});
