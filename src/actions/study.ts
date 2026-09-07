"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cards, reviewLogs } from "@/db/schema";
import { fsrsToRow, isGrade, rowToFsrs, scheduler } from "@/lib/fsrs";
import { dueQueue } from "@/lib/queue";

export async function getNextCard() {
  const queue = await dueQueue();
  return queue[0] ?? null;
}

export async function rateCard(cardId: string, rating: number) {
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

  await db.update(cards).set(next).where(eq(cards.id, cardId));
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
  });

  revalidatePath("/study");
  revalidatePath("/");
  const queue = await dueQueue(now);
  return {
    ok: true as const,
    remaining: queue.length,
    item: queue[0] ?? null,
  };
}
