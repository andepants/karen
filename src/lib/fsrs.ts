import {
  type Card as FsrsCard,
  type Grade,
  Rating,
  State,
  createEmptyCard,
  fsrs,
} from "ts-fsrs";
import { cards } from "@/db/schema";

export const scheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: true,
});

export const previewScheduler = fsrs({
  request_retention: 0.9,
  enable_fuzz: false,
});

export const NEW_CARDS_PER_DAY = 20;
export const REVIEWS_PER_DAY = 200;
export const LEECH_THRESHOLD = 8;
export const MAX_ANSWER_SECONDS = 60;

export const CARD_KINDS = ["face", "name"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export { Rating, State, createEmptyCard };

export type CardRow = typeof cards.$inferSelect;

export function rowToFsrs(row: CardRow): FsrsCard {
  return {
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    scheduled_days: row.scheduledDays,
    learning_steps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ?? undefined,
  };
}

export function fsrsToRow(card: FsrsCard) {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

export function emptyCardRow(now = new Date()) {
  return fsrsToRow(createEmptyCard(now));
}

export function cardInsertValues(personId: string, now = new Date()) {
  const empty = emptyCardRow(now);
  return CARD_KINDS.map((kind) => ({
    personId,
    kind,
    ...empty,
  }));
}

export function isGrade(value: number): value is Grade {
  return (
    value === Rating.Again ||
    value === Rating.Hard ||
    value === Rating.Good ||
    value === Rating.Easy
  );
}

export function formatInterval(from: Date, to: Date) {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  const months = days / 30;
  if (months < 12) {
    return months < 10 ? `${months.toFixed(1)}mo` : `${Math.round(months)}mo`;
  }
  const years = months / 12;
  return years < 10 ? `${years.toFixed(1)}y` : `${Math.round(years)}y`;
}

export function previewIntervals(row: CardRow, now = new Date()) {
  const card = rowToFsrs(row);
  const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
  return Object.fromEntries(
    grades.map((grade) => {
      const next = previewScheduler.next(card, now, grade);
      return [grade, formatInterval(now, next.card.due)];
    }),
  ) as Record<Grade, string>;
}

export function stateLabel(state: number) {
  if (state === State.New) return "New";
  if (state === State.Learning) return "Learning";
  if (state === State.Review) return "Review";
  if (state === State.Relearning) return "Relearning";
  return "Card";
}

export function isInterdayLearning(state: number, scheduledDays: number) {
  return (
    (state === State.Learning || state === State.Relearning) &&
    scheduledDays >= 1
  );
}
