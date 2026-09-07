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

export const NEW_CARDS_PER_DAY = 20;

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

export function isGrade(value: number): value is Grade {
  return (
    value === Rating.Again ||
    value === Rating.Hard ||
    value === Rating.Good ||
    value === Rating.Easy
  );
}
