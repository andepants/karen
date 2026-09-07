import { timeZoneLabel } from "@/lib/dates";
import { gradeTone, MEMORY_GRADES } from "@/lib/grades";
import type { ProgressSnapshot } from "@/lib/progress";

export function ProgressDashboard({
  progress,
  remaining,
  people,
  bonus,
  gradeCounts,
}: {
  progress: ProgressSnapshot;
  remaining: number;
  people: number;
  cards: number;
  bonus: number;
  gradeCounts: Record<string, number>;
}) {
  const maxDay = Math.max(1, ...progress.days.map((day) => day.count));
  const ratingTotal =
    progress.ratings.again +
    progress.ratings.hard +
    progress.ratings.good +
    progress.ratings.easy;
  const rememberedPct = ratingTotal
    ? Math.round((progress.remembered / ratingTotal) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="font-heading text-3xl">Progress</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards you finished each day, counted by person in the roster.
        </p>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={progress.today.count} hint="cards" />
        <Stat
          label="Streak"
          value={progress.streak}
          hint={progress.streak === 1 ? "day" : "days"}
        />
        <Stat label="All time" value={progress.totalReviews} hint="reviews" />
        <Stat label="Time" value={progress.totalTimeLabel} hint="studied" />
      </section>

      <section className="rounded-[2rem] bg-card/80 p-5 ring-1 ring-border sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-3xl">Each day</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              How many cards you finished. Days use {timeZoneLabel(progress.timeZone)}.
            </p>
          </div>
          {progress.bestDay ? (
            <p className="hidden text-right text-sm text-muted-foreground sm:block">
              Best day
              <span className="mt-0.5 block font-heading text-2xl text-foreground">
                {progress.bestDay.count}
              </span>
            </p>
          ) : null}
        </div>

        <ol className="mt-6 flex h-40 items-end gap-1.5">
          {progress.days.map((day) => {
            const height = day.count ? Math.max(8, (day.count / maxDay) * 100) : 3;
            return (
              <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {day.count || ""}
                </span>
                <div
                  className={`w-full rounded-t-md ${
                    day.isToday
                      ? "bg-primary"
                      : day.count
                        ? "bg-primary/55"
                        : "bg-border"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${day.fullLabel}: ${day.count} cards`}
                  aria-label={`${day.fullLabel}, ${day.count} cards`}
                />
                <span
                  className={`text-[10px] tracking-wide uppercase ${
                    day.isToday ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {day.weekday.slice(0, 1)}
                </span>
              </li>
            );
          })}
        </ol>

        {progress.recentDays.length ? (
          <ol className="mt-6 divide-y divide-border/70">
            {progress.recentDays.map((day) => (
              <li
                key={day.date}
                className="flex items-baseline justify-between gap-4 py-2.5 text-sm"
              >
                <span className={day.isToday ? "text-foreground" : "text-muted-foreground"}>
                  {day.isToday ? "Today" : day.fullLabel}
                </span>
                <span className="tabular-nums">
                  {day.count}{" "}
                  <span className="text-muted-foreground">
                    · {day.newCount} new · {day.reviewCount} review
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Study a few cards and each day will show up here.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Fact
          label="Due now"
          value={String(remaining)}
          detail={
            bonus
              ? `${bonus} extra cards unlocked for more rounds today`
              : `${people} people · photo and name cards for each`
          }
        />
        <Fact
          label="People met"
          value={`${progress.uniquePeople} / ${people}`}
          detail={
            progress.favorite
              ? `Most seen: ${shortName(progress.favorite.name)}`
              : "Names you have practiced"
          }
        />
        <Fact
          label="Remembered"
          value={ratingTotal ? `${rememberedPct}%` : "—"}
          detail={
            ratingTotal
              ? `${progress.remembered} good or easy of ${ratingTotal}`
              : "After you rate a few cards"
          }
        />
        <Fact
          label="Typical day"
          value={progress.averagePerStudyDay ? String(progress.averagePerStudyDay) : "—"}
          detail={
            progress.longestStreak
              ? `Longest streak ${progress.longestStreak} days`
              : "Average cards on days you study"
          }
        />
      </section>

      <section>
        <h2 className="font-heading text-3xl">Memory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Grades fade as you forget. A is fresh. F needs work.
        </p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {MEMORY_GRADES.map((grade) => (
            <p key={grade} className={`text-sm ${gradeTone(grade)}`}>
              {grade} · {gradeCounts[grade]}
            </p>
          ))}
        </div>
        {ratingTotal ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Ratings · Again {progress.ratings.again} · Hard {progress.ratings.hard} · Good{" "}
            {progress.ratings.good} · Easy {progress.ratings.easy}
            {progress.firstReview ? ` · First review ${progress.firstReview}` : ""}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl bg-card/80 px-3 py-4 ring-1 ring-border">
      <p className="font-heading text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[1.75rem] bg-card/80 px-5 py-5 ring-1 ring-border">
      <p className="text-xs tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-3xl">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function shortName(name: string) {
  return name.split(",")[0]?.replace(/\s+MD.*$/i, "").trim() || name;
}
