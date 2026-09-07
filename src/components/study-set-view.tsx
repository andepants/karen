import { notFound } from "next/navigation";
import { StudyDeck } from "@/components/study-deck";
import { ensureTestSet } from "@/lib/ensure-test-set";
import { studySnapshot } from "@/lib/queue";

export async function StudySetView({
  slug,
  profileSlug,
}: {
  slug: string;
  profileSlug?: string;
}) {
  const set = await ensureTestSet(slug).catch(() => null);
  if (!set) notFound();

  const initial = await studySnapshot({
    setId: set.id,
    profileSlug,
  });

  return (
    <main className="py-6 sm:px-6 sm:py-10">
      <StudyDeck initial={{ ...initial, set }} />
    </main>
  );
}
