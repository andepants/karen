import Link from "next/link";
import { LilyGarden } from "@/components/lily-garden";
import { ImportForm, UnlockForm } from "@/components/import-form";
import { Button } from "@/components/ui/button";
import { isEditor } from "@/lib/auth";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export default async function HomePage() {
  const editor = await isEditor();
  const deck = await ensureDefaultSet().catch(() => null);
  const studyHref = deck ? `/study/${deck.slug}` : `/study/${DEFAULT_SET_SLUG}`;

  return (
    <main className="relative overflow-hidden px-6 pb-40 pt-8 md:pt-16">
      <LilyGarden />
      <div className="relative z-10 mx-auto max-w-xl">
        <h1 className="font-heading text-6xl leading-none text-balance md:text-7xl">
          Flashcards
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Learn the Austin Area OBGYN team.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" className="rounded-full px-8" asChild>
            <Link href={studyHref}>Study</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/people">People</Link>
          </Button>
        </div>
        <div className="mt-12 space-y-8 rounded-[2rem] bg-card/70 p-6 shadow-sm ring-1 ring-border backdrop-blur-sm md:p-8">
          {!editor ? <UnlockForm /> : null}
          <ImportForm isEditor={editor} />
        </div>
      </div>
    </main>
  );
}
