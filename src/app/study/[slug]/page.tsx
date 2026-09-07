import { notFound } from "next/navigation";
import { StudyDeck } from "@/components/study-deck";
import { studySnapshot } from "@/lib/queue";
import { getSetBySlug } from "@/lib/sets";

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = await getSetBySlug(slug).catch(() => null);
  if (!set) notFound();

  const initial = await studySnapshot({ setId: set.id });

  return (
    <main className="px-6 py-10">
      <StudyDeck initial={{ ...initial, set }} setSlug={set.slug} />
    </main>
  );
}
