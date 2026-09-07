"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  DEFAULT_PROFILE_SLUG,
  profileHref,
  profileSlugFromPathname,
} from "@/lib/profile-path";

type ProfileContextValue = {
  slug: string;
  href: (path?: string) => string;
};

const ProfileContext = createContext<ProfileContextValue>({
  slug: DEFAULT_PROFILE_SLUG,
  href: (path = "/") => profileHref(DEFAULT_PROFILE_SLUG, path),
});

export function ProfileProvider({
  initialSlug = DEFAULT_PROFILE_SLUG,
  children,
}: {
  initialSlug?: string;
  children: ReactNode;
}) {
  const pathname = usePathname() || "/";
  const slug =
    profileSlugFromPathname(pathname) ??
    (initialSlug && initialSlug.length ? initialSlug : DEFAULT_PROFILE_SLUG);

  const value = useMemo<ProfileContextValue>(
    () => ({
      slug,
      href: (path = "/") => profileHref(slug, path),
    }),
    [slug],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
