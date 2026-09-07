import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, reviewLogs } from "@/db/schema";
import { emptyCardRow } from "./fsrs";
import { getActiveProfile } from "./profiles";

export async function resetAllStudyProgress(profileId?: string) {
  const db = getDb();
  const scopedId = profileId ?? (await getActiveProfile()).id;
  const profileCards = await db
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.profileId, scopedId));
  const cardIds = profileCards.map((row) => row.id);
  if (cardIds.length) {
    await db.delete(reviewLogs).where(inArray(reviewLogs.cardId, cardIds));
  }
  const empty = emptyCardRow();
  await db
    .update(cards)
    .set({
      ...empty,
      lastReview: null,
      buriedUntil: null,
      suspended: false,
      leech: false,
    })
    .where(and(eq(cards.profileId, scopedId)));
}
