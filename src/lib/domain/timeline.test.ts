import { beforeEach, describe, expect, it } from "vitest";
import { simulateFlightChange, type Scenario } from "@/components/trip/simulateChange";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { buildTimeline, finalArrival } from "./timeline";

function run(scenario: Scenario, trip: Trip = sampleTrip) {
  useTripStore.setState({ trip: structuredClone(trip) });
  simulateFlightChange(scenario);
  const t = useTripStore.getState().trip!;
  return { trip: t, id: t.disruptions[0].id, nodes: buildTimeline(t, t.disruptions[0].id) };
}
const kinds = (n: ReturnType<typeof buildTimeline>) => n.map((x) => `${x.kind}:${x.state}`);
// Without the booked transfer, Layover has no ride to move, so the pickup is a task for the traveler.
const noRides: Trip = { ...sampleTrip, rides: [] };

describe("buildTimeline", () => {
  beforeEach(() => useTripStore.getState().resetTrip());

  it("shows a missed connection as a broken rail, then the rebooked flight", () => {
    const { nodes } = run("missed", noRides);
    expect(kinds(nodes)).toEqual(["flight:warn", "connection:bad", "flight:ok", "stay:ok", "person:bad", "person:warn"]);
    expect(nodes[1].title).toBe("Missed AZ 201");
    expect(nodes[1].broken).toBe(true);
    expect(nodes[2].time).toBe("18:00");
    expect(nodes[2].was).toBe("15:05");
  });

  it("marks a delay that keeps the connection as tight, not missed", () => {
    const { nodes } = run("delay45");
    expect(nodes[1].state).toBe("warn");
    expect(nodes[1].title).toBe("10 min in London");
    expect(nodes.some((n) => n.broken)).toBe(false);
  });

  it("treats a delay past the connection with no rebooking as an unknown arrival", () => {
    const { trip, id, nodes } = run("delay180");
    expect(nodes[1].state).toBe("bad");
    expect(finalArrival(trip, id)?.unknown).toBe(true);
    expect(nodes.find((n) => n.kind === "stay")?.state).toBe("bad");
  });

  it("handles a cancellation with no new arrival time", () => {
    const { nodes } = run("cancelled");
    expect(nodes[0]).toMatchObject({ state: "bad", time: "–:–" });
    expect(nodes[1].broken).toBe(true);
  });

  it("flags a hotel whose front desk closes before the new arrival", () => {
    const late = { ...sampleTrip, stays: [{ ...sampleTrip.stays[0], latestCheckIn: "17:00" }] };
    expect(run("missed", late).nodes.find((n) => n.kind === "stay")?.state).toBe("bad");
  });

  it("shows the pickup person as handled when Layover moved the booked ride", () => {
    const { nodes } = run("missed");
    expect(nodes.find((n) => n.id === "person-marco")?.state).toBe("ok");
  });

  it("shows the pickup person as waiting when the ride is on hold for a new flight", () => {
    const { nodes } = run("cancelled");
    expect(nodes.find((n) => n.id === "person-marco")?.state).toBe("warn");
  });

  it("turns the pickup person green once rearrange_pickup is done", () => {
    const { trip, id } = run("missed", noRides);
    const task = trip.disruptions[0].tasks.find((t) => t.id.endsWith(":rearrange_pickup"))!;
    useTripStore.getState().toggleTask(id, task.id);
    const nodes = buildTimeline(useTripStore.getState().trip!, id);
    expect(nodes.find((n) => n.id === "person-marco")?.state).toBe("ok");
  });

  it("has no person nodes when the trip has no people", () => {
    const { nodes } = run("missed", { ...sampleTrip, people: undefined });
    expect(nodes.some((n) => n.kind === "person")).toBe(false);
  });

  it("returns nothing for an unknown disruption", () => {
    expect(buildTimeline(sampleTrip, "nope")).toEqual([]);
  });
});
