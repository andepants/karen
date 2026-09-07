import { getDb } from "@/db";
import { cards, reviewLogs } from "@/db/schema";
import { emptyCardRow } from "./fsrs";

export async function resetAllStudyProgress() {
  const db = getDb();
  await db.delete(reviewLogs);
  const empty = emptyCardRow();
  await db.update(cards).set({
    ...empty,
    lastReview: null,
    buriedUntil: null,
    suspended: false,
    leech: false,
  });
}
