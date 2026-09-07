"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-heading text-4xl">That page is gone.</p>
      <p className="text-muted-foreground">Taking you back home.</p>
      <Link href="/" className="text-sm text-primary underline">
        Go to the home page
      </Link>
    </main>
  );
}
