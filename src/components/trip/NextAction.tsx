"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useId, useState, type ReactNode } from "react";
import { Button, Card, Collapse, Icon, cx } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import type { FinalArrival } from "@/lib/domain/timeline";
import { timePart } from "@/lib/domain/time";
import { useTripStore } from "@/lib/store";
import type { Disruption } from "@/lib/types";

/** A short tap-back on phones that support it. */
export function haptic() {
  try {
    navigator.vibrate?.(15);
  } catch {
    // not supported
  }
}

/**
 * "Do this first": the first unfinished task with one clear action. The card and full list sit
 * behind "To do". Generated tasks are already in order of urgency, so no sorting here.
 */
export function NextAction({
  disruption,
  arrival,
  children,
}: {
  disruption: Disruption;
  arrival: FinalArrival | null;
  children: ReactNode;
}) {
  const displayTime = useTimeFormat();
  const toggleTask = useTripStore((s) => s.toggleTask);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [lastDoneId, setLastDoneId] = useState<string | null>(null);
  const lastDone = disruption.tasks.find((t) => t.id === lastDoneId && t.done);
  const task = disruption.tasks.find((t) => !t.done);
  const markDone = () => {
    haptic();
    if (task) {
      toggleTask(disruption.id, task.id);
      setLastDoneId(task.id);
    }
  };

  return (
    <section aria-label="Tasks" className="ck-rise flex flex-col px-4 pt-7" style={{ animationDelay: "700ms" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 cursor-pointer items-center justify-between rounded-control px-1 text-[15px] font-semibold hover:bg-sunk"
      >
        To do ({disruption.tasks.filter((t) => !t.done).length})
        <Icon
          name="chevron-right"
          size={18}
          className={cx("transition-transform duration-300 ease-out", open && "rotate-90")}
        />
      </button>
      <Collapse open={open} id={listId} className="flex flex-col gap-2.5 pt-2.5">
        <Card aria-labelledby="first-task-heading">
          {/* A new first task settles in when the one before it is done. */}
          <div key={task?.id ?? "all-done"} className="ck-rise flex items-start gap-3">
            <span className={cx(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control",
              task ? "bg-mark text-on-mark" : "bg-ok-bg text-ok-fg",
            )}>
              <Icon name={task ? "arrow-right" : "circle-check"} size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="ck-label text-ink-2">{task ? "Do this first" : "Sorted"}</p>
              <h2 id="first-task-heading" className="mt-1 break-words text-[18px] leading-snug font-semibold text-ink">
                {task ? displayTime(task.title) : "All done"}
              </h2>
              {task?.detail && (
                <p className="mt-1.5 break-words text-[14px] leading-snug text-ink-2">{displayTime(task.detail)}</p>
              )}
              {!task && arrival && !arrival.unknown && (
                <p className="mt-1.5 text-[14px] text-ink-2">
                  Land {cityName(arrival.flight.to)} {displayTime(timePart(arrival.arriveAt))}
                </p>
              )}
            </div>
          </div>
          {task && (
            <Button variant="secondary" size="sm" block icon="check" className="mt-4"
              aria-label={`Mark done: ${task.title}`} onClick={markDone}>
              Done
            </Button>
          )}
          {lastDone && (
            <div className="ck-rise mt-2 flex items-center justify-between gap-3 text-[13px]" role="status">
              <span className="text-ok-fg">Done</span>
              <button type="button" aria-label={`Undo task: ${displayTime(lastDone.title)}`}
                onClick={() => {
                  toggleTask(disruption.id, lastDone.id);
                  setLastDoneId(null);
                }}
                className="min-h-11 cursor-pointer rounded-control px-2 font-semibold text-ink-2 hover:bg-sunk">
                Undo
              </button>
            </div>
          )}
        </Card>
        {children}
      </Collapse>
    </section>
  );
}
