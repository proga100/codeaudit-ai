import type { Config } from "drizzle-kit";

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required for Drizzle Kit commands");
}

export default {
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"],
  },
  verbose: true,
  strict: true,
} satisfies Config;
