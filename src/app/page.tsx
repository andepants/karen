<<<<<<< HEAD
import { LilyGarden } from "@/components/lily-garden";
import { KayakScene } from "@/components/kayak-scene";
import { ImportForm, UnlockForm } from "@/components/import-form";
import { isEditor } from "@/lib/auth";
=======
import { HomeIntro } from "@/components/home-intro";
import { getDb } from "@/db";
import { people } from "@/db/schema";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { and, eq, isNotNull } from "drizzle-orm";
>>>>>>> origin/cursor/anki-sets-seed-52fa

export default async function HomePage() {
  const deck = await ensureDefaultSet().catch(() => null);
  const studyHref = deck ? `/study/${deck.slug}` : `/study/${DEFAULT_SET_SLUG}`;
  let faces: { id: string; name: string; photoUrl: string }[] = [];
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: people.id,
        name: people.name,
        photoUrl: people.photoUrl,
      })
      .from(people)
      .where(and(eq(people.archived, false), isNotNull(people.photoUrl)));
    faces = rows
      .filter((row): row is { id: string; name: string; photoUrl: string } =>
        Boolean(row.photoUrl),
      )
      .sort(() => Math.random() - 0.5);
  } catch {
    faces = [];
  }

<<<<<<< HEAD
  return (
    <main className="relative overflow-hidden px-6 pb-40 pt-8 md:pt-16">
      <LilyGarden />
      <div className="relative z-10 mx-auto max-w-2xl">
        <p className="text-sm tracking-[0.25em] text-primary uppercase">
          Face garden
        </p>
        <h1 className="mt-3 font-heading text-5xl leading-[0.95] text-balance md:text-7xl">
          Learn every name like a lily you have already met.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Paste a team page. Karen gathers names, photos, and descriptions,
          then surfaces the faces you keep missing — the same spaced
          repetition family Anki uses.
        </p>
        <div className="mt-10 space-y-8 rounded-[2rem] bg-card/70 p-6 shadow-sm ring-1 ring-border backdrop-blur-sm md:p-8">
          {!editor ? <UnlockForm /> : null}
          <ImportForm isEditor={editor} />
        </div>
        <KayakScene />
      </div>
    </main>
  );
=======
  return <HomeIntro href={studyHref} faces={faces} />;
>>>>>>> origin/cursor/anki-sets-seed-52fa
}
