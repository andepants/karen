"use client";

import { useEffect } from "react";
import { saveTimeZone } from "@/actions/settings";

export function SyncTimeZone({
  current,
  profileSlug,
}: {
  current: string;
  profileSlug?: string;
}) {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone || timeZone === current) return;
    void saveTimeZone(timeZone, profileSlug);
  }, [current, profileSlug]);

  return null;
}
