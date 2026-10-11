"use client";

import { useCallback, useEffect, useState } from "react";
import { BrandMark } from "./Brand";
import { OPENING_SEEN_KEY as SEEN_KEY } from "./theme";

function hasSeen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A brief brand entrance on a fresh app load; the root stays mounted between pages. It plays
 * once per tab session, so a reload or a restored tab goes straight to the app.
 */
export function AppOpening() {
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // private mode: it just plays again next load
    }
    setVisible(false);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Marked seen when it ends, not when it starts, so dev's double-mounted effect still plays it.
    // The timer is also the fallback that removes the overlay if an animation event is missed.
    const timer = window.setTimeout(() => finish(), reducedMotion.matches || hasSeen() ? 0 : 1700);
    return () => window.clearTimeout(timer);
  }, [finish]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="ck-opening pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-bg px-6 text-ink"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) finish();
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="ck-opening-mark">
          <BrandMark size={80} className="overflow-hidden rounded-[18px] shadow-[0_12px_32px_rgba(0,0,0,0.12)]" />
        </div>
        <p className="ck-opening-name mt-5 text-[38px] leading-none font-semibold tracking-[-0.04em]">Layover</p>
        <p className="ck-opening-caption mt-3 text-[14px] text-ink-2">Your trip. A clearer next step.</p>
        <div className="ck-opening-route relative mt-7 h-1.5 w-40 overflow-hidden rounded-full bg-meter-track">
          <span className="absolute inset-0 origin-left rounded-full bg-signal" />
        </div>
      </div>
    </div>
  );
}
