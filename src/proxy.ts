import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEFAULT_PROFILE_SLUG,
  PROFILE_COOKIE,
  PROFILE_HEADER,
  isValidProfileSlug,
} from "@/lib/profile-path";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/p\/([a-z0-9][a-z0-9-]{0,31})(?:\/|$)/i);
  const cookieSlug = request.cookies.get(PROFILE_COOKIE)?.value?.toLowerCase();
  const slug = (
    match?.[1] ||
    cookieSlug ||
    DEFAULT_PROFILE_SLUG
  ).toLowerCase();
  const active = isValidProfileSlug(slug) ? slug : DEFAULT_PROFILE_SLUG;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PROFILE_HEADER, active);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  if (match && isValidProfileSlug(match[1].toLowerCase())) {
    response.cookies.set(PROFILE_COOKIE, match[1].toLowerCase(), {
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
