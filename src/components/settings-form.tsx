"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resetStudyBonus, saveStudySettings } from "@/actions/settings";
import { studyMore } from "@/actions/study";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SettingsForm({
  session,
  setId,
}: {
  session: number;
  setId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl">Session</h2>
      <form
        className="space-y-3"
        action={async (formData) => {
          await saveStudySettings(formData);
          router.refresh();
        }}
      >
        <Label htmlFor="session">Cards per session</Label>
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
        <Button type="submit">Save</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {setId ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await studyMore(setId);
                router.push(`/study/aaobgyn`);
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
