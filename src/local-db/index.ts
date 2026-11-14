import Dexie, { type EntityTable } from "dexie";
import type {
  canteens,
  customers,
  saleDays,
  orderItems,
  payments,
  orders,
  dayMenuItems,
  products,
  sellers,
} from "@/db/schema";

/**
 * The device's local database (IndexedDB). In the future, the UI reads and writes only here,
 * and the `outbox` queue takes the changes to the API. For now it is only the schema:
 * sync does not exist yet.
 *
 * Records mirror the server rows as they arrive from the API (JSON),
 * so dates are ISO strings instead of Date.
 */
type AsJson<T> = {
  [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K];
};

export type Canteen = AsJson<typeof canteens.$inferSelect>;
export type Seller = AsJson<typeof sellers.$inferSelect>;
export type Customer = AsJson<typeof customers.$inferSelect>;
export type Product = AsJson<typeof products.$inferSelect>;
export type SaleDay = AsJson<typeof saleDays.$inferSelect>;
export type DayMenuItem = AsJson<typeof dayMenuItems.$inferSelect>;
export type Order = AsJson<typeof orders.$inferSelect>;
export type OrderItem = AsJson<typeof orderItems.$inferSelect>;
export type Payment = AsJson<typeof payments.$inferSelect>;

export type SyncedTable =
  | "canteens"
  | "sellers"
  | "customers"
  | "products"
  | "saleDays"
  | "dayMenuItems"
  | "orders"
  | "orderItems"
  | "payments";

/** A local change waiting to go to the server. No deletes: only insert or update. */
export type OutboxItem = {
  id: number;
  table: SyncedTable;
  recordId: string;
  operation: "insert" | "update";
  payload: Record<string, unknown>;
  createdAt: string;
};

export class CanteenLocalDb extends Dexie {
  canteens!: EntityTable<Canteen, "id">;
  sellers!: EntityTable<Seller, "id">;
  customers!: EntityTable<Customer, "id">;
  products!: EntityTable<Product, "id">;
  saleDays!: EntityTable<SaleDay, "id">;
  dayMenuItems!: EntityTable<DayMenuItem, "id">;
  orders!: EntityTable<Order, "id">;
  orderItems!: EntityTable<OrderItem, "id">;
  payments!: EntityTable<Payment, "id">;
  /** Outgoing queue in arrival order (autoincrement id). */
  outbox!: EntityTable<OutboxItem, "id">;

  constructor() {
    super("canteen");
    // Only fields used in lookups become indexes. Never edit a published version:
    // to change the schema, add this.version(2) with the changes.
    this.version(1).stores({
      canteens: "id, slug, seq",
      sellers: "id, canteenId, seq",
      customers: "id, canteenId, name, seq",
      products: "id, canteenId, seq",
      saleDays: "id, canteenId, date, seq",
      dayMenuItems: "id, canteenId, dayId, productId, seq",
      orders: "id, canteenId, dayId, customerId, status, seq",
      orderItems: "id, orderId, canteenId, productId, seq",
      payments: "id, orderId, canteenId, seq",
      outbox: "++id, table, recordId, createdAt",
    });
  }
}

let instance: CanteenLocalDb | null = null;

/** Opens the local database. Only works in the browser. */
export function getLocalDb(): CanteenLocalDb {
  if (typeof indexedDB === "undefined") {
    throw new Error("O banco local só está disponível no navegador.");
  }
  instance ??= new CanteenLocalDb();
  return instance;
}
