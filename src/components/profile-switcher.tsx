"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createStudyProfile } from "@/actions/profiles";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { profileHref } from "@/lib/profile-path";

export function ProfileSwitcher({
  profiles,
  activeSlug,
  shareOrigin,
}: {
  profiles: { slug: string; name: string }[];
  activeSlug: string;
  shareOrigin?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shareUrl = shareOrigin ? `${shareOrigin}${profileHref(activeSlug)}` : "";

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createStudyProfile(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setName("");
      router.push(result.href);
    });
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <p className="text-center text-sm text-muted-foreground">Who is studying?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {profiles.map((profile) => {
          const selected = profile.slug === activeSlug;
          return (
            <Link
              key={profile.slug}
              href={profileHref(profile.slug)}
              aria-current={selected ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm ring-1 transition-colors ${
                selected
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card/80 text-foreground ring-border hover:bg-secondary"
              }`}
            >
              {profile.name}
            </Link>
          );
        })}
        <button
          type="button"
          aria-label="Add a profile"
          onClick={() => setOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-full bg-card/80 text-foreground ring-1 ring-border hover:bg-secondary"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {shareUrl ? (
        <p className="text-center text-xs text-muted-foreground">
          Share this desk:{" "}
          <span className="break-all text-foreground">{shareUrl}</span>
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a profile</DialogTitle>
            <DialogDescription>
              Just a name. Each person gets their own progress, grades, and
              session settings. Send them <code>/p/their-name</code>.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              create();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                autoFocus
                maxLength={40}
                placeholder="Alex"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={pending || !name.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
