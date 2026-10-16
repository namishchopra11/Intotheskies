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
    <section className="ck-rise flex flex-col gap-3 pt-9" style={rise(delay)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="ck-h2">{title}</h2>
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
  const reminders = useTripStore((s) => s.settings.reminders);
  const [showDone, setShowDone] = useState(false);
  // Keys just ticked: still shown while they animate out. "folding" once the strike is done.
  const [leaving, setLeaving] = useState<Record<string, "striking" | "folding">>({});
  const items = prepItems(trip, reminders);
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
    <section className="ck-rise flex flex-col pt-9" style={rise(delay)}>
      <ProgressBar label="Before you go" value={doneCount} max={items.length} />
      <ul className="mt-3 flex flex-col gap-[3px]">
        {visible.map((item) => {
          const isDone = done.has(item.key);
          return (
            <li
              key={item.key}
              className={cx(
                "grid overflow-hidden rounded-card bg-surface transition-[grid-template-rows,opacity,margin] ease-out",
                leaving[item.key] === "folding" ? "-mb-[3px] grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
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
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3.5 px-4 py-2 text-left"
                >
                  <TaskSquare />
                  <span className="ck-task-text min-w-0 flex-1 text-[16px] font-medium">{displayTime(item.title)}</span>
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
          className="ck-press mt-1 min-h-11 cursor-pointer self-start text-[15px] font-bold underline underline-offset-4"
        >
          {showDone ? "Hide done" : `${doneCount} done`}
        </button>
      )}
      {doneCount === items.length && !showDone && (
        <p className="ck-rise py-3 text-[16px] font-bold text-ok-fg">All set.</p>
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
      <ul className="flex flex-col gap-[3px]">
        {codes.map((c) => (
          <li key={c.key} className="flex items-center gap-3 rounded-card bg-surface py-3 pr-2 pl-4">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-ink-2">
                {c.label} · {c.detail}
              </span>
              <span className="block font-display text-[30px] leading-none font-bold tracking-[0.04em]">{c.code}</span>
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
                "ck-press inline-flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control px-3 text-[15px] font-bold",
                copied === c.key ? "bg-ok-bg text-ok-fg" : "bg-sunk text-ink",
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

/**
 * An empty square and a filled green square with a check, stacked in one spot. The row's
 * data-done decides which shows, so ticking and unticking both animate (.ck-task-* in globals.css).
 */
export function TaskSquare() {
  return (
    <span aria-hidden="true" className="relative inline-flex h-6 w-6 shrink-0">
      <span className="ck-task-ring absolute inset-0 rounded-[3px] border-[2.5px] border-ink" />
      <span className="ck-task-disc absolute inset-0 inline-flex items-center justify-center rounded-[3px] bg-ok text-white">
        <Icon name="check" size={16} strokeWidth={3.5} />
      </span>
    </span>
  );
}
