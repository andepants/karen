"use server";

import { revalidatePath } from "next/cache";
import { isValidTimeZone } from "@/lib/dates";
import { ensureSchema } from "@/lib/ensure-schema";
import { getActiveProfile } from "@/lib/profiles";
import { resetAllStudyProgress } from "@/lib/reset-progress";
import { roundSize } from "@/lib/session-limits";
import { getStudyPrefs, writeStudyPrefs } from "@/lib/session-prefs";
import { clearSessionSample } from "@/lib/session-sample";

function refreshSettings() {
  revalidatePath("/settings");
  revalidatePath("/study");
  revalidatePath("/p", "layout");
  revalidatePath("/");
}

function slugFromForm(formData: FormData) {
  const slug = String(formData.get("profileSlug") || "").trim().toLowerCase();
  return slug || undefined;
}

export async function saveStudySettings(formData: FormData) {
  const profile = await getActiveProfile(slugFromForm(formData));
  const session = Number(formData.get("session"));
  const prefs = await getStudyPrefs(profile);
  await writeStudyPrefs(
    {
      ...prefs,
      session: Number.isFinite(session) ? roundSize(session) : prefs.session,
      bonus: 0,
      burySiblings: formData.get("burySiblings") === "on",
    },
    profile,
  );
  await clearSessionSample();
  refreshSettings();
}

export async function resetStudyBonus(profileSlug?: string) {
  const profile = await getActiveProfile(profileSlug);
  const prefs = await getStudyPrefs(profile);
  await writeStudyPrefs({ ...prefs, bonus: 0 }, profile);
  refreshSettings();
}

export async function resetStudyProgress(profileSlug?: string) {
  await ensureSchema();
  const profile = await getActiveProfile(profileSlug);
  await resetAllStudyProgress(profile.id);
  const prefs = await getStudyPrefs(profile);
  await writeStudyPrefs({ ...prefs, bonus: 0 }, profile);
  await clearSessionSample();
  refreshSettings();
}

export async function saveTimeZone(timeZone: string, profileSlug?: string) {
  const profile = await getActiveProfile(profileSlug);
  const prefs = await getStudyPrefs(profile);
  if (!isValidTimeZone(timeZone) || prefs.timeZone === timeZone) return;
  await writeStudyPrefs({ ...prefs, timeZone }, profile);
  revalidatePath("/settings");
  revalidatePath("/p", "layout");
}
