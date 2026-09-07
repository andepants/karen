"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { requireEditor } from "@/lib/auth";
import { ensureCardsForPerson } from "@/lib/profiles";
import { normalizeName } from "@/lib/names";
import { isAllowedPhotoFile, storePhotoFromFile } from "@/lib/photos";

function refreshPeople() {
  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/sets");
  revalidatePath("/");
}

export async function createPerson(formData: FormData) {
  await requireEditor();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const setId = String(formData.get("setId") ?? "").trim() || null;
  const photo = formData.get("photo");
  if (!name) {
    return { error: "Name is required." };
  }
  if (photo instanceof File && photo.size > 0 && !isAllowedPhotoFile(photo)) {
    return { error: "Photo must be an image under 12 MB." };
  }

  const db = getDb();
  const now = new Date();
  const [person] = await db
    .insert(people)
    .values({
      setId,
      name,
      normalizedName: normalizeName(name),
      description,
    })
    .returning();

  if (photo instanceof File && photo.size > 0) {
    const photoUrl = await storePhotoFromFile(photo, person.id);
    if (!photoUrl) {
      return { error: "Photo must be an image under 12 MB." };
    }
    await db.update(people).set({ photoUrl, updatedAt: now }).where(eq(people.id, person.id));
  }

  await ensureCardsForPerson(person.id);
  refreshPeople();
  return { ok: true as const };
}

export async function updatePerson(formData: FormData) {
  await requireEditor();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const setId = String(formData.get("setId") ?? "").trim() || null;
  const photo = formData.get("photo");
  if (!id || !name) {
    return { error: "Name is required." };
  }
  if (photo instanceof File && photo.size > 0 && !isAllowedPhotoFile(photo)) {
    return { error: "Photo must be an image under 12 MB." };
  }

  const db = getDb();
  const now = new Date();
  let photoUrl: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    photoUrl = await storePhotoFromFile(photo, id) ?? undefined;
    if (!photoUrl) {
      return { error: "Photo must be an image under 12 MB." };
    }
  }

  await db
    .update(people)
    .set({
      name,
      normalizedName: normalizeName(name),
      description,
      setId,
      updatedAt: now,
      ...(photoUrl ? { photoUrl } : {}),
    })
    .where(eq(people.id, id));

  refreshPeople();
  return { ok: true as const };
}

export async function setPersonArchived(id: string, archived: boolean) {
  await requireEditor();
  const db = getDb();
  await db
    .update(people)
    .set({ archived, updatedAt: new Date() })
    .where(eq(people.id, id));
  refreshPeople();
}
