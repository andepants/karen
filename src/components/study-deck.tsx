"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  buryCard,
  lockStudySample,
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
import { emptyGradeCounts } from "@/lib/grades";
import { Rating } from "@/lib/fsrs";
import { Button } from "@/components/ui/button";
import { DEFAULT_SESSION, roundSize } from "@/lib/session-limits";
import type { StudyItem, StudySnapshot } from "@/lib/queue";

const PROMPT_KEY = "karen-prompt";

const ratings = [
  { value: Rating.Again, label: "Again", hint: "Forgot" },
  { value: Rating.Hard, label: "Hard", hint: "Struggled" },
  { value: Rating.Good, label: "Good", hint: "Recalled" },
  { value: Rating.Easy, label: "Easy", hint: "Instant" },
] as const;

type DeckState = {
  item: StudySnapshot["item"];
  upcoming: StudyItem[];
  intervals: StudySnapshot["intervals"];
  nextIntervals: StudySnapshot["nextIntervals"];
  canUndo: boolean;
  people: number;
  grades: StudySnapshot["grades"];
};

function snapshotToDeck(snapshot: StudySnapshot): DeckState {
  return {
    item: snapshot.item,
    upcoming: snapshot.upcoming ?? [],
    intervals: snapshot.intervals,
    nextIntervals: snapshot.nextIntervals ?? null,
    canUndo: snapshot.canUndo,
    people: snapshot.people,
    grades: snapshot.grades ?? emptyGradeCounts(),
  };
}

function advanceDeck(current: DeckState): DeckState {
  const [next, ...rest] = current.upcoming;
  return {
    ...current,
    item: next ?? null,
    upcoming: rest,
    intervals: current.nextIntervals,
    nextIntervals: null,
    canUndo: true,
  };
}

function readPrompt(): PromptSide {
  if (typeof window === "undefined") return "picture";
  return window.sessionStorage.getItem(PROMPT_KEY) === "name" ? "name" : "picture";
}

function photoUrlsFor(items: Array<StudyItem | null | undefined>) {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const url = item?.person.photoUrl;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function StudyDeck({
  initial,
}: {
  initial: StudySnapshot;
}) {
  const sessionSize = roundSize(initial.roundSize || DEFAULT_SESSION);
  const [deck, setDeck] = useState(() => snapshotToDeck(initial));
  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [leechNote, setLeechNote] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [session, setSession] = useState(emptySessionScore);
  const [prompt, setPrompt] = useState<PromptSide>("picture");
  const [cardPrompt, setCardPrompt] = useState<PromptSide>("picture");
  const startedAt = useRef(Date.now());
  const deckRef = useRef(deck);
  const promptRef = useRef<PromptSide>("picture");
  const sampleRef = useRef(initial.samplePersonIds);
  const flightRef = useRef(0);
  const gradingCardId = useRef<string | null>(null);

  deckRef.current = deck;
  promptRef.current = prompt;

  useEffect(() => {
    const stored = readPrompt();
    setPrompt(stored);
    setCardPrompt(stored);
    promptRef.current = stored;
  }, []);

  useEffect(() => {
    const setId = initial.set?.id;
    const personIds = sampleRef.current;
    if (!setId || !personIds.length) return;
    void lockStudySample(setId, personIds);
  }, [initial.set?.id]);

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    setFlipped(false);
    setRevealed(false);
    setCardPrompt(promptRef.current);
    if (gradingCardId.current !== deck.item?.card.id) {
      gradingCardId.current = null;
    }
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [deck.item?.card.id]);

  function applyServerSnapshot(snapshot: StudySnapshot) {
    if (snapshot.samplePersonIds?.length) {
      sampleRef.current = snapshot.samplePersonIds;
    }
    setDeck(snapshotToDeck(snapshot));
  }

  function run(
    action: () => Promise<StudySnapshot | { error: string } | { ok: true } & StudySnapshot>,
    options?: { rating?: number; timeMs?: number; optimistic?: boolean },
  ) {
    setError(null);
    const previous = deckRef.current;
    const flight = ++flightRef.current;
    if (options?.optimistic && previous.item) {
      setFlipped(false);
      setRevealed(false);
      setDeck(advanceDeck(previous));
      if (options.rating != null && options.timeMs != null) {
        setSession((current) =>
          addSessionRating(current, options.rating!, options.timeMs!),
        );
      }
    }
    startTransition(async () => {
      const result = await action();
      if (flight !== flightRef.current) return;
      if ("error" in result && result.error) {
        setDeck(previous);
        setError(result.error);
        return;
      }
      if (!("item" in result)) return;
      if ("leech" in result) setLeechNote(Boolean(result.leech));
      else setLeechNote(false);
      if (
        options?.rating != null &&
        options.timeMs != null &&
        !options.optimistic
      ) {
        setSession((current) =>
          addSessionRating(current, options.rating!, options.timeMs!),
        );
      }
      applyServerSnapshot(result);
    });
  }

  function grade(rating: number) {
    const current = deckRef.current.item;
    if (!current || gradingCardId.current === current.card.id) return;
    gradingCardId.current = current.card.id;
    const timeMs = Date.now() - startedAt.current;
    run(() => rateCard(current.card.id, rating, timeMs, sampleRef.current), {
      rating,
      timeMs,
      optimistic: true,
    });
  }

  const item = deck.item;
  if (!item || session.cards >= sessionSize) {
    return (
      <div className="px-6">
        <SessionRecap
          setName={initial.set?.name ?? "Study"}
          setId={initial.set?.id}
          session={session}
          people={deck.people}
          grades={deck.grades}
          profileSlug={initial.profileSlug}
          pending={pending}
          onStudyMore={() => {
            if (!initial.set?.id) return;
            setSession(emptySessionScore());
            sampleRef.current = [];
            run(() => studyMore(initial.set!.id, sessionSize));
          }}
        />
      </div>
    );
  }

  const pictureFirst = cardPrompt === "picture";
  const current = session.cards + 1;
  const total = sessionSize;
  const preloadUrls = photoUrlsFor([item, ...deck.upcoming.slice(0, 4)]);

  return (
    <div className="flex w-full flex-col items-center gap-5 pb-28">
      <PhotoPreload urls={preloadUrls} />
      <div className="flex w-full max-w-lg items-center justify-between gap-3 px-6">
        <div className="flex items-baseline gap-3">
          <p className="font-heading text-3xl tabular-nums">
            {current}
            <span className="text-muted-foreground">/{total}</span>
          </p>
          <span className="text-sm tabular-nums text-muted-foreground">{elapsed}s</span>
        </div>
        <PromptToggle
          value={prompt}
          onChange={(value) => {
            setPrompt(value);
            window.sessionStorage.setItem(PROMPT_KEY, value);
          }}
        />
      </div>

      <div className="flashcard-scene w-full max-w-lg">
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
          <div className={`flashcard-inner ${flipped ? "is-flipped" : ""}`}>
            <article className="flashcard-face flashcard-front">
              {pictureFirst ? (
                <FacePhoto
                  name={item.person.name}
                  photoUrl={item.person.photoUrl}
                  labeled={false}
                  priority
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
                  priority
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
                variant={rating.value === Rating.Again ? "destructive" : "secondary"}
                className="h-auto flex-col rounded-2xl py-3"
                onClick={() => grade(rating.value)}
              >
                <span>{rating.label}</span>
                <span className="text-[10px] font-normal opacity-70">
                  {deck.intervals?.[rating.value] ?? rating.hint}
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

      <div className="flex w-full max-w-lg flex-wrap justify-center gap-2 px-6">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || !deck.canUndo}
          onClick={() => run(() => undoLastReview(initial.set?.id, sampleRef.current))}
        >
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => buryCard(item.card.id, "card", sampleRef.current), {
              optimistic: true,
            })
          }
        >
          Skip
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => suspendCard(item.card.id, "note", sampleRef.current), {
              optimistic: true,
            })
          }
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

function PhotoPreload({ urls }: { urls: string[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
    >
      {urls.map((url) => (
        <Image
          key={url}
          src={url}
          alt=""
          width={512}
          height={640}
          sizes="(max-width: 640px) 100vw, 512px"
          quality={75}
        />
      ))}
    </div>
  );
}

function FacePhoto({
  name,
  photoUrl,
  labeled,
  priority = false,
}: {
  name: string;
  photoUrl: string | null;
  labeled: boolean;
  priority?: boolean;
}) {
  return (
    <div className="relative h-full w-full">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={labeled ? name : "Person"}
          fill
          sizes="(max-width: 640px) 100vw, 512px"
          quality={75}
          className="object-cover object-top"
          priority={priority}
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
