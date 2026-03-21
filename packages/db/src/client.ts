import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Create a Drizzle ORM client using Neon's serverless HTTP adapter.
 * Use this in Next.js Route Handlers and Server Components.
 *
 * For the worker process, use createDbClientWebSocket() instead.
 */
export function createDbClient(connectionString: string) {
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

/**
 * Singleton database client for use in Next.js.
 * Reads DATABASE_URL from environment.
 */
let _db: DbClient | null = null;

export function getDb(): DbClient {
  if (!_db) {
    const url = process.env["DATABASE_URL"];
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is not set. " +
          "Set it to your Neon database connection string.",
      );
    }
    _db = createDbClient(url);
  }
  return _db;
}

// Re-export schema for convenience
export { schema };
