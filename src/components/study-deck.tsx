"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { rateCard } from "@/actions/study";
import { Rating } from "@/lib/fsrs";
import { Button } from "@/components/ui/button";
import type { cards, people } from "@/db/schema";

type Item = {
  card: typeof cards.$inferSelect;
  person: typeof people.$inferSelect;
};

const ratings = [
  { value: Rating.Again, label: "Again", hint: "Soon" },
  { value: Rating.Hard, label: "Hard", hint: "Sooner" },
  { value: Rating.Good, label: "Good", hint: "On track" },
  { value: Rating.Easy, label: "Easy", hint: "Later" },
] as const;

export function StudyDeck({
  initial,
  remaining,
}: {
  initial: Item | null;
  remaining: number;
}) {
  const [item, setItem] = useState(initial);
  const [left, setLeft] = useState(remaining);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!item) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-card/80 px-8 py-16 text-center shadow-sm">
        <h1 className="font-heading text-4xl">The garden is quiet</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing is due right now. Come back later, or add more people to the
          roster.
        </p>
      </div>
    );
  }

  function grade(rating: number) {
    if (!item) return;
    const current = item;
    setError(null);
    startTransition(async () => {
      const result = await rateCard(current.card.id, rating);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setFlipped(false);
      setLeft(result.remaining ?? 0);
      setItem(result.item ?? null);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6">
      <p className="text-sm tracking-widest text-muted-foreground uppercase">
        {left} due
      </p>
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="w-full text-left"
      >
        <motion.article
          key={`${item.card.id}-${flipped ? "back" : "front"}`}
          initial={{ rotateY: 12, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          className="overflow-hidden rounded-[2rem] bg-card shadow-sm ring-1 ring-border"
        >
          {item.person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.person.photoUrl}
              alt={flipped ? item.person.name : "Mystery person"}
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center bg-secondary font-heading text-7xl">
              {flipped ? item.person.name.slice(0, 1) : "?"}
            </div>
          )}
          <div className="px-6 py-5">
            {flipped ? (
              <>
                <h1 className="font-heading text-4xl">{item.person.name}</h1>
                <p className="mt-2 text-muted-foreground">
                  {item.person.description || "No description yet"}
                </p>
              </>
            ) : (
              <p className="font-heading text-2xl text-muted-foreground">
                Who is this? Tap to reveal.
              </p>
            )}
          </div>
        </motion.article>
      </button>

      {flipped ? (
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
          {ratings.map((rating) => (
            <Button
              key={rating.value}
              disabled={pending}
              variant={rating.value === Rating.Again ? "destructive" : "secondary"}
              className="h-auto flex-col rounded-2xl py-3"
              onClick={() => grade(rating.value)}
            >
              <span>{rating.label}</span>
              <span className="text-[10px] font-normal opacity-70">
                {rating.hint}
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <Button size="lg" className="rounded-full px-8" onClick={() => setFlipped(true)}>
          Show name
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
