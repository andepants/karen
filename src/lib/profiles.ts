import { and, asc, eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db";
import { cards, people, profiles } from "@/db/schema";
import { cardInsertValues } from "./fsrs";
import {
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_SLUG,
  NUMBERED_PROFILE_MAX,
  PATHNAME_HEADER,
  PROFILE_COOKIE,
  PROFILE_HEADER,
  isNumberedProfileSlug,
  profileSlugFromPathname,
  isValidProfileSlug,
  slugFromName,
} from "./profile-path";
import { DEFAULT_SESSION } from "./session-limits";

export type ProfileRow = typeof profiles.$inferSelect;

export {
  DEFAULT_PROFILE_NAME,
  DEFAULT_PROFILE_SLUG,
  NUMBERED_PROFILE_MAX,
  isValidProfileSlug,
  profileHref,
  profileSlugFromPathname,
  replaceProfileInPath,
} from "./profile-path";

async function prunePresetProfiles() {
  const db = getDb();
  const rows = await db.select({ id: profiles.id, slug: profiles.slug }).from(profiles);
  const extras = rows.filter(
    (row) =>
      row.slug !== DEFAULT_PROFILE_SLUG &&
      (isNumberedProfileSlug(row.slug) ||
        row.slug === "pat" ||
        row.slug === "not-pat"),
  );
  for (const row of extras) {
    await db.delete(profiles).where(eq(profiles.id, row.id));
  }
}

export async function ensureBuiltinProfiles() {
  const db = getDb();
  await db
    .insert(profiles)
    .values({ slug: DEFAULT_PROFILE_SLUG, name: DEFAULT_PROFILE_NAME })
    .onConflictDoNothing({ target: profiles.slug });
  await prunePresetProfiles();
}

export async function listProfiles() {
  await ensureBuiltinProfiles();
  const db = getDb();
  const rows = await db.select().from(profiles).orderBy(asc(profiles.createdAt));
  return rows.sort(compareProfiles);
}

function compareProfiles(left: ProfileRow, right: ProfileRow) {
  if (left.slug === DEFAULT_PROFILE_SLUG) return -1;
  if (right.slug === DEFAULT_PROFILE_SLUG) return 1;
  const leftNumber = isNumberedProfileSlug(left.slug) ? Number(left.slug) : null;
  const rightNumber = isNumberedProfileSlug(right.slug) ? Number(right.slug) : null;
  if (leftNumber != null && rightNumber != null) return leftNumber - rightNumber;
  if (leftNumber != null) return -1;
  if (rightNumber != null) return 1;
  return left.name.localeCompare(right.name);
}

export async function readRequestedProfileSlug() {
  const headerStore = await headers();
  const fromPath = profileSlugFromPathname(
    headerStore.get(PATHNAME_HEADER) || headerStore.get("x-url") || "",
  );
  if (fromPath) return fromPath;
  const fromHeader = headerStore.get(PROFILE_HEADER)?.trim().toLowerCase();
  if (fromHeader && isValidProfileSlug(fromHeader)) return fromHeader;
  const store = await cookies();
  const fromCookie = store.get(PROFILE_COOKIE)?.value?.trim().toLowerCase();
  if (fromCookie && isValidProfileSlug(fromCookie)) return fromCookie;
  return DEFAULT_PROFILE_SLUG;
}

export async function getProfileBySlug(slug: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function resolveProfile(slug = DEFAULT_PROFILE_SLUG) {
  await ensureBuiltinProfiles();
  const normalized = slug.trim().toLowerCase();
  if (!isValidProfileSlug(normalized)) {
    return getProfileBySlug(DEFAULT_PROFILE_SLUG).then((row) => row!);
  }
  const existing = await getProfileBySlug(normalized);
  if (existing) {
    await ensureProfileCards(existing.id);
    return existing;
  }
  return getProfileBySlug(DEFAULT_PROFILE_SLUG).then((row) => row!);
}

export const getActiveProfile = cache(async (explicitSlug?: string) => {
  const slug = explicitSlug?.trim().toLowerCase();
  return resolveProfile(
    slug && isValidProfileSlug(slug) ? slug : await readRequestedProfileSlug(),
  );
});

export async function createNamedProfile(rawName: string) {
  await ensureBuiltinProfiles();
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, 40);
  if (name.length < 1) return { ok: false as const, error: "Name is required." };
  const base = slugFromName(name);
  if (!isValidProfileSlug(base) || isNumberedProfileSlug(base)) {
    return { ok: false as const, error: "Use a name, not a reserved number." };
  }
  const db = getDb();
  let slug = base;
  for (let attempt = 2; attempt < 30; attempt += 1) {
    const taken = await getProfileBySlug(slug);
    if (!taken) break;
    if (taken.name.toLowerCase() === name.toLowerCase()) {
      await ensureProfileCards(taken.id);
      return { ok: true as const, profile: taken };
    }
    slug = `${base.slice(0, 28)}-${attempt}`;
  }
  if (!isValidProfileSlug(slug) || (await getProfileBySlug(slug))) {
    return { ok: false as const, error: "That name is already used." };
  }
  const [created] = await db
    .insert(profiles)
    .values({ slug, name })
    .onConflictDoNothing({ target: profiles.slug })
    .returning();
  const row = created ?? (await getProfileBySlug(slug));
  if (!row) {
    return { ok: false as const, error: "That name is already used." };
  }
  await ensureProfileCards(row.id);
  return { ok: true as const, profile: row };
}

export async function updateProfileSettings(
  profileId: string,
  values: { session: number; burySiblings: boolean },
) {
  const db = getDb();
  await db
    .update(profiles)
    .set({
      session: values.session,
      burySiblings: values.burySiblings,
    })
    .where(eq(profiles.id, profileId));
}

export async function ensureProfileCards(profileId: string) {
  const db = getDb();
  const [roster, existing] = await Promise.all([
    db
      .select({ id: people.id })
      .from(people)
      .where(eq(people.archived, false)),
    db
      .select({ personId: cards.personId, kind: cards.kind })
      .from(cards)
      .where(eq(cards.profileId, profileId)),
  ]);
  const have = new Set(existing.map((row) => `${row.personId}:${row.kind}`));
  const now = new Date();
  const missing = roster.flatMap((person) =>
    cardInsertValues(person.id, now, profileId).filter(
      (row) => !have.has(`${row.personId}:${row.kind}`),
    ),
  );
  if (missing.length) {
    await db.insert(cards).values(missing).onConflictDoNothing();
  }
}

export async function ensureCardsForPerson(personId: string) {
  const db = getDb();
  const all = await db.select({ id: profiles.id }).from(profiles);
  const now = new Date();
  for (const profile of all) {
    const existing = await db
      .select({ kind: cards.kind })
      .from(cards)
      .where(and(eq(cards.profileId, profile.id), eq(cards.personId, personId)));
    const have = new Set(existing.map((row) => row.kind));
    const missing = cardInsertValues(personId, now, profile.id).filter(
      (row) => !have.has(row.kind),
    );
    if (missing.length) {
      await db.insert(cards).values(missing).onConflictDoNothing();
    }
  }
}

export function defaultProfileSession(profile: ProfileRow) {
  return profile.session || DEFAULT_SESSION;
}
