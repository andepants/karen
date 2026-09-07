"use server";

import { revalidatePath } from "next/cache";
import { requireEditor } from "@/lib/auth";
import { seedTestSets } from "@/lib/seed";

export async function seedDemoSets() {
  await requireEditor();
  const created = await seedTestSets();
  revalidatePath("/");
  revalidatePath("/sets");
  revalidatePath("/people");
  revalidatePath("/study");
  return { ok: true as const, created };
}
