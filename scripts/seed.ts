/**
 * Initial seed: the "Mídia" canteen and two sample products.
 * Idempotent: uses fixed IDs and does not overwrite what already exists.
 *
 *   npm run db:seed
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { canteens, products } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

export const MEDIA_CANTEEN_ID = "6d1a4f0e-1c55-4a77-9a7b-2f6a1d3c0b01";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle({ client });

  await db
    .insert(canteens)
    .values({ id: MEDIA_CANTEEN_ID, name: "Mídia", slug: "midia" })
    .onConflictDoNothing();

  await db
    .insert(products)
    .values([
      {
        id: "b3c2e5a1-7f0d-4e2b-8c61-4a9e0d2f1a01",
        canteenId: MEDIA_CANTEEN_ID,
        name: "Espeto de carne",
        priceCents: 1200,
      },
      {
        id: "b3c2e5a1-7f0d-4e2b-8c61-4a9e0d2f1a02",
        canteenId: MEDIA_CANTEEN_ID,
        name: "Refrigerante lata",
        priceCents: 600,
      },
    ])
    .onConflictDoNothing();

  await client.end();
  console.log("Seed applied: Mídia canteen with 2 products.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
