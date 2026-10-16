"use client";

import type { CSSProperties } from "react";
import { Icon, SignArrow, cx } from "@/components/ui";
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

/** The edge stripe on each plate, by marker. */
const STRIPE: Record<PlanMarker, string> = {
  dot: "bg-line-strong",
  ring: "bg-warn",
  x: "bg-bad",
  check: "bg-on-sign",
  open: "bg-ink-faint",
};

/**
 * The traveler's day as a stack of sign plates, one per moment, as booked (null) or after a
 * change (see planRows.ts). The booking that no longer flies is struck through; the new flight
 * is the yellow plate with the arrow.
 */
export function DayPlan({ trip, disruptionId, baseDelay = 0 }: { trip: Trip; disruptionId: string | null; baseDelay?: number }) {
  const rows = buildDayPlan(trip, disruptionId);
  if (rows.length === 0) return null;
  return (
    <ol aria-label={disruptionId ? "Your day, re-planned" : "Your day"} className="flex flex-col gap-[3px]">
      {rows.map((r, i) => (
        <Row key={r.id} r={r} style={{ animationDelay: `${baseDelay + i * 55}ms` }} />
      ))}
    </ol>
  );
}

function Row({ r, style }: { r: PlanRow; style: CSSProperties }) {
  const displayTime = useTimeFormat();
  const time = r.time === "–:–" ? r.time : displayTime(r.time);
  const [clock, meridiem] = splitClock(time);
  return (
    <li
      className={cx(
        "relative flex min-h-[68px] items-stretch overflow-hidden rounded-card",
        r.highlight ? "ck-wipe bg-sign text-on-sign" : "ck-rise bg-surface",
      )}
      style={style}
    >
      <span aria-hidden="true" className={cx("w-[5px] shrink-0", STRIPE[r.marker])} />
      <span
        className={cx(
          "flex w-[84px] shrink-0 flex-col justify-center pl-3 font-display leading-none font-bold whitespace-nowrap",
          r.highlight ? "text-[30px]" : "text-[26px]",
          r.struck && "text-ink-faint line-through decoration-[3px]",
        )}
      >
        {r.struck && <span className="sr-only">Was </span>}
        <span>{clock}</span>
        {meridiem && <span className="mt-0.5 text-[13px] font-semibold no-underline">{meridiem}</span>}
      </span>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3 pr-3">
        <p className={cx("leading-snug font-semibold", r.highlight ? "text-[18px] font-bold" : "text-[16px]", r.struck && "text-ink-faint line-through")}>
          {r.title}
          <span className="sr-only"> — {MARKER_WORD[r.marker]}</span>
        </p>
        {r.detail && <p className={cx("text-[14px] leading-snug", r.highlight ? "font-medium" : "text-ink-2")}>{displayTime(r.detail)}</p>}
        {r.status && (
          <p className={cx("text-[14px] leading-snug font-bold", r.highlight ? "" : TONE[r.status.tone])}>
            {displayTime(r.status.text)}
          </p>
        )}
      </div>

      <span aria-hidden="true" className="flex w-11 shrink-0 items-center justify-center">
        <Marker kind={r.marker} />
      </span>
    </li>
  );
}

function Marker({ kind }: { kind: PlanMarker }) {
  switch (kind) {
    case "check":
      return <SignArrow size={26} />;
    case "x":
      return <Icon name="x" size={20} strokeWidth={3} className="text-bad-fg" />;
    case "ring":
      return <Icon name="clock" size={20} strokeWidth={2.5} className="text-warn-fg" />;
    case "open":
      return <Icon name="circle-dashed" size={20} strokeWidth={2.5} className="text-ink-3" />;
    default:
      return null;
  }
}

/** "6:40 PM" -> ["6:40", "PM"]; "18:40" -> ["18:40", ""]. */
function splitClock(text: string): [string, string] {
  const m = text.match(/^(.*?)\s?(AM|PM)$/);
  return m ? [m[1], m[2]] : [text, ""];
}
