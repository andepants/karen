import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs } from "@/db/schema";
import { NEW_CARDS_PER_DAY, State } from "./fsrs";

function startOfUtcDay(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export async function dueQueue(now = new Date()) {
  const db = getDb();
  const start = startOfUtcDay(now);

  const logs = await db
    .select({
      cardId: reviewLogs.cardId,
      reviewedAt: reviewLogs.reviewedAt,
    })
    .from(reviewLogs);

  const firstByCard = new Map<string, Date>();
  for (const log of logs) {
    const existing = firstByCard.get(log.cardId);
    if (!existing || log.reviewedAt < existing) {
      firstByCard.set(log.cardId, log.reviewedAt);
    }
  }

  let newReviewedToday = 0;
  for (const first of firstByCard.values()) {
    if (first >= start) newReviewedToday += 1;
  }

  const remainingNew = Math.max(0, NEW_CARDS_PER_DAY - newReviewedToday);

  const dueExisting = await db
    .select({
      card: cards,
      person: people,
    })
    .from(cards)
    .innerJoin(people, eq(people.id, cards.personId))
    .where(
      and(
        eq(people.archived, false),
        lte(cards.due, now),
        sql`${cards.state} <> ${State.New}`,
      ),
    )
    .orderBy(
      sql`case when ${cards.state} in (${State.Learning}, ${State.Relearning}) then 0 else 1 end`,
      asc(cards.due),
    );

  const newCards = remainingNew
    ? await db
        .select({
          card: cards,
          person: people,
        })
        .from(cards)
        .innerJoin(people, eq(people.id, cards.personId))
        .where(and(eq(people.archived, false), eq(cards.state, State.New)))
        .orderBy(asc(people.createdAt))
        .limit(remainingNew)
    : [];

  return [...dueExisting, ...newCards];
}

export async function dueCount(now = new Date()) {
  return (await dueQueue(now)).length;
}
