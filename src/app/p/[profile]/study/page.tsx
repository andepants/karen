import { redirect } from "next/navigation";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { profileHref } from "@/lib/profile-path";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function ProfileStudyIndexPage({
  params,
}: {
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  const deck = await ensureDefaultSet().catch(() => null);
  redirect(
    profileHref(profile, `/study/${deck?.slug ?? DEFAULT_SET_SLUG}`),
  );
}
