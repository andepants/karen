import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { listSetSummaries } from "@/lib/queue";

export function SetList({
  summaries,
}: {
  summaries: Awaited<ReturnType<typeof listSetSummaries>>;
}) {
  if (!summaries.length) {
    return (
      <p className="text-muted-foreground">
        No sets yet. Import a team page or seed the garden test roster.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {summaries.map(({ set, counts, remaining }) => (
        <article
          key={set.id}
          className="flex flex-col gap-4 rounded-[1.75rem] bg-card/80 px-5 py-5 shadow-sm ring-1 ring-border sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="font-heading text-3xl">{set.name}</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {set.description}
            </p>
            <p className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="text-sky-700">{counts.new} new</span>
              <span className="text-rose-700">{counts.learning} learn</span>
              <span className="text-emerald-700">{counts.review} review</span>
              {counts.buried ? (
                <span className="text-muted-foreground">{counts.buried} buried</span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild>
              <Link href={`/study/${set.slug}`}>
                {remaining ? `Study (${remaining})` : "Study"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/sets/${set.slug}`}>Overview</Link>
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
