"use server";

import { revalidatePath } from "next/cache";
import { createNamedProfile, profileHref } from "@/lib/profiles";

export async function createStudyProfile(name: string) {
  const result = await createNamedProfile(name);
  if (!result.ok) return { ok: false as const, error: result.error };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/p");
  return {
    ok: true as const,
    href: profileHref(result.profile.slug),
    slug: result.profile.slug,
    name: result.profile.name,
  };
}
