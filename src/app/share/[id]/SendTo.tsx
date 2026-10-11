"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useState } from "react";
import { Card, Icon, buttonClasses } from "@/components/ui";
import { buildDrafts, channelLinks } from "@/lib/domain/messages";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";

const ROLE = { pickup: "Pickup", family: "Family", hotel: "Hotel" } as const;

/**
 * One ready-written message per person. A button opens their messaging app with the text
 * filled in (nothing is sent from here) and counts the matching checklist task as done.
 */
export function SendTo({ trip, disruptionId }: { trip: Trip; disruptionId: string }) {
  const displayTime = useTimeFormat();
  const toggleTask = useTripStore((s) => s.toggleTask);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const drafts = buildDrafts(trip, disruptionId).map((draft) => ({ ...draft, body: displayTime(draft.body) }));
  if (drafts.length === 0) return null;

  // Read the live store: toggleTask flips the state, so only tick tasks that are still open.
  const tick = (taskIds: string[]) => {
    const tasks = useTripStore.getState().trip?.disruptions.find((d) => d.id === disruptionId)?.tasks ?? [];
    for (const id of taskIds) if (tasks.some((t) => t.id === id && !t.done)) toggleTask(disruptionId, id);
  };

  return (
    <section aria-labelledby="send-to-h" className="mx-4 mt-2">
      <h2 id="send-to-h" className="ck-label mb-2 px-1">
        Send to
      </h2>
      <Card padding="none" className="divide-y divide-line-soft">
        {drafts.map((d) => {
          const links = channelLinks(d);
          const sent = opened.has(d.id);
          const open = () => {
            tick(d.taskIds);
            setOpened((o) => new Set(o).add(d.id));
          };
          const cls = buttonClasses({ variant: "secondary", size: "sm", block: true });
          return (
            <div key={d.id} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[16px] font-semibold">
                  {d.name} <span className="font-normal text-ink-2">· {ROLE[d.kind]}</span>
                </p>
                {sent && (
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ok-fg">
                    <Icon name="check" size={14} strokeWidth={3} /> Opened
                  </span>
                )}
              </div>
              <p className="line-clamp-3 text-[14px] leading-snug text-ink-2">{d.body}</p>
              <div className="grid grid-cols-3 gap-2">
                <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" onClick={open} className={cls}>
                  WhatsApp
                </a>
                <a href={links.sms} onClick={open} className={cls}>
                  Text
                </a>
                <a href={links.mail} onClick={open} className={cls}>
                  Email
                </a>
              </div>
            </div>
          );
        })}
      </Card>
      <p className="mt-2 px-1 text-[13px] leading-snug text-ink-2">Opens your messaging app. Nothing is sent from here.</p>
    </section>
  );
}
