import { z } from "zod";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import {
  DisruptionTypeSchema,
  FlightOriginalSchema,
  FlightStatusSchema,
  LocalDateTimeSchema,
  ClockTimeSchema,
  type Trip,
} from "@/lib/types";
import { computeImpact, ImpactSchema } from "./impact";
import { buildSummary, openTasksForOthers, type SummaryOptions } from "./summary";

// What the read-only page (/s) receives. Nothing else leaves the device.
// Links look like `/s#<fragment>`; the fragment never reaches a server.
export const ShareSnapshotSchema = z.object({
  v: z.literal(1),
  tripName: z.string(),
  travelerName: z.string(),
  disruption: z.object({
    type: DisruptionTypeSchema,
    flightId: z.string(),
    createdAt: z.string(),
  }),
  flights: z.array(
    z.object({
      id: z.string(),
      airline: z.string(),
      flightNumber: z.string(),
      from: z.string(),
      to: z.string(),
      departAt: LocalDateTimeSchema,
      arriveAt: LocalDateTimeSchema,
      status: FlightStatusSchema,
      original: FlightOriginalSchema.optional(),
      bookingRef: z.string().optional(), // only with includeBookingRefs
    }),
  ),
  // Empty unless includeStays.
  stays: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      checkIn: LocalDateTimeSchema,
      checkOut: LocalDateTimeSchema,
      latestCheckIn: ClockTimeSchema.optional(),
      confirmation: z.string().optional(), // only with includeBookingRefs
    }),
  ),
  impact: ImpactSchema, // affectedStays is empty unless includeStays
  openTasks: z.array(z.string()), // titles of unfinished tasks; empty unless includeOpenTasks
  summary: z.string(), // the same text buildSummary returns
});
export type ShareSnapshot = z.infer<typeof ShareSnapshotSchema>;

/** Returns a URL-safe string for use as a fragment, or "" if the disruption is unknown. */
export function encodeShare(trip: Trip, disruptionId: string, options: SummaryOptions): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  if (!disruption) return "";
  const impact = computeImpact(trip, disruption.flightId);
  const snapshot: ShareSnapshot = {
    v: 1,
    tripName: trip.name,
    travelerName: trip.travelerName,
    disruption: {
      type: disruption.type,
      flightId: disruption.flightId,
      createdAt: disruption.createdAt,
    },
    flights: trip.flights.map((f) => ({
      id: f.id,
      airline: f.airline,
      flightNumber: f.flightNumber,
      from: f.from,
      to: f.to,
      departAt: f.departAt,
      arriveAt: f.arriveAt,
      status: f.status,
      ...(f.original ? { original: f.original } : {}),
      ...(options.includeBookingRefs ? { bookingRef: f.bookingRef } : {}),
    })),
    stays: options.includeStays
      ? trip.stays.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          ...(s.latestCheckIn ? { latestCheckIn: s.latestCheckIn } : {}),
          ...(options.includeBookingRefs ? { confirmation: s.confirmation } : {}),
        }))
      : [],
    impact: options.includeStays ? impact : { ...impact, affectedStays: [] },
    openTasks: options.includeOpenTasks
      ? openTasksForOthers(disruption).map((t) => t.title)
      : [],
    summary: buildSummary(trip, disruptionId, options),
  };
  // lz-string's alphabet includes "+" and "$", which some messaging apps mangle in links.
  return compressToEncodedURIComponent(JSON.stringify(snapshot))
    .replace(/\+/g, "_")
    .replace(/\$/g, "~");
}

/** Accepts the fragment with or without a leading "#". Returns null for anything malformed. */
export function decodeShare(fragment: string): ShareSnapshot | null {
  try {
    const raw = fragment.replace(/^#/, "").trim();
    if (!raw) return null;
    if (!/^[A-Za-z0-9_~+$-]+$/.test(raw)) return null;
    const json = decompressFromEncodedURIComponent(raw.replace(/_/g, "+").replace(/~/g, "$"));
    if (!json) return null;
    const parsed = ShareSnapshotSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
