import { localToday } from "@/lib/format";
import type { CanteenLocalDb } from "./index";

/**
 * Everything the screens read from the local database, plus today's date. The device only stores
 * its own canteen's data, so the read does not filter by cantina_id.
 */
export async function readLocalDb(db: CanteenLocalDb) {
  const [days, orders, items, payments, products, customers, dayMenuItems] = await Promise.all([
    db.saleDays.toArray(),
    db.orders.toArray(),
    db.orderItems.toArray(),
    db.payments.toArray(),
    db.products.toArray(),
    db.customers.toArray(),
    db.dayMenuItems.toArray(),
  ]);
  return { days, orders, items, payments, products, customers, dayMenuItems, today: localToday() };
}

export type LocalData = Awaited<ReturnType<typeof readLocalDb>>;
