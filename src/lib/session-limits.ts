export const SESSION_MIN = 5;
export const SESSION_MAX = 100;
export const SESSION_STEP = 5;
export const DEFAULT_SESSION = 10;

export function snapSession(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SESSION;
  const snapped = Math.round(value / SESSION_STEP) * SESSION_STEP;
  return Math.min(SESSION_MAX, Math.max(SESSION_MIN, snapped));
}

export function roundSize(session?: number) {
  return snapSession(session || DEFAULT_SESSION);
}
