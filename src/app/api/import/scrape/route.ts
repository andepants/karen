import { NextResponse } from "next/server";
import { isEditor } from "@/lib/auth";
import { extractPeopleFromUrl } from "@/lib/firecrawl";

export const maxDuration = 120;

export async function POST(request: Request) {
  if (!(await isEditor())) {
    return NextResponse.json({ error: "Editor passcode required" }, { status: 401 });
  }

  const body = (await request.json()) as {
    url?: string;
    followProfiles?: boolean;
  };

  if (!body.url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const result = await extractPeopleFromUrl(body.url, {
      followProfiles: Boolean(body.followProfiles),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
