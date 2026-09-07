import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { PeopleGrid } from "@/components/people-grid";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { people, sets } from "@/db/schema";
import { isEditor } from "@/lib/auth";
import { ensureTestSets } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { getSetBySlug } from "@/lib/sets";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  const editor = await isEditor();
  const { set: setSlug } = await searchParams;
  const selected = setSlug ? await getSetBySlug(setSlug).catch(() => null) : null;

  let roster: (typeof people.$inferSelect)[] = [];
  let allSets: (typeof sets.$inferSelect)[] = [];
  try {
    await ensureTestSets();
    const db = getDb();
    allSets = await db.select().from(sets).orderBy(asc(sets.name));
    const rows = editor
      ? await db.select().from(people).orderBy(desc(people.createdAt))
      : await db
          .select()
          .from(people)
          .where(eq(people.archived, false))
          .orderBy(desc(people.createdAt));
    roster = selected ? rows.filter((row) => row.setId === selected.id) : rows;
  } catch {
    roster = [];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-5xl">
            {selected ? selected.name : "People"}
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Names, photos, and notes.
          </p>
        </div>
        <Button size="lg" className="rounded-full px-8" asChild>
          <Link href={`/study/${selected?.slug ?? DEFAULT_SET_SLUG}`}>
            Study
          </Link>
        </Button>
      </div>
      <div className="mt-8">
        {roster.length === 0 && !editor ? (
          <p className="text-muted-foreground">
            No people yet.
          </p>
        ) : (
          <PeopleGrid people={roster} sets={allSets} isEditor={editor} />
        )}
      </div>
    </main>
  );
}
