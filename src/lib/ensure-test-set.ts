import { GARDEN_TEST_SLUG, STUDIO_NEIGHBORS_SLUG } from "./seed-data";
import { ensureSchema } from "./ensure-schema";
import { seedTestSets } from "./seed";
import { getSetBySlug } from "./sets";

const TEST_SLUGS = new Set([GARDEN_TEST_SLUG, STUDIO_NEIGHBORS_SLUG]);

export async function ensureTestSets() {
  const existing = await getSetBySlug(GARDEN_TEST_SLUG);
  if (existing) return;
  await ensureSchema();
  await seedTestSets();
}

export async function ensureTestSet(slug: string) {
  if (!TEST_SLUGS.has(slug)) return getSetBySlug(slug);
  const existing = await getSetBySlug(slug);
  if (existing) return existing;
  await ensureTestSets();
  return getSetBySlug(slug);
}
