import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getProfileBySlug, isValidProfileSlug } from "@/lib/profiles";

export default async function ProfileSectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ profile: string }>;
}) {
  const { profile } = await params;
  const slug = profile.trim().toLowerCase();
  if (!isValidProfileSlug(slug)) notFound();
  const row = await getProfileBySlug(slug);
  if (!row) notFound();
  return children;
}
