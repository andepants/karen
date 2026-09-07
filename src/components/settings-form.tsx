"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetStudyBonus, saveStudySettings } from "@/actions/settings";
import { studyMore } from "@/actions/study";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_SET_SLUG } from "@/lib/seed-data";

export function SettingsForm({
  session,
  burySiblings,
  setId,
}: {
  session: number;
  burySiblings: boolean;
  setId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-heading text-3xl">How you study</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These stay on this browser. They do not change the shared deck.
        </p>
      </div>
      <form
        className="space-y-5"
        action={async (formData) => {
          await saveStudySettings(formData);
          router.refresh();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="session">Cards per session</Label>
          <p className="text-sm text-muted-foreground">
            New cards you can start in a day. Study more adds extra when you finish.
          </p>
          <select
            id="session"
            name="session"
            defaultValue={session}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {[20, 40, 80, 120].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
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
              Hide the matching photo or name card until tomorrow.
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
                router.push(`/study/${DEFAULT_SET_SLUG}`);
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
      </div>
    </section>
  );
}
