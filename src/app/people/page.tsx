import { desc, eq } from "drizzle-orm";
import { PeopleGrid } from "@/components/people-grid";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { isEditor } from "@/lib/auth";

export default async function PeoplePage() {
  const editor = await isEditor();
  let roster: (typeof people.$inferSelect)[] = [];
  try {
    const db = getDb();
    roster = editor
      ? await db.select().from(people).orderBy(desc(people.createdAt))
      : await db
          .select()
          .from(people)
          .where(eq(people.archived, false))
          .orderBy(desc(people.createdAt));
  } catch {
    roster = [];
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-heading text-5xl">The roster</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Everyone planted in the garden. Edit names, swap photos, or hide
        someone you no longer need to study.
      </p>
      <div className="mt-8">
        {roster.length === 0 && !editor ? (
          <p className="text-muted-foreground">No people yet. Import a website from the home page.</p>
        ) : (
          <PeopleGrid people={roster} isEditor={editor} />
        )}
      </div>
    </main>
  );
}
