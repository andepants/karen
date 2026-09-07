import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs, sets } from "@/db/schema";
import {
  REVIEWS_PER_DAY,
  State,
  isInterdayLearning,
  previewIntervals,
  type CardRow,
} from "./fsrs";
import { getStudyPrefs } from "./session-prefs";
import { roundSize } from "./session-limits";
import {
  getSessionSample,
  writeSessionSample,
} from "./session-sample";

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
  samplePersonIds: string[];
  roundSize: number;
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
  const dailyNew = roundSize(prefs.session) + prefs.bonus;
  if (!setId) {
    return {
      newCardsPerDay: dailyNew,
      reviewsPerDay: REVIEWS_PER_DAY,
    };
  }
  const db = getDb();
  const [row] = await db.select().from(sets).where(eq(sets.id, setId)).limit(1);
  return {
    newCardsPerDay: dailyNew,
    reviewsPerDay: row?.reviewsPerDay ?? REVIEWS_PER_DAY,
  };
}

export async function dueQueue(
  options: { setId?: string; now?: Date; personIds?: string[] } = {},
) {
  const now = options.now ?? new Date();
  const setId = options.setId;
  const db = getDb();
  const limits = await loadLimits(setId);
  const usage = await todayUsage(setId, now);
  const remainingNew = Math.max(0, limits.newCardsPerDay - usage.newToday);
  const remainingReviews = Math.max(0, limits.reviewsPerDay - usage.reviewsToday);
  const active = options.personIds?.length
    ? and(activeCardFilter(now, setId), inArray(people.id, options.personIds))
    : activeCardFilter(now, setId);

  const learning = shuffle(
    await db
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
      ),
  );

  const interdayRows = remainingReviews
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
    : [];
  const interday = shuffle(interdayRows).slice(0, remainingReviews);

  const reviewSlots = Math.max(0, remainingReviews - interday.length);
  const reviewRows = reviewSlots
    ? await db
        .select({ card: cards, person: people })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(and(active, lte(cards.due, now), eq(cards.state, State.Review)))
    : [];
  const reviews = shuffle(reviewRows).slice(0, reviewSlots);

  const newRows = remainingNew
    ? await db
        .select({ card: cards, person: people })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(and(active, eq(cards.state, State.New)))
    : [];
  const newCards = shuffle(newRows).slice(0, remainingNew);

  return [...learning, ...interday, ...shuffle([...reviews, ...newCards])];
}

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap]!;
    next[swap] = current!;
  }
  return next;
}

function uniquePeopleCount(queue: { person: { id: string } }[]) {
  return new Set(queue.map((item) => item.person.id)).size;
}

export async function dueCount(options: { setId?: string; now?: Date } = {}) {
  return uniquePeopleCount(await dueQueue(options));
}

export async function dueCardCount(options: { setId?: string; now?: Date } = {}) {
  return (await dueQueue(options)).length;
}

export async function isDueCard(
  cardId: string,
  options: { setId?: string; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const db = getDb();
  const [row] = await db
    .select({
      card: cards,
      archived: people.archived,
      setId: people.setId,
    })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(eq(cards.id, cardId))
    .limit(1);
  if (!row || row.archived || row.card.suspended) return false;
  if (row.card.buriedUntil && row.card.buriedUntil > now) return false;
  if (options.setId && row.setId !== options.setId) return false;

  if (row.card.state === State.New) {
    const limits = await loadLimits(options.setId);
    const usage = await todayUsage(options.setId, now);
    return usage.newToday < limits.newCardsPerDay;
  }

  return row.card.due <= now;
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

function uniquePersonIds(queue: { person: { id: string } }[]) {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of queue) {
    if (seen.has(item.person.id)) continue;
    seen.add(item.person.id);
    ids.push(item.person.id);
  }
  return ids;
}

async function resolveSessionSample(options: {
  setId?: string;
  duePeople: string[];
  requested?: string[];
  persist?: boolean;
}) {
  const prefs = await getStudyPrefs();
  const limit = roundSize(prefs.session);
  const requested = (options.requested ?? []).filter(Boolean);
  const stored = await getSessionSample(options.setId);
  let sample = stored?.personIds ?? (requested.length ? requested : null);

  if (!sample) {
    sample = shuffle(options.duePeople).slice(0, limit);
  } else if (sample.length > limit) {
    sample = sample.slice(0, limit);
  } else if (sample.length < limit) {
    const extra = shuffle(
      options.duePeople.filter((id) => !sample!.includes(id)),
    ).slice(0, limit - sample.length);
    sample = [...sample, ...extra];
  }

  if (options.persist && options.setId) {
    await writeSessionSample(options.setId, sample);
  }
  return sample;
}

export async function studySnapshot(options: {
  setId?: string;
  now?: Date;
  skipCardId?: string;
  skipPersonId?: string;
  samplePersonIds?: string[];
  persistSample?: boolean;
} = {}): Promise<StudySnapshot> {
  const now = options.now ?? new Date();
  const prefs = await getStudyPrefs();
  const currentRound = roundSize(prefs.session);
  const openQueue = await dueQueue({ setId: options.setId, now });
  const samplePersonIds = await resolveSessionSample({
    setId: options.setId,
    duePeople: uniquePersonIds(openQueue),
    requested: options.samplePersonIds,
    persist: options.persistSample,
  });
  const queue = samplePersonIds.length
    ? await dueQueue({ setId: options.setId, now, personIds: samplePersonIds })
    : openQueue;
  const item =
    queue.find((entry) => {
      if (options.skipCardId && entry.card.id === options.skipCardId) return false;
      if (options.skipPersonId && entry.person.id === options.skipPersonId) {
        return false;
      }
      return true;
    }) ?? null;
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
    remaining: uniquePeopleCount(queue),
    counts,
    intervals: item ? previewIntervals(item.card, now) : null,
    canUndo: await canUndoLast(options.setId),
    set,
    samplePersonIds,
    roundSize: currentRound,
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

  const turnedOff = new Map<string, { id: string; name: string }>();
  for (const row of roster) {
    if (row.card.suspended) {
      turnedOff.set(row.person.id, {
        id: row.person.id,
        name: row.person.name,
      });
    }
  }

  return {
    prefs,
    usage,
    counts,
    remaining,
    people: new Set(roster.map((row) => row.person.id)).size,
    cards: roster.length,
    roster,
    turnedOff: [...turnedOff.values()].sort((a, b) => a.name.localeCompare(b.name)),
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
