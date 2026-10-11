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
      "Leave San Francisco · BA 286",
      "Land in London",
      "AZ 201 to Rome",
      "New flight · AZ 207",
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

  it("returns nothing for an unknown disruption", () => {
    expect(buildDayPlan(useTripStore.getState().trip!, "nope")).toEqual([]);
  });
});
