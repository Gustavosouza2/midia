import { describe, expect, it } from "vitest";
import type { OrderItem, Order, DayMenuItem } from "@/local-db";
import { dayStock } from "./stock";

const CANTEEN = "c0000000-0000-4000-8000-000000000000";
const DAY = "d1";
const OTHER_DAY = "d2";
const sync = { updatedAt: "2026-11-01T00:00:00.000Z", seq: 1 };

const price = (dayId: string, productId: string, quantity: number | null): DayMenuItem => ({
  id: `${dayId}-${productId}`,
  canteenId: CANTEEN,
  dayId,
  productId,
  priceCents: 1200,
  active: true,
  quantity,
  ...sync,
});

const order = (id: string, dayId: string, status: Order["status"]): Order => ({
  id,
  canteenId: CANTEEN,
  dayId,
  customerId: null,
  origin: "balcao",
  status,
  sellerId: null,
  createdAt: "2026-11-01T20:00:00.000Z",
  deliveredAt: null,
  ...sync,
});

const item = (orderId: string, productId: string, quantity: number, canceledAt: string | null = null): OrderItem => ({
  id: `${orderId}-${productId}-${quantity}`,
  orderId,
  canteenId: CANTEEN,
  productId,
  quantity,
  unitPriceCents: 1200,
  canceledAt,
  ...sync,
});

describe("dayStock", () => {
  it("deducts the day's sales and reservations, without canceled orders or items", () => {
    const stock = dayStock(
      {
        dayMenuItems: [price(DAY, "espeto", 10)],
        orders: [
          order("sale", DAY, "entregue"),
          order("reservation", DAY, "recebido"),
          order("cancelado", DAY, "cancelado"),
          order("outro", OTHER_DAY, "entregue"),
        ],
        items: [
          item("sale", "espeto", 3),
          item("reservation", "espeto", 2),
          item("sale", "espeto", 4, "2026-11-01T21:00:00.000Z"),
          item("cancelado", "espeto", 5),
          item("outro", "espeto", 5),
        ],
      },
      DAY,
    );
    expect(stock("espeto")).toEqual({ quantity: 10, soldUnits: 5, remaining: 5, soldOut: false });
  });

  it("without a quantity on the day, there is no limit", () => {
    const stock = dayStock(
      { dayMenuItems: [price(DAY, "espeto", null)], orders: [order("p", DAY, "entregue")], items: [item("p", "espeto", 7)] },
      DAY,
    );
    expect(stock("espeto")).toEqual({ quantity: null, soldUnits: 7, remaining: null, soldOut: false });
    expect(stock("sem-linha")).toEqual({ quantity: null, soldUnits: 0, remaining: null, soldOut: false });
  });

  it("sells out at zero and does not go negative if the quantity is lowered after the sales", () => {
    const data = { orders: [order("p", DAY, "entregue")], items: [item("p", "espeto", 4)] };
    expect(dayStock({ ...data, dayMenuItems: [price(DAY, "espeto", 4)] }, DAY)("espeto")).toMatchObject({
      remaining: 0,
      soldOut: true,
    });
    expect(dayStock({ ...data, dayMenuItems: [price(DAY, "espeto", 2)] }, DAY)("espeto")).toMatchObject({
      remaining: 0,
      soldOut: true,
    });
  });

  it("a row saved before the column existed (without the field) counts as no limit", () => {
    const old = { ...price(DAY, "espeto", null) } as Partial<DayMenuItem>;
    delete old.quantity;
    const stock = dayStock({ dayMenuItems: [old as DayMenuItem], orders: [], items: [] }, DAY);
    expect(stock("espeto").quantity).toBeNull();
  });
});
