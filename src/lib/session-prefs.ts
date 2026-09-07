import { cookies } from "next/headers";
import { isValidTimeZone } from "./dates";
import { getActiveProfile, updateProfileSettings } from "./profiles";
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

type CookiePrefs = {
  bonus?: number;
  bonusProfileId?: string;
  timeZone?: string;
};

const DEFAULT_TIME_ZONE = "UTC";

export async function getStudyPrefs(): Promise<StudyPrefs> {
  const profile = await getActiveProfile();
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  let cookie: CookiePrefs = {};
  if (raw) {
    try {
      cookie = JSON.parse(raw) as CookiePrefs;
    } catch {
      cookie = {};
    }
  }
  return {
    session: roundSize(profile.session || DEFAULT_SESSION),
    bonus:
      cookie.bonusProfileId === profile.id
        ? Math.max(0, Math.round(Number(cookie.bonus) || 0))
        : 0,
    burySiblings: profile.burySiblings,
    timeZone: isValidTimeZone(String(cookie.timeZone || ""))
      ? String(cookie.timeZone)
      : DEFAULT_TIME_ZONE,
  };
}

export async function writeStudyPrefs(prefs: StudyPrefs) {
  const profile = await getActiveProfile();
  await updateProfileSettings(profile.id, {
    session: roundSize(prefs.session),
    burySiblings: prefs.burySiblings,
  });
  const store = await cookies();
  store.set(
    COOKIE,
    JSON.stringify({
      bonus: Math.max(0, Math.round(prefs.bonus || 0)),
      bonusProfileId: profile.id,
      timeZone: isValidTimeZone(prefs.timeZone) ? prefs.timeZone : DEFAULT_TIME_ZONE,
    } satisfies CookiePrefs),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );
}
