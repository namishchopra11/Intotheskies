import { cityName } from "@/lib/domain/airports";
import { isArrivalUnknown } from "@/lib/domain/impact";
import { datePart, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import { buildTimeline, finalArrival, type TimelineNode } from "@/lib/domain/timeline";
import type { Flight, Trip } from "@/lib/types";

export type PlanTone = "ok" | "warn" | "bad";

/** dot: as planned · ring: watch this · x: gone · check: the new booking · open: not known yet */
export type PlanMarker = "dot" | "ring" | "x" | "check" | "open";

export type PlanRow = {
  id: string;
  /** "HH:mm", or "–:–" when there is no time yet. */
  time: string;
  title: string;
  /** The row is something that no longer happens: time and title are struck through. */
  struck?: boolean;
  detail?: string;
  status?: { tone: PlanTone; text: string };
  marker: PlanMarker;
  /** The row that matters most: the new flight. */
  highlight?: boolean;
};

const byDeparture = (a: Flight, b: Flight) => a.departAt.localeCompare(b.departAt);

function lateBy(f: Flight): number {
  return f.original ? minutesBetween(f.original.departAt, f.departAt) : 0;
}

/** The new booking's details: "Seat 12C · lands 18:00". */
function bookingLine(f: Flight): string {
  return [f.seat && `Seat ${f.seat}`, `lands ${timePart(f.arriveAt)}`].filter(Boolean).join(" · ");
}

/** The pickup's state from the timeline, said in a few words. */
function pickupLine(name: string, detail: string): string {
  if (detail.startsWith("Pickup moved")) return `${name}'s picking you up — moved to match`;
  if (detail.startsWith("Knows")) return `${name}'s picking you up — knows the new plan`;
  if (detail.startsWith("Pickup on hold")) return `${name}'s pickup is on hold for now`;
  if (detail.startsWith("Still expects")) return `${name}'s picking you up — not told yet`;
  if (detail.startsWith("Pickup still on")) return `${name}'s pickup still stands if you connect`;
  return `${name}'s picking you up`;
}

/** Before any change, the people waiting stand as booked: a pickup simply expects you. */
function asBookedPeople(trip: Trip): Pick<TimelineNode, "kind" | "title" | "detail" | "state">[] {
  return (trip.people ?? [])
    .filter((p) => p.role === "pickup")
    .map((p) => ({ kind: "person" as const, title: `${p.name} · pickup`, detail: "", state: "ok" as const }));
}

/**
 * The traveler's day (after a change, or as booked when `disruptionId` is null), as one list in time order: each flight's departure
 * (an old booking struck through above its replacement), each landing with the time until
 * the next flight, then the ride and hotel waiting at the end. All comparisons are at one
 * airport or one city (see the wall-clock rule in CLAUDE.md).
 */
export function buildDayPlan(trip: Trip, disruptionId: string | null): PlanRow[] {
  const flights = [...trip.flights].sort(byDeparture);
  const d = disruptionId === null ? undefined : trip.disruptions.find((x) => x.id === disruptionId);
  // With no change yet (null), the day as booked: the last flight's arrival stands.
  const last = flights.at(-1);
  const arrival =
    disruptionId === null
      ? last && { flight: last, arriveAt: last.arriveAt, unknown: false }
      : d && finalArrival(trip, disruptionId);
  if (!arrival) return [];
  const nodes = d ? buildTimeline(trip, d.id) : asBookedPeople(trip);
  const rows: PlanRow[] = [];

  flights.forEach((f, i) => {
    const prev = flights[i - 1];
    const next = flights[i + 1];
    const connectsIn = prev && prev.to === f.from;
    const o = f.original;
    const replaced = o && (o.flightNumber !== f.flightNumber || f.status === "rebooked" || f.status === "cancelled");

    if (replaced) {
      // The booking that no longer flies.
      rows.push({
        id: `${f.id}-was`,
        time: timePart(o.departAt),
        title: `${o.flightNumber} to ${cityName(f.to)}`,
        struck: true,
        status: { tone: "bad", text: d?.type === "missed_connection" && d.flightId === f.id ? "Missed" : "Cancelled" },
        marker: "x",
      });
      if (isArrivalUnknown(f)) {
        rows.push({
          id: f.id,
          time: "–:–",
          title: "New flight",
          detail: `Waiting for ${f.airline} to confirm one`,
          status: { tone: "warn", text: "Finding one…" },
          marker: "open",
        });
      } else {
        rows.push({
          id: f.id,
          time: timePart(f.departAt),
          title: `New flight · ${f.flightNumber}`,
          detail: bookingLine(f),
          status: { tone: "ok", text: "Rebooked" },
          marker: "check",
          highlight: true,
        });
      }
    } else {
      const late = lateBy(f);
      const verb = connectsIn ? "Fly to" : "Leave";
      const place = connectsIn ? cityName(f.to) : cityName(f.from);
      const unconfirmed = arrival.unknown && f.status === "scheduled" && i > 0;
      rows.push({
        id: f.id,
        time: timePart(f.departAt),
        title: `${verb} ${place} · ${f.flightNumber}`,
        status: unconfirmed
          ? { tone: "warn", text: "Depends on a new flight" }
          : late > 0
            ? { tone: "warn", text: `${formatDuration(late)} late` }
            : f.status === "rebooked"
              ? { tone: "ok", text: "Rebooked" }
              : undefined,
        detail: !unconfirmed && late <= 0 && f.status !== "rebooked" ? "On time" : undefined,
        marker: late > 0 || unconfirmed ? "ring" : "dot",
      });
    }

    // The landing, and the time until the next flight from the same airport.
    const unknown = isArrivalUnknown(f) || (arrival.unknown && f.status === "scheduled" && i > 0);
    const onward = next && next.from === f.to ? next : null;
    let detail: string | undefined;
    let status: PlanRow["status"];
    if (unknown) status = { tone: "warn", text: "No new arrival time yet" };
    else if (onward && !isArrivalUnknown(onward)) {
      const gap = minutesBetween(f.arriveAt, onward.departAt);
      const what = onward.original && onward.status === "rebooked" ? "your new flight" : onward.flightNumber;
      if (gap < 0) status = { tone: "bad", text: `Lands after ${onward.flightNumber} leaves` };
      else if (gap < 60) status = { tone: "warn", text: `Tight — ${formatDuration(gap)} until ${what}` };
      else detail = `${formatDuration(gap)} until ${what}`;
    } else if (!onward && f.id === arrival.flight.id) {
      const pickup = nodes.find((n) => n.kind === "person" && n.title.endsWith("· pickup"));
      if (pickup) {
        const said = pickupLine(pickup.title.split(" · ")[0], pickup.detail);
        if (pickup.state === "ok" || pickup.state === "idle") detail = said;
        else status = { tone: pickup.state === "bad" ? "bad" : "warn", text: said };
      }
    }
    rows.push({
      id: `${f.id}-land`,
      time: unknown ? "–:–" : timePart(f.arriveAt),
      title: `Land in ${cityName(f.to)}`,
      detail,
      status,
      marker: unknown ? "open" : status?.tone === "bad" || status?.tone === "warn" ? "ring" : "dot",
    });
  });

  // What waits at the destination: the ride and the hotel, in time order.
  const end: (PlanRow & { at: string })[] = [];
  const landed = arrival.flight.original?.arriveAt ?? arrival.arriveAt;
  for (const r of trip.rides ?? []) {
    const booked = r.rescheduledFrom ?? r.pickupAt;
    const gap = minutesBetween(landed, booked);
    if (gap < -60 || gap > 6 * 60) continue;
    let status: PlanRow["status"];
    let marker: PlanMarker = "dot";
    if (arrival.unknown) {
      status = { tone: "warn", text: "On hold until there's a new flight" };
      marker = "ring";
    } else if (minutesBetween(arrival.arriveAt, r.pickupAt) < 0) {
      status = { tone: "bad", text: `Booked for before you land` };
      marker = "ring";
    } else if (r.rescheduledFrom) status = { tone: "ok", text: `Moved from ${timePart(r.rescheduledFrom)} for you` };
    end.push({ id: r.id, at: r.pickupAt, time: arrival.unknown ? timePart(booked) : timePart(r.pickupAt), title: "Your pickup", detail: r.provider, status, marker });
  }
  for (const s of trip.stays) {
    const days = minutesBetween(`${datePart(landed)}T00:00`, `${datePart(s.checkIn)}T00:00`) / 1440;
    if (days < 0 || days > 1) continue;
    const closes = s.latestCheckIn ? `${datePart(s.checkIn)}T${s.latestCheckIn}` : null;
    const at = closes ?? s.checkIn;
    let status: PlanRow["status"];
    let detail: string | undefined;
    if (arrival.unknown) status = { tone: "warn", text: "At risk — no arrival time yet" };
    else if (closes) {
      const spare = minutesBetween(arrival.arriveAt, closes);
      if (spare < 0) status = { tone: "bad", text: "You land after the front desk closes" };
      else if (spare < 60) status = { tone: "warn", text: `Tight — ${formatDuration(spare)} after landing` };
      else detail = `${formatDuration(spare)} to spare after landing`;
    } else if (datePart(arrival.arriveAt) > datePart(s.checkIn)) status = { tone: "warn", text: "You now land after your check-in date" };
    else detail = "Check-in open";
    detail = detail ? `${s.name} · ${detail}` : s.name;
    end.push({
      id: s.id,
      at,
      time: timePart(at),
      title: closes ? "Hotel front desk closes" : "Hotel check-in",
      detail,
      status,
      marker: status && status.tone !== "ok" ? "ring" : "dot",
    });
  }
  end.sort((a, b) => a.at.localeCompare(b.at));
  return [...rows, ...end.map(({ at, ...row }) => (void at, row))];
}
