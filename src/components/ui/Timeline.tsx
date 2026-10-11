import type { CSSProperties } from "react";
import type { TimelineNode, TimelineState } from "@/lib/domain/timeline";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";

// Colour is never the only signal: every state has its own icon and a screen-reader word.
const STATE: Record<TimelineState, { marker: string; text: string; line: string; icon: IconName; word: string }> = {
  ok: { marker: "border-ok bg-ok-bg text-ok-fg", text: "text-ok-fg", line: "border-ok", icon: "check", word: "On track" },
  warn: { marker: "border-warn bg-warn-bg text-warn-fg", text: "text-warn-fg", line: "border-warn", icon: "clock", word: "Tight" },
  bad: { marker: "border-bad bg-bad-bg text-bad-fg", text: "text-bad-fg", line: "border-bad", icon: "x", word: "Problem" },
  idle: { marker: "border-line bg-surface text-ink-3", text: "text-ink-3", line: "border-line", icon: "circle-dashed", word: "Not affected" },
};

const KIND_ICON: Partial<Record<TimelineNode["kind"], IconName>> = { flight: "plane", stay: "bed", person: "user" };

/** The trip as a vertical rail. Each node enters a beat after the one above, so a change ripples down. */
export function Timeline({ nodes, baseDelay = 0 }: { nodes: TimelineNode[]; baseDelay?: number }) {
  return (
    <ol aria-label="Your trip, step by step" className="flex flex-col px-5">
      {nodes.map((n, i) => {
        const s = STATE[n.state];
        const last = i === nodes.length - 1;
        const icon = KIND_ICON[n.kind];
        return (
          <li
            key={n.id}
            className="ck-rise flex gap-3"
            style={{ animationDelay: `${baseDelay + i * 110}ms` } as CSSProperties}
          >
            <span className="w-11 shrink-0 pt-1 text-right font-num text-[13px] tabular-nums">
              {n.was && <span className="block text-ink-faint line-through">{n.was}</span>}
              {n.time && <span className={cx("block font-medium", n.state === "ok" ? "text-ink" : s.text)}>{n.time}</span>}
            </span>
            <span className="relative flex w-7 shrink-0 flex-col items-center">
              <span className={cx("inline-flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-500", s.marker)}>
                <Icon name={s.icon} size={14} strokeWidth={3} />
              </span>
              {!last && (
                <span
                  aria-hidden="true"
                  className={cx("my-1 w-0 flex-1 border-l-2 transition-colors duration-500", n.broken ? "border-dashed" : "border-solid", n.broken ? "border-bad" : s.line)}
                />
              )}
            </span>
            <div className={cx("flex min-w-0 flex-1 flex-col gap-0.5", last ? "pb-1" : "pb-5")}>
              <p className="flex items-center gap-1.5 text-[15px] leading-snug font-semibold">
                {icon && <Icon name={icon} size={15} className="shrink-0 text-ink-3" />}
                <span className={cx(n.kind === "flight" && "font-num text-[14px]")}>{n.title}</span>
                <span className="sr-only"> — {s.word}</span>
              </p>
              <p className="text-[14px] leading-snug text-ink-2">{n.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
