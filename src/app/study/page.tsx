import { StudyDeck } from "@/components/study-deck";
import { dueQueue } from "@/lib/queue";

export default async function StudyPage() {
  let queue: Awaited<ReturnType<typeof dueQueue>> = [];
  try {
    queue = await dueQueue();
  } catch {
    queue = [];
  }

  return (
    <main className="px-6 py-10">
      <StudyDeck initial={queue[0] ?? null} remaining={queue.length} />
    </main>
  );
}
