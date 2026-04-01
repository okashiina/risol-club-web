import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { StoreData } from "@/lib/types";

export const appState = pgTable("app_state", {
  id: text("id").primaryKey(),
  payload: jsonb("payload").$type<StoreData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
