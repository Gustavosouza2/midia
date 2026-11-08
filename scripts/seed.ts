/**
 * Seed inicial: cantina "Mídia" e dois produtos de exemplo.
 * Idempotente: usa IDs fixos e não sobrescreve o que já existe.
 *
 *   npm run db:seed
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cantinas, produtos } from "../src/db/schema";

config({ path: [".env.local", ".env"], quiet: true });

export const CANTINA_MIDIA_ID = "6d1a4f0e-1c55-4a77-9a7b-2f6a1d3c0b01";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não está definida.");

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle({ client });

  await db
    .insert(cantinas)
    .values({ id: CANTINA_MIDIA_ID, nome: "Mídia", slug: "midia" })
    .onConflictDoNothing();

  await db
    .insert(produtos)
    .values([
      {
        id: "b3c2e5a1-7f0d-4e2b-8c61-4a9e0d2f1a01",
        cantinaId: CANTINA_MIDIA_ID,
        nome: "Espeto de carne",
        precoCentavos: 1200,
      },
      {
        id: "b3c2e5a1-7f0d-4e2b-8c61-4a9e0d2f1a02",
        cantinaId: CANTINA_MIDIA_ID,
        nome: "Refrigerante lata",
        precoCentavos: 600,
      },
    ])
    .onConflictDoNothing();

  await client.end();
  console.log("Seed aplicado: cantina Mídia com 2 produtos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
