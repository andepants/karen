"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { lockEditor } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { DEFAULT_PROFILE_SLUG, profileHref } from "@/lib/profile-path";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import { LilyMark } from "./lily-garden";

export function SiteHeader({
  isEditor,
  dueCount,
  profileSlug = DEFAULT_PROFILE_SLUG,
}: {
  isEditor: boolean;
  dueCount: number;
  profileSlug?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-5">
      <Link href={profileHref(profileSlug)} className="flex items-center gap-2">
        <LilyMark className="h-10 w-8" />
        <span className="font-heading text-xl tracking-wide text-foreground">
          Karen&apos;s Flashcards
        </span>
      </Link>
      <div ref={menuRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
        {open ? (
          <nav className="absolute right-0 top-12 z-40 flex w-56 flex-col rounded-2xl bg-card p-2 shadow-lg ring-1 ring-border">
            <Link
              href={profileHref(profileSlug, `/study/${DEFAULT_SET_SLUG}`)}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              Study
              {dueCount > 0 ? (
                <span className="rounded-full bg-primary/15 px-1.5 text-xs text-primary">
                  {dueCount}
                </span>
              ) : null}
            </Link>
            <Link
              href={profileHref(profileSlug, "/people")}
              className="rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              Roster
            </Link>
            <Link
              href={profileHref(profileSlug, "/settings")}
              className="rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              Options
            </Link>
            {isEditor ? (
              <form action={lockEditor}>
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-secondary"
                >
                  Sign out
                </button>
              </form>
            ) : null}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
