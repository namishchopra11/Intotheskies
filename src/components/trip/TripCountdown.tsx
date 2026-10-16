"use client";

import { useMemo, useSyncExternalStore } from "react";
import { countdownLabel, departureInstant } from "@/lib/domain/countdown";
import type { Trip } from "@/lib/types";
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
    label: shortClock(Math.min(realRemaining, demoRemaining)),
    demo: realRemaining > demoRemaining,
  };
}

/** "23h 56m 11s": short enough to read at a glance. */
function shortClock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s === 0) return "now";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h > 0 ? `${h}h ` : ""}${m}m ${String(s % 60).padStart(2, "0")}s`;
}

export type Countdown = {
  /** "2 days to go", "Leaves in 23h 56m 11s", "Waiting for a new flight". */
  label: string;
  /** A live, ticking clock (after a change). */
  live: boolean;
  /** The clock is the demo's 24 hours, not the real departure. */
  demo: boolean;
};

/** Live seconds during the final 24 hours; calendar fallback for unknown airport zones. */
export function useTripCountdown(trip: Trip): Countdown | null {
  const epoch = useSyncExternalStore(subscribe, nowSeconds, serverNow);
  const first = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))[0];
  const departure = useMemo(() => (first ? departureInstant(first.departAt, first.from) : null), [first]);
  const disruption = trip.disruptions[trip.disruptions.length - 1];
  if (epoch === null || !first) return null;
  const now = epoch * 1000;
  const cancelled = first.status === "cancelled";
  const live = disruption && !cancelled ? changeCountdown(departure, disruption.createdAt, now) : null;
  const { days } = daysUntil(first.departAt, today(now));
  const label = cancelled
    ? "Waiting for a new flight"
    : live ? `Leaves in ${live.label}`
    : departure !== null ? countdownLabel(departure, now)
    : days < 0 ? "Trip started"
    : days === 0 ? "Leaving today"
    : days === 1 ? "Leaving tomorrow" : `${days} days to go`;
  return { label, live: Boolean(live), demo: Boolean(live?.demo) };
}
