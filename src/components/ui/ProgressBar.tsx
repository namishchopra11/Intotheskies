import { cx } from "./cx";
import { Icon } from "./Icon";

type ProgressBarProps = {
  value: number;
  max: number;
  /** What is being counted, read by screen readers and shown on the left. e.g. "Checklist". */
  label?: string;
  /** Hide the "3 of 7 done" line. */
  hideCount?: boolean;
  className?: string;
};

export function ProgressBar({ value, max, label, hideCount, className }: ProgressBarProps) {
  const safeMax = Math.max(max, 0);
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const pct = safeMax === 0 ? 0 : Math.round((clamped / safeMax) * 100);
  const complete = safeMax > 0 && clamped === safeMax;

  return (
    <div className={className}>
      {(label || !hideCount) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px]">
          {label && <span className="font-medium text-ink-2">{label}</span>}
          {!hideCount && (
            <span
              className={cx(
                "ml-auto inline-flex items-center gap-1 tabular-nums",
                complete ? "text-ok-fg" : "text-ink-3",
              )}
            >
              {complete && <Icon name="circle-check" size={16} strokeWidth={2} />}
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
        className="h-2 w-full overflow-hidden rounded-full bg-sunk"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-300",
            complete ? "bg-ok" : "bg-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
