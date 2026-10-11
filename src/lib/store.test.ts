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

describe("cascades and lifecycle", () => {
  beforeEach(() => {
    useTripStore.getState().resetTrip();
    useTripStore.getState().loadSampleTrip();
  });
  const trip = () => useTripStore.getState().trip!;

  it("removeFlight also removes that flight's disruptions, and only those", () => {
    const [first, onward] = sampleTrip.flights;
    const store = useTripStore.getState();
    store.reportDisruption(first.id, "delay", { arriveAt: "2026-10-17T11:20" });
    store.reportDisruption(onward.id, "cancellation");
    expect(trip().disruptions).toHaveLength(2);

    useTripStore.getState().removeFlight(first.id);
    expect(trip().flights.map((f) => f.id)).toEqual([onward.id]);
    expect(trip().disruptions.map((d) => d.flightId)).toEqual([onward.id]);
  });

  it("removeContact keeps the tasks and only unlinks the contact", () => {
    const id = useTripStore.getState().reportDisruption(sampleTrip.flights[0].id, "cancellation");
    const linked = trip().disruptions.find((d) => d.id === id)!.tasks.find((t) => t.contactId);
    expect(linked).toBeDefined();
    const before = trip().disruptions[0].tasks.length;

    useTripStore.getState().removeContact(linked!.contactId!);
    expect(trip().contacts.some((c) => c.id === linked!.contactId)).toBe(false);
    const after = trip().disruptions[0].tasks;
    expect(after).toHaveLength(before);
    expect(after.find((t) => t.id === linked!.id)?.contactId).toBeUndefined();
  });

  it("upsert replaces by id instead of adding a second copy", () => {
    const flight = trip().flights[0];
    useTripStore.getState().upsertFlight({ ...flight, seat: "12C" });
    expect(trip().flights).toHaveLength(sampleTrip.flights.length);
    expect(trip().flights[0].seat).toBe("12C");
  });

  it("people can be added to a trip that has none, edited by id, and removed", () => {
    const { startTrip, upsertPerson, removePerson } = useTripStore.getState();
    startTrip({ name: "Rome", travelerName: "Alex" });
    expect(useTripStore.getState().trip!.people).toBeUndefined();

    upsertPerson({ id: "p1", name: "Marco", role: "pickup" });
    upsertPerson({ id: "p2", name: "Mum", role: "family", email: "mum@example.com" });
    upsertPerson({ id: "p1", name: "Marco R", role: "pickup", phone: "+39 06 0000 0199" });
    expect(useTripStore.getState().trip!.people).toEqual([
      { id: "p1", name: "Marco R", role: "pickup", phone: "+39 06 0000 0199" },
      { id: "p2", name: "Mum", role: "family", email: "mum@example.com" },
    ]);

    removePerson("p1");
    expect(useTripStore.getState().trip!.people!.map((p) => p.id)).toEqual(["p2"]);
    expect(TripSchema.safeParse(useTripStore.getState().trip).success).toBe(true);
  });

  it("loadSampleTrip gives a copy, so editing the trip never edits the sample", () => {
    useTripStore.getState().reportDisruption(sampleTrip.flights[0].id, "delay", { arriveAt: "2026-10-17T11:20" });
    expect(sampleTrip.flights[0].status).toBe("scheduled");
    useTripStore.getState().resetTrip();
    expect(trip()).toBeNull();
    useTripStore.getState().loadSampleTrip();
    expect(trip().disruptions).toHaveLength(0);
    expect(trip().flights[0].status).toBe("scheduled");
  });

  it("reporting the same change twice returns the same disruption", () => {
    const store = useTripStore.getState();
    const flightId = sampleTrip.flights[0].id;
    const a = store.reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T11:20" });
    const b = store.reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T11:20" });
    expect(b).toBe(a);
    expect(trip().disruptions).toHaveLength(1);
  });

  it("a worse delay is a new disruption, and a repeat is allowed once the tasks are done", () => {
    const store = useTripStore.getState();
    const flightId = sampleTrip.flights[0].id;
    const a = store.reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T11:20" });
    const b = store.reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T12:00" });
    expect(b).not.toBe(a);

    for (const t of trip().disruptions.find((d) => d.id === b)!.tasks) {
      if (!t.done) useTripStore.getState().toggleTask(b, t.id);
    }
    const c = useTripStore.getState().reportDisruption(flightId, "delay", { arriveAt: "2026-10-17T12:00" });
    expect(c).not.toBe(b);
  });

  it("throws for an unknown flight and when there is no trip", () => {
    expect(() => useTripStore.getState().reportDisruption("nope", "delay")).toThrow(/unknown flight/);
    useTripStore.getState().resetTrip();
    expect(() => useTripStore.getState().reportDisruption(sampleTrip.flights[0].id, "delay")).toThrow();
  });
});

describe("loading a saved trip", () => {
  const options = () => useTripStore.persist.getOptions();
  const current = () => useTripStore.getState();
  beforeEach(() => useTripStore.setState({ loadNotice: null }));

  it("rebuilds a partly stale trip and sets a notice instead of dropping it", () => {
    const saved = structuredClone(sampleTrip);
    saved.stays[0] = { ...saved.stays[0], checkIn: "2026-02-31T15:00" };
    const next = options().merge!({ trip: saved }, current()) as ReturnType<typeof current>;
    expect(next.trip?.flights).toHaveLength(sampleTrip.flights.length);
    expect(next.loadNotice).toEqual({ kind: "recovered", dropped: 1 });
  });

  it("sets a discarded notice for an unreadable value, and none for an empty one", () => {
    const bad = options().merge!({ trip: { nonsense: true } }, current()) as ReturnType<typeof current>;
    expect(bad.trip).toBeNull();
    expect(bad.loadNotice).toEqual({ kind: "discarded" });

    const empty = options().merge!(undefined, current()) as ReturnType<typeof current>;
    expect(empty.trip).toBeNull();
    expect(empty.loadNotice).toBeNull();
  });

  it("keeps an undismissed notice when a later read of the save is clean", () => {
    useTripStore.setState({ loadNotice: { kind: "recovered", dropped: 2 } });
    const next = options().merge!({ trip: sampleTrip }, current()) as ReturnType<typeof current>;
    expect(next.loadNotice).toEqual({ kind: "recovered", dropped: 2 });
  });

  it("keeps a v1 save through the migration, and the notice can be dismissed", () => {
    expect(options().version).toBe(2);
    expect(options().migrate!({ trip: sampleTrip }, 1)).toEqual({ trip: sampleTrip });
    useTripStore.setState({ loadNotice: { kind: "discarded" } });
    useTripStore.getState().dismissLoadNotice();
    expect(current().loadNotice).toBeNull();
  });
});
