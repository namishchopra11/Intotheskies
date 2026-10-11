"use client";

import { useCallback } from "react";
import { formatTimeText } from "@/lib/domain/time";
import { useTripStore } from "@/lib/store";

/** Subscribe at the display boundary; keep stored wall-clock values unchanged. */
export function useTimeFormat() {
  const format = useTripStore((s) => s.settings.timeFormat);
  return useCallback((text: string) => formatTimeText(text, format), [format]);
}
