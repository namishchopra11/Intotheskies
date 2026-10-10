import { z } from "zod";
import type { Trip } from "@/lib/types";

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

// STUB: returns plausible fixed values. Real logic lands in Part B.
export function computeImpact(trip: Trip, flightId: string): Impact {
  const index = trip.flights.findIndex((f) => f.id === flightId);
  const next = index >= 0 ? trip.flights[index + 1] : undefined;
  const stay = trip.stays[0];
  return {
    flightId,
    delayMinutes: 45,
    connection: next
      ? { flightId: next.id, minutesBefore: 55, minutesAfter: 10, status: "tight" }
      : null,
    affectedStays: stay
      ? [{ stayId: stay.id, reason: `Your onward flight is at risk, so you may reach ${stay.name} late.` }]
      : [],
  };
}
