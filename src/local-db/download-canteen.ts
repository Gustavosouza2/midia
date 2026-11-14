import type { Canteen, CanteenLocalDb } from "./index";

/**
 * Brings the canteen from the server to the device. Local writes need it (cantina_id).
 * It is server data, so it does not go through the outbox. With no network or no valid response, it does nothing.
 */
export async function downloadCanteen(db: CanteenLocalDb): Promise<void> {
  try {
    const response = await fetch("/api/canteen");
    if (!response.ok) return;
    const { canteen } = (await response.json()) as { canteen?: Canteen };
    if (typeof canteen?.id !== "string") return;
    await db.canteens.put(canteen);
  } catch {
    // Offline or server down: tries again the next time the app opens.
  }
}
