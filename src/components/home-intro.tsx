import Link from "next/link";
import { KayakScene } from "@/components/kayak-scene";
import { LilyMark } from "@/components/lily-garden";
import { Button } from "@/components/ui/button";

export function HomeIntro({
  href,
  photos,
}: {
  href: string;
  photos: string[];
}) {
  return (
    <main className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6">
      <div className="intro-lily">
        <LilyMark className="h-40 w-32 md:h-52 md:w-40" />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {photos.slice(0, 8).map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className="intro-face size-14 rounded-full object-cover object-top ring-2 ring-background md:size-16"
            style={{ animationDelay: `${280 + index * 140}ms` }}
          />
        ))}
      </div>
      <p className="mt-8 font-heading text-4xl">Karen&apos;s Flashcards</p>
      <p className="mt-2 text-muted-foreground">Learn every face.</p>
      <Button asChild size="lg" className="mt-8 rounded-full px-8">
        <Link href={href}>Start studying</Link>
      </Button>
      <KayakScene />
    </main>
  );
}
