"use client";

import type { CSSProperties } from "react";
import { Icon, cx } from "@/components/ui";
import { useTimeFormat } from "@/lib/useTimeFormat";
import type { Trip } from "@/lib/types";
import { buildDayPlan, type PlanMarker, type PlanRow, type PlanTone } from "./planRows";

const TONE: Record<PlanTone, string> = { ok: "text-ok-fg", warn: "text-warn-fg", bad: "text-bad-fg" };

// Colour is never the only signal: each marker has its own shape and a screen-reader word.
const MARKER_WORD: Record<PlanMarker, string> = {
  dot: "As planned",
  ring: "Watch this",
  x: "No longer happening",
  check: "New booking",
  open: "Not known yet",
};

/** The traveler's day after the change, as one list down a rail (see planRows.ts). */
export function DayPlan({ trip, disruptionId, baseDelay = 0 }: { trip: Trip; disruptionId: string; baseDelay?: number }) {
  const rows = buildDayPlan(trip, disruptionId);
  if (rows.length === 0) return null;
  return (
    <ol aria-label="Your day, re-planned" className="flex flex-col px-3 pt-1 pb-2">
      {rows.map((r, i) => (
        <Row key={r.id} r={r} first={i === 0} last={i === rows.length - 1} style={{ animationDelay: `${baseDelay + i * 90}ms` }} />
      ))}
    </ol>
  );
}

function Row({ r, first, last, style }: { r: PlanRow; first: boolean; last: boolean; style: CSSProperties }) {
  const displayTime = useTimeFormat();
  return (
    <li
      className={cx(
        "flex gap-3 px-2",
        r.highlight
          ? "ck-pop relative z-[1] mb-4 rounded-card border border-line bg-surface py-3 shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
          : "ck-rise",
      )}
      style={style}
    >
      <span
        className={cx(
          "w-[76px] shrink-0 pt-[2px] font-num tracking-[-0.02em] whitespace-nowrap tabular-nums",
          r.highlight ? "text-[15px] font-semibold" : "text-[14px] font-medium",
          r.struck ? "text-ink-faint line-through" : "text-ink",
        )}
      >
        {r.struck && <span className="sr-only">Was </span>}
        {r.time === "–:–" ? r.time : displayTime(r.time)}
      </span>

      {/* The rail: a line through every marker, cut at the top of the first and bottom of the last. */}
      <span className="relative flex w-5 shrink-0 justify-center" aria-hidden="true">
        <span
          className={cx(
            "absolute left-1/2 w-[2px] -translate-x-1/2 bg-ink",
            first ? "top-3" : r.highlight ? "-top-3" : "top-0",
            last ? "h-3" : r.highlight ? "-bottom-7" : "bottom-0",
          )}
        />
        <span className="relative mt-[3px]">
          <Marker kind={r.marker} />
        </span>
      </span>

      <div className={cx("flex min-w-0 flex-1 flex-col gap-0.5", !r.highlight && !last && "pb-5")}>
        <p
          className={cx(
            "leading-snug",
            r.highlight ? "text-[17px] font-semibold" : "text-[16px] font-semibold",
            r.struck && "text-ink-faint line-through",
          )}
        >
          {r.title}
          <span className="sr-only"> — {MARKER_WORD[r.marker]}</span>
        </p>
        {r.detail && <p className="text-[14px] leading-snug text-ink-2">{displayTime(r.detail)}</p>}
        {r.status && <p className={cx("text-[14px] leading-snug font-semibold", TONE[r.status.tone])}>{displayTime(r.status.text)}</p>}
      </div>
    </li>
  );
}

function Marker({ kind }: { kind: PlanMarker }) {
  switch (kind) {
    case "check":
      return (
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] bg-signal text-on-signal">
          <Icon name="check" size={13} strokeWidth={3.5} />
        </span>
      );
    case "x":
      return (
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center bg-bg text-bad">
          <Icon name="x" size={15} strokeWidth={3} />
        </span>
      );
    case "ring":
      return <span className="block h-[16px] w-[16px] rounded-full border-[3px] border-warn bg-bg" />;
    case "open":
      return <span className="block h-[16px] w-[16px] rounded-full border-2 border-dashed border-ink-2 bg-bg" />;
    default:
      return <span className="block h-[14px] w-[14px] translate-y-[1px] rounded-full bg-ink" />;
  }
}
