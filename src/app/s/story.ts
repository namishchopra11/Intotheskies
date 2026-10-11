import { cityName } from "@/lib/domain/airports";
import type { ShareSnapshot } from "@/lib/domain/shareLink";
import { datePart, formatDuration, timePart } from "@/lib/domain/time";

// The words on the read-only page (/s), kept apart from the page so they can be tested.
// Everything here reads only the snapshot that travels in the link.

export type SnapFlight = ShareSnapshot["flights"][number];
export type SnapStay = ShareSnapshot["stays"][number];
export type SnapConnection = NonNullable<ShareSnapshot["impact"]["connection"]>;

/**
 * How the onward connection stands. "unknown" is a connection whose new arrival time is not
 * known yet: that is at risk, not missed, so it has to be told apart from "missed" first.
 */
export type ConnectionState = "none" | "unknown" | "missed" | "tight" | "ok";

export function connectionState(c: SnapConnection | null): ConnectionState {
  if (!c) return "none";
  if (c.minutesAfter === null) return "unknown";
  return c.status;
}

/** The headline and one plain sentence of why, written for the person waiting. */
export function storyFor(
  s: ShareSnapshot,
  first: string,
  changed: SnapFlight | undefined,
  final: SnapFlight | undefined,
  c: SnapConnection | null,
): { title: string; detail: string } {
  const detail = changed ? whyLine(s, first, changed) : "";
  if (!final) return { title: `${first}'s plans have changed.`, detail };
  const dest = cityName(final.to);
  const at = timePart(final.arriveAt);
  const via = changed ? cityName(changed.to) : dest;
  const state = connectionState(c);

  if (final.status === "cancelled") return { title: `${first} doesn't have a new flight to ${dest} yet.`, detail };
  if (state === "unknown") return { title: `${first}'s connection in ${via} is at risk.`, detail };
  if (state === "missed") return { title: `${first} is likely to miss the connection in ${via}.`, detail };
  const moved = final.original && final.original.arriveAt !== final.arriveAt;
  if (moved) return { title: `${first} now lands in ${dest} at ${at}.`, detail };
  if (state === "tight") return { title: `${first}'s connection in ${via} is now tight.`, detail };
  return { title: `${first} still lands in ${dest} at ${at}.`, detail };
}

export function whyLine(s: ShareSnapshot, first: string, f: SnapFlight): string {
  const from = cityName(f.from);
  const to = cityName(f.to);
  const rebooked = f.status === "rebooked";
  const newFlight = f.original && f.original.flightNumber !== f.flightNumber ? ` ${f.airline} ${f.flightNumber}` : " a new flight";
  switch (s.disruption.type) {
    case "delay": {
      const late = s.impact.delayMinutes && s.impact.delayMinutes > 0 ? ` ${formatDuration(s.impact.delayMinutes)}` : "";
      return `The flight from ${from} to ${to} is running${late} late.${connectionClause(s.impact.connection)}`;
    }
    case "cancellation":
      return rebooked
        ? `The flight from ${from} to ${to} was cancelled. ${first} has been rebooked onto${newFlight}.`
        : `The flight from ${from} to ${to} was cancelled, and a replacement isn't confirmed yet.`;
    case "missed_connection":
      return rebooked
        ? `${first} missed the connection in ${from} and has been rebooked onto${newFlight}.`
        : `${first} missed the connection in ${from} and is waiting for a new flight.`;
    case "rebooked":
    default:
      return `The flight from ${from} to ${to} has changed. ${first} is now on${newFlight}.`;
  }
}

function connectionClause(c: SnapConnection | null): string {
  const state = connectionState(c);
  if (!c || c.minutesAfter === null || state === "ok") return "";
  if (state === "missed") return " That's after the onward flight leaves.";
  return ` That leaves ${formatDuration(c.minutesAfter)} to change planes.`;
}

/**
 * One line for a hotel the update says is at risk, worded from what is actually true: the
 * landing day or time against the check-in, or else the state of the connection. The
 * traveler's own reasons (computeImpact) are written in the second person, so they are
 * not reused here.
 */
export function stayRisk(
  first: string,
  stay: SnapStay,
  final: SnapFlight | undefined,
  c: SnapConnection | null,
): string {
  if (final?.status === "cancelled") {
    return `Check-in at ${stay.name} is on hold until ${first} has a new flight.`;
  }
  if (final) {
    const landsOn = datePart(final.arriveAt);
    const checkInOn = datePart(stay.checkIn);
    if (landsOn > checkInOn) {
      return `${first} now lands after the check-in date at ${stay.name}.`;
    }
    if (stay.latestCheckIn && landsOn === checkInOn && timePart(final.arriveAt) > stay.latestCheckIn) {
      return `${first} now lands at ${timePart(final.arriveAt)}, after the front desk at ${stay.name} closes at ${stay.latestCheckIn}.`;
    }
  }
  switch (connectionState(c)) {
    case "unknown":
    case "missed":
      return `Check-in at ${stay.name} may be late: the connection is at risk.`;
    case "tight":
      return `Check-in at ${stay.name} may be late: the connection is tight.`;
    default:
      return stay.latestCheckIn
        ? `Check-in at ${stay.name}: the front desk is open until ${stay.latestCheckIn}.`
        : `Check-in at ${stay.name} may be late.`;
  }
}
