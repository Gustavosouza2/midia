import type { Page } from "@playwright/test";

/** Local date "YYYY-MM-DD" shifted by `days` from today. */
export function date(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11-01" → "01 nov", as in the day tabs. */
export const label = (when: string) => `${when.slice(8)} ${MONTHS[Number(when.slice(5, 7)) - 1]}`;

/** Fixed UUID from a number, for the test data. */
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const CANTEEN_ID = "c0000000-0000-4000-8000-000000000001";
const base = () => ({ canteenId: CANTEEN_ID, updatedAt: new Date().toISOString(), seq: 1 });

/** Local database row builders, with the required fields filled in. */
export const row = {
  canteen: () => ({ id: CANTEEN_ID, name: "Mídia", slug: "midia", updatedAt: new Date().toISOString(), seq: 1 }),
  product: (n: number, name: string, priceCents: number, active = true) => ({
    ...base(), id: id(n), name, priceCents, active,
  }),
  day: (n: number, when: string, name: string | null = null) => ({
    ...base(), id: id(n), date: when, name, closedAt: null, canceledAt: null,
  }),
  dayMenuItem: (
    n: number, dayId: string, productId: string, priceCents: number, active = true, quantity: number | null = null,
  ) => ({
    ...base(), id: id(n), dayId, productId, priceCents, active, quantity,
  }),
  customer: (n: number, name: string) => ({ ...base(), id: id(n), name, phone: null }),
  order: (n: number, dayId: string, customerId: string | null, status: "recebido" | "entregue") => ({
    ...base(), id: id(n), dayId, customerId, origin: "balcao", status, sellerId: null,
    createdAt: new Date().toISOString(), deliveredAt: status === "entregue" ? new Date().toISOString() : null,
  }),
  item: (n: number, orderId: string, productId: string, quantity: number, unitPriceCents: number) => ({
    ...base(), id: id(n), orderId, productId, quantity, unitPriceCents, canceledAt: null,
  }),
  payment: (n: number, orderId: string, amountCents: number, method: "pix" | "dinheiro" = "pix") => ({
    ...base(), id: id(n), orderId, amountCents, method, sellerId: null,
    recordedAt: new Date().toISOString(), refundedAt: null,
  }),
};

async function waitForLocalDb(page: Page) {
  // The database only exists after the app has opened once (Dexie creates the stores).
  await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === "canteen"));
}

/** Writes rows straight into the app's IndexedDB (the "canteen" database created by Dexie). */
export async function writeLocalDb(page: Page, rows: Record<string, object[]>) {
  await waitForLocalDb(page);
  await page.evaluate(async (rows) => {
    const db = await new Promise<IDBDatabase>((ok, error) => {
      const order = indexedDB.open("canteen");
      order.onsuccess = () => ok(order.result);
      order.onerror = () => error(order.error);
    });
    const tx = db.transaction(Object.keys(rows), "readwrite");
    for (const [table, records] of Object.entries(rows)) {
      for (const record of records) tx.objectStore(table).put(record);
    }
    await new Promise((ok, error) => {
      tx.oncomplete = ok;
      tx.onerror = () => error(tx.error);
    });
    db.close();
  }, rows);
}

/** Reads every row of a table from the app's IndexedDB. */
export async function readTable<T = Record<string, unknown>>(page: Page, table: string): Promise<T[]> {
  await waitForLocalDb(page);
  return page.evaluate(async (table) => {
    const db = await new Promise<IDBDatabase>((ok, error) => {
      const order = indexedDB.open("canteen");
      order.onsuccess = () => ok(order.result);
      order.onerror = () => error(order.error);
    });
    const rows = await new Promise<unknown[]>((ok, error) => {
      const order = db.transaction(table).objectStore(table).getAll();
      order.onsuccess = () => ok(order.result);
      order.onerror = () => error(order.error);
    });
    db.close();
    return rows;
  }, table) as Promise<T[]>;
}
