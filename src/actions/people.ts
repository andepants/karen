"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { cards, people } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import { emptyCardRow } from "@/lib/fsrs";
import { normalizeName } from "@/lib/names";
import { storePhotoFromFile } from "@/lib/photos";

export async function createPerson(formData: FormData) {
  await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const photo = formData.get("photo");
  if (!name) {
    return { error: "Name is required." };
  }

  const db = getDb();
  const now = new Date();
  const [person] = await db
    .insert(people)
    .values({
      name,
      normalizedName: normalizeName(name),
      description,
    })
    .returning();

  if (photo instanceof File && photo.size > 0) {
    const photoUrl = await storePhotoFromFile(photo, person.id);
    await db.update(people).set({ photoUrl, updatedAt: now }).where(eq(people.id, person.id));
  }

  await db.insert(cards).values({
    personId: person.id,
    ...emptyCardRow(now),
  });

  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updatePerson(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const photo = formData.get("photo");
  if (!id || !name) {
    return { error: "Name is required." };
  }

  const db = getDb();
  const now = new Date();
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    photoUrl = await storePhotoFromFile(photo, id);
  }

  await db
    .update(people)
    .set({
      name,
      normalizedName: normalizeName(name),
      description,
      updatedAt: now,
      ...(photoUrl ? { photoUrl } : {}),
    })
    .where(eq(people.id, id));

  revalidatePath("/people");
  revalidatePath("/study");
  return { ok: true as const };
}

export async function setPersonArchived(id: string, archived: boolean) {
  await requireEditor();
  const db = getDb();
  await db
    .update(people)
    .set({ archived, updatedAt: new Date() })
    .where(eq(people.id, id));
  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/");
}
