import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs, sets } from "@/db/schema";
import { State, cardInsertValues } from "./fsrs";
import { normalizeName } from "./names";
import { RETIRED_SET_SLUGS, seedSets } from "./seed-data";

async function removeRetiredSets() {
  const db = getDb();
  const retired = await db
    .select()
    .from(sets)
    .where(inArray(sets.slug, [...RETIRED_SET_SLUGS]));
  if (!retired.length) return;

  const setIds = retired.map((set) => set.id);
  const roster = await db
    .select({ id: people.id })
    .from(people)
    .where(inArray(people.setId, setIds));
  const personIds = roster.map((row) => row.id);
  if (personIds.length) {
    const cardRows = await db
      .select({ id: cards.id })
      .from(cards)
      .where(inArray(cards.personId, personIds));
    const cardIds = cardRows.map((row) => row.id);
    if (cardIds.length) {
      await db.delete(reviewLogs).where(inArray(reviewLogs.cardId, cardIds));
      await db.delete(cards).where(inArray(cards.id, cardIds));
    }
    await db.delete(people).where(inArray(people.id, personIds));
  }
  await db.delete(sets).where(inArray(sets.id, setIds));
}

async function removeOrphanPeople() {
  const db = getDb();
  const allSets = await db.select({ id: sets.id, slug: sets.slug }).from(sets);
  const setIds = new Set(allSets.map((set) => set.id));
  const allowedBySlug = new Map(
    seedSets.map((seed) => [
      seed.slug,
      new Set(seed.people.map((person) => normalizeName(person.name))),
    ]),
  );
  const slugById = new Map(allSets.map((set) => [set.id, set.slug]));
  const roster = await db.select({ id: people.id, setId: people.setId, normalizedName: people.normalizedName }).from(people);
  const extraIds = roster
    .filter((person) => {
      if (!person.setId || !setIds.has(person.setId)) return true;
      const allowed = allowedBySlug.get(slugById.get(person.setId) ?? "");
      return allowed ? !allowed.has(person.normalizedName) : false;
    })
    .map((person) => person.id);
  if (!extraIds.length) return;

  const cardRows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(inArray(cards.personId, extraIds));
  const cardIds = cardRows.map((row) => row.id);
  if (cardIds.length) {
    await db.delete(reviewLogs).where(inArray(reviewLogs.cardId, cardIds));
    await db.delete(cards).where(inArray(cards.id, cardIds));
  }
  await db.delete(people).where(inArray(people.id, extraIds));
}

export async function seedTestSets() {
  const db = getDb();
  await removeRetiredSets();
  await removeOrphanPeople();
  const now = new Date();
  const created: { slug: string; name: string; people: number; cards: number }[] =
    [];

  for (const seed of seedSets) {
    let [set] = await db
      .select()
      .from(sets)
      .where(eq(sets.slug, seed.slug))
      .limit(1);

    if (!set) {
      [set] = await db
        .insert(sets)
        .values({
          slug: seed.slug,
          name: seed.name,
          description: seed.description,
          newCardsPerDay: seed.newCardsPerDay ?? 20,
          buryNewSiblings: seed.buryNewSiblings ?? false,
          buryReviewSiblings: seed.buryReviewSiblings ?? false,
        })
        .returning();
    } else {
      await db
        .update(sets)
        .set({
          name: seed.name,
          description: seed.description,
          newCardsPerDay: seed.newCardsPerDay ?? set.newCardsPerDay,
          buryNewSiblings: seed.buryNewSiblings ?? set.buryNewSiblings,
          buryReviewSiblings: seed.buryReviewSiblings ?? set.buryReviewSiblings,
        })
        .where(eq(sets.id, set.id));
    }

    let peopleCount = 0;
    let cardCount = 0;
    const personIds: string[] = [];

    for (const person of seed.people) {
      const normalizedName = normalizeName(person.name);
      const [existing] = await db
        .select()
        .from(people)
        .where(eq(people.normalizedName, normalizedName))
        .limit(1);

      const photoUrl = person.photoUrl ?? existing?.photoUrl ?? null;
      let personId = existing?.id;

      if (existing) {
        await db
          .update(people)
          .set({
            setId: set.id,
            name: person.name,
            description: person.description,
            photoUrl,
            profileUrl: person.profileUrl ?? existing.profileUrl,
            archived: false,
            updatedAt: now,
          })
          .where(eq(people.id, existing.id));
      } else {
        const [row] = await db
          .insert(people)
          .values({
            setId: set.id,
            name: person.name,
            normalizedName,
            description: person.description,
            photoUrl,
            profileUrl: person.profileUrl ?? null,
          })
          .returning();
        personId = row.id;
      }

      if (!personId) continue;
      peopleCount += 1;
      personIds.push(personId);

      const existingCards = await db
        .select()
        .from(cards)
        .where(eq(cards.personId, personId));
      const have = new Set(existingCards.map((card) => card.kind));
      const missing = cardInsertValues(personId, now).filter(
        (value) => !have.has(value.kind),
      );
      if (missing.length) {
        await db.insert(cards).values(missing);
      }
      cardCount += existingCards.length + missing.length;
    }

    if (personIds.length && seed.buryNewSiblings === false) {
      await db
        .update(cards)
        .set({ buriedUntil: null })
        .where(and(inArray(cards.personId, personIds), eq(cards.state, State.New)));
    }

    created.push({
      slug: set.slug,
      name: set.name,
      people: peopleCount,
      cards: cardCount,
    });
  }

  return created;
}
