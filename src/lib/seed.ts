import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, reviewLogs, sets } from "@/db/schema";
import { State, cardInsertValues } from "./fsrs";
import { normalizeName } from "./names";
import { RETIRED_SET_SLUGS, seedSets, type SeedSet } from "./seed-data";

async function deletePeople(personIds: string[]) {
  if (!personIds.length) return;
  const db = getDb();
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

async function removeRetiredSets() {
  const db = getDb();
  const retired = await db
    .select({ id: sets.id })
    .from(sets)
    .where(inArray(sets.slug, [...RETIRED_SET_SLUGS]));
  if (!retired.length) return;

  const setIds = retired.map((set) => set.id);
  const roster = await db
    .select({ id: people.id })
    .from(people)
    .where(inArray(people.setId, setIds));
  await deletePeople(roster.map((row) => row.id));
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
  const roster = await db
    .select({
      id: people.id,
      setId: people.setId,
      normalizedName: people.normalizedName,
    })
    .from(people);
  const extraIds = roster
    .filter((person) => {
      if (!person.setId || !setIds.has(person.setId)) return true;
      const allowed = allowedBySlug.get(slugById.get(person.setId) ?? "");
      return allowed ? !allowed.has(person.normalizedName) : false;
    })
    .map((person) => person.id);
  await deletePeople(extraIds);
}

async function ensureSet(seed: SeedSet, reconcile: boolean) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(sets)
    .where(eq(sets.slug, seed.slug))
    .limit(1);

  const values = {
    name: seed.name,
    description: seed.description,
    newCardsPerDay: seed.newCardsPerDay ?? existing?.newCardsPerDay ?? 20,
    buryNewSiblings: seed.buryNewSiblings ?? existing?.buryNewSiblings ?? false,
    buryReviewSiblings:
      seed.buryReviewSiblings ?? existing?.buryReviewSiblings ?? false,
  };

  if (!existing) {
    const [created] = await db
      .insert(sets)
      .values({ slug: seed.slug, ...values })
      .returning();
    return created;
  }

  if (reconcile) {
    await db.update(sets).set(values).where(eq(sets.id, existing.id));
  }
  return existing;
}

async function ensurePersonCards(
  seed: SeedSet,
  setId: string,
  reconcile: boolean,
) {
  const db = getDb();
  const now = new Date();
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

    let personId = existing?.id;
    if (!existing) {
      const [row] = await db
        .insert(people)
        .values({
          setId,
          name: person.name,
          normalizedName,
          description: person.description,
          photoUrl: person.photoUrl ?? null,
          profileUrl: person.profileUrl ?? null,
        })
        .returning();
      personId = row.id;
    } else if (reconcile) {
      await db
        .update(people)
        .set({
          setId,
          name: person.name,
          description: person.description,
          photoUrl: person.photoUrl ?? existing.photoUrl,
          profileUrl: person.profileUrl ?? existing.profileUrl,
          archived: false,
          updatedAt: now,
        })
        .where(eq(people.id, existing.id));
    }

    if (!personId) continue;
    peopleCount += 1;
    personIds.push(personId);

    const existingCards = await db
      .select({ kind: cards.kind })
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

  return { peopleCount, cardCount, personIds };
}

export async function ensureSeededSets(options: { reconcile?: boolean } = {}) {
  const reconcile = options.reconcile === true;
  const db = getDb();
  await removeRetiredSets();
  if (reconcile) await removeOrphanPeople();

  const created: { slug: string; name: string; people: number; cards: number }[] =
    [];

  for (const seed of seedSets) {
    const set = await ensureSet(seed, reconcile);
    const { peopleCount, cardCount, personIds } = await ensurePersonCards(
      seed,
      set.id,
      reconcile,
    );

    if (reconcile && personIds.length && seed.buryNewSiblings === false) {
      await db
        .update(cards)
        .set({ buriedUntil: null })
        .where(
          and(inArray(cards.personId, personIds), eq(cards.state, State.New)),
        );
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

export async function seedTestSets() {
  return ensureSeededSets({ reconcile: true });
}
