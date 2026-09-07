import Link from "next/link";
import { ImportForm, UnlockForm } from "@/components/import-form";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { SettingsForm } from "@/components/settings-form";
import { TurnedOffList } from "@/components/turned-off-list";
import { SyncTimeZone } from "@/components/sync-timezone";
import { Button } from "@/components/ui/button";
import { isEditor } from "@/lib/auth";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { MEMORY_GRADES, memoryGrade, weakerGrade } from "@/lib/grades";
import { progressStats } from "@/lib/progress";
import { studyStats } from "@/lib/queue";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function SettingsPage() {
  const editor = await isEditor();
  const deck = await ensureDefaultSet().catch((error) => {
    console.error("settings deck", error);
    return null;
  });
  const stats = deck
    ? await studyStats(deck.id).catch((error) => {
        console.error("settings stats", error);
        return null;
      })
    : null;
  const progress = deck
    ? await progressStats(deck.id, { timeZone: stats?.prefs.timeZone }).catch(
        (error) => {
          console.error("settings progress", error);
          return null;
        },
      )
    : null;
  const gradeCounts = Object.fromEntries(MEMORY_GRADES.map((grade) => [grade, 0])) as Record<
    string,
    number
  >;
  if (stats) {
    const byPerson = new Map<string, typeof stats.roster>();
    for (const row of stats.roster) {
      const current = byPerson.get(row.person.id) ?? [];
      current.push(row);
      byPerson.set(row.person.id, current);
    }
    for (const rows of byPerson.values()) {
      const letter = weakerGrade(...rows.map((row) => memoryGrade(row.card)));
      if (letter !== "—") gradeCounts[letter] += 1;
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-12 px-6 py-10">
      {progress ? <SyncTimeZone current={progress.timeZone} /> : null}
      <div>
        <h1 className="font-heading text-5xl">Options</h1>
        <p className="mt-2 text-muted-foreground">
          Your progress, then settings you can change.
        </p>
      </div>

      {progress && stats ? (
        <ProgressDashboard
          progress={progress}
          remaining={stats.remaining}
          people={stats.people}
          cards={stats.cards}
          bonus={stats.prefs.bonus}
          gradeCounts={gradeCounts}
        />
      ) : stats ? (
        <p className="text-muted-foreground">
          Daily history is not available yet. Session settings still work below.
        </p>
      ) : (
        <p className="text-muted-foreground">The deck is not ready yet.</p>
      )}

      <SettingsForm
        session={stats?.prefs.session ?? 80}
        burySiblings={stats?.prefs.burySiblings ?? false}
        setId={deck?.id}
      />

      <TurnedOffList people={stats?.turnedOff ?? []} />

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
