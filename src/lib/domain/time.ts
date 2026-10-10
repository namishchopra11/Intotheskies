import type { LocalDateTime } from "@/lib/types";

// Wall-clock helpers. Strings are parsed as if they were UTC so that no device
// timezone or DST rule ever shifts them. Only compare times at the same place.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toMs(t: LocalDateTime): number {
  const [date, time] = t.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes from `from` to `to`. Negative when `to` is earlier. Same location only. */
export function minutesBetween(from: LocalDateTime, to: LocalDateTime): number {
  return Math.round((toMs(to) - toMs(from)) / 60000);
}

export function addMinutes(t: LocalDateTime, minutes: number): LocalDateTime {
  const d = new Date(toMs(t) + minutes * 60000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** "2026-10-17" */
export function datePart(t: LocalDateTime): string {
  return t.slice(0, 10);
}

/** "10:35" */
export function timePart(t: LocalDateTime): string {
  return t.slice(11, 16);
}

/** "Sat 17 Oct" */
export function formatDate(t: LocalDateTime): string {
  const d = new Date(toMs(t));
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sat 17 Oct, 10:35" */
export function formatDateTime(t: LocalDateTime): string {
  return `${formatDate(t)}, ${timePart(t)}`;
}

/** 135 -> "2h 15m", 45 -> "45 min", -20 -> "20 min" (sign is dropped) */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
