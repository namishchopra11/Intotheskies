import { beforeEach, describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { simulateFlightChange } from "./simulateChange";

function load(trip: Trip) {
  useTripStore.setState({ trip: structuredClone(trip) });
}

const current = () => useTripStore.getState().trip!;

describe("simulateFlightChange", () => {
  beforeEach(() => {
    useTripStore.getState().resetTrip();
  });

  it("delays the first flight and rebooks the onward one on a two-flight trip", () => {
    load(sampleTrip);
    const change = simulateFlightChange();
    const [first, onward] = current().flights;

    expect(change?.disruptionId).toBe(current().disruptions[0].id);
    expect(first.status).toBe("delayed");
    expect(first.original?.arriveAt).toBe("2026-10-17T10:35");
    expect(first.arriveAt > "2026-10-17T11:30").toBe(true); // lands after the original onward departure
    expect(onward.status).toBe("rebooked");
    expect(onward.flightNumber).not.toBe("AZ 201");
    expect(onward.original?.flightNumber).toBe("AZ 201");
    expect(current().disruptions).toHaveLength(1);
    expect(current().disruptions[0].type).toBe("missed_connection");
  });

  it("clears the seat on the rebooked flight but keeps the first flight's seat", () => {
    load(sampleTrip);
    simulateFlightChange();
    const [first, onward] = current().flights;
    expect(onward.seat).toBeUndefined();
    expect(first.seat).toBe("34A");
  });

  it("picks the flights by departure time, not array order", () => {
    load({ ...sampleTrip, flights: [...sampleTrip.flights].reverse() });
    simulateFlightChange();
    const byId = Object.fromEntries(current().flights.map((f) => [f.id, f]));
    expect(byId["flight-sfo-lhr"].status).toBe("delayed");
    expect(byId["flight-lhr-fco"].status).toBe("rebooked");
  });

  it("delays a one-flight trip by 90 minutes", () => {
    load({ ...sampleTrip, flights: [sampleTrip.flights[0]], stays: [] });
    const change = simulateFlightChange();
    const [flight] = current().flights;

    expect(change?.title).toBe("Simulated change · BA 286 is delayed");
    expect(flight.status).toBe("delayed");
    expect(flight.departAt).toBe("2026-10-16T18:10");
    expect(flight.arriveAt).toBe("2026-10-17T12:05");
    expect(current().disruptions[0].type).toBe("delay");
  });

  it("does not pair a second flight that leaves from a different airport", () => {
    const [first, second] = sampleTrip.flights;
    load({ ...sampleTrip, flights: [first, { ...second, from: "CDG" }] });
    const change = simulateFlightChange();

    expect(change?.title).toBe("Simulated change · BA 286 is delayed");
    expect(current().disruptions).toHaveLength(1);
    expect(current().disruptions[0].type).toBe("delay");
    expect(current().flights[1].status).toBe("scheduled");
  });

  it("says in the notification that the change is simulated", () => {
    load(sampleTrip);
    expect(simulateFlightChange()?.title).toMatch(/^Simulated/);
  });

  it("does nothing when the trip already has a disruption", () => {
    load(sampleTrip);
    simulateFlightChange();
    const before = structuredClone(current());

    expect(simulateFlightChange()).toBeNull();
    expect(current()).toEqual(before);
  });

  it("does nothing without a trip or without flights", () => {
    expect(simulateFlightChange()).toBeNull();
    load({ ...sampleTrip, flights: [], stays: [] });
    expect(simulateFlightChange()).toBeNull();
    expect(current().disruptions).toHaveLength(0);
  });
});
