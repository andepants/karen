import { DEFAULT_SET_SLUG } from "./seed-data";
import { ensureSchema } from "./ensure-schema";
import { ensureSeededSets } from "./seed";
import { getSetBySlug } from "./sets";

export async function ensureTestSets() {
  await ensureSchema();
  await ensureSeededSets();
}

export async function ensureDefaultSet() {
  await ensureTestSets();
  return getSetBySlug(DEFAULT_SET_SLUG);
}

export async function ensureTestSet(slug: string) {
  await ensureTestSets();
  return getSetBySlug(slug);
}
