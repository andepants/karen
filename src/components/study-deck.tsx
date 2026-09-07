"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  buryCard,
  rateCard,
  studyMore,
  suspendCard,
  undoLastReview,
} from "@/actions/study";
import { PersonFacts } from "@/components/person-facts";
import { PromptToggle, type PromptSide } from "@/components/prompt-toggle";
import {
  SessionRecap,
  addSessionRating,
  emptySessionScore,
} from "@/components/session-recap";
import { Rating } from "@/lib/fsrs";
import { Button } from "@/components/ui/button";
import { DEFAULT_SESSION } from "@/lib/session-limits";
import type { StudySnapshot } from "@/lib/queue";

const PROMPT_KEY = "karen-prompt";

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

function readPrompt(): PromptSide {
  if (typeof window === "undefined") return "picture";
  return window.sessionStorage.getItem(PROMPT_KEY) === "name" ? "name" : "picture";
}

export function StudyDeck({
  initial,
  sessionGoal = DEFAULT_SESSION,
  sessionSize = DEFAULT_SESSION,
}: {
  initial: StudySnapshot;
  sessionGoal?: number;
  sessionSize?: number;
}) {
  const [item, setItem] = useState(initial.item);
  const [left, setLeft] = useState(initial.remaining);
  const [counts, setCounts] = useState(initial.counts);
  const [intervals, setIntervals] = useState(initial.intervals);
  const [canUndo, setCanUndo] = useState(initial.canUndo);
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [leechNote, setLeechNote] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState(emptySessionScore);
  const [goal, setGoal] = useState(sessionGoal);
  const [prompt, setPrompt] = useState<PromptSide>("picture");
  const [cardPrompt, setCardPrompt] = useState<PromptSide>("picture");
  const startedAt = useRef(Date.now());
  const itemRef = useRef(item);
  const promptRef = useRef<PromptSide>("picture");

  itemRef.current = item;
  promptRef.current = prompt;

  useEffect(() => {
    const stored = readPrompt();
    setPrompt(stored);
    setCardPrompt(stored);
    promptRef.current = stored;
  }, []);

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    setFlipped(false);
    setRevealed(false);
    setCardPrompt(promptRef.current);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [item?.card.id]);

  function run(
    action: () => Promise<StudySnapshot | { error: string } | { ok: true } & StudySnapshot>,
    scored?: { rating: number; timeMs: number },
  ) {
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
      if (scored) {
        setSession((current) => addSessionRating(current, scored.rating, scored.timeMs));
      }
      setFlipped(false);
      setRevealed(false);
      applySnapshot(result, setItem, setLeft, setCounts, setIntervals, setCanUndo);
    });
  }

  function grade(rating: number) {
    if (!itemRef.current) return;
    const current = itemRef.current;
    const timeMs = Date.now() - startedAt.current;
    run(() => rateCard(current.card.id, rating, timeMs), { rating, timeMs });
  }

  if (!item) {
    return (
      <SessionRecap
        setName={initial.set?.name ?? "Study"}
        setId={initial.set?.id}
        session={session}
        pending={pending}
        onStudyMore={() => {
          if (!initial.set?.id) return;
          setSession(emptySessionScore());
          setGoal((current) => current + sessionSize);
          run(() => studyMore(initial.set!.id));
        }}
      />
    );
  }

  const pictureFirst = cardPrompt === "picture";
  const current = session.cards + 1;
  const total = Math.max(goal, current);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5 pb-28">
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
          <span>{left} people due</span>
          <span className="tabular-nums">{elapsed}s</span>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3">
        <p className="font-heading text-3xl tabular-nums">
          {current}
          <span className="text-muted-foreground">/{total}</span>
        </p>
        <PromptToggle
          value={prompt}
          onChange={(value) => {
            setPrompt(value);
            window.sessionStorage.setItem(PROMPT_KEY, value);
          }}
        />
      </div>

      <div className="flashcard-scene w-full">
        <div
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={flipped ? "Hide answer" : "Show answer"}
          className="flashcard-trigger"
          onClick={() => {
            setFlipped((value) => !value);
            setRevealed(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setFlipped((value) => !value);
              setRevealed(true);
            }
          }}
        >
          <div
            key={item.card.id}
            className={`flashcard-inner ${flipped ? "is-flipped" : ""}`}
          >
            <article className="flashcard-face flashcard-front">
              {pictureFirst ? (
                <FacePhoto
                  name={item.person.name}
                  photoUrl={item.person.photoUrl}
                  labeled={false}
                />
              ) : (
                <NameFront name={item.person.name} />
              )}
            </article>
            <article className="flashcard-face flashcard-back">
              {pictureFirst ? (
                <NameAndBio
                  name={item.person.name}
                  description={item.person.description || ""}
                  facts={item.person.facts}
                  title={item.person.title}
                />
              ) : (
                <FacePhoto
                  name={item.person.name}
                  photoUrl={item.person.photoUrl}
                  labeled
                />
              )}
            </article>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-4">
          {revealed ? (
            ratings.map((rating) => (
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
            ))
          ) : (
            <Button
              size="lg"
              className="col-span-2 rounded-full sm:col-span-4"
              onClick={() => {
                setFlipped(true);
                setRevealed(true);
              }}
            >
              Show answer
            </Button>
          )}
        </div>
      </div>

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
          onClick={() => run(() => suspendCard(item.card.id, "note"))}
        >
          Turn Off
        </Button>
      </div>

      {leechNote ? (
        <p className="text-sm text-muted-foreground">
          This card is taking longer to learn.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function FacePhoto({
  name,
  photoUrl,
  labeled,
}: {
  name: string;
  photoUrl: string | null;
  labeled: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={labeled ? name : "Person"}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-secondary font-heading text-7xl">
          {labeled ? name.slice(0, 1) : "?"}
        </div>
      )}
      {labeled ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 pb-5 pt-16">
          <p className="font-heading text-3xl text-white">{name}</p>
        </div>
      ) : null}
    </div>
  );
}

function NameFront({ name }: { name: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-secondary px-6 text-center">
      <h1 className="font-heading text-4xl leading-tight text-balance sm:text-5xl">
        {name}
      </h1>
    </div>
  );
}

function NameAndBio({
  name,
  description,
  facts,
  title,
}: {
  name: string;
  description: string;
  facts?: string[] | null;
  title?: string | null;
}) {
  return (
    <div className="flex h-full flex-col bg-card px-6 py-5">
      <h1 className="shrink-0 font-heading text-3xl leading-tight">{name}</h1>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <PersonFacts
          description={description}
          facts={facts}
          title={title}
          compact
        />
      </div>
    </div>
  );
}
