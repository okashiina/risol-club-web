import type { Config } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.warn("drizzle.config.ts loaded without DATABASE_URL. DB commands will need the env set.");
}

export default {
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
} satisfies Config;
