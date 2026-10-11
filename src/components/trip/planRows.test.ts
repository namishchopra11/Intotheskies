import { beforeEach, describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import { buildDayPlan } from "./planRows";
import { simulateFlightChange } from "./simulateChange";

describe("buildDayPlan", () => {
  beforeEach(() => {
    useTripStore.getState().resetTrip();
    useTripStore.setState({ trip: structuredClone(sampleTrip) });
  });

  it("lists the sample change in order: late flight, landing, missed, new flight, landing, then ride and hotel", () => {
    const change = simulateFlightChange()!;
    const rows = buildDayPlan(useTripStore.getState().trip!, change.disruptionId);
    expect(rows.map((r) => r.title)).toEqual([
      "Leave San Francisco · Flight BA 286",
      "Land in London",
      "Flight AZ 201 to Rome",
      "Flight AZ 207 to Rome",
      "Land in Rome",
      "Your pickup",
      "Hotel front desk closes",
    ]);
    expect(rows[0].status).toEqual({ tone: "warn", text: "2h 10m late" });
    expect(rows[1].detail).toBe("1h 40m until your new flight");
    expect(rows[2]).toMatchObject({ struck: true, time: "11:30", status: { text: "Missed" } });
    expect(rows[3]).toMatchObject({ highlight: true, time: "14:25", marker: "check" });
    expect(rows[6].detail).toBe("Hotel Aventino Garden · 4h to spare after landing");
  });

  it("lists the trip as booked when nothing has changed (null)", () => {
    const rows = buildDayPlan(useTripStore.getState().trip!, null);
    expect(rows.map((r) => r.title)).toEqual([
      "Leave San Francisco · Flight BA 286",
      "Land in London",
      "Fly to Rome · Flight AZ 201",
      "Land in Rome",
      "Your pickup",
      "Hotel front desk closes",
    ]);
    expect(rows[1].status).toEqual({ tone: "warn", text: "Tight — 55 min until Flight AZ 201" });
    expect(rows[3].detail).toBe("Marco's picking you up");
    expect(rows.some((r) => r.struck || r.highlight)).toBe(false);
  });

  it("returns nothing for an unknown disruption", () => {
    expect(buildDayPlan(useTripStore.getState().trip!, "nope")).toEqual([]);
  });
});

describe("buildDayPlan on a round trip saved out of order", () => {
  const roundTrip = () => ({
    ...structuredClone(sampleTrip),
    flights: [
      { id: "home-2", airline: "British Airways", flightNumber: "BA 287", from: "LHR", to: "SFO", departAt: "2026-10-21T16:30", arriveAt: "2026-10-21T19:40", bookingRef: "K7QM2X", status: "scheduled" as const },
      ...[...sampleTrip.flights].reverse(),
      { id: "home-1", airline: "ITA Airways", flightNumber: "AZ 204", from: "FCO", to: "LHR", departAt: "2026-10-21T13:00", arriveAt: "2026-10-21T14:50", bookingRef: "W4HT9P", status: "scheduled" as const },
    ],
  });

  it("puts the pickup and hotel after the Rome landing, and the flights home after them", () => {
    const rows = buildDayPlan(roundTrip(), null);
    expect(rows.map((r) => r.title)).toEqual([
      "Leave San Francisco · Flight BA 286",
      "Land in London",
      "Fly to Rome · Flight AZ 201",
      "Land in Rome",
      "Your pickup",
      "Hotel front desk closes",
      "Leave Rome · Flight AZ 204",
      "Land in London",
      "Fly to San Francisco · Flight BA 287",
      "Land in San Francisco",
    ]);
    // Four days in Rome is a stay, not a layover.
    expect(rows.find((r) => r.id === "flight-lhr-fco-land")?.detail).toBe("Marco's picking you up");
  });

  it("only marks the changed journey as waiting on a new flight", () => {
    useTripStore.setState({ trip: roundTrip() });
    const change = simulateFlightChange("cancelled")!;
    const rows = buildDayPlan(useTripStore.getState().trip!, change.disruptionId);
    expect(rows.find((r) => r.id === "flight-lhr-fco")?.status?.text).toBe("Depends on a new flight");
    expect(rows.find((r) => r.id === "home-1")?.status).toBeUndefined();
  });
});
