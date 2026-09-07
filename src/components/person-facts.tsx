"use client";

import { useState } from "react";
import { parseProfile } from "@/lib/profile";

const PREVIEW = 3;

export function PersonFacts({
  description,
  facts: storedFacts,
  title: storedTitle,
  compact = false,
}: {
  description: string;
  facts?: string[] | null;
  title?: string | null;
  compact?: boolean;
}) {
  const parsed = parseProfile(description);
  const facts = storedFacts?.length ? storedFacts : parsed.facts;
  const title = storedTitle || parsed.title;
  const [open, setOpen] = useState(false);
  const visible = open ? facts : facts.slice(0, PREVIEW);
  const extra = facts.length - PREVIEW;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </p>
      {visible.length ? (
        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-foreground/80">
          {visible.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
      {extra > 0 ? (
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
