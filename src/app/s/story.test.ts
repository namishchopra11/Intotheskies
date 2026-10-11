import { describe, expect, it } from "vitest";
import type { ShareSnapshot } from "@/lib/domain/shareLink";
import { NO_NAME, connectionState, stayRisk, storyFor, whyLine, type SnapConnection, type SnapFlight, type SnapStay } from "./story";

const flight = (over: Partial<SnapFlight>): SnapFlight => ({
  id: "f1",
  airline: "ITA Airways",
  flightNumber: "AZ 201",
  from: "LHR",
  to: "FCO",
  departAt: "2026-10-17T11:30",
  arriveAt: "2026-10-17T15:05",
  status: "scheduled",
  ...over,
});
const stay = (over: Partial<SnapStay> = {}): SnapStay => ({
  id: "s1",
  name: "Hotel Aventino",
  address: "Via di Santa Prisca 14",
  checkIn: "2026-10-17T15:00",
  checkOut: "2026-10-21T11:00",
  ...over,
});
const connection = (over: Partial<SnapConnection>): SnapConnection => ({
  flightId: "f1",
  minutesBefore: 55,
  minutesAfter: 10,
  status: "tight",
  ...over,
});
const snapshot = (type: ShareSnapshot["disruption"]["type"], c: SnapConnection | null, delay: number | null = 45): ShareSnapshot => ({
  v: 1,
  tripName: "Rome",
  travelerName: "Alex Morgan",
  disruption: { type, flightId: "f1", createdAt: "2026-10-17T09:00:00.000Z" },
  flights: [flight({})],
  stays: [],
  impact: { flightId: "f1", delayMinutes: delay, connection: c, affectedStays: [] },
  openTasks: [],
});

describe("connectionState", () => {
  it("tells an unknown arrival apart from a missed connection", () => {
    expect(connectionState(null)).toBe("none");
    expect(connectionState(connection({ minutesAfter: null, status: "missed" }))).toBe("unknown");
    expect(connectionState(connection({ minutesAfter: -20, status: "missed" }))).toBe("missed");
    expect(connectionState(connection({ minutesAfter: 10, status: "tight" }))).toBe("tight");
    expect(connectionState(connection({ minutesAfter: 90, status: "ok" }))).toBe("ok");
  });
});

describe("storyFor", () => {
  const changed = flight({ to: "LHR", flightNumber: "BA 286" });
  const final = flight({});

  it("says at risk when the new arrival is not known, and likely to miss only when it is", () => {
    const unknown = connection({ minutesAfter: null, status: "missed" });
    const missed = connection({ minutesAfter: -20, status: "missed" });
    expect(storyFor(snapshot("delay", unknown), "Alex", changed, final, unknown).title).toBe(
      "Alex's connection in London is at risk.",
    );
    expect(storyFor(snapshot("delay", missed), "Alex", changed, final, missed).title).toBe(
      "Alex is likely to miss the connection in London.",
    );
  });

  it("reports a tight connection, a moved landing and an unchanged one", () => {
    const tight = connection({});
    expect(storyFor(snapshot("delay", tight), "Alex", changed, final, tight).title).toBe(
      "Alex's connection in London is now tight.",
    );
    const moved = flight({ original: { airline: "ITA Airways", flightNumber: "AZ 201", departAt: "2026-10-17T11:30", arriveAt: "2026-10-17T14:00" } });
    expect(storyFor(snapshot("delay", null), "Alex", changed, moved, null).title).toBe(
      "Alex now lands in Rome at 15:05.",
    );
    expect(storyFor(snapshot("delay", null), "Alex", changed, final, null).title).toBe(
      "Alex still lands in Rome at 15:05.",
    );
  });

  it("says there is no new flight when the last one is cancelled", () => {
    const gone = flight({ status: "cancelled" });
    expect(storyFor(snapshot("cancellation", null, null), "Alex", changed, gone, null).title).toBe(
      "Alex doesn't have a new flight to Rome yet.",
    );
  });
});

describe("whyLine", () => {
  it("explains a delay with the time left to connect, and leaves unknown times out", () => {
    const f = flight({ from: "SFO", to: "LHR" });
    expect(whyLine(snapshot("delay", connection({})), "Alex", f)).toBe(
      "The flight from San Francisco to London is running 45 min late. That leaves 10 min to change planes.",
    );
    expect(whyLine(snapshot("delay", connection({ minutesAfter: null, status: "missed" })), "Alex", f)).not.toMatch(
      /change planes|after the onward/,
    );
  });
});

describe("stayRisk", () => {
  it("does not claim it is tight for a late landing", () => {
    const late = flight({ arriveAt: "2026-10-17T22:40" });
    const text = stayRisk("Alex", stay({ latestCheckIn: "22:00" }), late, null);
    expect(text).toBe("Alex now lands at 22:40, after the front desk at Hotel Aventino closes at 22:00.");
    expect(text).not.toMatch(/tight/);
  });

  it("names the connection when that is the reason", () => {
    expect(stayRisk("Alex", stay({ latestCheckIn: "22:00" }), flight({}), connection({}))).toBe(
      "Check-in at Hotel Aventino may be late: the connection is tight.",
    );
    expect(stayRisk("Alex", stay(), flight({}), connection({ minutesAfter: null, status: "missed" }))).toBe(
      "Check-in at Hotel Aventino may be late: the connection is at risk.",
    );
  });

  it("handles a landing on a later day and a cancelled last flight", () => {
    expect(stayRisk("Alex", stay(), flight({ arriveAt: "2026-10-18T01:10" }), null)).toBe(
      "Alex now lands after the check-in date at Hotel Aventino.",
    );
    expect(stayRisk("Alex", stay(), flight({ status: "cancelled" }), null)).toBe(
      "Check-in at Hotel Aventino is on hold until Alex has a new flight.",
    );
    expect(stayRisk(NO_NAME, stay(), flight({ status: "cancelled" }), null)).toBe(
      "Check-in at Hotel Aventino is on hold until there's a new flight.",
    );
  });
});
