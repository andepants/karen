import Link from "next/link";
import { ImportForm, UnlockForm } from "@/components/import-form";
import { SettingsForm } from "@/components/settings-form";
import { Button } from "@/components/ui/button";
import { isEditor } from "@/lib/auth";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { gradeTone, memoryGrade, MEMORY_GRADES } from "@/lib/grades";
import { studyStats } from "@/lib/queue";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function SettingsPage() {
  const editor = await isEditor();
  const deck = await ensureDefaultSet().catch(() => null);
  const stats = deck ? await studyStats(deck.id).catch(() => null) : null;
  const gradeCounts = Object.fromEntries(MEMORY_GRADES.map((grade) => [grade, 0])) as Record<
    string,
    number
  >;
  if (stats) {
    for (const row of stats.roster) {
      const letter = memoryGrade(row.card);
      if (letter !== "—") gradeCounts[letter] += 1;
    }
  }

  return (
    <main className="mx-auto max-w-xl space-y-10 px-6 py-10">
      <div>
        <h1 className="font-heading text-5xl">Settings</h1>
        <p className="mt-2 text-muted-foreground">Progress and how many cards you see.</p>
      </div>

      {stats ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Due" value={stats.remaining} />
          <Stat label="People" value={stats.people} />
          <Stat label="Today" value={stats.usage.newToday + stats.usage.reviewsToday} />
          <Stat label="Bonus" value={stats.prefs.bonus} />
        </section>
      ) : null}

      {stats ? (
        <section>
          <h2 className="font-heading text-2xl">Memory</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Grades fade as you forget. A is fresh. F needs work.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {MEMORY_GRADES.map((grade) => (
              <p key={grade} className={`text-sm ${gradeTone(grade)}`}>
                {grade} · {gradeCounts[grade]}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      <SettingsForm
        session={stats?.prefs.session ?? 80}
        setId={deck?.id}
      />

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/study/${deck?.slug ?? DEFAULT_SET_SLUG}`}>Study</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/people">Roster</Link>
        </Button>
      </div>

      <section className="space-y-6 rounded-[2rem] bg-card/70 p-6 ring-1 ring-border">
        <h2 className="font-heading text-2xl">Editor</h2>
        {!editor ? <UnlockForm /> : null}
        <ImportForm isEditor={editor} />
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card/80 px-3 py-4 ring-1 ring-border">
      <p className="font-heading text-3xl">{value}</p>
      <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
