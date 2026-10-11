import type { TripState } from "@/lib/store";

/**
 * The order the app is shown in a demo. Given the screen you're on and what's in the
 * store, the next step: what the button says and where it goes. Pure, so it can be tested;
 * DemoNextButton carries the step out.
 *
 *   log in (guest) -> your trip (empty) -> your trip, filled with the sample -> the trip
 *   on track -> flight changes -> share -> what the recipient sees -> settings -> start over
 */
export type DemoStep =
  | { label: string; kind: "go"; to: string }
  | { label: string; kind: "guest" }
  | { label: string; kind: "sample" }
  | { label: string; kind: "change" }
  | { label: string; kind: "recipient"; disruptionId: string }
  | { label: string; kind: "restart" };

type View = Pick<TripState, "trip" | "profile">;

export function nextDemoStep(pathname: string, { trip, profile }: View): DemoStep {
  const latest = trip?.disruptions.at(-1);

  if (pathname === "/login") return { label: "Log in as a guest", kind: "guest" };
  if (!profile && pathname !== "/s") return { label: "Log in", kind: "go", to: "/login" };

  if (pathname === "/") {
    if (!trip) return { label: "Your trip", kind: "go", to: "/trip" };
    if (trip.flights.length === 0) return { label: "Load the sample trip", kind: "sample" };
    if (!latest) return { label: "Change the flight", kind: "change" };
    return { label: "Share the update", kind: "go", to: `/share/${latest.id}` };
  }
  if (pathname === "/trip") {
    // First fill the form screen with the sample's bookings, then go and see the trip.
    return trip && trip.flights.length > 0
      ? { label: "See your trip", kind: "go", to: "/" }
      : { label: "Load the sample trip", kind: "sample" };
  }
  if (pathname.startsWith("/share/")) {
    const id = pathname.split("/")[2];
    return trip?.disruptions.some((d) => d.id === id)
      ? { label: "What they see", kind: "recipient", disruptionId: id }
      : { label: "Home", kind: "go", to: "/" };
  }
  if (pathname === "/s") return profile ? { label: "Settings", kind: "go", to: "/settings" } : { label: "Log in", kind: "go", to: "/login" };
  if (pathname === "/settings") return { label: "Start over", kind: "restart" };
  return { label: "Home", kind: "go", to: "/" };
}
