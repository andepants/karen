"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cards, people, reviewLogs } from "@/db/schema";
import {
  LEECH_THRESHOLD,
  MAX_ANSWER_SECONDS,
  State,
  fsrsToRow,
  isGrade,
  rowToFsrs,
  scheduler,
} from "@/lib/fsrs";
import { ensureSchema } from "@/lib/ensure-schema";
import {
  nextUtcDay,
  rosterGrades,
  studySnapshot,
  type StudySnapshot,
} from "@/lib/queue";
import { formatStudyTime } from "@/lib/dates";
import { getActiveProfile } from "@/lib/profiles";
import { progressStats } from "@/lib/progress";
import { getStudyPrefs, writeStudyPrefs } from "@/lib/session-prefs";
import { roundSize } from "@/lib/session-limits";
import { clearSessionSample, writeSessionSample } from "@/lib/session-sample";

function refreshStudy() {
  revalidatePath("/study");
  revalidatePath("/sets");
  revalidatePath("/people");
  revalidatePath("/settings");
  revalidatePath("/");
}

function snapshotFromRow(row: typeof cards.$inferSelect) {
  return {
    due: row.due.toISOString(),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsedDays,
    scheduledDays: row.scheduledDays,
    learningSteps: row.learningSteps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.lastReview?.toISOString() ?? null,
    buriedUntil: row.buriedUntil?.toISOString() ?? null,
    suspended: row.suspended,
    leech: row.leech,
  };
}

async function burySiblings(
  personId: string,
  answeredCardId: string,
  now: Date,
  profileId?: string | null,
) {
  const db = getDb();
  await db
    .update(cards)
    .set({ buriedUntil: nextUtcDay(now) })
    .where(
      and(
        eq(cards.personId, personId),
        ne(cards.id, answeredCardId),
        eq(cards.suspended, false),
        profileId ? eq(cards.profileId, profileId) : undefined,
      ),
    );
}

export async function getStudyState(
  setId?: string,
  samplePersonIds?: string[],
): Promise<StudySnapshot> {
  return studySnapshot({ setId, samplePersonIds, persistSample: true });
}

export async function lockStudySample(setId: string, personIds: string[]) {
  const profile = await getActiveProfile();
  await writeSessionSample(setId, personIds, profile.id);
  return { ok: true as const };
}

export async function rateCard(
  cardId: string,
  rating: number,
  reviewTimeMs?: number,
  _samplePersonIds?: string[],
) {
  if (!isGrade(rating)) {
    return { error: "Invalid rating." };
  }

  const db = getDb();
  const [row] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!row) {
    return { error: "Card not found." };
  }

  const now = new Date();
  const result = scheduler.next(rowToFsrs(row), now, rating);
  const next = fsrsToRow(result.card);
  const leech = next.lapses >= LEECH_THRESHOLD;

  await db
    .update(cards)
    .set({
      ...next,
      leech,
    })
    .where(eq(cards.id, cardId));

  await db.insert(reviewLogs).values({
    cardId,
    rating: result.log.rating,
    state: result.log.state,
    due: result.log.due,
    stability: result.log.stability,
    difficulty: result.log.difficulty,
    elapsedDays: result.log.elapsed_days,
    lastElapsedDays: result.log.last_elapsed_days,
    scheduledDays: result.log.scheduled_days,
    learningSteps: result.log.learning_steps,
    reviewedAt: result.log.review,
    previousCard: snapshotFromRow(row),
    reviewTimeMs: Math.min(
      MAX_ANSWER_SECONDS * 1000,
      Math.max(0, reviewTimeMs ?? 0),
    ),
  });

  void burySiblings(row.personId, cardId, now, row.profileId);
  return { ok: true as const, leech };
}

export async function undoLastReview(
  setId?: string,
  samplePersonIds?: string[],
) {
  if (!setId) {
    return { error: "Nothing to undo." };
  }

  await ensureSchema();
  const profile = await getActiveProfile();
  const db = getDb();
  const [log] = await db
    .select()
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .innerJoin(people, eq(people.id, cards.personId))
    .where(and(eq(people.setId, setId), eq(cards.profileId, profile.id)))
    .orderBy(desc(reviewLogs.reviewedAt))
    .limit(1);

  if (!log) {
    return { error: "Nothing to undo." };
  }

  const previous = log.review_logs.previousCard;
  if (!previous) {
    return { error: "That review cannot be undone." };
  }

  await db
    .update(cards)
    .set({
      due: new Date(String(previous.due)),
      stability: Number(previous.stability),
      difficulty: Number(previous.difficulty),
      elapsedDays: Number(previous.elapsedDays),
      scheduledDays: Number(previous.scheduledDays),
      learningSteps: Number(previous.learningSteps),
      reps: Number(previous.reps),
      lapses: Number(previous.lapses),
      state: Number(previous.state),
      lastReview: previous.lastReview ? new Date(String(previous.lastReview)) : null,
      buriedUntil: previous.buriedUntil
        ? new Date(String(previous.buriedUntil))
        : null,
      suspended: Boolean(previous.suspended),
      leech: Boolean(previous.leech),
    })
    .where(eq(cards.id, log.review_logs.cardId));

  await db.delete(reviewLogs).where(eq(reviewLogs.id, log.review_logs.id));
  refreshStudy();
  return {
    ok: true as const,
    ...(await studySnapshot({
      setId,
      samplePersonIds,
      persistSample: true,
    })),
  };
}

export async function buryCard(
  cardId: string,
  scope: "card" | "note" = "card",
  _samplePersonIds?: string[],
) {
  const db = getDb();
  const [row] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!row) return { error: "Card not found." };

  const until = nextUtcDay();
  if (scope === "note") {
    await db
      .update(cards)
      .set({ buriedUntil: until })
      .where(
        and(
          eq(cards.personId, row.personId),
          eq(cards.suspended, false),
          row.profileId ? eq(cards.profileId, row.profileId) : undefined,
        ),
      );
  } else {
    await db.update(cards).set({ buriedUntil: until }).where(eq(cards.id, cardId));
    await burySiblings(row.personId, cardId, new Date(), row.profileId);
  }

  return { ok: true as const };
}

export async function suspendCard(
  cardId: string,
  scope: "card" | "note" = "card",
  _samplePersonIds?: string[],
) {
  const db = getDb();
  const [row] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!row) return { error: "Card not found." };

  if (scope === "note") {
    await db
      .update(cards)
      .set({ suspended: true, buriedUntil: null })
      .where(
        and(
          eq(cards.personId, row.personId),
          row.profileId ? eq(cards.profileId, row.profileId) : undefined,
        ),
      );
  } else {
    await db
      .update(cards)
      .set({ suspended: true, buriedUntil: null })
      .where(eq(cards.id, cardId));
  }

  return { ok: true as const };
}

export async function getStudyRecap(setId?: string) {
  if (!setId) return { error: "No deck." };
  await ensureSchema();
  const prefs = await getStudyPrefs();
  const profile = await getActiveProfile();
  const [progress, grades] = await Promise.all([
    progressStats(setId, { timeZone: prefs.timeZone, profileId: profile.id }),
    rosterGrades(setId, new Date(), profile.id),
  ]);
  const todayRated =
    progress.today.again +
    progress.today.hard +
    progress.today.good +
    progress.today.easy;
  return {
    ok: true as const,
    people: grades.people,
    grades: grades.counts,
    todayCount: progress.today.count,
    todayTime: formatStudyTime(progress.today.timeMs),
    todayRatings: {
      again: progress.today.again,
      hard: progress.today.hard,
      good: progress.today.good,
      easy: progress.today.easy,
    },
    rememberedPct: todayRated
      ? Math.round(((progress.today.good + progress.today.easy) / todayRated) * 100)
      : 0,
    streak: progress.streak,
  };
}

export async function studyMore(setId: string, extra?: number) {
  await ensureSchema();
  const prefs = await getStudyPrefs();
  await writeStudyPrefs({
    ...prefs,
    bonus: prefs.bonus + roundSize(extra ?? prefs.session),
  });
  await clearSessionSample();
  await unburySet(setId);
  refreshStudy();
  return {
    ok: true as const,
    ...(await studySnapshot({ setId, persistSample: true })),
  };
}

export async function unsuspendPerson(personId: string) {
  await ensureSchema();
  const profile = await getActiveProfile();
  const db = getDb();
  await db
    .update(cards)
    .set({ suspended: false, buriedUntil: null })
    .where(and(eq(cards.personId, personId), eq(cards.profileId, profile.id)));

  const [person] = await db
    .select({ setId: people.setId })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);

  refreshStudy();
  return {
    ok: true as const,
    ...(await studySnapshot({ setId: person?.setId ?? undefined })),
  };
}

export async function unburySet(setId: string) {
  const profile = await getActiveProfile();
  const db = getDb();
  const setCards = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(and(eq(people.setId, setId), eq(cards.profileId, profile.id)));
  const ids = setCards.map((card) => card.id);
  if (ids.length) {
    await db.update(cards).set({ buriedUntil: null }).where(inArray(cards.id, ids));
  }
  refreshStudy();
  return { ok: true as const, ...(await studySnapshot({ setId })) };
}
