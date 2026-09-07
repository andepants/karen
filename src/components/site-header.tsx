import Link from "next/link";
import { lockEditor } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { LilyMark } from "./lily-garden";

export function SiteHeader({
  isEditor,
  dueCount,
}: {
  isEditor: boolean;
  dueCount: number;
}) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-5">
      <Link href="/" className="flex items-center gap-2">
        <LilyMark className="h-10 w-8" />
        <span className="font-heading text-xl tracking-wide text-foreground">
          Karen
        </span>
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <Button variant="ghost" asChild>
          <Link href="/sets">Decks</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/people">People</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/study" className="gap-1.5">
            Study
            {dueCount > 0 ? (
              <span className="rounded-full bg-primary/15 px-1.5 text-xs text-primary">
                {dueCount}
              </span>
            ) : null}
          </Link>
        </Button>
        {isEditor ? (
          <form action={lockEditor}>
            <Button variant="outline" type="submit" size="sm">
              Sign Out
            </Button>
          </form>
        ) : null}
      </nav>
    </header>
  );
}
