import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { migratePersisted, recoverTrip } from "./recoverTrip";

// The trip as it comes out of localStorage: untyped, so tests can put bad values in it.
type Raw = {
  [key: string]: unknown;
  flights: Record<string, unknown>[];
  stays: Record<string, unknown>[];
  disruptions: unknown[];
};
const clone = () => structuredClone(sampleTrip) as unknown as Raw;
const disruption = (flightId: string) => ({
  id: "d1",
  type: "delay",
  flightId,
  createdAt: "2026-10-17T09:00:00.000Z",
  tasks: [],
});

describe("recoverTrip", () => {
  it("loads a valid trip untouched, with no notice", () => {
    expect(recoverTrip(clone())).toEqual({ trip: sampleTrip, notice: null });
  });

  it("returns no trip and no notice when nothing was saved", () => {
    expect(recoverTrip(null)).toEqual({ trip: null, notice: null });
    expect(recoverTrip(undefined)).toEqual({ trip: null, notice: null });
  });

  it("keeps the trip and says what was left out when one stay no longer validates", () => {
    const raw = clone();
    raw.stays = [{ ...raw.stays[0], checkIn: "2026-02-31T15:00" }, ...raw.stays.slice(1)];
    const { trip, notice } = recoverTrip(raw);
    expect(trip?.flights).toHaveLength(sampleTrip.flights.length);
    expect(trip?.stays).toHaveLength(sampleTrip.stays.length - 1);
    expect(notice).toEqual({ kind: "recovered", dropped: 1 });
  });

  it("keeps a trip saved before people existed, without adding the field", () => {
    const raw = clone();
    delete raw.people;
    raw.stays = [{ ...raw.stays[0], checkIn: "2026-02-31T15:00" }];
    const { trip } = recoverTrip(raw);
    expect(trip).not.toBeNull();
    expect(trip?.people).toBeUndefined();
  });

  it("drops one unreadable person and keeps the rest", () => {
    const raw = clone();
    raw.people = [{ id: "p1", name: "Marco", role: "pickup" }, { id: "p2", name: "Bad", role: "wizard" }];
    raw.stays = [{ ...raw.stays[0], checkIn: "2026-02-31T15:00" }];
    const { trip, notice } = recoverTrip(raw);
    expect(trip?.people).toEqual([{ id: "p1", name: "Marco", role: "pickup" }]);
    expect(notice).toEqual({ kind: "recovered", dropped: 2 });
  });

  it("drops a disruption whose flight did not survive", () => {
    const raw = clone();
    const [bad, ...rest] = raw.flights;
    raw.flights = [{ ...bad, departAt: "not a time" }, ...rest];
    raw.disruptions = [disruption(bad.id as string), disruption(rest[0].id as string)];
    const { trip, notice } = recoverTrip(raw);
    expect(trip?.disruptions.map((d) => d.flightId)).toEqual([rest[0].id]);
    expect(notice).toEqual({ kind: "recovered", dropped: 2 });
  });

  it("discards a trip with nothing readable left, and says so", () => {
    const raw = clone();
    raw.flights = raw.flights.map((f) => ({ ...f, status: "teleported" }));
    expect(recoverTrip(raw)).toEqual({ trip: null, notice: { kind: "discarded" } });
    expect(recoverTrip("junk")).toEqual({ trip: null, notice: { kind: "discarded" } });
    expect(recoverTrip({ trip: "nested wrongly" })).toEqual({ trip: null, notice: { kind: "discarded" } });
  });

  it("discards a trip that has lost its identity fields", () => {
    const raw = clone();
    delete raw.travelerName;
    expect(recoverTrip(raw).notice).toEqual({ kind: "discarded" });
  });
});

describe("migratePersisted", () => {
  it("passes the saved trip through and tolerates junk", () => {
    expect(migratePersisted({ trip: sampleTrip })).toEqual({ trip: sampleTrip });
    expect(migratePersisted(null)).toEqual({});
    expect(migratePersisted("x")).toEqual({});
  });
});
