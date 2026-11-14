import { buildDashboard } from "@/lib/dashboard";
import type { CanteenLocalDb } from "./index";
import { readLocalDb } from "./read-local-db";

/** Menu badge count: orders with an outstanding amount, across all days. */
export async function countPending(db: CanteenLocalDb): Promise<number> {
  const data = await readLocalDb(db);
  return buildDashboard(data, "all", data.today).pending.length;
}
