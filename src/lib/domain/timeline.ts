import type { Flight, Stay, Trip } from "@/lib/types";
import { taskId } from "./checklist";
import { TIGHT_CONNECTION_MINUTES, computeImpact, isArrivalUnknown } from "./impact";
import { cityName } from "./airports";
import { datePart, formatDate, formatDuration, minutesBetween, timePart } from "./time";

export type TimelineState = "ok" | "warn" | "bad" | "idle";

export type TimelineNode = {
  id: string;
  kind: "flight" | "connection" | "stay" | "person";
  title: string;
  detail: string;
  state: TimelineState;
  /** The rail below this node is dashed: the link to the next node is broken. */
  broken?: boolean;
  /** Time shown beside the rail ("12:45"), and the old one struck through. */
  time?: string;
  was?: string;
};

export type FinalArrival = {
  flight: Flight;
  arriveAt: string;
  was: string;
  /** Minutes later than booked, or null while the arrival is unknown. */
  delayMinutes: number | null;
  unknown: boolean;
};

const byDeparture = (a: Flight, b: Flight) => a.departAt.localeCompare(b.departAt);

/** Where the traveler now lands: the last flight, unknown if a cancel or missed link leaves no new plan. */
export function finalArrival(trip: Trip, disruptionId: string): FinalArrival | null {
  const d = trip.disruptions.find((x) => x.id === disruptionId);
  const changed = d && trip.flights.find((f) => f.id === d.flightId);
  const last = [...trip.flights].sort(byDeparture).at(-1);
  if (!changed || !last) return null;
  const c = computeImpact(trip, changed.id).connection;
  const onward = c && trip.flights.find((f) => f.id === c.flightId);
  const unknown = isArrivalUnknown(changed) || isArrivalUnknown(last) || (c?.status === "missed" && !onward?.original);
  const was = last.original?.arriveAt ?? last.arriveAt;
  return {
    flight: last,
    arriveAt: last.arriveAt,
    was,
    unknown,
    delayMinutes: unknown ? null : minutesBetween(was, last.arriveAt),
  };
}

function flightNode(f: Flight): TimelineNode {
  const o = f.original;
  const unknown = isArrivalUnknown(f);
  const late = o ? minutesBetween(o.arriveAt, f.arriveAt) : 0;
  const route = `${f.from} → ${f.to}`;
  const base = { id: f.id, kind: "flight" as const, title: `${f.flightNumber} · ${route}` };
  if (f.status === "cancelled" && unknown) {
    return { ...base, detail: "Cancelled. No new time yet.", state: "bad", time: "–:–", was: o && timePart(o.arriveAt) };
  }
  if (f.status === "rebooked") {
    const was = o && o.flightNumber !== f.flightNumber ? `Was ${o.flightNumber}, ${timePart(o.departAt)}. ` : "";
    return { ...base, detail: `${was}Leaves ${timePart(f.departAt)}, lands ${timePart(f.arriveAt)}.`, state: "ok", time: timePart(f.arriveAt), was: o && o.arriveAt !== f.arriveAt ? timePart(o.arriveAt) : undefined };
  }
  if (late > 0) {
    return { ...base, detail: `${formatDuration(late)} late. Lands ${timePart(f.arriveAt)}.`, state: "warn", time: timePart(f.arriveAt), was: timePart(o!.arriveAt) };
  }
  return { ...base, detail: `Lands ${timePart(f.arriveAt)}.`, state: "ok", time: timePart(f.arriveAt) };
}

/** The link between two flights, measured at the one airport they share. */
function connectionNode(a: Flight, b: Flight): TimelineNode {
  const city = cityName(b.from);
  const id = `${a.id}>${b.id}`;
  if (isArrivalUnknown(a)) {
    return { id, kind: "connection", title: `Connection in ${city}`, detail: `${a.flightNumber} has no new arrival time, so ${b.flightNumber} is at risk.`, state: "bad", broken: true };
  }
  const booked = b.original?.departAt ?? b.departAt;
  const gapBooked = minutesBetween(a.arriveAt, booked);
  if (gapBooked < 0) {
    return {
      id,
      kind: "connection",
      title: `Missed ${b.original?.flightNumber ?? b.flightNumber}`,
      detail: `${a.flightNumber} lands ${timePart(a.arriveAt)}, ${formatDuration(-gapBooked)} after it left at ${timePart(booked)}.`,
      state: "bad",
      broken: true,
    };
  }
  const gap = minutesBetween(a.arriveAt, b.departAt);
  const tight = gap < TIGHT_CONNECTION_MINUTES;
  return {
    id,
    kind: "connection",
    title: `${formatDuration(gap)} in ${city}`,
    detail: tight ? `Tight for ${b.flightNumber}.` : `Enough time for ${b.flightNumber}.`,
    state: tight ? "warn" : "ok",
  };
}

function stayNode(stay: Stay, arrival: FinalArrival): TimelineNode {
  const base = { id: stay.id, kind: "stay" as const, title: stay.name };
  if (arrival.unknown) {
    return { ...base, detail: "No arrival time yet, so check-in is at risk.", state: "bad", broken: false };
  }
  const arrive = arrival.arriveAt;
  if (stay.latestCheckIn) {
    // Landing to the front desk closing, same city: no transfer time is assumed.
    const spare = minutesBetween(arrive, `${datePart(stay.checkIn)}T${stay.latestCheckIn}`);
    if (spare < 0) {
      return { ...base, detail: `You land ${timePart(arrive)}, after the front desk closes at ${stay.latestCheckIn}.`, state: "bad" };
    }
    return {
      ...base,
      detail: `Front desk open until ${stay.latestCheckIn}. ${formatDuration(spare)} to spare after you land.`,
      state: spare < TIGHT_CONNECTION_MINUTES ? "warn" : "ok",
    };
  }
  if (datePart(arrive) > datePart(stay.checkIn)) {
    return { ...base, detail: `You now land on ${formatDate(arrive)}, after your check-in date.`, state: "warn" };
  }
  return { ...base, detail: `Check-in from ${timePart(stay.checkIn)}.`, state: "ok" };
}

/**
 * The trip as a rail of nodes: flights, the links between them, the stay and the people
 * waiting. Everything is read from the trip; a person turns green when their task is done.
 */
export function buildTimeline(trip: Trip, disruptionId: string): TimelineNode[] {
  const d = trip.disruptions.find((x) => x.id === disruptionId);
  const arrival = finalArrival(trip, disruptionId);
  if (!d || !arrival) return [];
  const flights = [...trip.flights].sort(byDeparture);

  const nodes: TimelineNode[] = [];
  flights.forEach((f, i) => {
    const node = flightNode(f);
    // A flight that still shows its booked time, but can no longer be relied on.
    if (arrival.unknown && f.id === arrival.flight.id && f.status === "scheduled") {
      Object.assign(node, { detail: "Not confirmed. Depends on getting a new flight.", state: "warn", time: "–:–", was: timePart(f.arriveAt) });
    }
    nodes.push(node);
    const next = flights[i + 1];
    if (next && next.from === f.to) nodes.push(connectionNode(f, next));
  });

  const landed = arrival.flight.original?.arriveAt ?? arrival.arriveAt;
  for (const stay of trip.stays) {
    const days = minutesBetween(`${datePart(landed)}T00:00`, `${datePart(stay.checkIn)}T00:00`) / 1440;
    if (days >= 0 && days <= 1) nodes.push(stayNode(stay, arrival));
  }

  const isDone = (key: string) => d.tasks.find((t) => t.id === taskId(d.id, key as never))?.done;
  const hasTask = (key: string) => d.tasks.some((t) => t.id === taskId(d.id, key as never));
  // A pickup Layover already moved by itself (autoUpdates.ts) has no rearrange_pickup task.
  const rideAction = (d.actions ?? []).find((a) => a.kind === "ride");
  for (const p of trip.people ?? []) {
    const key = p.role === "pickup" ? "rearrange_pickup" : p.role === "family" ? "send_update" : null;
    const base = { id: p.id, kind: "person" as const, title: `${p.name} · ${p.role === "pickup" ? "pickup" : p.role === "family" ? "family" : "waiting"}` };
    if (key === "rearrange_pickup" && !hasTask(key) && rideAction) {
      nodes.push(
        rideAction.status === "done"
          ? { ...base, detail: "Pickup moved for you to meet the new arrival.", state: "ok" }
          : { ...base, detail: "Pickup on hold until there's a new flight.", state: "warn" },
      );
    } else if (!key || !hasTask(key)) nodes.push({ ...base, detail: "Nothing to tell them yet.", state: "idle" });
    else if (isDone(key)) nodes.push({ ...base, detail: "Knows the new plan.", state: "ok" });
    else nodes.push({ ...base, detail: p.role === "pickup" ? "Still expects the old arrival." : "Hasn't heard yet.", state: p.role === "pickup" ? "bad" : "warn" });
  }
  return nodes;
}
