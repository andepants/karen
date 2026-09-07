import { cookies } from "next/headers";

const COOKIE = "karen_session_sample";

export type SessionSample = {
  setId: string;
  personIds: string[];
};

export async function getSessionSample(setId?: string) {
  if (!setId) return null;
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionSample>;
    if (parsed.setId !== setId || !Array.isArray(parsed.personIds)) return null;
    const personIds = parsed.personIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    return personIds.length ? { setId, personIds } : null;
  } catch {
    return null;
  }
}

export async function writeSessionSample(setId: string, personIds: string[]) {
  const unique = [...new Set(personIds.filter(Boolean))];
  const store = await cookies();
  store.set(COOKIE, JSON.stringify({ setId, personIds: unique } satisfies SessionSample), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionSample() {
  const store = await cookies();
  store.delete(COOKIE);
}
