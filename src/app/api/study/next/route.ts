import { NextResponse } from "next/server";
import { studySnapshot } from "@/lib/queue";
import { getSetBySlug } from "@/lib/sets";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("set");
  const set = slug ? await getSetBySlug(slug) : null;
  const snapshot = await studySnapshot({ setId: set?.id });
  return NextResponse.json(snapshot);
}
