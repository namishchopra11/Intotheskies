"use client";

import { useSyncExternalStore } from "react";
import { Card, Icon } from "@/components/ui";
import { formatDate, timePart } from "@/lib/domain/time";
import type { Trip } from "@/lib/types";
import { useTimeFormat } from "@/lib/useTimeFormat";
import { daysUntil } from "./prep";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const serverToday = () => null;

/** Calendar days, since flight times are local to airports and have no timezone attached. */
export function TripCountdown({ trip }: { trip: Trip }) {
  const date = useSyncExternalStore(subscribe, today, serverToday);
  const displayTime = useTimeFormat();
  const first = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))[0];
  if (!date || !first) return null;
  const { days } = daysUntil(first.departAt, date);
  const label = first.status === "cancelled"
    ? "Waiting for a new departure"
    : days < 0 ? "Your trip has started"
    : days === 0 ? "Your trip starts today"
    : days === 1 ? "1 day to go" : `${days} days to go`;

  return (
    <section aria-label="Trip countdown" className="mx-4 mb-4">
      <Card className="flex items-center gap-3 py-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-ink-2">
          <Icon name="calendar" size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold">{label}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
            {first.status === "cancelled" ? "Your countdown will return when a new flight is confirmed." :
              `${formatDate(first.departAt)} · ${displayTime(timePart(first.departAt))} · ${first.from} local time`}
          </p>
        </div>
      </Card>
    </section>
  );
}
