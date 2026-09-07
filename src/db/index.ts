import { neon } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon(neon(url), { schema });
  }
  return drizzlePglite({ client: new PGlite(), schema });
}

let cached: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!cached) {
    cached = createDb();
  }
  return cached;
}
