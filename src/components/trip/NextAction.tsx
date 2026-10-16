"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useId, useState, type ReactNode } from "react";
import { Collapse, Icon, SignArrow, cx } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import type { FinalArrival } from "@/lib/domain/timeline";
import { timePart } from "@/lib/domain/time";
import { useTripStore } from "@/lib/store";
import type { Contact, Disruption } from "@/lib/types";

/** A short tap-back on phones that support it. */
export function haptic() {
  try {
    navigator.vibrate?.(15);
  } catch {
    // not supported
  }
}

/**
 * "Do this now": the first unfinished task as a yellow sign with one clear action. The full
 * checklist folds out under it. Generated tasks are already in order of urgency, so no sorting.
 */
export function NextAction({
  disruption,
  arrival,
  contacts,
  children,
}: {
  disruption: Disruption;
  arrival: FinalArrival | null;
  contacts: Contact[];
  children: ReactNode;
}) {
  const displayTime = useTimeFormat();
  const toggleTask = useTripStore((s) => s.toggleTask);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [lastDoneId, setLastDoneId] = useState<string | null>(null);
  const lastDone = disruption.tasks.find((t) => t.id === lastDoneId && t.done);
  const task = disruption.tasks.find((t) => !t.done);
  // Same call as the task's row in the list below.
  const contact = task?.contactId ? contacts.find((c) => c.id === task.contactId) : undefined;
  const markDone = () => {
    haptic();
    if (task) {
      toggleTask(disruption.id, task.id);
      setLastDoneId(task.id);
    }
  };

  const total = disruption.tasks.length;
  const left = disruption.tasks.filter((t) => !t.done).length;
  return (
    <section aria-label="Tasks" className="flex flex-col gap-[3px]">
      <div
        aria-labelledby="first-task-heading"
        className={cx("relative overflow-hidden rounded-card", task ? "bg-sign text-on-sign" : "bg-ok-bg text-ok-fg")}
      >
        {/* A new first task is pasted up when the one before it is done. */}
        <div key={task?.id ?? "all-done"} className="ck-wipe flex flex-col gap-3 p-5">
          <p className="flex items-center justify-between gap-3 text-[15px] font-bold">
            <span className="inline-flex items-center gap-2">
              {task ? <SignArrow size={22} /> : <Icon name="circle-check" size={22} strokeWidth={2.5} />}
              {task ? "Do this now" : "All sorted"}
            </span>
            <span className="font-num">
              {total - left} of {total}
            </span>
          </p>
          <h3 id="first-task-heading" className="font-display text-[32px] leading-[0.98] font-bold break-words">
            {task ? displayTime(task.title) : "Nothing left to do"}
          </h3>
          {task?.detail && <p className="text-[16px] leading-snug font-medium break-words">{displayTime(task.detail)}</p>}
          {!task && arrival && !arrival.unknown && (
            <p className="text-[16px] font-medium">
              Land {cityName(arrival.flight.to)} {displayTime(timePart(arrival.arriveAt))}
            </p>
          )}
          {task && (
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                aria-label={`Mark done: ${task.title}`}
                onClick={markDone}
                className="ck-press inline-flex min-h-13 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control bg-on-sign px-4 text-[17px] font-bold text-sign"
              >
                <Icon name="check" size={20} strokeWidth={3} />
                Done
              </button>
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                  aria-label={`Call ${contact.name}`}
                  className="ck-press inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-control bg-black/10 px-4 text-[17px] font-bold"
                >
                  <Icon name="phone" size={19} strokeWidth={2.5} />
                  Call
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {lastDone && (
        <div className="ck-rise flex items-center justify-between gap-3 rounded-card bg-surface py-1 pr-1 pl-4 text-[14px]" role="status">
          <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-ok-fg">
            <Icon name="check" size={16} strokeWidth={3} />
            <span className="truncate">{displayTime(lastDone.title)}</span>
          </span>
          <button
            type="button"
            aria-label={`Undo task: ${displayTime(lastDone.title)}`}
            onClick={() => {
              toggleTask(disruption.id, lastDone.id);
              setLastDoneId(null);
            }}
            className="ck-press min-h-11 shrink-0 cursor-pointer rounded-control px-3 font-bold underline underline-offset-4"
          >
            Undo
          </button>
        </div>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="ck-press flex min-h-14 cursor-pointer items-center justify-between rounded-card bg-surface px-4 text-[16px] font-bold"
      >
        <span>{open ? "Hide checklist" : "Full checklist"}</span>
        <span className="inline-flex items-center gap-2 font-num text-ink-2">
          {!open && `${left} open`}
          <SignArrow size={18} direction={open ? "up" : "down"} className="text-ink transition-transform duration-300" />
        </span>
      </button>
      <Collapse open={open} id={listId}>
        {children}
      </Collapse>
    </section>
  );
}
