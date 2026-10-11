import { beforeEach, describe, expect, it } from "vitest";
import { prepItems } from "@/components/trip/prep";
import { useFeedback } from "./feedback";
import { recoverTrip } from "./recoverTrip";
import { safeStorage } from "./safeStorage";
import { sampleTrip } from "./sampleTrip";
import { useTripStore } from "./store";
import { isPastTrip } from "./tripArchive";
import { DEFAULT_REMINDERS, DEFAULT_SETTINGS, SettingsSchema } from "./types";

beforeEach(() => {
  useTripStore.setState({ trip: structuredClone(sampleTrip), savedTrips: [], settings: structuredClone(DEFAULT_SETTINGS), accounts: {}, profile: null });
  useFeedback.getState().dismiss();
});

describe("safe undo", () => {
  it("restores a deleted flight together with its disruption and tasks", () => {
    const store = useTripStore.getState();
    const flight = store.trip!.flights[0];
    store.reportDisruption(flight.id, "delay");
    const before = useTripStore.getState().trip;
    store.removeFlight(flight.id);
    expect(useTripStore.getState().trip!.disruptions).toHaveLength(0);
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().trip).toEqual(before);
  });

  it.each(["stay", "ride"] as const)("restores a deleted %s", (kind) => {
    const store = useTripStore.getState();
    const before = store.trip;
    if (kind === "stay") store.removeStay(before!.stays[0].id);
    else store.removeRide(before!.rides![0].id);
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().trip).toEqual(before);
  });

  it("undoes task completion and preparation reminders", () => {
    const store = useTripStore.getState();
    const disruption = store.reportDisruption(store.trip!.flights[0].id, "delay");
    const task = useTripStore.getState().trip!.disruptions[0].tasks[0];
    store.toggleTask(disruption, task.id);
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().trip!.disruptions[0].tasks[0].done).toBe(false);
    store.togglePrep("documents");
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().trip!.prepDone ?? []).not.toContain("documents");
  });

  it("invalidates stale undo so a later edit is never overwritten", () => {
    const store = useTripStore.getState();
    store.removeStay(store.trip!.stays[0].id);
    const oldUndo = useFeedback.getState().undo!;
    store.updateTripDetails({ name: "Updated after deletion" });
    expect(useFeedback.getState().undo).toBeNull();
    expect(oldUndo.run()).toBe(false);
    expect(useTripStore.getState().trip!.name).toBe("Updated after deletion");
  });
});

describe("trip archive", () => {
  it("keeps every booking and persists the archive marker through recovery", () => {
    const store = useTripStore.getState();
    const before = store.trip!;
    store.archiveTrip(before.id);
    const archived = useTripStore.getState().savedTrips[0];
    expect(useTripStore.getState().trip).toBeNull();
    expect(archived).toMatchObject(before);
    expect(recoverTrip(archived).trip!.archivedAt).toBeTruthy();
    expect(isPastTrip(archived, "2026-10-01")).toBe(true);
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().trip).toEqual(before);
    expect(useTripStore.getState().savedTrips).toHaveLength(0);
  });

  it("reopens an archive and preserves the currently open trip", () => {
    const store = useTripStore.getState();
    const first = store.trip!;
    store.archiveTrip(first.id);
    store.startTrip({ name: "Next holiday", travelerName: "Alex" });
    const second = useTripStore.getState().trip!;
    store.openSavedTrip(first.id);
    expect(useTripStore.getState().trip!.id).toBe(first.id);
    expect(useTripStore.getState().trip!.archivedAt).toBeUndefined();
    expect(useTripStore.getState().savedTrips.map((t) => t.id)).toEqual([second.id]);
  });

  it("waits until the last booking day ends and keeps undated trips upcoming", () => {
    expect(isPastTrip(sampleTrip, "2026-10-18")).toBe(false);
    expect(isPastTrip(sampleTrip, "2026-10-21")).toBe(false);
    expect(isPastTrip(sampleTrip, "2026-10-22")).toBe(true);
    expect(isPastTrip({ ...sampleTrip, flights: [], stays: [], rides: [] }, "2030-01-01")).toBe(false);
  });

  it("undoes deleting an archived trip", () => {
    const store = useTripStore.getState();
    store.archiveTrip(store.trip!.id);
    const archived = useTripStore.getState().savedTrips[0];
    store.removeSavedTrip(archived.id);
    expect(useFeedback.getState().undo!.run()).toBe(true);
    expect(useTripStore.getState().savedTrips).toEqual([archived]);
  });
});

describe("reminder preferences", () => {
  it("hides only the selected category and restores its completed state when enabled", () => {
    const store = useTripStore.getState();
    store.togglePrep("documents");
    const preferences = { ...DEFAULT_REMINDERS, documents: false };
    store.updateSettings({ reminders: preferences });
    expect(prepItems(useTripStore.getState().trip!, preferences).some((i) => i.key === "documents")).toBe(false);
    expect(prepItems(useTripStore.getState().trip!, DEFAULT_REMINDERS).some((i) => i.key === "documents")).toBe(true);
    expect(useTripStore.getState().trip!.prepDone).toContain("documents");
    expect(prepItems(sampleTrip, { documents: false, checkin: false, connections: false, arrival: false, sharing: false })).toHaveLength(0);
  });

  it("loads older settings with every reminder enabled", () => {
    const legacy = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([key]) => key !== "reminders"));
    expect(SettingsSchema.parse(legacy).reminders).toEqual(DEFAULT_REMINDERS);
  });
});

describe("storage write results", () => {
  it("reports success only after a storage write and distinguishes blocked storage", () => {
    const outcomes: boolean[] = [];
    const report = (saved: boolean) => { outcomes.push(saved); };
    const storage = safeStorage(() => ({ getItem: () => null, setItem: () => {}, removeItem: () => {} }), report);
    storage.setItem("test", "{}");
    expect(outcomes).toEqual([true]);
    const blocked = safeStorage(() => { throw new Error("Storage blocked"); }, report);
    blocked.setItem("test", "{}");
    expect(outcomes).toEqual([true, false]);
  });
});
