import { z } from "zod";
import type { Flight, Stay, Trip } from "@/lib/types";
import { flightLabel } from "./text";
import { datePart, formatDate, minutesBetween, timePart } from "./time";

export const ConnectionStatusSchema = z.enum(["ok", "tight", "missed"]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionImpactSchema = z.object({
  flightId: z.string(), // the onward flight
  minutesBefore: z.number(), // connection time as originally booked
  minutesAfter: z.number().nullable(), // connection time now; null = arrival unknown
  status: ConnectionStatusSchema,
});
export type ConnectionImpact = z.infer<typeof ConnectionImpactSchema>;

export const AffectedStaySchema = z.object({
  stayId: z.string(),
  reason: z.string(), // one plain sentence, ready to show
});
export type AffectedStay = z.infer<typeof AffectedStaySchema>;

export const ImpactSchema = z.object({
  flightId: z.string(),
  // Minutes later the flight now arrives than originally booked (negative = earlier).
  // null when the flight is cancelled and no replacement times are known.
  delayMinutes: z.number().nullable(),
  connection: ConnectionImpactSchema.nullable(), // null = no onward flight
  affectedStays: z.array(AffectedStaySchema),
});
export type Impact = z.infer<typeof ImpactSchema>;

/** A connection shorter than this many minutes is "tight". Below zero is "missed". */
export const TIGHT_CONNECTION_MINUTES = 60;

/** How long after an arrival a departure from the same airport still counts as a connection. */
const MAX_CONNECTION_MINUTES = 24 * 60;

/** True when the flight is cancelled and nobody has supplied replacement times. */
export function isArrivalUnknown(flight: Flight): boolean {
  return (
    flight.status === "cancelled" &&
    (!flight.original || flight.original.arriveAt === flight.arriveAt)
  );
}

/** The parts of a flight that connections are worked out from (a trip's or a shared link's). */
type Leg = {
  id: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  original?: { departAt: string; arriveAt: string };
};

/**
 * The onward leg booked after `flight` among `flights`: the earliest departure from the
 * airport it arrives at, within a day of its originally booked arrival. Null if there is none.
 */
export function nextLeg<F extends Leg>(flights: F[], flight: F): F | null {
  const bookedArrival = flight.original?.arriveAt ?? flight.arriveAt;
  const candidates = flights
    .filter((f) => f.id !== flight.id && f.from === flight.to)
    .map((f) => ({ f, gap: minutesBetween(bookedArrival, f.original?.departAt ?? f.departAt) }))
    .filter(({ gap }) => gap >= 0 && gap <= MAX_CONNECTION_MINUTES)
    .sort((a, b) => a.gap - b.gap);
  return candidates[0]?.f ?? null;
}

/**
 * The last leg of the journey `flight` is part of, following booked connections. On a round
 * trip that is where the outward journey ends, not the flight home days later.
 */
export function lastLeg<F extends Leg>(flights: F[], flight: F): F {
  let last = flight;
  const seen = new Set([flight.id]);
  for (let next = nextLeg(flights, flight); next && !seen.has(next.id); next = nextLeg(flights, next)) {
    seen.add(next.id);
    last = next;
  }
  return last;
}

/** The onward flight booked after `flight`, or null. */
export function findConnection(trip: Trip, flight: Flight): Flight | null {
  return nextLeg(trip.flights, flight);
}

function connectionStatus(minutesAfter: number | null): ConnectionStatus {
  if (minutesAfter === null || minutesAfter < 0) return "missed";
  return minutesAfter < TIGHT_CONNECTION_MINUTES ? "tight" : "ok";
}

export function computeImpact(trip: Trip, flightId: string): Impact {
  const flight = trip.flights.find((f) => f.id === flightId);
  if (!flight) return { flightId, delayMinutes: 0, connection: null, affectedStays: [] };

  const unknown = isArrivalUnknown(flight);
  const bookedArrival = flight.original?.arriveAt ?? flight.arriveAt;
  // Old vs new arrival at the same airport.
  const delayMinutes = unknown ? null : minutesBetween(bookedArrival, flight.arriveAt);

  const onward = findConnection(trip, flight);
  let connection: ConnectionImpact | null = null;
  if (onward) {
    // Arrival vs the onward departure, both at the connecting airport. If the onward flight
    // is itself cancelled with no replacement, its departure time no longer means anything.
    const onwardGone = onward.status === "cancelled" && isArrivalUnknown(onward);
    const minutesAfter = unknown || onwardGone ? null : minutesBetween(flight.arriveAt, onward.departAt);
    connection = {
      flightId: onward.id,
      minutesBefore: minutesBetween(bookedArrival, onward.original?.departAt ?? onward.departAt),
      minutesAfter,
      status: connectionStatus(minutesAfter),
    };
  }

  // Follow the booked connections to the flight that actually lands where the traveler sleeps.
  const last = lastLeg(trip.flights, flight);
  const bookedFinalDate = datePart(last.original?.arriveAt ?? last.arriveAt);
  const stays = trip.stays.filter((s) => {
    const daysAfterLanding = minutesBetween(`${bookedFinalDate}T00:00`, `${datePart(s.checkIn)}T00:00`) / 1440;
    return daysAfterLanding >= 0 && daysAfterLanding <= 1;
  });

  const affectedStays: AffectedStay[] = [];
  for (const stay of stays) {
    const reason = stayReason(stay, flight, onward, connection, unknown);
    if (reason) affectedStays.push({ stayId: stay.id, reason });
  }

  return { flightId, delayMinutes, connection, affectedStays };
}

function stayReason(
  stay: Stay,
  flight: Flight,
  onward: Flight | null,
  connection: ConnectionImpact | null,
  unknown: boolean,
): string | null {
  if (unknown) {
    return `${flightLabel(flight.flightNumber)} is cancelled with no new arrival time yet, so check-in at ${stay.name} is at risk.`;
  }
  if (onward && connection) {
    if (connection.status === "missed") {
      return `You are likely to miss ${flightLabel(onward.flightNumber)}, so you may reach ${stay.name} late or on a later day.`;
    }
    if (connection.status === "tight") {
      return `Your connection to ${flightLabel(onward.flightNumber)} is tight. If you miss it you will reach ${stay.name} late.`;
    }
    return null;
  }
  // No onward flight: this flight lands in the stay's city, so compare directly.
  const arrival = flight.arriveAt;
  if (datePart(arrival) > datePart(stay.checkIn)) {
    return `You now land on ${formatDate(arrival)}, after your check-in date at ${stay.name}.`;
  }
  if (
    stay.latestCheckIn &&
    datePart(arrival) === datePart(stay.checkIn) &&
    timePart(arrival) > stay.latestCheckIn
  ) {
    return `You now land at ${timePart(arrival)}, after the latest check-in time (${stay.latestCheckIn}) at ${stay.name}.`;
  }
  return null;
}
