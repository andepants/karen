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

export const PATHNAME_HEADER = "x-pathname";

export function profileHref(slug: string, path = "/") {
  const prefix = `/p/${slug}`;
  if (!path || path === "/") return prefix;
  return `${prefix}${path.startsWith("/") ? path : `/${path}`}`;
}

export function profileSlugFromPathname(pathname: string) {
  const match = pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{0,31})(?:\/|$)/i);
  if (!match?.[1]) return null;
  const slug = match[1].toLowerCase();
  return isValidProfileSlug(slug) ? slug : null;
}

export function pathWithoutProfile(pathname: string) {
  if (!pathname.startsWith("/p/")) return pathname || "/";
  const rest = pathname.replace(/^\/p\/[^/]+/, "");
  return rest || "/";
}

export function replaceProfileInPath(pathname: string, slug: string) {
  return profileHref(slug, pathWithoutProfile(pathname));
}

export function isUnscopedAppPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/people" ||
    pathname.startsWith("/people/") ||
    pathname === "/study" ||
    pathname.startsWith("/study/")
  );
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
