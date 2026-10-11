import type { CSSProperties } from "react";
import { cx } from "./cx";

/**
 * An airport departures-board style time. Digits that differ from the old time turn over
 * (a short flip, off under prefers-reduced-motion). `time` null = no new time yet.
 */
export function FlapBoard({
  label,
  time,
  was,
  note,
}: {
  label: string;
  time: string | null;
  was?: string;
  note?: string;
}) {
  const [clock, period] = (time ?? "--:--").split(" ");
  const chars = clock.split("");
  const oldChars = (was ?? "").split(" ")[0].split("");
  return (
    <div className="flex flex-col gap-3 rounded-card bg-signal px-4 py-3.5 text-on-signal">
      <span className="font-num text-[11px] font-semibold tracking-[0.08em] uppercase">{label}</span>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="flex items-center gap-1" style={{ perspective: 400 }} aria-label={time ?? "No new time yet"}>
          {chars.map((c, i) =>
            c === ":" ? (
              <span key={i} aria-hidden="true" className="px-0.5 font-num text-[34px] leading-none font-semibold">
                :
              </span>
            ) : (
              <span
                key={i}
                aria-hidden="true"
                className={cx(
                  "inline-flex h-14 w-10 items-center justify-center rounded-[6px] bg-band font-num text-[36px] leading-none font-semibold text-on-band tabular-nums",
                  time !== null && c !== oldChars[i] && "ck-flap",
                )}
                style={{ animationDelay: `${150 + i * 90}ms` } as CSSProperties}
              >
                {c}
              </span>
            ),
          )}
          {period && <span aria-hidden="true" className="ml-1 self-end pb-1 font-num text-[18px] font-semibold">{period}</span>}
        </p>
        <div className="flex flex-col items-end gap-0.5 text-right">
          {was && time !== was && <span className="font-num text-[15px] tabular-nums line-through opacity-70">{was}</span>}
          {note && <span className="text-[14px] leading-tight font-semibold">{note}</span>}
        </div>
      </div>
    </div>
  );
}
