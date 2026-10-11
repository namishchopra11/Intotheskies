import { useTripStore } from "@/lib/store";
import { findConnection } from "@/lib/domain/impact";
import { cityName } from "@/lib/domain/airports";
import { addMinutes, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import type { AutoAction } from "@/lib/types";

/**
 * There is no backend: this plays the part of the airline's live feed. It delays the first
 * flight past the connection and rebooks the onward flight, the same way the airline app
 * would push it, then reports it to the store so the checklist and summary follow.
 *
 * Times move by the same amount at each end of a flight, so nothing is computed across
 * airports. The connection gap is measured at one airport.
 */
export type FlightAlertContent = {
  disruptionId: string;
  title: string;
  lines: string[];
};

// How much later the onward replacement leaves than the original, beyond the delay.
const NEXT_DEPARTURE_BUFFER = 45;
// How far past the connection the first flight runs.
const MISS_BY = 75;

/** "AZ 201" -> "AZ 207". */
function laterFlightNumber(n: string): string {
  const m = n.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 6}` : `${n}A`;
}

export type Scenario = "delay45" | "delay180" | "missed" | "cancelled";


export function simulateFlightChange(scenario: Scenario = "missed"): FlightAlertContent | null {
  const { trip, upsertFlight, reportDisruption } = useTripStore.getState();
  if (!trip || trip.disruptions.length > 0 || trip.flights.length === 0) return null;
  // Wall-clock strings sort correctly as text; the array order is not guaranteed.
  const sorted = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
  // Break the first real connection (a flight leaving the airport the previous one lands at);
  // a trip without one just gets a delay on its first flight.
  const first = sorted.find((f) => findConnection(trip, f)) ?? sorted[0];
  const onward = findConnection(trip, first);

  if (scenario === "cancelled") {
    const id = reportDisruption(first.id, "cancellation");
    return {
      disruptionId: id,
      title: `Simulated change · ${first.flightNumber} is cancelled`,
      lines: [
        `${first.flightNumber} to ${cityName(first.to)} was cancelled and there's no new flight yet.`,
        "Your checklist is ready. Tap to see what to do first.",
      ],
    };
  }

  if (scenario !== "missed" || !onward) {
    const late = scenario === "delay45" ? 45 : scenario === "delay180" ? 180 : 90;
    const id = reportDisruption(first.id, "delay", {
      departAt: addMinutes(first.departAt, late),
      arriveAt: addMinutes(first.arriveAt, late),
    });
    return {
      disruptionId: id,
      title: `Simulated change · ${first.flightNumber} is delayed`,
      lines: [
        `${first.flightNumber} to ${cityName(first.to)} is ${formatDuration(late)} late.`,
        `Now lands ${timePart(addMinutes(first.arriveAt, late))}. Your checklist is ready.`,
      ],
    };
  }

  const connection = minutesBetween(first.arriveAt, onward.departAt); // same airport
  const late = Math.max(connection, 0) + MISS_BY;
  upsertFlight({
    ...first,
    departAt: addMinutes(first.departAt, late),
    arriveAt: addMinutes(first.arriveAt, late),
    status: "delayed",
    original: first.original ?? {
      airline: first.airline,
      flightNumber: first.flightNumber,
      departAt: first.departAt,
      arriveAt: first.arriveAt,
    },
  });

  const shift = late + NEXT_DEPARTURE_BUFFER;
  const newNumber = laterFlightNumber(onward.flightNumber);
  const newDepart = addMinutes(onward.departAt, shift);
  const newArrive = addMinutes(onward.arriveAt, shift);
  const id = reportDisruption(onward.id, "missed_connection", {
    flightNumber: newNumber,
    departAt: newDepart,
    arriveAt: newArrive,
  });

  // The seat belongs to the booking that was replaced; the new flight has none yet.
  const rebooked = useTripStore.getState().trip?.flights.find((f) => f.id === onward.id);
  if (rebooked) upsertFlight({ ...rebooked, seat: undefined });

  const disruption = useTripStore.getState().trip?.disruptions.find((d) => d.id === id);
  const open = disruption?.tasks.filter((t) => !t.done).length ?? 0;
  const handled = handledLine(disruption?.actions ?? []);
  return {
    disruptionId: id,
    title: "Simulated flight change · new plan ready",
    lines: [
      `${first.flightNumber} is ${formatDuration(late)} late, so you'll miss ${onward.flightNumber} in ${cityName(onward.from)}.`,
      `You're rebooked on ${newNumber}, ${timePart(newDepart)} → ${timePart(newArrive)} to ${cityName(onward.to)}.`,
      ...(handled ? [handled] : []),
      open > 0 ? `${open} ${open === 1 ? "thing" : "things"} to sort out. Tap to see your plan.` : "Tap to see your plan.",
    ],
  };
}

/** "Told Hotel X your new arrival and moved your Y pickup to 18:40." from the automatic updates. */
function handledLine(actions: AutoAction[]): string | null {
  const titles = actions.filter((a) => a.kind !== "flight" && a.status === "done").map((a) => a.title);
  if (titles.length === 0) return null;
  const parts = titles.map((t, i) => (i === 0 ? t : t.charAt(0).toLowerCase() + t.slice(1)));
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `${joined}.`;
}

/** Fired on window when a change lands, so the watcher can show the notification. */
export const FLIGHT_CHANGE_EVENT = "ck:flight-change";

/**
 * Runs the simulation now and tells the watcher. Used by the timer, the "Simulate a change"
 * button and the demo's Next button.
 */
export function triggerFlightChange(scenario?: Scenario): FlightAlertContent | null {
  const change = simulateFlightChange(scenario);
  if (change && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<FlightAlertContent>(FLIGHT_CHANGE_EVENT, { detail: change }));
  }
  return change;
}
