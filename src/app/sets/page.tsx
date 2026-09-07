import { SetList } from "@/components/set-list";
import { ensureTestSets } from "@/lib/ensure-test-set";
import { listSetSummaries } from "@/lib/queue";

export default async function SetsPage() {
  let summaries: Awaited<ReturnType<typeof listSetSummaries>> = [];
  try {
    await ensureTestSets();
    summaries = await listSetSummaries();
  } catch {
    summaries = [];
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-heading text-5xl">Decks</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Choose a deck to study.
      </p>
      <div className="mt-8">
        <SetList summaries={summaries} />
      </div>
    </main>
  );
}
