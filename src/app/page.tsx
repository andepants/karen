import { HomeIntro } from "@/components/home-intro";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { and, eq, isNotNull } from "drizzle-orm";

export default async function HomePage() {
  const deck = await ensureDefaultSet().catch(() => null);
  const studyHref = deck ? `/study/${deck.slug}` : `/study/${DEFAULT_SET_SLUG}`;
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

  return <HomeIntro href={studyHref} faces={faces} />;
}
