"use client";

import { useState } from "react";
import { parseProfile } from "@/lib/profile";

const PREVIEW = 3;

export function PersonFacts({
  description,
  compact = false,
}: {
  description: string;
  compact?: boolean;
}) {
  const { title, facts } = parseProfile(description);
  const [open, setOpen] = useState(false);
  const visible = open ? facts : facts.slice(0, PREVIEW);
  const extra = facts.length - PREVIEW;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </p>
      {visible.length ? (
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {visible.map((fact) => (
            <li key={fact} className="flex gap-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-primary/50" />
              <span>{fact}</span>
            </li>
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
