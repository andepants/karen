"use server";

import { revalidatePath } from "next/cache";
import { clearEditorCookie, setEditorCookie } from "@/lib/auth";

export async function unlockEditor(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await setEditorCookie(password);
  if (!ok) {
    return { error: "Incorrect password." };
  }
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/sets");
  return { ok: true as const };
}

export async function lockEditor() {
  await clearEditorCookie();
  revalidatePath("/");
  revalidatePath("/people");
  revalidatePath("/study");
  revalidatePath("/sets");
}
