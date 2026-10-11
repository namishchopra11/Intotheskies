import { DEFAULT_SETTINGS, type AutoAction, type Flight, type Ride, type Settings, type Stay, type Trip } from "@/lib/types";
import { cityName } from "./airports";
import { computeImpact, isArrivalUnknown, lastLeg } from "./impact";
import { addMinutes, datePart, formatDate, minutesBetween, timePart } from "./time";

/**
 * What Layover does by itself when a flight changes, so the traveler doesn't have to:
 * keep track of the new flight, tell the hotel, and move any pickup waiting at the
 * destination. With no backend these are simulated, but the trip data really changes
 * (rides get their new pickup time) and the checklist leaves these jobs out.
 *
 * Every time comparison is at one place: old vs new landing at the final airport, and
 * landing vs pickup at that same airport.
 */
export type AutoPlan = {
  actions: AutoAction[];
  /** Rides with their new pickup times, to save over the old ones. */
  rides: Ride[];
};

/** A pickup this long before or after the booked landing is treated as meeting that flight. */
const PICKUP_WINDOW_BEFORE = 60;
const PICKUP_WINDOW_AFTER = 6 * 60;

/** Stays whose check-in is on the landing day or the day after (same rule as computeImpact). */
function staysAfter(trip: Trip, bookedLanding: string): Stay[] {
  return trip.stays.filter((s) => {
    const days = minutesBetween(`${datePart(bookedLanding)}T00:00`, `${datePart(s.checkIn)}T00:00`) / 1440;
    return days >= 0 && days <= 1;
  });
}

/** Rides that leave around the booked landing time, i.e. they are waiting for this flight. */
function ridesMeeting(trip: Trip, bookedLanding: string): Ride[] {
  return (trip.rides ?? []).filter((r) => {
    const booked = r.rescheduledFrom ?? r.pickupAt;
    const gap = minutesBetween(bookedLanding, booked);
    return gap >= -PICKUP_WINDOW_BEFORE && gap <= PICKUP_WINDOW_AFTER;
  });
}

function flightAction(flight: Flight, disruptionId: string): AutoAction {
  const base = { id: `${disruptionId}:auto:flight`, kind: "flight" as const, targetId: flight.id };
  const times = `${flight.from} ${timePart(flight.departAt)} – ${flight.to} ${timePart(flight.arriveAt)}`;
  if (isArrivalUnknown(flight)) {
    return {
      ...base,
      status: "pending",
      title: `Waiting for ${flight.airline} to rebook you`,
      detail: "Your hotel and pickup get the new time as soon as there is one.",
    };
  }
  if (flight.status === "rebooked") {
    return {
      ...base,
      status: "done",
      title: `Rebooked on ${flight.flightNumber}`,
      detail: times,
    };
  }
  return { ...base, status: "done", title: `Updated ${flight.flightNumber} times`, detail: times };
}

/**
 * Works out the automatic updates for a change to `flightId`. Pure: returns the actions to
 * record and the rides to save; the store applies them.
 */
export function planAutoUpdates(
  trip: Trip,
  flightId: string,
  disruptionId: string,
  settings: Settings = DEFAULT_SETTINGS,
): AutoPlan {
  const flight = trip.flights.find((f) => f.id === flightId);
  if (!flight) return { actions: [], rides: [] };

  const actions: AutoAction[] = [flightAction(flight, disruptionId)];
  const impact = computeImpact(trip, flightId);

  // How much later the traveler now reaches their destination: null = not known yet.
  // A connection that still works means the final landing hasn't moved.
  let shift: number | null;
  if (impact.connection === null) shift = impact.delayMinutes;
  else shift = impact.connection.status === "missed" ? null : 0;
  if (shift === 0) return { actions, rides: [] };

  const last = impact.connection ? lastLeg(trip.flights, flight) : flight;
  const bookedLanding = last.original?.arriveAt ?? last.arriveAt;
  const newLanding = shift === null ? null : addMinutes(bookedLanding, shift);
  const city = cityName(last.to);

  for (const stay of settings.notifyHotel ? staysAfter(trip, bookedLanding) : []) {
    const base = { id: `${disruptionId}:auto:stay:${stay.id}`, kind: "hotel" as const, targetId: stay.id };
    if (newLanding === null) {
      actions.push({
        ...base,
        status: "done",
        title: "Told the hotel you may be late",
        detail: "Asked them to hold your room until you have a new arrival time.",
      });
      continue;
    }
    const day = datePart(newLanding) === datePart(bookedLanding) ? "" : ` on ${formatDate(newLanding)}`;
    const desk = stay.latestCheckIn ? ` Front desk is open until ${stay.latestCheckIn}.` : "";
    actions.push({
      ...base,
      status: "done",
      title: `Told the hotel you land at ${timePart(newLanding)}${day}`,
      detail: `You now land in ${city} at ${timePart(newLanding)}${day}. Asked them to hold your room.${desk}`,
    });
  }

  const rides: Ride[] = [];
  for (const ride of settings.moveRides ? ridesMeeting(trip, bookedLanding) : []) {
    const base = { id: `${disruptionId}:auto:ride:${ride.id}`, kind: "ride" as const, targetId: ride.id };
    if (shift === null) {
      actions.push({
        ...base,
        status: "pending",
        title: "Put your pickup on hold",
        detail: `They get a new pickup time as soon as you have a new flight.`,
      });
      continue;
    }
    const was = ride.rescheduledFrom ?? ride.pickupAt;
    // From the booked time, so a second change doesn't move it twice.
    const moved: Ride = { ...ride, pickupAt: addMinutes(was, shift), rescheduledFrom: was };
    rides.push(moved);
    actions.push({
      ...base,
      status: "done",
      title: `Moved your pickup to ${timePart(moved.pickupAt)}`,
      detail: `Was ${timePart(was)}${datePart(moved.pickupAt) === datePart(was) ? "" : ` on ${formatDate(was)}`}. ${ride.provider} has the new time.`,
    });
  }

  return { actions, rides };
}
