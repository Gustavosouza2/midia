import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * Server connection to Supabase's Postgres. Created only on the first call,
 * so routes that reject the request earlier (e.g. 401) do not depend on the database.
 */
export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }

  // Supabase's pooler in transaction mode (port 6543) does not accept prepared statements.
  const client = postgres(url, { prepare: false, max: 5 });
  globalForDb.db = drizzle({ client, schema });
  return globalForDb.db;
}

export { schema };
