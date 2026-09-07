import {
  gradeBarFill,
  gradeTone,
  MEMORY_GRADES,
  type GradeCounts,
  type MemoryGrade,
} from "@/lib/grades";

export type { GradeCounts };

const GRADE_PLOT_HEIGHT = 160;

const GRADE_COLUMNS: { key: MemoryGrade; label: string }[] = [
  { key: "—", label: "New" },
  ...MEMORY_GRADES.map((grade) => ({ key: grade, label: grade })),
];

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

export function GradeBars({
  counts,
  people,
}: {
  counts: GradeCounts;
  people: number;
}) {
  const max = Math.max(1, people, ...GRADE_COLUMNS.map((column) => counts[column.key]));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <em className="not-italic font-medium text-foreground tabular-nums">{people}</em>{" "}
        people
      </p>
      <ol className="flex items-end gap-2" aria-label="Memory grades">
        {GRADE_COLUMNS.map((column) => {
          const value = counts[column.key];
          const barHeight = value
            ? Math.max(10, Math.round((value / max) * GRADE_PLOT_HEIGHT))
            : 4;
          return (
            <li key={column.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span className={`h-4 text-xs tabular-nums ${gradeTone(column.key)}`}>
                {value || ""}
              </span>
              <div
                className="flex w-full items-end justify-center border-b border-border/80"
                style={{ height: GRADE_PLOT_HEIGHT }}
              >
                <div
                  className={`w-full max-w-10 rounded-t-md ${
                    value ? gradeBarFill(column.key) : "bg-border"
                  }`}
                  style={{ height: barHeight }}
                  title={`${column.label}: ${value}`}
                  aria-label={`${column.label}, ${value} ${value === 1 ? "person" : "people"}`}
                />
              </div>
              <span className={`text-[11px] tracking-wide ${gradeTone(column.key)}`}>
                {column.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
