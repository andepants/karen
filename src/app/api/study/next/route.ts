import { NextResponse } from "next/server";
import { dueQueue } from "@/lib/queue";

export async function GET() {
  const queue = await dueQueue();
  const item = queue[0] ?? null;
  return NextResponse.json({ item, remaining: queue.length });
}
