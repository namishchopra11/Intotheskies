"use client";

import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

// Registered once, on the client. Import gsap and useGSAP from here so every animation in the
// app shares the same plugins and defaults.
gsap.registerPlugin(useGSAP, MotionPathPlugin);
gsap.defaults({ ease: "expo.out", duration: 0.6 });
// Sequences name optional parts (a struck old time, a cancelled leg) that only some states have.
gsap.config({ nullTargetWarn: false });

/** Media conditions for gsap.matchMedia(): full motion, or a gentle cross-fade instead. */
export const MOTION = {
  full: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

export { gsap, useGSAP };
