import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sets } from "@/db/schema";

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "set";
}

export async function getSetBySlug(slug: string) {
  const db = getDb();
  const [row] = await db.select().from(sets).where(eq(sets.slug, slug)).limit(1);
  return row ?? null;
}

export async function uniqueSlug(base: string) {
  const db = getDb();
  const root = slugify(base);
  let slug = root;
  let n = 2;
  while (true) {
    const [existing] = await db
      .select({ id: sets.id })
      .from(sets)
      .where(eq(sets.slug, slug))
      .limit(1);
    if (!existing) return slug;
    slug = `${root}-${n}`;
    n += 1;
  }
}
