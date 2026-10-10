import type { Trip } from "@/lib/types";

// STUB: returns a plausible fixed briefing. Real logic lands in Part B.
// Written to be spoken aloud: no airport codes, no abbreviations.
// Returns "" when the disruption id is not in the trip.
export function buildBriefing(trip: Trip, disruptionId: string): string {
  const disruption = trip.disruptions.find((d) => d.id === disruptionId);
  if (!disruption) return "";
  const firstOpen = disruption.tasks.find((t) => !t.done);
  return [
    "Your flight to London is now 45 minutes late.",
    "That leaves 10 minutes for your connection to Rome, which is at risk.",
    firstOpen ? `First, ${firstOpen.title.charAt(0).toLowerCase()}${firstOpen.title.slice(1)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
