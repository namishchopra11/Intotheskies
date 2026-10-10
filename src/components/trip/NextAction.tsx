"use client";

import { useState, type ReactNode } from "react";
import { Button, Icon, buttonClasses } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import type { FinalArrival } from "@/lib/domain/timeline";
import { timePart } from "@/lib/domain/time";
import { useTripStore } from "@/lib/store";
import type { Disruption, Trip } from "@/lib/types";

/** A short tap-back on phones that support it. */
export function haptic() {
  try {
    navigator.vibrate?.(15);
  } catch {
    // not supported
  }
}

// These three are handled on the share screen, where the message is already written.
const TELL_PEOPLE = /:(send_update|rearrange_pickup|tell_hotel)(:|$)/;

/**
 * "Do this now": the first unfinished task with one clear action. The rest of the list sits
 * behind "All tasks". Generated tasks are already in order of urgency, so no sorting here.
 */
export function NextAction({
  trip,
  disruption,
  arrival,
  children,
}: {
  trip: Trip;
  disruption: Disruption;
  arrival: FinalArrival | null;
  children: ReactNode;
}) {
  const toggleTask = useTripStore((s) => s.toggleTask);
  const [open, setOpen] = useState(false);
  const task = disruption.tasks.find((t) => !t.done);
  const contact = task?.contactId ? trip.contacts.find((c) => c.id === task.contactId) : undefined;
  const markDone = () => {
    haptic();
    if (task) toggleTask(disruption.id, task.id);
  };

  let action: ReactNode = (
    <Button variant="primary" size="md" block icon="check" onClick={markDone}>
      Mark done
    </Button>
  );
  let secondary = false;
  if (task && TELL_PEOPLE.test(task.id)) {
    action = (
      <Button href={`/share/${disruption.id}`} variant="primary" size="md" block chip="arrow-right">
        Send the message
      </Button>
    );
    secondary = true;
  } else if (contact?.phone) {
    action = (
      <a
        href={`tel:${contact.phone.replace(/\s+/g, "")}`}
        className={buttonClasses({ variant: "primary", size: "md", block: true })}
      >
        <Icon name="phone" size={20} />
        Call {contact.name}
      </a>
    );
    secondary = true;
  }

  return (
    <section aria-label="Do this now" className="ck-rise flex flex-col gap-2.5 px-4 pt-7" style={{ animationDelay: "700ms" }}>
      <h2 className="ck-label px-1">{task ? "Do this now" : "All done"}</h2>
      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-4">
        {task ? (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-[18px] leading-snug font-semibold">{task.title}</p>
              {task.detail && <p className="text-[14px] leading-snug text-ink-2">{task.detail}</p>}
            </div>
            {action}
            {secondary && (
              <Button variant="ghost" size="sm" block onClick={markDone}>
                Mark done
              </Button>
            )}
          </>
        ) : (
          <div className="ck-rise flex items-start gap-3">
            <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ok-bg text-ok-fg">
              <Icon name="check" size={20} strokeWidth={3} />
            </span>
            <p className="flex flex-col gap-0.5">
              <span className="text-[18px] leading-snug font-semibold">You&apos;re sorted</span>
              <span className="text-[14px] leading-snug text-ink-2">
                {arrival && !arrival.unknown
                  ? `Everything is done. You land in ${cityName(arrival.flight.to)} at ${timePart(arrival.arriveAt)}.`
                  : "Everything on your list is done."}
              </span>
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 cursor-pointer items-center justify-between rounded-control px-1 text-[15px] font-semibold hover:bg-sunk"
      >
        All tasks ({disruption.tasks.filter((t) => !t.done).length} to do)
        <Icon name="chevron-right" size={18} className={open ? "rotate-90 transition-transform" : "transition-transform"} />
      </button>
      {open && children}
    </section>
  );
}
