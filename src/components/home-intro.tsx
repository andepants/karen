import Image from "next/image";
import Link from "next/link";
import { KayakScene } from "@/components/kayak-scene";
import { LilyMark } from "@/components/lily-garden";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { Button } from "@/components/ui/button";
import { profileHref } from "@/lib/profile-path";

export function HomeIntro({
  href,
  faces,
  profiles,
  activeSlug,
  shareOrigin,
}: {
  href: string;
  faces: { id: string; name: string; photoUrl: string }[];
  profiles: { slug: string; name: string }[];
  activeSlug: string;
  shareOrigin?: string;
}) {
  return (
    <main className="relative flex min-h-[calc(100dvh-5.5rem)] flex-col items-center overflow-x-hidden pt-4">
      <div className="flex w-full flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="intro-lily">
          <LilyMark className="h-40 w-32 md:h-52 md:w-40" />
        </div>
        <div className="relative z-10 mb-2">
          <ProfileSwitcher
            profiles={profiles}
            activeSlug={activeSlug}
            shareOrigin={shareOrigin}
          />
        </div>
        <div className="mt-8 flex max-w-3xl flex-wrap justify-center gap-2">
          {faces.map((face, index) => (
            <Link
              key={face.id}
              href={profileHref(activeSlug, `/people/${face.id}`)}
              title={face.name}
              className="intro-face"
              style={{ animationDelay: `${200 + index * 28}ms` }}
            >
              <Image
                src={face.photoUrl}
                alt={face.name}
                width={112}
                height={112}
                sizes="56px"
                quality={65}
                preload={index < 8}
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
      </div>
      <KayakScene />
    </main>
  );
}
