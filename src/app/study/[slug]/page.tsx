import { notFound } from "next/navigation";
import { StudyDeck } from "@/components/study-deck";
import { ensureTestSet } from "@/lib/ensure-test-set";
import { studySnapshot } from "@/lib/queue";

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = await ensureTestSet(slug).catch(() => null);
  if (!set) notFound();

  const initial = await studySnapshot({ setId: set.id });

  return (
    <main className="py-6 sm:px-6 sm:py-10">
      <StudyDeck initial={{ ...initial, set }} />
    </main>
  );
}
