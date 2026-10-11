"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Card, Icon } from "@/components/ui";
import { countdownLabel, departureInstant } from "@/lib/domain/countdown";
import { formatDate, timePart } from "@/lib/domain/time";
import type { Trip } from "@/lib/types";
import { useTimeFormat } from "@/lib/useTimeFormat";
import { daysUntil } from "./prep";

const DAY_MS = 86400000;

function today(epoch: number) {
  const now = new Date(epoch);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 1000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverNow = () => null;

/**
 * Once a flight has changed, the countdown runs live, hours down to seconds. The simulated
 * feed can report a change days ahead, so when departure is more than 24 hours away the
 * clock starts at 24 hours from the moment the change arrived (a demo clock, labelled so).
 */
function changeCountdown(departure: number | null, createdAt: string, now: number) {
  const reported = Date.parse(createdAt);
  const elapsed = Number.isNaN(reported) ? 0 : Math.max(0, now - reported);
  const demoRemaining = DAY_MS - elapsed;
  const realRemaining = departure === null ? Infinity : departure - now;
  return {
    label: countdownLabel(Math.min(realRemaining, demoRemaining), 0),
    demo: realRemaining > demoRemaining,
  };
}

/** Live seconds during the final 24 hours; calendar fallback for unknown airport zones. */
export function TripCountdown({ trip }: { trip: Trip }) {
  const epoch = useSyncExternalStore(subscribe, nowSeconds, serverNow);
  const displayTime = useTimeFormat();
  const first = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))[0];
  const departure = useMemo(() => first ? departureInstant(first.departAt, first.from) : null, [first]);
  const disruption = trip.disruptions[trip.disruptions.length - 1];
  if (epoch === null || !first) return null;
  const now = epoch * 1000;
  const cancelled = first.status === "cancelled";
  const live = disruption && !cancelled ? changeCountdown(departure, disruption.createdAt, now) : null;
  const { days } = daysUntil(first.departAt, today(now));
  const label = cancelled
    ? "Waiting for a new departure"
    : live ? live.label
    : departure !== null ? countdownLabel(departure, now)
    : days < 0 ? "Your trip has started"
    : days === 0 ? "Your trip starts today"
    : days === 1 ? "1 day to go" : `${days} days to go`;

  return (
    <section aria-label="Trip countdown" className="mx-4 mb-4">
      <Card className="flex items-center gap-3 py-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-sunk text-ink-2">
          <Icon name={live ? "clock" : "calendar"} size={20} />
        </span>
        <div className="min-w-0">
          {live && <p className="text-[13px] text-ink-2">{first.flightNumber} departs in</p>}
          <p className="font-num text-[16px] font-semibold tabular-nums">{label}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
            {cancelled ? "Your countdown will return when a new flight is confirmed." :
              `${formatDate(first.departAt)} · ${displayTime(timePart(first.departAt))} · ${first.from} local time${live?.demo ? " · demo clock" : ""}`}
          </p>
        </div>
      </Card>
    </section>
  );
}
