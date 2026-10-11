import { z } from "zod";
import { flightLabel } from "@/lib/domain/text";
import { LocalDateTimeSchema, type Flight, type Ride, type Stay, type Trip } from "@/lib/types";

/**
 * What Claude reads out of a confirmation (see src/app/api/import/route.ts). Every field is
 * required and nullable, so a missing value comes back as null instead of a guess. Times are
 * local wall-clock strings, the same as everywhere else in the app.
 */
const When = z
  .string()
  .nullable()
  .describe('Local time exactly as printed, as "YYYY-MM-DDTHH:mm" with no timezone. null if not shown.');

export const ImportResultSchema = z.object({
  tripName: z.string().nullable().describe('Short trip name, e.g. "Rome via London". null if unclear.'),
  travelerName: z.string().nullable().describe("The passenger or guest name, as a person would write it."),
  flights: z.array(
    z.object({
      airline: z.string(),
      flightNumber: z.string().describe('Airline code and number, e.g. "BA 286".'),
      from: z.string().describe("Departure airport, 3-letter IATA code."),
      to: z.string().describe("Arrival airport, 3-letter IATA code."),
      departAt: When,
      arriveAt: When,
      bookingRef: z.string().nullable(),
      seat: z.string().nullable(),
    }),
  ),
  hotels: z.array(
    z.object({
      name: z.string(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      checkIn: When,
      checkOut: When,
      confirmation: z.string().nullable(),
      latestCheckIn: z.string().nullable().describe('Latest arrival time, "HH:mm", if the hotel states one.'),
    }),
  ),
  rides: z.array(
    z.object({
      provider: z.string().describe("Company or driver, e.g. Uber, Welcome Pickups, hotel shuttle."),
      pickupAt: When,
      from: z.string(),
      to: z.string(),
      phone: z.string().nullable(),
      confirmation: z.string().nullable(),
      notes: z.string().nullable().describe("Meeting point, car, name sign, and similar."),
    }),
  ),
  notes: z
    .array(z.string())
    .describe("Short notes for the traveler: anything assumed, unclear, or that could not be read."),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;

/** A booking read from the confirmation, ready to add, or the reason it can't be added yet. */
export type ImportItem =
  | { kind: "flight"; label: string; item: Flight }
  | { kind: "stay"; label: string; item: Stay }
  | { kind: "ride"; label: string; item: Ride }
  | { kind: "skipped"; label: string; reason: string };

const isTime = (t: string | null): t is string => t !== null && LocalDateTimeSchema.safeParse(t).success;
const isClock = (t: string | null): t is string => t !== null && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const code = (s: string) => s.trim().toUpperCase();
const orUndefined = (s: string | null) => s?.trim() || undefined;

/** Turns what Claude read into trip bookings. Anything without usable times is skipped with a reason. */
export function toImportItems(result: ImportResult, newId: () => string): ImportItem[] {
  const items: ImportItem[] = [];

  for (const f of result.flights) {
    const label = `${flightLabel(f.flightNumber)} · ${code(f.from)} – ${code(f.to)}`;
    if (!isTime(f.departAt) || !isTime(f.arriveAt)) {
      items.push({ kind: "skipped", label, reason: "Departure or arrival time wasn't readable." });
      continue;
    }
    items.push({
      kind: "flight",
      label,
      item: {
        id: newId(),
        airline: f.airline.trim(),
        flightNumber: f.flightNumber.trim().toUpperCase(),
        from: code(f.from),
        to: code(f.to),
        departAt: f.departAt,
        arriveAt: f.arriveAt,
        bookingRef: f.bookingRef?.trim().toUpperCase() ?? "",
        seat: orUndefined(f.seat),
        status: "scheduled",
      },
    });
  }

  for (const h of result.hotels) {
    if (!isTime(h.checkIn) || !isTime(h.checkOut)) {
      items.push({ kind: "skipped", label: h.name, reason: "Check-in or check-out date wasn't readable." });
      continue;
    }
    const latest = isClock(h.latestCheckIn) ? h.latestCheckIn : undefined;
    items.push({
      kind: "stay",
      label: h.name,
      item: {
        id: newId(),
        name: h.name.trim(),
        address: h.address?.trim() ?? "",
        phone: orUndefined(h.phone),
        checkIn: h.checkIn,
        checkOut: h.checkOut,
        confirmation: h.confirmation?.trim() ?? "",
        latestCheckIn: latest,
      },
    });
  }

  for (const r of result.rides) {
    const label = `${r.provider} · ${r.from} – ${r.to}`;
    if (!isTime(r.pickupAt)) {
      items.push({ kind: "skipped", label, reason: "Pickup time wasn't readable." });
      continue;
    }
    items.push({
      kind: "ride",
      label,
      item: {
        id: newId(),
        provider: r.provider.trim(),
        pickupAt: r.pickupAt,
        from: r.from.trim(),
        to: r.to.trim(),
        phone: orUndefined(r.phone),
        confirmation: orUndefined(r.confirmation),
        notes: orUndefined(r.notes),
      },
    });
  }

  return items;
}

/**
 * The id of a booking already on the trip that an imported one duplicates, so importing the
 * same email twice updates instead of adding a copy.
 */
export function existingIdFor(trip: Trip | null, entry: ImportItem): string | undefined {
  if (!trip) return undefined;
  switch (entry.kind) {
    case "flight":
      return trip.flights.find(
        (f) => f.flightNumber === entry.item.flightNumber && f.departAt.slice(0, 10) === entry.item.departAt.slice(0, 10),
      )?.id;
    case "stay":
      return trip.stays.find(
        (s) =>
          (entry.item.confirmation && s.confirmation === entry.item.confirmation) ||
          (s.name === entry.item.name && s.checkIn === entry.item.checkIn),
      )?.id;
    case "ride":
      return (trip.rides ?? []).find((r) => r.provider === entry.item.provider && r.pickupAt === entry.item.pickupAt)?.id;
    default:
      return undefined;
  }
}
