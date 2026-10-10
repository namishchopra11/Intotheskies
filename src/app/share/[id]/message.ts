import { cityName } from "@/lib/domain/airports";
import { computeImpact, isArrivalUnknown } from "@/lib/domain/impact";
import type { SummaryOptions } from "@/lib/domain/summary";
import { formatDate, formatDuration, timePart } from "@/lib/domain/time";
import type { Trip } from "@/lib/types";

/**
 * The short text message on the Share screen: four or five lines a person can read at a
 * glance in a chat. Every optional line is always returned, marked `on` or not, so the
 * preview can fold a line away when its switch is turned off. The full detail travels in
 * the link (/s), built from buildSummary.
 */
export type MessageLine = {
  key: "lead" | "flight" | "refs" | "hotel" | "unresolved";
  text: string;
  on: boolean;
  mono?: boolean;
};

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

export function buildMessage(trip: Trip, disruptionId: string, options: SummaryOptions): MessageLine[] {
  const d = trip.disruptions.find((x) => x.id === disruptionId);
  const f = d && trip.flights.find((x) => x.id === d.flightId);
  if (!d || !f) return [];
  const impact = computeImpact(trip, f.id);
  const from = cityName(f.from);
  const to = cityName(f.to);
  const unknown = isArrivalUnknown(f);

  let lead: string;
  switch (d.type) {
    case "missed_connection":
      lead = `Change of plans — my connection in ${from} was missed.`;
      break;
    case "cancellation":
      lead = `Change of plans — my flight from ${from} to ${to} was cancelled.`;
      break;
    case "delay": {
      const late = impact.delayMinutes;
      lead =
        late && late > 0
          ? `Change of plans — my flight from ${from} to ${to} is running ${formatDuration(late)} late.`
          : `Change of plans — my flight from ${from} to ${to} has new times.`;
      break;
    }
    case "rebooked":
    default:
      lead = `Change of plans — my flight from ${from} to ${to} has changed.`;
  }

  let flight: string;
  if (unknown) {
    flight = "I don't have a new flight yet.";
  } else {
    const label = d.type === "delay" ? "New times" : "New flight";
    flight = `${label}: ${f.flightNumber}, ${from} ${timePart(f.departAt)} → ${to} ${timePart(f.arriveAt)} (${formatDate(f.departAt)}).`;
    const c = impact.connection;
    if (c?.status === "missed") flight += " I'll likely miss my connection.";
    else if (c?.status === "tight") flight += " My connection is tight.";
  }

  const refs = [...new Set(trip.flights.map((x) => x.bookingRef).filter(Boolean))];
  const affected = impact.affectedStays[0]?.stayId;
  const stay = trip.stays.find((s) => s.id === affected) ?? trip.stays[0];
  const hotel = stay
    ? `Hotel: ${stay.name}.${stay.latestCheckIn ? ` Front desk is open until ${stay.latestCheckIn}.` : ` Check-in ${formatDate(stay.checkIn)}.`}${options.includeBookingRefs && stay.confirmation ? ` Confirmation ${stay.confirmation}.` : ""}`
    : "";
  const open = d.tasks.filter((t) => !t.done).map((t) => lowerFirst(t.title));
  const unresolved = open.length > 0 ? `Still sorting: ${open.join(", ")}.` : "Everything else is sorted.";

  const lines: MessageLine[] = [
    { key: "lead", text: lead, on: true },
    { key: "flight", text: flight, on: true },
  ];
  if (refs.length > 0) {
    lines.push({ key: "refs", text: `Booking ref: ${refs.join(", ")}`, on: options.includeBookingRefs, mono: true });
  }
  if (hotel) lines.push({ key: "hotel", text: hotel, on: options.includeStays });
  lines.push({ key: "unresolved", text: unresolved, on: options.includeOpenTasks });
  return lines;
}

/** The message as plain text, only the lines that are switched on. */
export function messageText(lines: MessageLine[]): string {
  return lines
    .filter((l) => l.on)
    .map((l) => l.text)
    .join("\n");
}
