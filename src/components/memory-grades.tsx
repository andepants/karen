import { gradeTone, MEMORY_GRADES, type GradeCounts } from "@/lib/grades";

export type { GradeCounts };

export function GradeStrip({
  counts,
  people,
}: {
  counts: GradeCounts;
  people: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      <span className="text-muted-foreground">
        <em className="not-italic font-medium text-foreground tabular-nums">{people}</em>{" "}
        people
      </span>
      <span className="tabular-nums text-muted-foreground">
        <em className="not-italic text-sky-700">{counts["—"]}</em> new
      </span>
      {MEMORY_GRADES.map((grade) => (
        <span key={grade} className={`tabular-nums ${gradeTone(grade)}`}>
          {grade} {counts[grade]}
        </span>
      ))}
    </div>
  );
}
