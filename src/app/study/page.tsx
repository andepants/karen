import { redirect } from "next/navigation";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function StudyIndexPage() {
  const deck = await ensureDefaultSet().catch(() => null);
  redirect(`/study/${deck?.slug ?? DEFAULT_SET_SLUG}`);
}
