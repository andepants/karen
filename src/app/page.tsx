import { HomeIntro } from "@/components/home-intro";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { and, eq, isNotNull } from "drizzle-orm";

export default async function HomePage() {
  const deck = await ensureDefaultSet().catch(() => null);
  const studyHref = deck ? `/study/${deck.slug}` : `/study/${DEFAULT_SET_SLUG}`;
  let photos: string[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select({ photoUrl: people.photoUrl })
      .from(people)
      .where(and(eq(people.archived, false), isNotNull(people.photoUrl)));
    photos = rows
      .map((row) => row.photoUrl)
      .filter((src): src is string => Boolean(src))
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
  } catch {
    photos = [];
  }

  return <HomeIntro href={studyHref} photos={photos} />;
}
