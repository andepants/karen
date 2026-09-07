import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PersonFacts } from "@/components/person-facts";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { cards, people } from "@/db/schema";
import { ensureTestSets } from "@/lib/ensure-test-set";
import { gradeTone, memoryGrade, weakerGrade } from "@/lib/grades";
import { getActiveProfile, profileHref } from "@/lib/profiles";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string; profile?: string }>;
}) {
  const { id, profile: routeSlug } = await params;
  await ensureTestSets().catch(() => null);
  const db = getDb();
  const [person] = await db.select().from(people).where(eq(people.id, id)).limit(1);
  if (!person || person.archived) notFound();

  const profile = await getActiveProfile(routeSlug);
  const cardRows = await db
    .select()
    .from(cards)
    .where(and(eq(cards.personId, person.id), eq(cards.profileId, profile.id)));
  const letter = weakerGrade(...cardRows.map((card) => memoryGrade(card)));

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={profileHref(profile.slug, "/people")}>Roster</Link>
        </Button>
        <span className={`text-sm font-medium ${gradeTone(letter)}`}>{letter}</span>
      </div>
      {person.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.photoUrl}
          alt={person.name}
          className="aspect-[4/5] w-full rounded-[2rem] object-cover object-top"
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-[2rem] bg-secondary font-heading text-7xl">
          {person.name.slice(0, 1)}
        </div>
      )}
      <h1 className="mt-6 font-heading text-4xl">{person.name}</h1>
      <div className="mt-5">
        <PersonFacts
          description={person.description || ""}
          facts={person.facts}
          title={person.title}
        />
      </div>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link href={profileHref(profile.slug, `/study/${DEFAULT_SET_SLUG}`)}>
            Study
          </Link>
        </Button>
        {person.profileUrl ? (
          <Button variant="outline" asChild>
            <a href={person.profileUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </Button>
        ) : null}
      </div>
    </main>
  );
}
