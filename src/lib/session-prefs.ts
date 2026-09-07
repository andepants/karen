import { cookies } from "next/headers";
import { isValidTimeZone } from "./dates";
import { DEFAULT_SESSION, roundSize } from "./session-limits";

export {
  DEFAULT_SESSION,
  SESSION_MAX,
  SESSION_MIN,
  SESSION_STEP,
  roundSize,
  snapSession,
} from "./session-limits";

const COOKIE = "karen_study_prefs";

export type StudyPrefs = {
  session: number;
  bonus: number;
  burySiblings: boolean;
  timeZone: string;
};

const DEFAULT_PREFS: StudyPrefs = {
  session: DEFAULT_SESSION,
  bonus: 0,
  burySiblings: true,
  timeZone: "UTC",
};

export async function getStudyPrefs(): Promise<StudyPrefs> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<StudyPrefs>;
    return {
      session: roundSize(Number(parsed.session) || DEFAULT_PREFS.session),
      bonus: Math.max(0, Math.round(Number(parsed.bonus) || 0)),
      burySiblings: Boolean(parsed.burySiblings),
      timeZone: isValidTimeZone(String(parsed.timeZone || ""))
        ? String(parsed.timeZone)
        : DEFAULT_PREFS.timeZone,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function writeStudyPrefs(prefs: StudyPrefs) {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(prefs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
