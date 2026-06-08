import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Use DIRECT_URL for migrations (bypasses PgBouncer)
    url: env("DIRECT_URL"),
  },
});
