import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEFAULT_PROFILE_SLUG,
  PATHNAME_HEADER,
  PROFILE_COOKIE,
  PROFILE_HEADER,
  isUnscopedAppPath,
  isValidProfileSlug,
  profileHref,
  profileSlugFromPathname,
} from "@/lib/profile-path";

function cookieSlug(request: NextRequest) {
  const value = request.cookies.get(PROFILE_COOKIE)?.value?.toLowerCase();
  return value && isValidProfileSlug(value) ? value : DEFAULT_PROFILE_SLUG;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const urlSlug = profileSlugFromPathname(pathname);

  if (!urlSlug && isUnscopedAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = profileHref(cookieSlug(request), pathname);
    return NextResponse.redirect(url);
  }

  const active = urlSlug || cookieSlug(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PROFILE_HEADER, active);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (urlSlug) {
    response.cookies.set(PROFILE_COOKIE, urlSlug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
