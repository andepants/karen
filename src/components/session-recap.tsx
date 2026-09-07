"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudyRecap } from "@/actions/study";
import { GradeStrip } from "@/components/memory-grades";
import { Button } from "@/components/ui/button";
import { formatStudyTime } from "@/lib/dates";
import type { GradeCounts } from "@/lib/grades";
import { DEFAULT_PROFILE_SLUG, profileHref } from "@/lib/profile-path";

export type SessionScore = {
  again: number;
  hard: number;
  good: number;
  easy: number;
  cards: number;
  timeMs: number;
};

const emptyScore: SessionScore = {
  again: 0,
  hard: 0,
  good: 0,
  easy: 0,
  cards: 0,
  timeMs: 0,
};

export function emptySessionScore(): SessionScore {
  return { ...emptyScore };
}

export function addSessionRating(
  score: SessionScore,
  rating: number,
  timeMs: number,
): SessionScore {
  const next = {
    ...score,
    cards: score.cards + 1,
    timeMs: score.timeMs + Math.max(0, timeMs),
  };
  if (rating === 1) next.again += 1;
  else if (rating === 2) next.hard += 1;
  else if (rating === 3) next.good += 1;
  else if (rating === 4) next.easy += 1;
  return next;
}

export function SessionRecap({
  setName,
  setId,
  session,
  people,
  grades,
  pending,
  onStudyMore,
  profileSlug = DEFAULT_PROFILE_SLUG,
}: {
  setName: string;
  setId?: string;
  session: SessionScore;
  people: number;
  grades: GradeCounts;
  pending: boolean;
  onStudyMore: () => void;
  profileSlug?: string;
}) {
  const [today, setToday] = useState<Awaited<ReturnType<typeof getStudyRecap>> | null>(
    null,
  );
  const overallPeople = today && "ok" in today && today.ok ? today.people : people;
  const overallGrades = today && "ok" in today && today.ok ? today.grades : grades;

  useEffect(() => {
    if (!setId) return;
    let cancelled = false;
    getStudyRecap(setId).then((result) => {
      if (!cancelled) setToday(result);
    });
    return () => {
      cancelled = true;
    };
  }, [setId, session.cards]);

  const sessionRated = session.again + session.hard + session.good + session.easy;
  const sessionPct = sessionRated
    ? Math.round(((session.good + session.easy) / sessionRated) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 rounded-[2rem] bg-card/80 px-6 py-10 shadow-sm">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{setName}</p>
        <h1 className="mt-3 font-heading text-4xl">Nice work.</h1>
        <p className="mt-3 text-muted-foreground">
          That round is done. Here is how you did.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Overall</h2>
        <p className="text-sm text-muted-foreground">
          Letter grades for everyone in the roster. New means not graded yet.
        </p>
        <GradeStrip people={overallPeople} counts={overallGrades} />
      </section>

      {session.cards ? (
        <section className="space-y-3">
          <h2 className="font-heading text-2xl">This session</h2>
          <p className="text-sm text-muted-foreground">
            {session.cards} {session.cards === 1 ? "card" : "cards"} ·{" "}
            {formatStudyTime(session.timeMs)}
          </p>
          <ScoreRow
            again={session.again}
            hard={session.hard}
            good={session.good}
            easy={session.easy}
          />
          <p className="font-heading text-3xl tabular-nums">{sessionPct}%</p>
          <p className="text-sm text-muted-foreground">Remembered (Good or Easy)</p>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-2xl">Today</h2>
        {today && "ok" in today && today.ok ? (
          <>
            <p className="text-sm text-muted-foreground">
              {today.todayCount} {today.todayCount === 1 ? "card" : "cards"} ·{" "}
              {today.todayTime}
            </p>
            <ScoreRow
              again={today.todayRatings.again}
              hard={today.todayRatings.hard}
              good={today.todayRatings.good}
              easy={today.todayRatings.easy}
            />
            <p className="text-sm text-muted-foreground">
              {today.rememberedPct}% remembered
              {today.streak ? ` · ${today.streak} day streak` : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Loading today’s progress…</p>
        )}
      </section>

      <div className="flex justify-center gap-3">
        {setId ? (
          <Button disabled={pending} onClick={onStudyMore}>
            Study more
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link href={profileHref(profileSlug, "/settings")}>Options</Link>
        </Button>
      </div>
    </div>
  );
}

function ScoreRow({
  again,
  hard,
  good,
  easy,
}: {
  again: number;
  hard: number;
  good: number;
  easy: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <Score label="Again" value={again} className="text-rose-700" />
      <Score label="Hard" value={hard} className="text-orange-700" />
      <Score label="Good" value={good} className="text-emerald-700" />
      <Score label="Easy" value={easy} className="text-sky-700" />
    </div>
  );
}

function Score({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="rounded-2xl bg-background/70 px-2 py-3">
      <p className={`font-heading text-2xl tabular-nums ${className}`}>{value}</p>
      <p className="mt-0.5 text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
