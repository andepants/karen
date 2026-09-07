"use server";

import { revalidatePath } from "next/cache";
import { getStudyPrefs, writeStudyPrefs } from "@/lib/session-prefs";

export async function saveStudySettings(formData: FormData) {
  const session = Number(formData.get("session"));
  const prefs = await getStudyPrefs();
  await writeStudyPrefs({
    session: Number.isFinite(session) ? session : prefs.session,
    bonus: prefs.bonus,
  });
  revalidatePath("/settings");
  revalidatePath("/study");
  revalidatePath("/");
}

export async function resetStudyBonus() {
  const prefs = await getStudyPrefs();
  await writeStudyPrefs({ session: prefs.session, bonus: 0 });
  revalidatePath("/settings");
  revalidatePath("/study");
  revalidatePath("/");
}
