"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { unsuspendPerson } from "@/actions/study";
import { Button } from "@/components/ui/button";

export function TurnedOffList({
  people,
}: {
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-3xl">Turned off</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These people stay out of study until you add them back.
        </p>
      </div>
      {people.length ? (
        <ul className="divide-y divide-border/70 rounded-[1.75rem] bg-card/80 ring-1 ring-border">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <span className="text-sm">{person.name}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await unsuspendPerson(person.id);
                    router.refresh();
                  })
                }
              >
                Add back
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No one is turned off. Use Turn Off on a card to hide that person.
        </p>
      )}
    </section>
  );
}
