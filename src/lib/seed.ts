import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cards, people, sets } from "@/db/schema";
import { cardInsertValues } from "./fsrs";
import { normalizeName } from "./names";
import { portraitSvg } from "./portraits";
import { seedSets } from "./seed-data";

export async function seedTestSets() {
  const db = getDb();
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
        })
        .returning();
    } else {
      await db
        .update(sets)
        .set({
          name: seed.name,
          description: seed.description,
        })
        .where(eq(sets.id, set.id));
    }

    let peopleCount = 0;
    let cardCount = 0;

    for (const person of seed.people) {
      const normalizedName = normalizeName(person.name);
      const [existing] = await db
        .select()
        .from(people)
        .where(eq(people.normalizedName, normalizedName))
        .limit(1);

      const photoUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(person.name))}`;
      let personId = existing?.id;

      if (existing) {
        await db
          .update(people)
          .set({
            setId: set.id,
            name: person.name,
            description: person.description,
            photoUrl,
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
          })
          .returning();
        personId = row.id;
      }

      if (!personId) continue;
      peopleCount += 1;

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

    created.push({
      slug: set.slug,
      name: set.name,
      people: peopleCount,
      cards: cardCount,
    });
  }

  return created;
}
