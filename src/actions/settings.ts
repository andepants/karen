"use server";

import { revalidatePath } from "next/cache";
import { isValidTimeZone } from "@/lib/dates";
import { roundSize } from "@/lib/session-limits";
import { getStudyPrefs, writeStudyPrefs } from "@/lib/session-prefs";
import { clearSessionSample } from "@/lib/session-sample";

function refreshSettings() {
  revalidatePath("/settings");
  revalidatePath("/study");
  revalidatePath("/");
}

export async function saveStudySettings(formData: FormData) {
  const session = Number(formData.get("session"));
  const prefs = await getStudyPrefs();
  await writeStudyPrefs({
    ...prefs,
    session: Number.isFinite(session) ? roundSize(session) : prefs.session,
    bonus: 0,
    burySiblings: formData.get("burySiblings") === "on",
  });
  await clearSessionSample();
  refreshSettings();
}

export async function resetStudyBonus() {
  const prefs = await getStudyPrefs();
  await writeStudyPrefs({ ...prefs, bonus: 0 });
  refreshSettings();
}

export async function saveTimeZone(timeZone: string) {
  const prefs = await getStudyPrefs();
  if (!isValidTimeZone(timeZone) || prefs.timeZone === timeZone) return;
  await writeStudyPrefs({ ...prefs, timeZone });
  revalidatePath("/settings");
}
