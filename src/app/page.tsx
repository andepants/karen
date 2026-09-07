import Link from "next/link";
import { LilyGarden } from "@/components/lily-garden";
import { ImportForm, UnlockForm } from "@/components/import-form";
import { Button } from "@/components/ui/button";
import { isEditor } from "@/lib/auth";
import { ensureTestSet } from "@/lib/ensure-test-set";
import { GARDEN_TEST_SLUG } from "@/lib/seed-data";

export default async function HomePage() {
  const editor = await isEditor();
  const garden = await ensureTestSet(GARDEN_TEST_SLUG).catch(() => null);

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
        {garden ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full px-6" asChild>
              <Link href={`/study/${garden.slug}`}>Study Garden Test</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sets">All sets</Link>
            </Button>
          </div>
        ) : null}
        <div className="mt-10 space-y-8 rounded-[2rem] bg-card/70 p-6 shadow-sm ring-1 ring-border backdrop-blur-sm md:p-8">
          {!editor ? <UnlockForm /> : null}
          <ImportForm isEditor={editor} />
        </div>
      </div>
    </main>
  );
}
