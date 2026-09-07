"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { unburySet } from "@/actions/study";
import { Button } from "@/components/ui/button";
import type { StudyCounts } from "@/lib/queue";
import type { sets } from "@/db/schema";

export function DeckOverview({
  set,
  counts,
  remaining,
}: {
  set: typeof sets.$inferSelect;
  counts: StudyCounts;
  remaining: number;
}) {
  const [buried, setBuried] = useState(counts.buried);
  const [pending, startTransition] = useTransition();
  const shareUrl = `/study/${set.slug}`;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-heading text-5xl">{set.name}</h1>
        <p className="mt-3 text-muted-foreground">{set.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="New" value={counts.new} className="text-sky-700" />
        <Stat label="Learn" value={counts.learning} className="text-rose-700" />
        <Stat label="Review" value={counts.review} className="text-emerald-700" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button size="lg" className="rounded-full px-6" asChild>
          <Link href={shareUrl}>
            {remaining ? `Study · ${remaining}` : "Study"}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/people?set=${set.slug}`}>People</Link>
        </Button>
        {buried > 0 ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unburySet(set.id);
                setBuried(0);
              })
            }
          >
            Show Hidden · {buried}
          </Button>
        ) : null}
      </div>

      <p className="rounded-2xl bg-card/70 px-4 py-3 text-sm text-muted-foreground">
        Link:{" "}
        <Link className="text-foreground underline-offset-4 hover:underline" href={shareUrl}>
          {shareUrl}
        </Link>
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl bg-card/80 px-3 py-5 ring-1 ring-border">
      <p className={`font-heading text-3xl ${className}`}>{value}</p>
      <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
