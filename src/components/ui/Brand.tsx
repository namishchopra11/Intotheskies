import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";
import { HomeLogo } from "./HomeLogo";

/** The logo: an arrow on a small sign. Ink square with a yellow arrow (inverted in dark mode). */
export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-[4px] bg-mark text-on-mark",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Icon name="arrow-right" size={Math.round(size * 0.6)} strokeWidth={3} />
    </span>
  );
}

/**
 * App header for the home screen: the logo (always home) on the left, an optional action on
 * the right. Other screens get the same logo row from PageHeader.
 */
export function AppHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex min-h-[68px] items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pr-3 pb-3 pl-5">
      <HomeLogo />
      {action}
    </header>
  );
}

/**
 * A full-width yellow band, like a gate sign: "NEW PLAN READY · UPDATED 09:42".
 * Use one at most per screen, for the single thing that just changed.
 */
export function SignalBar({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="ck-fade flex items-center justify-between gap-3 bg-signal px-5 py-2.5 font-num text-[13px] font-semibold tracking-[0.04em] text-on-signal uppercase">
      <span>{children}</span>
      {aside && <span className="tabular-nums">{aside}</span>}
    </div>
  );
}
