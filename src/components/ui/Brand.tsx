import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./Icon";

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
 * App header for top-level screens: logo and name on the left, an optional action on the right.
 * With `onLogoClick`, the logo becomes a button (e.g. back to the start screen).
 */
export function AppHeader({ action, onLogoClick }: { action?: ReactNode; onLogoClick?: () => void }) {
  const brand = (
    <>
      <BrandMark />
      Layover
    </>
  );
  return (
    <header className="flex min-h-[68px] items-center justify-between pt-[max(env(safe-area-inset-top),12px)] pr-3 pb-3 pl-5">
      {onLogoClick ? (
        <button
          type="button"
          onClick={onLogoClick}
          aria-label="Layover, back to the start screen"
          className="-ml-2 inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-control px-2 text-[15px] font-semibold hover:bg-sunk"
        >
          {brand}
        </button>
      ) : (
        <span className="inline-flex items-center gap-2.5 text-[15px] font-semibold">{brand}</span>
      )}
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
