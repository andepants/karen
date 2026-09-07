export const DEFAULT_PROFILE_SLUG = "karen";
export const DEFAULT_PROFILE_NAME = "Karen";
export const NUMBERED_PROFILE_MAX = 20;
export const PROFILE_COOKIE = "karen_profile";
export const PROFILE_HEADER = "x-profile-slug";

export const RESERVED_PROFILE_SLUGS = new Set([
  "admin",
  "api",
  "home",
  "login",
  "new",
  "options",
  "p",
  "people",
  "profile",
  "profiles",
  "roster",
  "sets",
  "settings",
  "study",
]);

export function profileHref(slug: string, path = "/") {
  const prefix = `/p/${slug}`;
  if (!path || path === "/") return prefix;
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}

export function slugFromName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "profile";
}

export function isValidProfileSlug(slug: string) {
  if (!slug || RESERVED_PROFILE_SLUGS.has(slug)) return false;
  return /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug);
}

export function isNumberedProfileSlug(slug: string) {
  const value = Number(slug);
  return slug === String(value) && value >= 1 && value <= NUMBERED_PROFILE_MAX;
}
