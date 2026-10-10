import { beforeEach, describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import { TripSchema } from "@/lib/types";

describe("sample trip", () => {
  it("matches the Trip schema", () => {
    expect(TripSchema.safeParse(sampleTrip).success).toBe(true);
  });

  it("keeps the 55-minute connection the demo depends on", () => {
    expect(sampleTrip.flights[0].arriveAt.slice(11)).toBe("10:35");
    expect(sampleTrip.flights[1].departAt.slice(11)).toBe("11:30");
    expect(sampleTrip.flights[0].arriveAt.slice(0, 10)).toBe(sampleTrip.flights[1].departAt.slice(0, 10));
  });
});

describe("store", () => {
  beforeEach(() => {
    useTripStore.getState().resetTrip();
    useTripStore.getState().loadSampleTrip();
  });

  it("startTrip replaces the trip with one the traveler entered", () => {
    const own = { ...sampleTrip, id: "mine", name: "Mine", stays: [], contacts: [] };
    useTripStore.getState().startTrip(own);
    expect(useTripStore.getState().trip).toEqual(own);
  });

  it("reportDisruption snapshots the original once and updates the flight", () => {
    const { reportDisruption } = useTripStore.getState();
    const flightId = sampleTrip.flights[0].id;

    const first = reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T11:20" });
    reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T12:00" });

    const trip = useTripStore.getState().trip!;
    const flight = trip.flights.find((f) => f.id === flightId)!;
    expect(flight.status).toBe("delayed");
    expect(flight.arriveAt).toBe("2026-10-17T12:00");
    expect(flight.original?.arriveAt).toBe("2026-10-17T10:35");
    expect(trip.disruptions).toHaveLength(2);
    expect(trip.disruptions[0].id).toBe(first);
    expect(trip.disruptions[0].tasks.length).toBeGreaterThan(0);
    expect(sampleTrip.flights[0].status).toBe("scheduled");
  });

  it("adds, toggles and removes tasks", () => {
    const store = useTripStore.getState();
    const id = store.reportDisruption(sampleTrip.flights[0].id, "cancellation");
    const taskId = store.addTask(id, "  Buy a charger ");
    const find = () =>
      useTripStore.getState().trip!.disruptions[0].tasks.find((t) => t.id === taskId);

    expect(find()).toMatchObject({ title: "Buy a charger", done: false, source: "custom" });
    store.toggleTask(id, taskId);
    expect(find()?.done).toBe(true);
    store.removeTask(id, taskId);
    expect(find()).toBeUndefined();
    expect(useTripStore.getState().trip!.flights[0].status).toBe("cancelled");
  });
});

describe("payoutAddress", () => {
  const ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

  beforeEach(() => {
    useTripStore.getState().resetTrip();
    useTripStore.getState().loadSampleTrip();
  });

  it("setPayoutAddress stores a trimmed valid address, rejects junk and clears on empty", () => {
    const { setPayoutAddress } = useTripStore.getState();
    const current = () => useTripStore.getState().trip!.payoutAddress;

    expect(setPayoutAddress(`  ${ADDRESS}\n`)).toBe(true);
    expect(current()).toBe(ADDRESS);
    expect(setPayoutAddress("0x52908400098527886E0F7030069857D2E4169EE7")).toBe(false);
    expect(current()).toBe(ADDRESS);
    expect(setPayoutAddress("  ")).toBe(true);
    expect(current()).toBeUndefined();
  });

  it("an invalid stored address is dropped on load instead of discarding the trip", () => {
    const parsed = TripSchema.safeParse({ ...sampleTrip, payoutAddress: "garbage" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.payoutAddress).toBeUndefined();
    expect(TripSchema.parse({ ...sampleTrip, payoutAddress: ADDRESS }).payoutAddress).toBe(ADDRESS);
  });
});
