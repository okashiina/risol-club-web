import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "@/db/schema";

const globalForDb = globalThis as typeof globalThis & {
  __risolSqlClient?: Sql;
  __risolDb?: ReturnType<typeof createDb>;
};

function createSqlClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 5 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

function createDb(client: Sql) {
  return drizzle(client, { schema });
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getDb() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  if (!globalForDb.__risolSqlClient) {
    globalForDb.__risolSqlClient = createSqlClient();
  }

  if (!globalForDb.__risolDb) {
    globalForDb.__risolDb = createDb(globalForDb.__risolSqlClient);
  }

  return globalForDb.__risolDb;
}
