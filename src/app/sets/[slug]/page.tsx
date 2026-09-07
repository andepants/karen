import { notFound } from "next/navigation";
import { DeckOverview } from "@/components/deck-overview";
import { dueCount, studyCounts } from "@/lib/queue";
import { getSetBySlug } from "@/lib/sets";

export default async function SetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = await getSetBySlug(slug).catch(() => null);
  if (!set) notFound();

  const [counts, remaining] = await Promise.all([
    studyCounts({ setId: set.id }),
    dueCount({ setId: set.id }),
  ]);

  return (
    <main className="px-6 py-10">
      <DeckOverview set={set} counts={counts} remaining={remaining} />
    </main>
  );
}
