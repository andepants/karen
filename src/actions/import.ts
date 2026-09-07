"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cards, people, sources } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import type { ExtractedPerson } from "@/lib/firecrawl";
import { emptyCardRow } from "@/lib/fsrs";
import { normalizeName } from "@/lib/names";
import { storePhotoFromUrl } from "@/lib/photos";

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
  const [source] = await db
    .insert(sources)
    .values({ url: input.url, title: input.title })
    .returning();

  const existing = await db.select().from(people);
  const existingNames = new Set(existing.map((p) => p.normalizedName));

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
        sourceId: source.id,
        name: person.name.trim(),
        normalizedName,
        description: person.description.trim(),
        profileUrl: person.profileUrl,
      })
      .returning();

    let photoUrl: string | null = null;
    if (person.photoUrl) {
      photoUrl = await storePhotoFromUrl(person.photoUrl, row.id);
      if (photoUrl) {
        await db
          .update(people)
          .set({ photoUrl, updatedAt: now })
          .where(eq(people.id, row.id));
      }
    }

    await db.insert(cards).values({
      personId: row.id,
      ...emptyCardRow(now),
    });
    created += 1;
  }

  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/study");
  return { ok: true as const, created, skipped };
}
