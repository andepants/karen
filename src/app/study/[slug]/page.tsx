import { notFound } from "next/navigation";
import { StudyDeck } from "@/components/study-deck";
import { ensureTestSet } from "@/lib/ensure-test-set";
import { studySnapshot } from "@/lib/queue";
import { DEFAULT_SESSION } from "@/lib/session-limits";
import { getStudyPrefs } from "@/lib/session-prefs";

export default async function StudySetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const set = await ensureTestSet(slug).catch(() => null);
  if (!set) notFound();

  const [initial, prefs] = await Promise.all([
    studySnapshot({ setId: set.id }),
    getStudyPrefs(),
  ]);

  return (
    <main className="px-6 py-10">
      <StudyDeck
        initial={{ ...initial, set }}
        sessionGoal={prefs.session + prefs.bonus || DEFAULT_SESSION}
        sessionSize={prefs.session || DEFAULT_SESSION}
      />
    </main>
  );
}
