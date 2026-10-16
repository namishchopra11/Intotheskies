"use client";

import { useCallback, useRef, useState } from "react";
import { MOTION, gsap, useGSAP } from "./gsap";
import { SignArrow } from "./SignArrow";
import { OPENING_SEEN_KEY as SEEN_KEY } from "./theme";

function hasSeen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * A brief brand entrance on a fresh app load: a sign-yellow field, the arrow slides in, the
 * name rises under it, then the whole sign wipes off to the right the way the arrow points.
 * Once per tab session.
 */
export function AppOpening() {
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // private mode: it just plays again next load
    }
    setVisible(false);
  }, []);

  useGSAP(
    () => {
      if (hasSeen()) {
        finish();
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION.reduced, () => {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.25, delay: 0.35, onComplete: finish });
      });
      mm.add(MOTION.full, () => {
        gsap.set(root.current, { clipPath: "inset(0% 0% 0% 0%)" });
        gsap
          .timeline({ onComplete: finish })
          .from(".op-arrow", { xPercent: -140, duration: 0.7, ease: "expo.out" })
          .from(".op-word", { yPercent: 105, duration: 0.6, ease: "expo.out" }, 0.18)
          .from(".op-line", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5, ease: "expo.out" }, 0.3)
          .to(root.current, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.55, ease: "power3.inOut" }, "+=0.3");
      });
      // Fallback: never leave the cover up if a tween is interrupted.
      const t = window.setTimeout(finish, 2600);
      return () => window.clearTimeout(t);
    },
    { scope: root },
  );

  if (!visible) return null;

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="ck-opening pointer-events-none fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden bg-sign px-6 pb-[18svh] text-on-sign"
    >
      <SignArrow className="op-arrow -ml-3" size="min(62vw, 300px)" />
      <span className="op-line mt-2 block h-2 w-full max-w-[460px] bg-on-sign" />
      <span className="block overflow-hidden">
        <span className="op-word block font-display text-[min(26vw,128px)] leading-[0.9] font-bold">Layover</span>
      </span>
    </div>
  );
}
