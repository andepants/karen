import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "karen_editor";

function tokenForPassword(password: string) {
  return createHash("sha256").update(`karen:${password}`).digest("hex");
}

export function isEditorConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isEditor() {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return false;
  const expected = tokenForPassword(password);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function requireEditor() {
  if (!(await isEditor())) {
    throw new Error("Password required");
  }
}

export async function setEditorCookie(password: string) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  const submitted = password.trim();
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return false;
  }
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, tokenForPassword(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function clearEditorCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}
