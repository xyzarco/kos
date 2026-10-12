import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/**/*.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
