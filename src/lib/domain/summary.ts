import type { Disruption, Flight, Trip } from "@/lib/types";
import { cityName } from "./airports";
import { computeImpact, isArrivalUnknown, type Impact } from "./impact";
import { datePart, formatDate, formatDateTime, formatDuration, timePart } from "./time";

export type SummaryOptions = {
  includeBookingRefs: boolean; // booking references and hotel confirmation numbers
  includeStays: boolean;
  includeOpenTasks: boolean;
  // Optional "request funds" add-on. Omitted or null means no request in the link.
  // amountUsdc is what the traveler typed, e.g. "120" or "85.50"; see normalizeUsdcAmount.
  // Only takes effect when the trip has a payoutAddress. buildSummary ignores it.
  fundsRequest?: { amountUsdc: string } | null;
};

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  includeBookingRefs: false,
  includeStays: true,
  includeOpenTasks: true,
};

const route = (f: Flight) => `${cityName(f.from)} to ${cityName(f.to)}`;

function whatChanged(flight: Flight, disruption: Disruption, impact: Impact): string {
  const was = flight.original ?? flight;
  const where = route(flight);
  if (isArrivalUnknown(flight)) {
    return disruption.type === "missed_connection"
      ? `I missed ${was.flightNumber} (${where}) and don't have a new flight yet.`
      : `${was.flightNumber} (${where}) was cancelled. I don't have a new flight yet.`;
  }

  const sameDay = datePart(was.arriveAt) === datePart(flight.arriveAt);
  const nowArrives = `${formatDate(flight.arriveAt)} at ${timePart(flight.arriveAt)}`;
  const wasArriving = sameDay ? timePart(was.arriveAt) : `${formatDate(was.arriveAt)} at ${timePart(was.arriveAt)}`;
  const timing =
    impact.delayMinutes === 0
      ? `The arrival time is unchanged: ${nowArrives}.`
      : `It now arrives ${nowArrives} instead of ${wasArriving}.`;

  if (disruption.type === "delay") {
    const amount =
      impact.delayMinutes && impact.delayMinutes > 0 ? ` by ${formatDuration(impact.delayMinutes)}` : "";
    return `${flight.flightNumber} (${where}) is delayed${amount}. ${timing}`;
  }
  const newFlight =
    flight.flightNumber === was.flightNumber
      ? "The flight has been rescheduled."
      : `I'm now on ${flight.airline} ${flight.flightNumber}.`;
  const lead =
    disruption.type === "cancellation"
      ? `${was.flightNumber} (${where}) was cancelled.`
      : disruption.type === "missed_connection"
        ? `I missed ${was.flightNumber} (${where}).`
        : `My flight ${was.flightNumber} (${where}) has changed.`;
  return `${lead} ${newFlight} ${timing}`;
}

function connectionLine(trip: Trip, impact: Impact): string | null {
  const c = impact.connection;
  const onward = c && trip.flights.find((f) => f.id === c.flightId);
  if (!c || !onward) return null;
  const name = `${onward.flightNumber} to ${cityName(onward.to)}`;
  if (c.minutesAfter === null) return `My connection to ${name} is at risk until I have a new flight.`;
  if (c.status === "missed") return `That is after ${name} departs, so I expect to miss that connection.`;
  const was = c.minutesAfter === c.minutesBefore ? "" : ` (it was ${formatDuration(c.minutesBefore)})`;
  if (c.status === "tight") {
    return `That leaves ${formatDuration(c.minutesAfter)} to connect to ${name}${was}, so I may miss it.`;
  }
  return `I still have ${formatDuration(c.minutesAfter)} to connect to ${name}${was}.`;
}

function itineraryLine(flight: Flight, impact: Impact, withRef: boolean): string {
  const ref = withRef && flight.bookingRef ? ` Booking ref ${flight.bookingRef}.` : "";
  const head = `- ${flight.flightNumber}, ${route(flight)}:`;
  if (isArrivalUnknown(flight)) return `${head} cancelled, no new flight yet.${ref}`;
  const atRisk = impact.connection?.flightId === flight.id && impact.connection.status !== "ok";
  const tag = atRisk
    ? " (at risk)"
    : flight.status === "delayed"
      ? " (delayed)"
      : flight.status === "rebooked"
        ? " (new booking)"
        : "";
  return `${head} departs ${formatDateTime(flight.departAt)}, arrives ${formatDateTime(flight.arriveAt)}${tag}.${ref}`;
}

/**
 * A plain-text update from the traveler, short enough for a text message.
 * Returns "" when the disruption id is not in the trip.
 */
export function buildSummary(trip: Trip, disruptionId: string, options: SummaryOptions): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  const flight = disruption && trip.flights.find((f) => f.id === disruption.flightId);
  if (!disruption || !flight) return "";
  const impact = computeImpact(trip, flight.id);

  const lines: string[] = [`Travel update from ${trip.travelerName} (${trip.name})`, ""];

  lines.push("What changed:", whatChanged(flight, disruption, impact));
  const connection = connectionLine(trip, impact);
  if (connection) lines.push(connection);
  if (options.includeStays) {
    for (const { stayId } of impact.affectedStays) {
      const stay = trip.stays.find((s) => s.id === stayId);
      if (stay) lines.push(`I may be late checking in at ${stay.name}.`);
    }
  }

  lines.push("", "Revised itinerary:");
  for (const f of trip.flights) lines.push(itineraryLine(f, impact, options.includeBookingRefs));

  if (options.includeStays && trip.stays.length > 0) {
    lines.push("", "Where I'm staying:");
    for (const s of trip.stays) {
      const conf = options.includeBookingRefs && s.confirmation ? ` Confirmation ${s.confirmation}.` : "";
      lines.push(`- ${s.name}, ${s.address}. Check-in ${formatDate(s.checkIn)}, check-out ${formatDate(s.checkOut)}.${conf}`);
    }
  }

  if (options.includeOpenTasks) {
    const open = disruption.tasks.filter((t) => !t.done);
    lines.push("", "Still to sort out:");
    if (open.length === 0) lines.push("Nothing. Everything on my list is done.");
    for (const t of open) lines.push(`- ${t.title}`);
  }

  return lines.join("\n");
}
