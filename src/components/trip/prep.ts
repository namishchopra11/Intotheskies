import { cityName } from "@/lib/domain/airports";
import { TIGHT_CONNECTION_MINUTES } from "@/lib/domain/impact";
import { datePart, formatDate, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import type { Flight, Ride, Stay, Trip } from "@/lib/types";

/**
 * What the "on track" screen shows before anything has changed: reminders built from the
 * trip's own bookings, a plan for landing, and the booking codes. Pure functions.
 *
 * Every time comparison is at one place: a connection at one airport, landing vs pickup at
 * the arrival airport, landing vs check-in in the same city. Days-until uses calendar dates.
 */

export type PrepItem = { key: string; title: string; detail: string };

/** Flights in the order they're flown. Wall-clock strings sort as text; good enough for order. */
export function flightsInOrder(trip: Trip): Flight[] {
  return [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** Reminders for the days before the trip, most time-sensitive first. Keys are stable. */
export function prepItems(trip: Trip): PrepItem[] {
  const flights = flightsInOrder(trip);
  if (flights.length === 0) return [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const items: PrepItem[] = [];

  items.push({
    key: "documents",
    title: "Check passport and entry rules",
    detail: `Make sure your passport is valid for the whole trip, and check what you need to enter ${cityName(last.to)}.`,
  });

  for (const f of flights) {
    items.push({
      key: `checkin:${f.id}`,
      title: `Check in for ${f.flightNumber}`,
      detail: `${f.airline}, ${formatDate(f.departAt)}. Online check-in usually opens a day or two before departure.`,
    });
  }

  items.push({
    key: "boarding-passes",
    title: "Save boarding passes to your phone",
    detail: "Add them to your wallet so they open without signal.",
  });

  const airlines = [...new Set(flights.map((f) => f.airline))];
  items.push({
    key: "airline-apps",
    title: airlines.length === 1 ? `Install the ${airlines[0]} app` : "Install your airlines' apps",
    detail: `${list(airlines)}: gate changes and rebooking offers often show up there first.`,
  });

  for (let i = 0; i + 1 < flights.length; i++) {
    const [a, b] = [flights[i], flights[i + 1]];
    if (a.to !== b.from) continue;
    const gap = minutesBetween(a.arriveAt, b.departAt); // same airport
    if (gap >= 0 && gap < TIGHT_CONNECTION_MINUTES * 1.5) {
      items.push({
        key: `connection:${b.id}`,
        title: `Plan your ${cityName(b.from)} connection`,
        detail: `${formatDuration(gap)} to change planes. Look up how transfers work at ${b.from} and sit near the front if you can.`,
      });
    }
  }

  for (const r of trip.rides ?? []) {
    items.push({
      key: `ride:${r.id}`,
      title: `Confirm ${r.provider} pickup`,
      detail: `${timePart(r.pickupAt)} on ${formatDate(r.pickupAt)} at ${r.from}. Give them your flight number so they can follow it.`,
    });
  }

  for (const s of trip.stays) {
    items.push({
      key: `hotel:${s.id}`,
      title: `Tell ${s.name} your arrival time`,
      detail: s.latestCheckIn
        ? `The front desk is open until ${s.latestCheckIn}. Ask how to get in if you're late.`
        : "Ask them to note your arrival time and hold the room.",
    });
  }

  if (!trip.contacts.some((c) => c.kind === "insurance")) {
    items.push({
      key: "insurance",
      title: "Save your insurance details",
      detail: "Save the policy number and claims phone somewhere you can reach offline.",
    });
  }

  items.push({
    key: "share-plans",
    title: "Share your plans with someone",
    detail: `Tell them you leave ${first.from} on ${formatDate(first.departAt)}. If anything changes, Layover helps you update them.`,
  });

  return items;
}

/** "today", "tomorrow", "in 6 days", "2 days ago", from calendar dates only. */
export function daysUntil(date: string, today: string): { days: number; label: string } {
  const days = Math.round(minutesBetween(`${today}T00:00`, `${datePart(date)}T00:00`) / 1440);
  const label =
    days === 0 ? "today" : days === 1 ? "tomorrow" : days === -1 ? "yesterday" : days > 0 ? `in ${days} days` : `${-days} days ago`;
  return { days, label };
}

export type ArrivalStep = { key: string; time: string; title: string; detail?: string; warn?: string };

/** Pickups this long after landing (or less) get a warning: passport control and bags take time. */
const SHORT_PICKUP_MINUTES = 60;

/** Landing at the final airport, then the pickup and the hotel check-in that follow it. */
export function arrivalPlan(trip: Trip): ArrivalStep[] {
  const flights = flightsInOrder(trip);
  const last = flights.at(-1);
  if (!last) return [];
  const landing = last.arriveAt;
  const steps: ArrivalStep[] = [
    {
      key: "land",
      time: timePart(landing),
      title: `Land in ${cityName(last.to)}`,
      detail: `${last.flightNumber} at ${last.to}, ${formatDate(landing)}`,
    },
  ];

  const rides = (trip.rides ?? [])
    .filter((r: Ride) => {
      const gap = minutesBetween(landing, r.pickupAt); // both at the arrival airport
      return gap >= -60 && gap <= 6 * 60;
    })
    .sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  for (const r of rides) {
    const gap = minutesBetween(landing, r.pickupAt);
    steps.push({
      key: `ride:${r.id}`,
      time: timePart(r.pickupAt),
      title: `${r.provider} pickup`,
      detail: `${r.from} → ${r.to}${gap > 0 ? `, ${formatDuration(gap)} after landing` : ""}`,
      warn:
        gap < SHORT_PICKUP_MINUTES
          ? gap < 0
            ? "Pickup is before you land"
            : "Tight after landing. Ask them to wait."
          : undefined,
    });
  }

  const stays = trip.stays.filter((s: Stay) => {
    const days = minutesBetween(`${datePart(landing)}T00:00`, `${datePart(s.checkIn)}T00:00`) / 1440;
    return days >= 0 && days <= 1;
  });
  for (const s of stays) {
    const lateDesk = s.latestCheckIn && datePart(s.checkIn) === datePart(landing) && timePart(landing) > s.latestCheckIn;
    // Same city: if check-in has already opened by the time you land, there's no time to wait for.
    const openOnLanding = minutesBetween(s.checkIn, landing) >= 0;
    steps.push({
      key: `hotel:${s.id}`,
      time: openOnLanding ? "Open" : timePart(s.checkIn),
      title: `Check in at ${s.name}`,
      detail: `From ${timePart(s.checkIn)}${s.latestCheckIn ? `, front desk until ${s.latestCheckIn}` : ""}`,
      warn: lateDesk ? `Desk closes ${s.latestCheckIn}, before you land` : undefined,
    });
  }
  return steps;
}

export type BookingCode = { key: string; label: string; detail: string; code: string };

/** Every reference on the trip, one per booking, for reading out at a desk. */
export function bookingCodes(trip: Trip): BookingCode[] {
  const codes: BookingCode[] = [];
  const seen = new Set<string>();
  for (const f of flightsInOrder(trip)) {
    if (!f.bookingRef || seen.has(f.bookingRef)) continue;
    seen.add(f.bookingRef);
    codes.push({ key: `flight:${f.id}`, label: f.airline, detail: f.flightNumber, code: f.bookingRef });
  }
  for (const s of trip.stays) {
    if (s.confirmation) codes.push({ key: `stay:${s.id}`, label: s.name, detail: "Hotel", code: s.confirmation });
  }
  for (const r of trip.rides ?? []) {
    if (r.confirmation) codes.push({ key: `ride:${r.id}`, label: r.provider, detail: "Pickup", code: r.confirmation });
  }
  return codes;
}

/** Nights at each stay, from its check-in and check-out dates (same city). */
export function nights(stay: Stay): number {
  return Math.round(minutesBetween(`${datePart(stay.checkIn)}T00:00`, `${datePart(stay.checkOut)}T00:00`) / 1440);
}
