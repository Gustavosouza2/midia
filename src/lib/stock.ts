import type { OrderItem, Order, DayMenuItem } from "@/local-db";

export type Stock = {
  /** Units the day has to sell. Null = no limit. */
  quantity: number | null;
  /** Non-canceled items of the day's non-canceled orders, reservations included. */
  soldUnits: number;
  /** Null when there is no limit. Never negative, even if the quantity was lowered after the sales. */
  remaining: number | null;
  soldOut: boolean;
};

/**
 * Stock of each item on a sale day. Used by the writes (refusing a sale above what remains)
 * and by the screens, so both count the same way.
 */
export function dayStock(
  data: { dayMenuItems: DayMenuItem[]; orders: Order[]; items: OrderItem[] },
  dayId: string,
): (productId: string) => Stock {
  const quantityByProduct = new Map(
    data.dayMenuItems.filter((p) => p.dayId === dayId).map((p) => [p.productId, p.quantity ?? null]),
  );
  const dayOrders = new Set(
    data.orders.filter((p) => p.dayId === dayId && p.status !== "cancelado").map((p) => p.id),
  );
  const soldByProduct = new Map<string, number>();
  for (const i of data.items) {
    if (i.canceledAt || !dayOrders.has(i.orderId)) continue;
    soldByProduct.set(i.productId, (soldByProduct.get(i.productId) ?? 0) + i.quantity);
  }

  return (productId) => {
    const quantity = quantityByProduct.get(productId) ?? null;
    const soldUnits = soldByProduct.get(productId) ?? 0;
    const remaining = quantity === null ? null : Math.max(0, quantity - soldUnits);
    return { quantity, soldUnits, remaining, soldOut: remaining === 0 };
  };
}
