import { redirect } from "next/navigation";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { getActiveProfile, profileHref } from "@/lib/profiles";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function StudyIndexPage() {
  const deck = await ensureDefaultSet().catch(() => null);
  const profile = await getActiveProfile();
  redirect(
    profileHref(profile.slug, `/study/${deck?.slug ?? DEFAULT_SET_SLUG}`),
  );
}
