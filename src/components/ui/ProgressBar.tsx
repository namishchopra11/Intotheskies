import { cx } from "./cx";
import { Icon } from "./Icon";

type ProgressBarProps = {
  value: number;
  max: number;
  /** What is being counted, read by screen readers and shown on the left. e.g. "Sorting it out". */
  label?: string;
  /** Hide the "3 of 7 done" line. */
  hideCount?: boolean;
  className?: string;
};

// Up to this many steps the meter is drawn as one segment per step, like a departures board.
const MAX_SEGMENTS = 12;

export function ProgressBar({ value, max, label, hideCount, className }: ProgressBarProps) {
  const safeMax = Math.max(max, 0);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = safeMax === 0 ? 0 : Math.round((clamped / safeMax) * 100);
  const complete = safeMax > 0 && clamped === safeMax;
  const segmented = safeMax > 0 && safeMax <= MAX_SEGMENTS;

  return (
    <div className={className}>
      {(label || !hideCount) && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          {label && <span className="font-display text-[26px] font-bold text-ink">{label}</span>}
          {!hideCount && (
            <span
              className={cx(
                "ml-auto inline-flex items-center gap-1 font-num text-[14px] font-medium tabular-nums",
                complete ? "font-semibold text-ok-fg" : "text-ink-2",
              )}
            >
              {complete && <Icon name="circle-check" size={16} strokeWidth={2.5} />}
              {complete ? "All done" : `${clamped} of ${safeMax} done`}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        aria-valuetext={`${clamped} of ${safeMax} done`}
        className={segmented ? "grid gap-[3px]" : "h-2 w-full overflow-hidden bg-meter-track"}
        style={segmented ? { gridTemplateColumns: `repeat(${safeMax}, minmax(0, 1fr))` } : undefined}
      >
        {segmented ? (
          Array.from({ length: safeMax }, (_, i) => (
            <span key={i} className="flex h-2 overflow-hidden bg-meter-track">
              {i < clamped && (
                <i
                  className={cx("ck-fill flex-1", complete ? "bg-ok" : "bg-meter")}
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              )}
            </span>
          ))
        ) : (
          <div
            className={cx(
              "h-full transition-[width] duration-500 ease-out",
              complete ? "bg-ok" : "bg-meter",
            )}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
    </div>
  );
}
