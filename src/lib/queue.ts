import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs, sets } from "@/db/schema";
import {
  NEW_CARDS_PER_DAY,
  REVIEWS_PER_DAY,
  State,
  isInterdayLearning,
  previewIntervals,
  type CardRow,
} from "./fsrs";
import { getStudyPrefs } from "./session-prefs";

export type SetRow = typeof sets.$inferSelect;
export type PersonRow = typeof people.$inferSelect;

export type StudyItem = {
  card: CardRow;
  person: PersonRow;
};

export type StudyCounts = {
  new: number;
  learning: number;
  review: number;
  buried: number;
};

export type StudySnapshot = {
  item: StudyItem | null;
  remaining: number;
  counts: StudyCounts;
  intervals: Record<1 | 2 | 3 | 4, string> | null;
  canUndo: boolean;
  set: Pick<SetRow, "id" | "slug" | "name" | "description"> | null;
};

export function startOfUtcDay(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function nextUtcDay(now = new Date()) {
  return new Date(startOfUtcDay(now).getTime() + 86_400_000);
}

function activeCardFilter(now: Date, setId?: string) {
  return and(
    eq(people.archived, false),
    eq(cards.suspended, false),
    or(isNull(cards.buriedUntil), lte(cards.buriedUntil, now)),
    setId ? eq(people.setId, setId) : undefined,
  );
}

async function todayUsage(setId: string | undefined, now: Date) {
  const db = getDb();
  const start = startOfUtcDay(now);
  const logs = await db
    .select({
      cardId: reviewLogs.cardId,
      state: reviewLogs.state,
      scheduledDays: reviewLogs.scheduledDays,
    })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .innerJoin(people, eq(people.id, cards.personId))
    .where(
      and(
        gte(reviewLogs.reviewedAt, start),
        setId ? eq(people.setId, setId) : undefined,
      ),
    );

  let newToday = 0;
  let reviewsToday = 0;
  for (const log of logs) {
    if (log.state === State.New) newToday += 1;
    else if (log.state === State.Review || isInterdayLearning(log.state, log.scheduledDays)) {
      reviewsToday += 1;
    }
  }
  return { newToday, reviewsToday };
}

async function loadLimits(setId?: string) {
  const prefs = await getStudyPrefs();
  if (!setId) {
    return {
      newCardsPerDay: prefs.session + prefs.bonus,
      reviewsPerDay: REVIEWS_PER_DAY,
    };
  }
  const db = getDb();
  const [row] = await db.select().from(sets).where(eq(sets.id, setId)).limit(1);
  return {
    newCardsPerDay: (prefs.session || row?.newCardsPerDay || NEW_CARDS_PER_DAY) + prefs.bonus,
    reviewsPerDay: row?.reviewsPerDay ?? REVIEWS_PER_DAY,
  };
}

export async function dueQueue(options: { setId?: string; now?: Date } = {}) {
  const now = options.now ?? new Date();
  const setId = options.setId;
  const db = getDb();
  const limits = await loadLimits(setId);
  const usage = await todayUsage(setId, now);
  const remainingNew = Math.max(0, limits.newCardsPerDay - usage.newToday);
  const remainingReviews = Math.max(0, limits.reviewsPerDay - usage.reviewsToday);
  const active = activeCardFilter(now, setId);

  const learning = await db
    .select({ card: cards, person: people })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(
      and(
        active,
        lte(cards.due, now),
        or(eq(cards.state, State.Learning), eq(cards.state, State.Relearning)),
        sql`${cards.scheduledDays} < 1`,
      ),
    )
    .orderBy(asc(cards.due));

  const interday = remainingReviews
    ? await db
        .select({ card: cards, person: people })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(
          and(
            active,
            lte(cards.due, now),
            or(eq(cards.state, State.Learning), eq(cards.state, State.Relearning)),
            sql`${cards.scheduledDays} >= 1`,
          ),
        )
        .orderBy(asc(cards.due))
        .limit(remainingReviews)
    : [];

  const reviewSlots = Math.max(0, remainingReviews - interday.length);
  const reviews = reviewSlots
    ? await db
        .select({ card: cards, person: people })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(and(active, lte(cards.due, now), eq(cards.state, State.Review)))
        .orderBy(asc(cards.due))
        .limit(reviewSlots)
    : [];

  const newCards = remainingNew
    ? await db
        .select({ card: cards, person: people })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(and(active, eq(cards.state, State.New)))
        .orderBy(asc(people.createdAt), asc(cards.kind))
        .limit(remainingNew)
    : [];

  return [...learning, ...interday, ...reviews, ...newCards];
}

export async function dueCount(options: { setId?: string; now?: Date } = {}) {
  return (await dueQueue(options)).length;
}

export async function isDueCard(
  cardId: string,
  options: { setId?: string; now?: Date } = {},
) {
  const queue = await dueQueue(options);
  return queue.some((item) => item.card.id === cardId);
}

export async function studyCounts(options: { setId?: string; now?: Date } = {}) {
  const queue = await dueQueue(options);
  const now = options.now ?? new Date();
  const db = getDb();
  const [buried] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(
      and(
        eq(people.archived, false),
        eq(cards.suspended, false),
        options.setId ? eq(people.setId, options.setId) : undefined,
        sql`${cards.buriedUntil} > ${now}`,
      ),
    );

  // Anki's learn count includes cards waiting on the next intra-day step,
  // even when they are not due yet (Again typically schedules ~1m later).
  const learningRows = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(
      and(
        activeCardFilter(now, options.setId),
        or(eq(cards.state, State.Learning), eq(cards.state, State.Relearning)),
        sql`${cards.scheduledDays} < 1`,
      ),
    );

  const counts: StudyCounts = {
    new: 0,
    learning: learningRows.length,
    review: 0,
    buried: Number(buried?.count ?? 0),
  };
  for (const item of queue) {
    if (item.card.state === State.New) counts.new += 1;
    else if (
      item.card.state === State.Learning ||
      item.card.state === State.Relearning
    ) {
      continue;
    } else counts.review += 1;
  }
  return counts;
}

export async function canUndoLast(setId?: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: reviewLogs.id })
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .innerJoin(people, eq(people.id, cards.personId))
    .where(setId ? eq(people.setId, setId) : undefined)
    .orderBy(desc(reviewLogs.reviewedAt))
    .limit(1);
  return Boolean(row);
}

export async function studySnapshot(options: {
  setId?: string;
  now?: Date;
  skipCardId?: string;
} = {}): Promise<StudySnapshot> {
  const now = options.now ?? new Date();
  const queue = await dueQueue({ setId: options.setId, now });
  let item = queue[0] ?? null;
  if (
    options.skipCardId &&
    item?.card.id === options.skipCardId &&
    queue.length > 1
  ) {
    item = queue[1] ?? null;
  }
  const counts = await studyCounts({ setId: options.setId, now });
  let set: StudySnapshot["set"] = null;
  if (options.setId) {
    const db = getDb();
    const [row] = await db
      .select({
        id: sets.id,
        slug: sets.slug,
        name: sets.name,
        description: sets.description,
      })
      .from(sets)
      .where(eq(sets.id, options.setId))
      .limit(1);
    set = row ?? null;
  }
  return {
    item,
    remaining: queue.length,
    counts,
    intervals: item ? previewIntervals(item.card, now) : null,
    canUndo: await canUndoLast(options.setId),
    set,
  };
}

export async function studyStats(setId: string, now = new Date()) {
  const db = getDb();
  const prefs = await getStudyPrefs();
  const usage = await todayUsage(setId, now);
  const counts = await studyCounts({ setId, now });
  const remaining = await dueCount({ setId, now });
  const roster = await db
    .select({ card: cards, person: people })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(and(eq(people.setId, setId), eq(people.archived, false)));

  return {
    prefs,
    usage,
    counts,
    remaining,
    people: new Set(roster.map((row) => row.person.id)).size,
    cards: roster.length,
    roster,
  };
}

export async function listSetSummaries(now = new Date()) {
  const db = getDb();
  const all = await db.select().from(sets).orderBy(asc(sets.name));
  return Promise.all(
    all.map(async (set) => ({
      set,
      counts: await studyCounts({ setId: set.id, now }),
      remaining: await dueCount({ setId: set.id, now }),
    })),
  );
}
