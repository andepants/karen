"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  buryCard,
  rateCard,
  suspendCard,
  undoLastReview,
} from "@/actions/study";
import { Rating, stateLabel } from "@/lib/fsrs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StudySnapshot } from "@/lib/queue";

const ratings = [
  { value: Rating.Again, label: "Again", hint: "Forgot" },
  { value: Rating.Hard, label: "Hard", hint: "Struggled" },
  { value: Rating.Good, label: "Good", hint: "Recalled" },
  { value: Rating.Easy, label: "Easy", hint: "Instant" },
] as const;

function applySnapshot(
  snapshot: StudySnapshot,
  setItem: (value: StudySnapshot["item"]) => void,
  setLeft: (value: number) => void,
  setCounts: (value: StudySnapshot["counts"]) => void,
  setIntervals: (value: StudySnapshot["intervals"]) => void,
  setCanUndo: (value: boolean) => void,
) {
  setItem(snapshot.item);
  setLeft(snapshot.remaining);
  setCounts(snapshot.counts);
  setIntervals(snapshot.intervals);
  setCanUndo(snapshot.canUndo);
}

export function StudyDeck({
  initial,
  setSlug,
}: {
  initial: StudySnapshot;
  setSlug?: string;
}) {
  const [item, setItem] = useState(initial.item);
  const [left, setLeft] = useState(initial.remaining);
  const [counts, setCounts] = useState(initial.counts);
  const [intervals, setIntervals] = useState(initial.intervals);
  const [canUndo, setCanUndo] = useState(initial.canUndo);
  const [flipped, setFlipped] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [leechNote, setLeechNote] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const flippedRef = useRef(false);
  const itemRef = useRef(item);
  const pendingRef = useRef(pending);

  flippedRef.current = flipped;
  itemRef.current = item;
  pendingRef.current = pending;

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [item?.card.id]);

  function run(action: () => Promise<StudySnapshot | { error: string } | { ok: true } & StudySnapshot>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if (!("item" in result)) return;
      if ("leech" in result) setLeechNote(Boolean(result.leech));
      else setLeechNote(false);
      setFlipped(false);
      applySnapshot(result, setItem, setLeft, setCounts, setIntervals, setCanUndo);
    });
  }

  function grade(rating: number) {
    if (!itemRef.current) return;
    const current = itemRef.current;
    run(() =>
      rateCard(current.card.id, rating, Date.now() - startedAt.current),
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      if (pendingRef.current) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        run(() => undoLastReview(initial.set?.id));
        return;
      }

      if (!itemRef.current) return;

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!flippedRef.current) setFlipped(true);
        else grade(Rating.Good);
        return;
      }

      if (!flippedRef.current) {
        if (event.key === "1") setFlipped(true);
        return;
      }

      if (event.key === "1") grade(Rating.Again);
      if (event.key === "2") grade(Rating.Hard);
      if (event.key === "3") grade(Rating.Good);
      if (event.key === "4") grade(Rating.Easy);
      if (event.key === "-") run(() => buryCard(itemRef.current!.card.id, "card"));
      if (event.key === "=") run(() => buryCard(itemRef.current!.card.id, "note"));
      if (event.key === "@") run(() => suspendCard(itemRef.current!.card.id, "card"));
      if (event.key === "!") run(() => suspendCard(itemRef.current!.card.id, "note"));
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [initial.set?.id]);

  const overviewHref = setSlug ? `/sets/${setSlug}` : "/sets";

  if (!item) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl bg-card/80 px-8 py-16 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {initial.set?.name ?? "Study"}
        </p>
        <h1 className="mt-3 font-heading text-4xl">You&apos;re all caught up.</h1>
        <p className="mt-3 text-muted-foreground">
          Come back tomorrow for more cards.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link href={overviewHref}>Done</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sets">Decks</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isNameCard = item.card.kind === "name";

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm">
        <div className="flex gap-3 text-muted-foreground">
          <span>
            <em className="not-italic text-sky-700">{counts.new}</em> new
          </span>
          <span>
            <em className="not-italic text-rose-700">{counts.learning}</em> learn
          </span>
          <span>
            <em className="not-italic text-emerald-700">{counts.review}</em> review
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>{left} due</span>
          <span className="tabular-nums">{elapsed}s</span>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{stateLabel(item.card.state)}</Badge>
          <Badge variant="secondary">
            {isNameCard ? "Name card" : "Photo card"}
          </Badge>
          {item.card.leech ? <Badge variant="destructive">Hard</Badge> : null}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={overviewHref}>Back</Link>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="w-full text-left"
      >
        <article
          key={`${item.card.id}-${flipped ? "back" : "front"}`}
          className="overflow-hidden rounded-[2rem] bg-card shadow-sm ring-1 ring-border"
        >
          {isNameCard && !flipped ? (
            <div className="flex aspect-[4/5] flex-col items-center justify-center bg-secondary px-6 text-center">
              <p className="text-sm text-muted-foreground">Name</p>
              <h1 className="mt-3 font-heading text-5xl">{item.person.name}</h1>
            </div>
          ) : item.person.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.person.photoUrl}
              alt={flipped || isNameCard ? item.person.name : "Person"}
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
                  {item.person.description || ""}
                </p>
              </>
            ) : (
              <p className="font-heading text-2xl text-muted-foreground">
                {isNameCard ? "What do they look like?" : "What is their name?"}
              </p>
            )}
          </div>
        </article>
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
                {intervals?.[rating.value] ?? rating.hint}
              </span>
            </Button>
          ))}
        </div>
      ) : (
        <Button size="lg" className="rounded-full px-8" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}

      <div className="flex w-full flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !canUndo}
          onClick={() => run(() => undoLastReview(initial.set?.id))}
        >
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => buryCard(item.card.id, "card"))}
        >
          Skip
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => buryCard(item.card.id, "note"))}
        >
          Skip Both
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => suspendCard(item.card.id, "card"))}
        >
          Turn Off
        </Button>
      </div>

      <p className="max-w-md text-center text-xs text-muted-foreground">
        Space to flip. 1–4 to rate.
      </p>
      {leechNote ? (
        <p className="text-sm text-muted-foreground">
          This card is taking longer to learn.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
