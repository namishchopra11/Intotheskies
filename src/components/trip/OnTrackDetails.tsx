"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useState, type CSSProperties, type ReactNode } from "react";
import { copyText } from "@/app/share/[id]/copyText";
import { Icon, ProgressBar, cx } from "@/components/ui";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { bookingCodes, prepItems } from "./prep";

const rise = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Section({ title, aside, delay, children }: { title: string; aside?: ReactNode; delay: number; children: ReactNode }) {
  return (
    <section className="ck-rise flex flex-col gap-2.5 px-4 pt-7" style={rise(delay)}>
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="ck-label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Reminders for the days before the trip, ticked off as you go and saved with the trip. */
// A ticked reminder stays long enough for its strike-through and check to play, then folds away.
const STRIKE_MS = 520;
const FOLD_MS = 320;

export function BeforeYouGo({ trip, delay }: { trip: Trip; delay: number }) {
  const displayTime = useTimeFormat();
  const togglePrep = useTripStore((s) => s.togglePrep);
  const [showDone, setShowDone] = useState(false);
  // Keys just ticked: still shown while they animate out. "folding" once the strike is done.
  const [leaving, setLeaving] = useState<Record<string, "striking" | "folding">>({});
  const items = prepItems(trip);
  if (items.length === 0) return null;
  const done = new Set(trip.prepDone ?? []);
  const doneCount = items.filter((i) => done.has(i.key)).length;
  const visible = showDone ? items : items.filter((i) => !done.has(i.key) || leaving[i.key]);

  const toggle = (key: string) => {
    const ticking = !done.has(key);
    togglePrep(key);
    if (!ticking || showDone) return;
    setLeaving((l) => ({ ...l, [key]: "striking" }));
    setTimeout(() => setLeaving((l) => (l[key] ? { ...l, [key]: "folding" } : l)), STRIKE_MS);
    setTimeout(
      () =>
        setLeaving((l) => {
          const next = { ...l };
          delete next[key];
          return next;
        }),
      STRIKE_MS + FOLD_MS,
    );
  };

  return (
    <section className="ck-rise flex flex-col px-5 pt-7" style={rise(delay)}>
      <ProgressBar label="Before you go" value={doneCount} max={items.length} />
      <ul className="mt-1 flex flex-col">
        {visible.map((item) => {
          const isDone = done.has(item.key);
          return (
            <li
              key={item.key}
              className={cx(
                "grid border-b border-line transition-[grid-template-rows,opacity,border-color] ease-out",
                leaving[item.key] === "folding" ? "grid-rows-[0fr] border-transparent opacity-0" : "grid-rows-[1fr]",
                // Done reminders brought back by "Show done" settle in rather than pop.
                showDone && isDone && "ck-rise",
              )}
              style={{ transitionDuration: `${FOLD_MS}ms` }}
            >
              <div className="min-h-0 overflow-hidden">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  data-done={isDone}
                  onClick={() => toggle(item.key)}
                  className="flex min-h-13 w-full cursor-pointer items-center gap-3 py-2 text-left"
                >
                  <span aria-hidden="true" className="relative inline-flex h-[22px] w-[22px] shrink-0">
                    <Icon name="circle-dashed" size={22} className="ck-task-ring absolute inset-0 text-ink-2" />
                    <span className="ck-task-disc absolute inset-0 inline-flex items-center justify-center rounded-full bg-meter text-bg">
                      <Icon name="check" size={14} strokeWidth={3.5} />
                    </span>
                  </span>
                  <span className="ck-task-text min-w-0 flex-1 text-[15px]">{displayTime(item.title)}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setShowDone((v) => !v)}
          className="mt-2 min-h-11 cursor-pointer self-start text-[14px] font-semibold text-ink-2 hover:text-ink"
        >
          {showDone ? "Hide done" : `${doneCount} done`}
        </button>
      )}
      {doneCount === items.length && !showDone && (
        <p className="ck-rise py-3 text-[15px] text-ok-fg">All set.</p>
      )}
    </section>
  );
}

/** Every booking reference in one place, with a copy button each. */
export function BookingCodes({ trip, delay }: { trip: Trip; delay: number }) {
  const codes = bookingCodes(trip);
  const [copied, setCopied] = useState<string | null>(null);
  if (codes.length === 0) return null;
  return (
    <Section title="Booking codes" delay={delay}>
      <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
        {codes.map((c) => (
          <li key={c.key} className="flex items-center gap-3 py-2 pr-2 pl-4">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-ink-2">
                {c.label} · {c.detail}
              </span>
              <span className="block font-num text-[17px] font-semibold tracking-[0.04em]">{c.code}</span>
            </span>
            <button
              type="button"
              aria-label={`Copy ${c.label} code ${c.code}`}
              onClick={async () => {
                if (await copyText(c.code)) {
                  setCopied(c.key);
                  setTimeout(() => setCopied((k) => (k === c.key ? null : k)), 1600);
                }
              }}
              className={cx(
                "inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control px-3 text-[14px] font-semibold hover:bg-sunk",
                copied === c.key ? "text-ok-fg" : "text-ink-2",
              )}
            >
              <Icon name={copied === c.key ? "check" : "copy"} size={18} />
              {copied === c.key ? "Copied" : null}
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
