"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CalendarCheck, FastForward, Hourglass, ListOrdered, RotateCcw, SearchCheck, TriangleAlert } from "lucide-react";
import { countAt, revealedCount, timelineTotalMs, type TimelineStep, type TimelineStepId } from "@/lib/jetflex/shield";
import { Badge, Button, Card, cx } from "./ui";

const ICON: Record<TimelineStepId, typeof Hourglass> = { plan: CalendarCheck, detect: TriangleAlert, search: SearchCheck, rank: ListOrdered, approval: Hourglass };
const DOT = { steel: "border-line text-steel", bad: "border-bad/60 text-bad", gold: "border-gold/60 text-gold", ok: "border-ok/60 text-ok" };

const query = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

/**
 * Plays a recovery timeline: each step reveals in sequence, the search count ticks up, and `children`
 * (the ranked options and approval) appear once it finishes. Skippable and replayable; with reduced
 * motion it is complete immediately.
 */
export function ShieldTimeline({ steps, children }: { steps: TimelineStep[]; children?: ReactNode }) {
  const total = timelineTotalMs(steps);
  const reduced = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [play, setPlay] = useState(0);
  const instant = reduced || skipped;
  const top = useRef<HTMLDivElement>(null);

  // On a phone the Simulate button is far above the timeline; bring the sequence into view once.
  useEffect(() => {
    top.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (instant) return;
    const t0 = performance.now();
    const id = setInterval(() => {
      const e = performance.now() - t0;
      setElapsed(Math.min(e, total));
      if (e >= total) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [instant, play, total]);

  const now = instant ? total : elapsed;
  const done = now >= total;
  const shown = revealedCount(steps, now);
  const replay = () => { setSkipped(false); setElapsed(0); setPlay((n) => n + 1); };

  return (
    <div ref={top} className="scroll-mt-20 space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2"><h2 className="display text-2xl">Recovery sequence</h2><Badge tone="warn">Simulated</Badge></div>
          {done
            ? <Button size="sm" onClick={replay}><RotateCcw size={14} />Replay</Button>
            : <Button size="sm" onClick={() => setSkipped(true)}><FastForward size={14} />Skip animation</Button>}
        </div>
        <ol className="m-0 list-none p-0" key={play}>
          {steps.map((s, n) => {
            const on = n < shown;
            const I = ICON[s.id];
            const current = !done && n === shown - 1;
            const last = n === steps.length - 1;
            const count = s.count != null && on ? countAt(s, now) : null;
            return (
              <li key={s.id} className={cx("relative pb-5 pl-12", on ? "jf-step" : "invisible", last && "pb-0")} aria-hidden={on ? undefined : true} aria-current={current ? "step" : undefined}>
                {!last && n < shown - 1 && <span className="jf-line absolute bottom-0 left-[17px] top-9 w-px bg-line" aria-hidden />}
                <span className={cx("absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border bg-deep", DOT[s.tone], current && "jf-dot-live")} aria-hidden><I size={16} /></span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-[15px] font-medium text-warm">{s.title}</h3>
                  {s.stamp && <span className="num text-xs text-steel">{s.stamp}</span>}
                  {count != null && <span className="num text-sm text-gold" aria-hidden={!done}>{count} options</span>}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-steel">{s.detail}</p>
              </li>
            );
          })}
        </ol>
        <p className="sr-only" role="status">{done ? "Recovery search complete. Replacement options are listed below, awaiting your approval." : "Recovery search running."}</p>
      </Card>
      {done && <div className="jf-step space-y-6">{children}</div>}
    </div>
  );
}
