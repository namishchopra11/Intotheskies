import { beforeEach, describe, expect, it } from "vitest";
import { simulateFlightChange } from "@/components/trip/simulateChange";
import { useTripStore } from "@/lib/store";
import { TripSchema } from "@/lib/types";

const state = () => useTripStore.getState();
const trip = () => state().trip!;
const ride = () => trip().rides!.find((r) => r.id === "ride-fco")!;
const disruption = (id: string) => trip().disruptions.find((d) => d.id === id)!;
const keys = (id: string) => disruption(id).tasks.map((t) => t.id.split(":")[1]);

describe("automatic updates when a flight changes", () => {
  beforeEach(() => {
    state().signOut({ erase: true });
    state().loadSampleTrip();
  });

  it("moves the airport pickup by the new landing time and tells the hotel", () => {
    const change = simulateFlightChange()!;
    // AZ 201 was due at 15:05; the replacement lands at 18:00, so 15:45 becomes 18:40.
    expect(ride().pickupAt).toBe("2026-10-17T18:40");
    expect(ride().rescheduledFrom).toBe("2026-10-17T15:45");

    const actions = disruption(change.disruptionId).actions!;
    expect(actions.map((a) => a.kind)).toEqual(["flight", "hotel", "ride"]);
    expect(actions.every((a) => a.status === "done")).toBe(true);
    expect(change.lines.join(" ")).toContain("pickup to 18:40");
  });

  it("leaves what was handled off the checklist", () => {
    const { disruptionId } = simulateFlightChange()!;
    expect(keys(disruptionId)).not.toContain("tell_hotel");
    expect(keys(disruptionId)).not.toContain("rearrange_pickup");
    expect(keys(disruptionId)).toContain("send_update");
  });

  it("holds the pickup when a cancelled flight has no new time yet", () => {
    const id = state().reportDisruption("flight-lhr-fco", "cancellation");
    const actions = disruption(id).actions!;
    expect(actions.find((a) => a.kind === "ride")?.status).toBe("pending");
    expect(actions.find((a) => a.kind === "flight")?.status).toBe("pending");
    expect(ride().pickupAt).toBe("2026-10-17T15:45");
  });

  it("does nothing downstream when the connection still works", () => {
    const id = state().reportDisruption("flight-sfo-lhr", "delay", { arriveAt: "2026-10-17T10:45" });
    expect(disruption(id).actions!.map((a) => a.kind)).toEqual(["flight"]);
    expect(ride().pickupAt).toBe("2026-10-17T15:45");
  });

  it("moves the pickup from its booked time on a second change, not twice", () => {
    state().reportDisruption("flight-lhr-fco", "delay", { departAt: "2026-10-17T12:30", arriveAt: "2026-10-17T16:05" });
    expect(ride().pickupAt).toBe("2026-10-17T16:45");
    state().reportDisruption("flight-lhr-fco", "delay", { departAt: "2026-10-17T13:30", arriveAt: "2026-10-17T17:05" });
    expect(ride().pickupAt).toBe("2026-10-17T17:45");
    expect(ride().rescheduledFrom).toBe("2026-10-17T15:45");
  });

  it("leaves the pickup to the traveler when moving pickups is switched off", () => {
    state().updateSettings({ moveRides: false });
    const { disruptionId } = simulateFlightChange()!;
    expect(ride().pickupAt).toBe("2026-10-17T15:45");
    expect(disruption(disruptionId).actions!.some((a) => a.kind === "ride")).toBe(false);
    expect(keys(disruptionId)).toContain("rearrange_pickup");
  });

  it("doesn't tell the hotel when that is switched off", () => {
    state().updateSettings({ notifyHotel: false });
    const { disruptionId } = simulateFlightChange()!;
    expect(disruption(disruptionId).actions!.some((a) => a.kind === "hotel")).toBe(false);
  });

  it("keeps the trip valid for saving", () => {
    simulateFlightChange();
    expect(TripSchema.safeParse(trip()).success).toBe(true);
  });
});
