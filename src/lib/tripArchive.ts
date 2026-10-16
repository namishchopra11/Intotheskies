import type { Trip } from "./types";

export function localDay(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Use the latest booking day, so a hotel stay or return flight keeps a trip upcoming. */
export function tripEndDay(trip: Trip): string | undefined {
  const days = [
    ...trip.flights.flatMap((f) => [f.departAt, f.arriveAt]),
    ...trip.stays.flatMap((s) => [s.checkIn, s.checkOut]),
    ...(trip.rides ?? []).map((r) => r.pickupAt),
  ].filter((value) => /^\d{4}-\d{2}-\d{2}T/.test(value)).map((value) => value.slice(0, 10));
  return days.sort().at(-1);
}

export function isPastTrip(trip: Trip, today: string): boolean {
  const end = tripEndDay(trip);
  return Boolean(trip.archivedAt || (end && end < today));
}
