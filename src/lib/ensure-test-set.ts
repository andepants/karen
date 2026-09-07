import { DEFAULT_SET_SLUG } from "./seed-data";
import { ensureSchema } from "./ensure-schema";
import { seedTestSets } from "./seed";
import { getSetBySlug } from "./sets";

export async function ensureTestSets() {
  await ensureSchema();
  await seedTestSets();
}

export async function ensureDefaultSet() {
  await ensureTestSets();
  return getSetBySlug(DEFAULT_SET_SLUG);
}

export async function ensureTestSet(slug: string) {
  await ensureTestSets();
  return getSetBySlug(slug);
}
