"use client";

import { ViewTransition, type ReactNode } from "react";

/** Navigation types that slide a page in or out. Pass them as `transitionTypes` on a link. */
export const NAV_FORWARD = ["nav-forward"];
export const NAV_BACK = ["nav-back"];

/**
 * Wrap a page's content so it slides when you navigate with a direction: forward moves in
 * from the right, back from the left (see ::view-transition-* in globals.css). Navigation
 * without a type, and browsers without view transitions, simply swap the page.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const slide = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };
  return (
    <ViewTransition enter={slide} exit={slide} default="none">
      {children}
    </ViewTransition>
  );
}
