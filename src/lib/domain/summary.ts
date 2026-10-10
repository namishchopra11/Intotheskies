import type { Trip } from "@/lib/types";

export type SummaryOptions = {
  includeBookingRefs: boolean; // booking references and hotel confirmation numbers
  includeStays: boolean;
  includeOpenTasks: boolean;
};

export const DEFAULT_SUMMARY_OPTIONS: SummaryOptions = {
  includeBookingRefs: false,
  includeStays: true,
  includeOpenTasks: true,
};

// STUB: returns a plausible fixed message. Real logic lands in Part B.
// Returns "" when the disruption id is not in the trip.
export function buildSummary(trip: Trip, disruptionId: string, options: SummaryOptions): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  if (!disruption) return "";
  const lines = [
    `Update from ${trip.travelerName}: my flight has changed.`,
    "",
    "Revised plan: details to follow.",
  ];
  if (options.includeStays && trip.stays[0]) lines.push(`Staying at: ${trip.stays[0].name}`);
  if (options.includeOpenTasks) lines.push("", "Still sorting out: rebooking the onward flight.");
  return lines.join("\n");
}
