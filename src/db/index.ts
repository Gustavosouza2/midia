import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { db?: Db };

/**
 * Conexão de servidor com o Postgres do Supabase. Criada só na primeira chamada,
 * para que rotas que recusam o pedido antes (ex.: 401) não dependam do banco.
 */
export function getDb(): Db {
  if (globalForDb.db) return globalForDb.db;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida. Veja o .env.example.");
  }

  // O pooler do Supabase em modo transação (porta 6543) não aceita prepared statements.
  const client = postgres(url, { prepare: false, max: 5 });
  globalForDb.db = drizzle({ client, schema });
  return globalForDb.db;
}

export { schema };
