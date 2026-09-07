import { parseProfile } from "@/lib/profile";

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

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </p>
      {facts.length ? (
        <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-foreground/80">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      )}
    </div>
  );
}
