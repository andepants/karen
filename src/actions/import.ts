"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { people, sets, sources } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import type { ExtractedPerson } from "@/lib/firecrawl";
import { ensureCardsForPerson } from "@/lib/profiles";
import { normalizeName } from "@/lib/names";
import { storePhotoFromUrl } from "@/lib/photos";
import { uniqueSlug } from "@/lib/sets";

export async function confirmImport(input: {
  url: string;
  title: string;
  people: ExtractedPerson[];
}) {
  await requireEditor();
  if (!input.people.length) {
    return { error: "No people selected." };
  }

  const db = getDb();
  const now = new Date();
  const title = input.title.trim() || new URL(input.url).hostname;
  const [set] = await db
    .insert(sets)
    .values({
      slug: await uniqueSlug(title),
      name: title,
      description: `Imported from ${input.url}`,
    })
    .returning();

  const [source] = await db
    .insert(sources)
    .values({ setId: set.id, url: input.url, title })
    .returning();

  const existing = await db.select().from(people);
  const existingNames = new Set(existing.map((person) => person.normalizedName));

  let created = 0;
  let skipped = 0;

  for (const person of input.people) {
    const normalizedName = normalizeName(person.name);
    if (!normalizedName || existingNames.has(normalizedName)) {
      skipped += 1;
      continue;
    }
    existingNames.add(normalizedName);

    const [row] = await db
      .insert(people)
      .values({
        setId: set.id,
        sourceId: source.id,
        name: person.name.trim(),
        normalizedName,
        description: person.description.trim(),
        profileUrl: person.profileUrl,
      })
      .returning();

    if (person.photoUrl) {
      const photoUrl = await storePhotoFromUrl(person.photoUrl, row.id);
      if (photoUrl) {
        await db
          .update(people)
          .set({ photoUrl, updatedAt: now })
          .where(eq(people.id, row.id));
      }
    }

    await ensureCardsForPerson(row.id);
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/sets");
  return { ok: true as const, created, skipped, slug: set.slug };
}
