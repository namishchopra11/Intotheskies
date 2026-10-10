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
import { SolanaAddressSchema } from "@/lib/solana/address";
import { SOLANA_CLUSTER, SolanaClusterSchema } from "@/lib/solana/config";
import { normalizeUsdcAmount, UsdcAmountSchema } from "@/lib/solana/pay";
import { recipientTasks } from "./checklist";
import { computeImpact, ImpactSchema } from "./impact";
import type { SummaryOptions } from "./summary";

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
  openTasks: z.array(z.string()), // what is still being sorted, worded for the reader; empty unless includeOpenTasks
  // Links made before this was dropped carry buildSummary's text. /s never showed it, so
  // new links leave it out (shorter link); it stays optional so old ones still decode.
  summary: z.string().optional(),
  // Present only when the traveler asked for funds and the trip has a payoutAddress.
  // Optional, so links made without it still decode; if it is malformed it is dropped
  // and the rest of the update still shows.
  fundsRequest: z
    .object({
      recipient: SolanaAddressSchema,
      amountUsdc: UsdcAmountSchema, // canonical, e.g. "85.5"
      cluster: SolanaClusterSchema, // the cluster the link was made for, not the reader's
    })
    .optional()
    .catch(undefined),
});
export type ShareSnapshot = z.infer<typeof ShareSnapshotSchema>;

/** Returns a URL-safe string for use as a fragment, or "" if the disruption is unknown. */
export function encodeShare(trip: Trip, disruptionId: string, options: SummaryOptions): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  if (!disruption) return "";
  const impact = computeImpact(trip, disruption.flightId);
  const fundsAmount = options.fundsRequest
    ? normalizeUsdcAmount(options.fundsRequest.amountUsdc)
    : null;
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
    openTasks: options.includeOpenTasks ? recipientTasks(trip, disruption, options) : [],
    ...(fundsAmount && trip.payoutAddress
      ? {
          fundsRequest: {
            recipient: trip.payoutAddress,
            amountUsdc: fundsAmount,
            cluster: SOLANA_CLUSTER,
          },
        }
      : {}),
  };
  // lz-string's alphabet includes "+" and "$", which some messaging apps mangle in links.
  return compressToEncodedURIComponent(JSON.stringify(snapshot))
    .replace(/\+/g, "_")
    .replace(/\$/g, "~");
}

// Links made before the share task was kept out of the list still carry its title.
const SEND_UPDATE_TITLE = /^send an update to someone\b/i;

/** Accepts the fragment with or without a leading "#". Returns null for anything malformed. */
export function decodeShare(fragment: string): ShareSnapshot | null {
  try {
    const raw = fragment.replace(/^#/, "").trim();
    if (!raw) return null;
    if (!/^[A-Za-z0-9_~+$-]+$/.test(raw)) return null;
    const json = decompressFromEncodedURIComponent(raw.replace(/_/g, "+").replace(/~/g, "$"));
    if (!json) return null;
    const parsed = ShareSnapshotSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return { ...parsed.data, openTasks: parsed.data.openTasks.filter((t) => !SEND_UPDATE_TITLE.test(t)) };
  } catch {
    return null;
  }
}
