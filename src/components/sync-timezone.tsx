"use client";

import { useEffect } from "react";
import { saveTimeZone } from "@/actions/settings";

export function SyncTimeZone({ current }: { current: string }) {
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone || timeZone === current) return;
    void saveTimeZone(timeZone);
  }, [current]);

  return null;
}
