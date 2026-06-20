import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // DIRECT_URL is only needed for migrations (bypasses PgBouncer).
  // prisma generate doesn't connect to the DB, so we skip this override
  // when the variable isn't set (e.g. during Vercel's postinstall step).
  ...(process.env.DIRECT_URL
    ? { datasource: { url: process.env.DIRECT_URL } }
    : {}),
});
