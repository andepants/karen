import Link from "next/link";
import { LilyMark } from "@/components/lily-garden";
import { Button } from "@/components/ui/button";

export function HomeIntro({
  href,
  faces,
}: {
  href: string;
  faces: { id: string; name: string; photoUrl: string }[];
}) {
  return (
    <main className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-6">
      <div className="intro-lily">
        <LilyMark className="h-40 w-32 md:h-52 md:w-40" />
      </div>
      <div className="mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
        {faces.map((face, index) => (
          <Link
            key={face.id}
            href={`/people/${face.id}`}
            title={face.name}
            className="intro-face"
            style={{ animationDelay: `${200 + index * 28}ms` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={face.photoUrl}
              alt={face.name}
              className="size-12 rounded-full object-cover object-top ring-2 ring-background md:size-14"
            />
          </Link>
        ))}
      </div>
      <p className="mt-8 font-heading text-4xl">Karen&apos;s Flashcards</p>
      <p className="mt-2 text-muted-foreground">Learn every face.</p>
      <Button asChild size="lg" className="mt-8 rounded-full px-8">
        <Link href={href}>Start studying</Link>
      </Button>
    </main>
  );
}
