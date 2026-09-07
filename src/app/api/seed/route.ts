import { NextResponse } from "next/server";
import { safeEqualString } from "@/lib/auth";
import { ensureSchema } from "@/lib/ensure-schema";
import { seedTestSets } from "@/lib/seed";

function authorized(request: Request) {
  const expected = process.env.ADMIN_PASSWORD?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return safeEqualString(token, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureSchema();
  const created = await seedTestSets();
  return NextResponse.json({ ok: true, created });
}
