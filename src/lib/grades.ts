import { State, rowToFsrs, scheduler, type CardRow } from "./fsrs";

export const MEMORY_GRADES = ["A", "B", "C", "D", "E", "F"] as const;
export type MemoryGrade = (typeof MEMORY_GRADES)[number] | "—";

export function memoryGrade(card: CardRow, now = new Date()): MemoryGrade {
  if (card.state === State.New || !card.lastReview) return "—";
  const retrievability = scheduler.get_retrievability(
    rowToFsrs(card),
    now,
    false,
  );
  if (card.lapses >= 8 || retrievability < 0.3) return "F";
  if (retrievability < 0.45) return "E";
  if (retrievability < 0.6) return "D";
  if (retrievability < 0.75) return "C";
  if (retrievability < 0.9) return "B";
  return "A";
}

export type GradeCounts = Record<MemoryGrade, number>;

export function emptyGradeCounts(): GradeCounts {
  return {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    "—": 0,
  };
}

export function summarizePeopleGrades(
  roster: { card: CardRow; person: { id: string } }[],
  now = new Date(),
) {
  const byPerson = new Map<string, CardRow[]>();
  for (const row of roster) {
    const list = byPerson.get(row.person.id) ?? [];
    list.push(row.card);
    byPerson.set(row.person.id, list);
  }
  const counts = emptyGradeCounts();
  for (const personCards of byPerson.values()) {
    const letter = weakerGrade(...personCards.map((card) => memoryGrade(card, now)));
    counts[letter] += 1;
  }
  return {
    people: byPerson.size,
    counts,
  };
}

export function weakerGrade(...grades: MemoryGrade[]): MemoryGrade {
  const studied = grades.filter((grade) => grade !== "—");
  if (!studied.length) return "—";
  return studied.reduce((worst, grade) =>
    MEMORY_GRADES.indexOf(grade) > MEMORY_GRADES.indexOf(worst) ? grade : worst,
  );
}

export function gradeTone(grade: MemoryGrade) {
  if (grade === "A") return "text-emerald-700";
  if (grade === "B") return "text-lime-700";
  if (grade === "C") return "text-amber-700";
  if (grade === "D") return "text-orange-700";
  if (grade === "E" || grade === "F") return "text-rose-700";
  return "text-muted-foreground";
}
