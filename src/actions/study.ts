"use server";

import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cards, people, reviewLogs, sets } from "@/db/schema";
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
import { nextUtcDay, studySnapshot, type StudySnapshot } from "@/lib/queue";

function refreshStudy() {
  revalidatePath("/study");
  revalidatePath("/sets");
  revalidatePath("/people");
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

async function loadCardSetId(cardId: string) {
  const db = getDb();
  const [row] = await db
    .select({ setId: people.setId })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(eq(cards.id, cardId))
    .limit(1);
  return row?.setId ?? undefined;
}

async function burySiblings(
  personId: string,
  answeredCardId: string,
  now: Date,
) {
  const db = getDb();
  const [person] = await db
    .select({ setId: people.setId })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1);
  if (!person?.setId) return;

  const [set] = await db.select().from(sets).where(eq(sets.id, person.setId)).limit(1);
  if (!set) return;

  const siblings = await db
    .select()
    .from(cards)
    .where(eq(cards.personId, personId));

  const until = nextUtcDay(now);
  const ids = siblings
    .filter((sibling) => {
      if (sibling.id === answeredCardId) return false;
      if (sibling.suspended) return false;
      if (sibling.state === State.Learning || sibling.state === State.Relearning) {
        if (sibling.scheduledDays < 1) return false;
        return set.buryReviewSiblings;
      }
      if (sibling.state === State.New) return set.buryNewSiblings;
      return set.buryReviewSiblings;
    })
    .map((sibling) => sibling.id);

  if (ids.length) {
    await db.update(cards).set({ buriedUntil: until }).where(inArray(cards.id, ids));
  }
}

export async function getStudyState(setId?: string): Promise<StudySnapshot> {
  return studySnapshot({ setId });
}

export async function rateCard(
  cardId: string,
  rating: number,
  reviewTimeMs?: number,
) {
  if (!isGrade(rating)) {
    return { error: "Invalid rating." };
  }

  await ensureSchema();
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

  await burySiblings(row.personId, cardId, now);
  refreshStudy();

  const setId = await loadCardSetId(cardId);
  const snapshot = await studySnapshot({ setId, now, skipCardId: cardId });
  return { ok: true as const, leech, ...snapshot };
}

export async function undoLastReview(setId?: string) {
  await ensureSchema();
  const db = getDb();
  const [log] = await db
    .select()
    .from(reviewLogs)
    .innerJoin(cards, eq(cards.id, reviewLogs.cardId))
    .innerJoin(people, eq(people.id, cards.personId))
    .where(setId ? eq(people.setId, setId) : undefined)
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
  return { ok: true as const, ...(await studySnapshot({ setId })) };
}

export async function buryCard(cardId: string, scope: "card" | "note" = "card") {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!row) return { error: "Card not found." };

  const until = nextUtcDay();
  if (scope === "note") {
    await db
      .update(cards)
      .set({ buriedUntil: until })
      .where(and(eq(cards.personId, row.personId), eq(cards.suspended, false)));
  } else {
    await db.update(cards).set({ buriedUntil: until }).where(eq(cards.id, cardId));
  }

  refreshStudy();
  const setId = await loadCardSetId(cardId);
  return { ok: true as const, ...(await studySnapshot({ setId, skipCardId: cardId })) };
}

export async function suspendCard(cardId: string, scope: "card" | "note" = "card") {
  await ensureSchema();
  const db = getDb();
  const [row] = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  if (!row) return { error: "Card not found." };

  if (scope === "note") {
    await db
      .update(cards)
      .set({ suspended: true, buriedUntil: null })
      .where(eq(cards.personId, row.personId));
  } else {
    await db
      .update(cards)
      .set({ suspended: true, buriedUntil: null })
      .where(eq(cards.id, cardId));
  }

  refreshStudy();
  const setId = await loadCardSetId(cardId);
  return { ok: true as const, ...(await studySnapshot({ setId, skipCardId: cardId })) };
}

export async function unburySet(setId: string) {
  const db = getDb();
  const setCards = await db
    .select({ id: cards.id })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(eq(people.setId, setId));
  const ids = setCards.map((card) => card.id);
  if (ids.length) {
    await db.update(cards).set({ buriedUntil: null }).where(inArray(cards.id, ids));
  }
  refreshStudy();
  return { ok: true as const, ...(await studySnapshot({ setId })) };
}
