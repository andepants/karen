"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetStudyBonus, resetStudyProgress, saveStudySettings } from "@/actions/settings";
import { studyMore } from "@/actions/study";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_PROFILE_SLUG, profileHref } from "@/lib/profile-path";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";
import {
  DEFAULT_SESSION,
  SESSION_MAX,
  SESSION_MIN,
  SESSION_STEP,
  snapSession,
} from "@/lib/session-limits";

export function SettingsForm({
  session,
  burySiblings,
  setId,
  profileSlug = DEFAULT_PROFILE_SLUG,
}: {
  session: number;
  burySiblings: boolean;
  setId?: string;
  profileSlug?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(snapSession(session || DEFAULT_SESSION));

  function persist(nextSession = value, form?: HTMLFormElement | null) {
    const data = new FormData(form ?? undefined);
    data.set("session", String(nextSession));
    if (!form) {
      if (burySiblings) data.set("burySiblings", "on");
    }
    startTransition(async () => {
      await saveStudySettings(data);
      router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-heading text-3xl">How you study</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These stay on this profile. Other people keep their own settings.
        </p>
      </div>
      <form
        className="space-y-5"
        action={async (formData) => {
          formData.set("session", String(value));
          await saveStudySettings(formData);
          router.refresh();
        }}
      >
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="session">Cards in a round</Label>
            <p className="font-heading text-3xl tabular-nums">{value}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            One round is this many cards, then you get a recap. Study more starts another round.
          </p>
          <input
            id="session"
            name="session"
            type="range"
            min={SESSION_MIN}
            max={SESSION_MAX}
            step={SESSION_STEP}
            value={value}
            onChange={(event) => setValue(snapSession(Number(event.target.value)))}
            onPointerUp={(event) =>
              persist(
                snapSession(Number(event.currentTarget.value)),
                event.currentTarget.form,
              )
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            style={{ accentColor: "var(--primary)" }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{SESSION_MIN}</span>
            <span>{SESSION_MAX}</span>
          </div>
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-card/80 px-4 py-3 ring-1 ring-border">
          <input
            type="checkbox"
            name="burySiblings"
            defaultChecked={burySiblings}
            className="mt-1 size-4 rounded border-input"
          />
          <span>
            <span className="block text-sm font-medium">One card per person</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              After you rate someone, their other card waits until tomorrow.
            </span>
          </span>
        </label>
        <Button type="submit">Save</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {setId ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await studyMore(setId);
                router.push(profileHref(profileSlug, `/study/${DEFAULT_SET_SLUG}`));
              })
            }
          >
            Study more
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await resetStudyBonus();
              router.refresh();
            })
          }
        >
          Reset extra
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                "Clear this profile’s reviews and start their deck from scratch?",
              )
            ) {
              return;
            }
            startTransition(async () => {
              await resetStudyProgress();
              router.refresh();
            });
          }}
        >
          Start over
        </Button>
      </div>
    </section>
  );
}
