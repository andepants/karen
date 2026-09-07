import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { PeopleGrid } from "@/components/people-grid";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { cards, people, sets } from "@/db/schema";
import { isEditor } from "@/lib/auth";
import { ensureTestSets } from "@/lib/ensure-test-set";
import { memoryGrade, weakerGrade, type MemoryGrade } from "@/lib/grades";
import { getActiveProfile, profileHref } from "@/lib/profiles";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { getSetBySlug } from "@/lib/sets";

export default async function PeoplePage({
  profileSlug,
  searchParams,
}: {
  profileSlug?: string;
  searchParams: Promise<{ set?: string }>;
}) {
  const editor = await isEditor();
  const { set: setSlug } = await searchParams;
  const selected = setSlug ? await getSetBySlug(setSlug).catch(() => null) : null;

  let roster: (typeof people.$inferSelect)[] = [];
  let allSets: (typeof sets.$inferSelect)[] = [];
  const grades: Record<string, MemoryGrade> = {};
  let activeSlug = profileSlug ?? "karen";
  try {
    await ensureTestSets();
    const profile = await getActiveProfile(profileSlug);
    activeSlug = profile.slug;
    const db = getDb();
    allSets = await db.select().from(sets).orderBy(asc(sets.name));
    const rows = editor
      ? await db.select().from(people).orderBy(asc(people.name))
      : await db
          .select()
          .from(people)
          .where(eq(people.archived, false))
          .orderBy(asc(people.name));
    roster = selected ? rows.filter((row) => row.setId === selected.id) : rows;
    const cardRows = await db
      .select()
      .from(cards)
      .where(eq(cards.profileId, profile.id));
    for (const person of roster) {
      const theirs = cardRows.filter((card) => card.personId === person.id);
      grades[person.id] = weakerGrade(...theirs.map((card) => memoryGrade(card)));
    }
  } catch {
    roster = [];
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-5xl">
            {selected ? selected.name : "Roster"}
          </h1>
          <p className="mt-2 text-muted-foreground">{roster.length} people</p>
        </div>
        <Button size="lg" className="rounded-full px-8" asChild>
          <Link
            href={profileHref(
              activeSlug,
              `/study/${selected?.slug ?? DEFAULT_SET_SLUG}`,
            )}
          >
            Study
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        {roster.length === 0 && !editor ? (
          <p className="text-muted-foreground">No one here yet.</p>
        ) : (
          <PeopleGrid
            people={roster}
            sets={allSets}
            isEditor={editor}
            grades={grades}
            profileSlug={activeSlug}
          />
        )}
      </div>
    </main>
  );
}
