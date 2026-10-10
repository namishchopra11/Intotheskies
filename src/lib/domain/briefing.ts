import type { Disruption, Flight, Trip } from "@/lib/types";
import { spokenPlace } from "./airports";
import { computeImpact, isArrivalUnknown, type Impact } from "./impact";
import { datePart, timePart } from "./time";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 45 -> "45 minutes", 75 -> "1 hour and 15 minutes" */
function spokenDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const hours = h === 0 ? "" : `${h} ${h === 1 ? "hour" : "hours"}`;
  const mins = m === 0 && h > 0 ? "" : `${m} ${m === 1 ? "minute" : "minutes"}`;
  return [hours, mins].filter(Boolean).join(" and ");
}

/** "2026-10-17T14:05" -> "2:05 PM" */
function spokenTime(t: string): string {
  const [hh, mm] = timePart(t).split(":").map(Number);
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
}

function spokenWeekday(t: string): string {
  const [y, m, d] = datePart(t).split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function changeSentence(flight: Flight, disruption: Disruption, impact: Impact): string {
  const to = spokenPlace(flight.to);
  if (isArrivalUnknown(flight)) {
    return disruption.type === "missed_connection"
      ? `You missed your flight to ${to}, and there is no new flight yet.`
      : `Your flight to ${to} has been cancelled, and there is no new flight yet.`;
  }
  const was = flight.original ?? flight;
  const day = datePart(was.arriveAt) === datePart(flight.arriveAt) ? "" : `on ${spokenWeekday(flight.arriveAt)} `;
  const arriving = `arriving ${day}at ${spokenTime(flight.arriveAt)}`;
  const delay = impact.delayMinutes ?? 0;
  if (disruption.type === "delay") {
    return delay > 0
      ? `Your flight to ${to} is now ${spokenDuration(delay)} late, ${arriving}.`
      : `Your flight to ${to} is delayed, but it is still ${arriving}.`;
  }
  const lead =
    disruption.type === "cancellation"
      ? `Your flight to ${to} was cancelled. You are now on a new flight`
      : disruption.type === "missed_connection"
        ? `You missed your flight to ${to}. You are now on a new flight`
        : `Your flight to ${to} has changed. You are now`;
  return `${lead} ${arriving}.`;
}

function riskSentence(trip: Trip, impact: Impact): string {
  const c = impact.connection;
  const onward = c && trip.flights.find((f) => f.id === c.flightId);
  const stay = trip.stays.find((s) => s.id === impact.affectedStays[0]?.stayId);
  const stayTail = stay ? `, and you may reach ${stay.name} late` : "";

  if (c && onward && c.status !== "ok") {
    const dest = spokenPlace(onward.to);
    if (c.minutesAfter === null) return `Your connection to ${dest} is at risk${stayTail}.`;
    if (c.status === "missed") return `You will probably miss your connection to ${dest}${stayTail}.`;
    return `That leaves only ${spokenDuration(c.minutesAfter)} for your connection to ${dest}${stayTail}.`;
  }
  if (stay) return `You may arrive too late to check in at ${stay.name}.`;
  if (c && onward && c.minutesAfter !== null) {
    return `You still have ${spokenDuration(c.minutesAfter)} for your connection to ${spokenPlace(onward.to)}.`;
  }
  return "Nothing else on your trip is affected.";
}

/**
 * Two or three short sentences for text-to-speech: what changed, what is at risk,
 * and the first unfinished task. Places and durations are spelled the way they are said.
 * Returns "" when the disruption id is not in the trip.
 */
export function buildBriefing(trip: Trip, disruptionId: string): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  const flight = disruption && trip.flights.find((f) => f.id === disruption.flightId);
  if (!disruption || !flight) return "";
  const impact = computeImpact(trip, flight.id);

  const firstOpen = disruption.tasks.find((t) => !t.done);
  const next = firstOpen
    ? `First, ${firstOpen.title.charAt(0).toLowerCase()}${firstOpen.title.slice(1).replace(/[.\s]+$/, "")}.`
    : disruption.tasks.length > 0
      ? "Everything on your list is done."
      : "";

  return [changeSentence(flight, disruption, impact), riskSentence(trip, impact), next]
    .filter(Boolean)
    .join(" ");
}
