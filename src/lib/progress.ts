import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs } from "@/db/schema";
import {
  addCalendarDays,
  calendarDate,
  formatStudyTime,
  monthDay,
  weekdayLong,
  weekdayShort,
} from "./dates";
import { Rating, State, isInterdayLearning } from "./fsrs";

export type DayProgress = {
  date: string;
  weekday: string;
  label: string;
  fullLabel: string;
  count: number;
  newCount: number;
  reviewCount: number;
  again: number;
  timeMs: number;
  isToday: boolean;
};

export type ProgressSnapshot = {
  timeZone: string;
  today: DayProgress;
  days: DayProgress[];
  recentDays: DayProgress[];
  streak: number;
  longestStreak: number;
  totalReviews: number;
  totalNew: number;
  totalTimeMs: number;
  totalTimeLabel: string;
  averagePerStudyDay: number;
  bestDay: { date: string; label: string; count: number } | null;
  ratings: { again: number; hard: number; good: number; easy: number };
  remembered: number;
  uniqueCards: number;
  uniquePeople: number;
  favorite: { name: string; count: number } | null;
  firstReview: string | null;
};

const HISTORY_DAYS = 14;

type LogRow = {
  reviewedAt: Date;
  rating: number;
  state: number;
  scheduledDays: number;
  reviewTimeMs: number | null;
  cardId: string;
  personId: string;
  personName: string;
};

function emptyDay(date: string, today: string): DayProgress {
  return {
    date,
    weekday: weekdayShort(date),
    label: monthDay(date),
    fullLabel: weekdayLong(date),
    count: 0,
    newCount: 0,
    reviewCount: 0,
    again: 0,
    timeMs: 0,
    isToday: date === today,
  };
}

function isNewLog(row: Pick<LogRow, "state">) {
  return row.state === State.New;
}

function isReviewLog(row: Pick<LogRow, "state" | "scheduledDays">) {
  return (
    row.state === State.Review ||
    isInterdayLearning(row.state, row.scheduledDays)
  );
}

function countStreak(activeDates: Set<string>, today: string) {
  let cursor = today;
  if (!activeDates.has(cursor)) {
    cursor = addCalendarDays(today, -1);
  }
  let streak = 0;
  while (activeDates.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

function longestStreak(dates: string[]) {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let current = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index] === addCalendarDays(sorted[index - 1], 1)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

export async function progressStats(
  setId: string,
  options: { now?: Date; timeZone?: string } = {},
) {
  const db = getDb();
  const now = options.now ?? new Date();
  const timeZone = options.timeZone || "UTC";
  const today = calendarDate(now, timeZone);

  const logs = await db
    .select({
      reviewedAt: reviewLogs.reviewedAt,
      rating: reviewLogs.rating,
      state: reviewLogs.state,
      scheduledDays: reviewLogs.scheduledDays,
      reviewTimeMs: reviewLogs.reviewTimeMs,
      cardId: reviewLogs.cardId,
      personId: people.id,
      personName: people.name,
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .innerJoin(people, eq(people.id, cards.personId))
    .where(and(eq(people.setId, setId), eq(people.archived, false)));

  const byDay = new Map<string, DayProgress>();
  const peopleCounts = new Map<string, { name: string; count: number }>();
  const cardIds = new Set<string>();
  const ratings = { again: 0, hard: 0, good: 0, easy: 0 };
  let totalNew = 0;
  let totalTimeMs = 0;
  let firstReview: Date | null = null;

  for (const row of logs) {
    const date = calendarDate(row.reviewedAt, timeZone);
    const day = byDay.get(date) ?? emptyDay(date, today);
    day.count += 1;
    if (isNewLog(row)) {
      day.newCount += 1;
      totalNew += 1;
    } else if (isReviewLog(row)) {
      day.reviewCount += 1;
    }
    if (row.rating === Rating.Again) {
      day.again += 1;
      ratings.again += 1;
    } else if (row.rating === Rating.Hard) {
      ratings.hard += 1;
    } else if (row.rating === Rating.Good) {
      ratings.good += 1;
    } else if (row.rating === Rating.Easy) {
      ratings.easy += 1;
    }
    day.timeMs += row.reviewTimeMs ?? 0;
    totalTimeMs += row.reviewTimeMs ?? 0;
    byDay.set(date, day);
    cardIds.add(row.cardId);
    const person = peopleCounts.get(row.personId) ?? {
      name: row.personName,
      count: 0,
    };
    person.count += 1;
    peopleCounts.set(row.personId, person);
    if (!firstReview || row.reviewedAt < firstReview) {
      firstReview = row.reviewedAt;
    }
  }

  const days = Array.from({ length: HISTORY_DAYS }, (_, index) => {
    const date = addCalendarDays(today, index - (HISTORY_DAYS - 1));
    return byDay.get(date) ?? emptyDay(date, today);
  });

  const activeDates = [...byDay.values()]
    .filter((day) => day.count > 0)
    .map((day) => day.date);
  const studyDays = activeDates.length;
  const favorite = [...peopleCounts.values()].sort(
    (left, right) => right.count - left.count,
  )[0];
  const best = [...byDay.values()].sort((left, right) => right.count - left.count)[0];
  const remembered = ratings.good + ratings.easy;
  const recentDays = [...days].reverse().filter((day) => day.count > 0).slice(0, 7);

  return {
    timeZone,
    today: byDay.get(today) ?? emptyDay(today, today),
    days,
    recentDays,
    streak: countStreak(new Set(activeDates), today),
    longestStreak: longestStreak(activeDates),
    totalReviews: logs.length,
    totalNew,
    totalTimeMs,
    totalTimeLabel: formatStudyTime(totalTimeMs),
    averagePerStudyDay: studyDays
      ? Math.round(logs.length / studyDays)
      : 0,
    bestDay: best
      ? { date: best.date, label: weekdayLong(best.date), count: best.count }
      : null,
    ratings,
    remembered,
    uniqueCards: cardIds.size,
    uniquePeople: peopleCounts.size,
    favorite: favorite ?? null,
    firstReview: firstReview ? weekdayLong(calendarDate(firstReview, timeZone)) : null,
  } satisfies ProgressSnapshot;
}
