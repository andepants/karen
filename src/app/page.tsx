import { headers } from "next/headers";
import { HomeIntro } from "@/components/home-intro";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { getActiveProfile, listProfiles, profileHref } from "@/lib/profiles";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { and, eq, isNotNull } from "drizzle-orm";

async function shareOrigin() {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : undefined;
}

export default async function HomePage() {
  const deck = await ensureDefaultSet().catch(() => null);
  const profile = await getActiveProfile();
  const profiles = await listProfiles();
  const studyHref = profileHref(
    profile.slug,
    deck ? `/study/${deck.slug}` : `/study/${DEFAULT_SET_SLUG}`,
  );
  let faces: { id: string; name: string; photoUrl: string }[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: people.id,
        name: people.name,
        photoUrl: people.photoUrl,
      })
      .from(people)
      .where(and(eq(people.archived, false), isNotNull(people.photoUrl)));
    faces = rows
      .filter((row): row is { id: string; name: string; photoUrl: string } =>
        Boolean(row.photoUrl),
      )
      .sort(() => Math.random() - 0.5);
  } catch {
    faces = [];
  }

  return (
    <HomeIntro
      href={studyHref}
      faces={faces}
      profiles={profiles}
      activeSlug={profile.slug}
      shareOrigin={await shareOrigin()}
    />
  );
}
