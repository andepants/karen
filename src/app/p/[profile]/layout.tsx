import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { isEditor } from "@/lib/auth";
import { ensureDefaultSet } from "@/lib/ensure-test-set";
import { getActiveProfile, getProfileBySlug, isValidProfileSlug } from "@/lib/profiles";
import { dueCount } from "@/lib/queue";

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

  let editor = false;
  let due = 0;
  try {
    editor = await isEditor();
    const active = await getActiveProfile(slug);
    const deck = await ensureDefaultSet();
    due = await dueCount({ setId: deck?.id, profileId: active.id });
  } catch {
    editor = await isEditor().catch(() => false);
  }

  return (
    <>
      <SiteHeader isEditor={editor} dueCount={due} profileSlug={slug} />
      {children}
    </>
  );
}
