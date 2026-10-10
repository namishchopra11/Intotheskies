import type { z } from "zod";
import {
  ContactSchema,
  DisruptionSchema,
  FlightSchema,
  StaySchema,
  TripSchema,
  type Trip,
} from "@/lib/types";

/**
 * What the store tells the screens after reading a saved trip back from localStorage.
 *   recovered: some saved items no longer match the schema and were left out; the rest loaded.
 *   discarded: the saved trip could not be read at all, so there is no trip.
 */
export type LoadNotice = { kind: "recovered"; dropped: number } | { kind: "discarded" };

export type Recovery = { trip: Trip | null; notice: LoadNotice | null };

/** Keeps the items that still validate and counts the ones that do not. */
function keepValid<T>(schema: z.ZodType<T>, items: unknown): { kept: T[]; dropped: number } {
  if (!Array.isArray(items)) return { kept: [], dropped: 0 };
  const kept: T[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) kept.push(parsed.data);
  }
  return { kept, dropped: items.length - kept.length };
}

/**
 * Turns whatever was in localStorage into a trip. A trip that validates loads as is. One
 * that does not (an older app version, a hand-edited value) is rebuilt from the items that
 * still validate, so one stale field does not wipe the whole trip. Only when nothing usable
 * is left is it discarded, and the notice says so.
 */
export function recoverTrip(raw: unknown): Recovery {
  if (raw === null || raw === undefined) return { trip: null, notice: null };

  const whole = TripSchema.safeParse(raw);
  if (whole.success) return { trip: whole.data, notice: null };

  const lost: Recovery = { trip: null, notice: { kind: "discarded" } };
  if (typeof raw !== "object" || Array.isArray(raw)) return lost;
  const r = raw as Record<string, unknown>;

  const flights = keepValid(FlightSchema, r.flights);
  const stays = keepValid(StaySchema, r.stays);
  const contacts = keepValid(ContactSchema, r.contacts);
  const disruptions = keepValid(DisruptionSchema, r.disruptions);
  // A disruption for a flight that did not survive has nothing to describe.
  const flightIds = new Set(flights.kept.map((f) => f.id));
  const attached = disruptions.kept.filter((d) => flightIds.has(d.flightId));
  const hadFlights = Array.isArray(r.flights) && r.flights.length > 0;
  if (hadFlights && flights.kept.length === 0) return lost;

  const rebuilt = TripSchema.safeParse({
    ...r,
    flights: flights.kept,
    stays: stays.kept,
    contacts: contacts.kept,
    disruptions: attached,
  });
  if (!rebuilt.success) return lost;

  const dropped =
    flights.dropped +
    stays.dropped +
    contacts.dropped +
    disruptions.dropped +
    (disruptions.kept.length - attached.length);
  return { trip: rebuilt.data, notice: { kind: "recovered", dropped } };
}

/**
 * Brings a saved value from an older storage version up to the current shape. Version 2 only
 * introduced this step, so there is nothing to change yet. On the next bump, take the
 * version as a second argument and add one branch per step; without a migrate function
 * zustand throws the saved state away on any version change.
 */
export function migratePersisted(persisted: unknown): { trip?: unknown } {
  return persisted && typeof persisted === "object" ? (persisted as { trip?: unknown }) : {};
}
