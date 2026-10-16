import type { ReactNode } from "react";
import { cx } from "./cx";
import { HomeLogo } from "./HomeLogo";

/**
 * The logo: a sign-yellow plate with the wayfinding arrow, its shaft broken once. The break is
 * the layover, the pause in a journey that keeps going. Yellow and black in both themes.
 */
export function BrandMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx("inline-flex shrink-0 items-center justify-center rounded-[3px] bg-sign text-on-sign", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.74} height={size * 0.74} viewBox="0 0 24 24" fill="currentColor">
        <path d="M1.5 9.6h4.6v4.8H1.5zM9 9.6h4.4L8.6 4.8l2.75-2.75L21.3 12l-9.95 9.95-2.75-2.75 4.8-4.8H9z" />
      </svg>
    </span>
  );
}

/** "Layover" set as a sign: the mark and the name in condensed bold. */
export function Wordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <BrandMark size={size} />
      <span className="font-display font-bold" style={{ fontSize: size * 0.93, lineHeight: 1 }}>
        Layover
      </span>
    </span>
  );
}

/**
 * App header for the home screen: the logo (always home) on the left, an optional action on
 * the right. Solid ground, sticky, so the trip scrolls underneath it.
 */
export function AppHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between bg-bg pt-[env(safe-area-inset-top)] pr-2 pl-4">
      <HomeLogo />
      {action}
    </header>
  );
}

/** A one-line status plate for the one thing that just changed. */
export function SignalBar({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="ck-fade mx-4 flex items-center justify-between gap-3 rounded-control bg-sign px-4 py-2 text-[14px] font-semibold text-on-sign">
      <span>{children}</span>
      {aside && <span className="font-num">{aside}</span>}
    </div>
  );
}
