import { describe, expect, it } from "vitest";
import { generateChecklist } from "@/lib/domain/checklist";
import { computeImpact } from "@/lib/domain/impact";
import { DEFAULT_SUMMARY_OPTIONS, type SummaryOptions } from "@/lib/domain/summary";
import { TripSchema, type Disruption, type DisruptionType, type Flight, type Trip } from "@/lib/types";
import { buildMessage, messageText, type MessageLine } from "./message";

const FIRST = "flight-sfo-lhr";
const ONWARD = "flight-lhr-fco";

// A fixed trip so these tests don't move when sampleTrip.ts is edited.
const baseTrip: Trip = TripSchema.parse({
  id: "t1",
  name: "Rome via London",
  travelerName: "Alex Morgan",
  flights: [
    {
      id: FIRST, airline: "British Airways", flightNumber: "BA 286", from: "SFO", to: "LHR",
      departAt: "2026-10-16T16:40", arriveAt: "2026-10-17T10:35", bookingRef: "K7QM2X", status: "scheduled",
    },
    {
      id: ONWARD, airline: "ITA Airways", flightNumber: "AZ 201", from: "LHR", to: "FCO",
      departAt: "2026-10-17T11:30", arriveAt: "2026-10-17T15:05", bookingRef: "W4HT9P", status: "scheduled",
    },
  ],
  stays: [
    {
      id: "stay-rome", name: "Hotel Aventino Garden", address: "Via di Santa Prisca 14, Roma",
      checkIn: "2026-10-17T15:00", checkOut: "2026-10-21T11:00", confirmation: "HAG-48213", latestCheckIn: "22:00",
    },
  ],
  contacts: [
    { id: "c-ba", kind: "airline", name: "British Airways" },
    { id: "c-ita", kind: "airline", name: "ITA Airways" },
    { id: "c-hotel", kind: "hotel", name: "Hotel Aventino Garden" },
  ],
  disruptions: [],
});

const ALL_ON: SummaryOptions = { includeBookingRefs: true, includeStays: true, includeOpenTasks: true };
const ALL_OFF: SummaryOptions = { includeBookingRefs: false, includeStays: false, includeOpenTasks: false };

/** Mirrors what the store's reportDisruption does, without the store. */
function report(
  type: DisruptionType,
  flightId: string,
  revised: Partial<Pick<Flight, "flightNumber" | "departAt" | "arriveAt">> = {},
  trip: Trip = baseTrip,
): Trip {
  const hasTimes = Boolean(revised.departAt || revised.arriveAt);
  const status: Flight["status"] =
    type === "delay" ? "delayed" : type === "rebooked" || hasTimes ? "rebooked" : "cancelled";
  const flights = trip.flights.map((f) =>
    f.id !== flightId
      ? f
      : {
          ...f,
          ...revised,
          status,
          original: { airline: f.airline, flightNumber: f.flightNumber, departAt: f.departAt, arriveAt: f.arriveAt },
        },
  );
  const updated = { ...trip, flights };
  const disruption: Disruption = { id: "d1", type, flightId, createdAt: "2026-10-17T09:00:00.000Z", tasks: [] };
  disruption.tasks = generateChecklist(updated, disruption, computeImpact(updated, flightId));
  return { ...updated, disruptions: [disruption] };
}

const line = (lines: MessageLine[], key: MessageLine["key"]) => lines.find((l) => l.key === key);
const text = (trip: Trip, options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) =>
  messageText(buildMessage(trip, "d1", options));

const REPLACEMENT = { flightNumber: "BA 288", departAt: "2026-10-16T18:40", arriveAt: "2026-10-17T12:35" };

describe("buildMessage by disruption type", () => {
  it("delay: says how late, and shows the new times", () => {
    const trip = report("delay", FIRST, { departAt: "2026-10-16T17:25", arriveAt: "2026-10-17T11:20" });
    const lines = buildMessage(trip, "d1", ALL_ON);
    expect(line(lines, "lead")!.text).toBe(
      "Change of plans — my flight from San Francisco to London is running 45 min late.",
    );
    expect(line(lines, "flight")!.text).toBe(
      "New times: BA 286, San Francisco 17:25 → London 11:20 (Fri 16 Oct). My connection is tight.",
    );
  });

  it("delay with the same times does not claim a delay", () => {
    const trip = report("delay", FIRST);
    expect(line(buildMessage(trip, "d1", ALL_ON), "lead")!.text).toBe(
      "Change of plans — my flight from San Francisco to London has new times.",
    );
  });

  it("cancellation with no replacement says there is no new flight yet", () => {
    const lines = buildMessage(report("cancellation", FIRST), "d1", ALL_ON);
    expect(line(lines, "lead")!.text).toBe("Change of plans — my flight from San Francisco to London was cancelled.");
    expect(line(lines, "flight")!.text).toBe("I don't have a new flight yet.");
  });

  it("cancellation with a replacement shows the new flight and a missed connection", () => {
    const lines = buildMessage(report("cancellation", FIRST, REPLACEMENT), "d1", ALL_ON);
    expect(line(lines, "lead")!.text).toContain("was cancelled.");
    expect(line(lines, "flight")!.text).toBe(
      "New flight: BA 288, San Francisco 18:40 → London 12:35 (Fri 16 Oct). I'll likely miss my connection.",
    );
  });

  it("missed connection: names the city where it was missed", () => {
    const lines = buildMessage(report("missed_connection", ONWARD), "d1", ALL_ON);
    expect(line(lines, "lead")!.text).toBe("Change of plans — my connection in London was missed.");
    expect(line(lines, "flight")!.text).toBe("I don't have a new flight yet.");
    expect(line(lines, "unresolved")!.text).toContain("getting rebooked with ITA Airways");
  });

  it("rebooked: shows the new flight", () => {
    const lines = buildMessage(report("rebooked", FIRST, REPLACEMENT), "d1", ALL_ON);
    expect(line(lines, "lead")!.text).toBe("Change of plans — my flight from San Francisco to London has changed.");
    expect(line(lines, "flight")!.text).toContain("New flight: BA 288, San Francisco 18:40 → London 12:35");
    expect(line(lines, "unresolved")!.text).toContain("confirming the new booking for BA 288");
  });

  it("returns nothing for an unknown disruption", () => {
    expect(buildMessage(baseTrip, "nope", ALL_ON)).toEqual([]);
  });
});

describe("buildMessage toggles", () => {
  const delayed = report("delay", FIRST, { departAt: "2026-10-16T17:25", arriveAt: "2026-10-17T11:20" });

  it("always returns the lead and the flight line, switched on", () => {
    const lines = buildMessage(delayed, "d1", ALL_OFF);
    expect(line(lines, "lead")!.on).toBe(true);
    expect(line(lines, "flight")!.on).toBe(true);
  });

  it("includeBookingRefs switches the booking line and the hotel confirmation", () => {
    const off = buildMessage(delayed, "d1", { ...ALL_ON, includeBookingRefs: false });
    expect(line(off, "refs")).toMatchObject({ text: "Booking ref: K7QM2X, W4HT9P", on: false });
    expect(messageText(off)).not.toMatch(/K7QM2X|W4HT9P|HAG-48213/);

    const on = buildMessage(delayed, "d1", { ...ALL_OFF, includeBookingRefs: true });
    expect(line(on, "refs")!.on).toBe(true);
    expect(messageText(on)).toContain("Booking ref: K7QM2X, W4HT9P");

    const withHotel = buildMessage(delayed, "d1", { ...ALL_ON, includeBookingRefs: true });
    expect(line(withHotel, "hotel")!.text).toContain("Confirmation HAG-48213.");
    expect(line(buildMessage(delayed, "d1", ALL_ON), "hotel")!.text).toContain("Confirmation HAG-48213.");
    expect(line(buildMessage(delayed, "d1", { ...ALL_ON, includeBookingRefs: false }), "hotel")!.text).not.toContain(
      "HAG-48213",
    );
  });

  it("includeStays switches the hotel line and keeps the hotel out of everything else", () => {
    const on = buildMessage(delayed, "d1", { ...ALL_ON, includeBookingRefs: false });
    expect(line(on, "hotel")).toMatchObject({
      text: "Hotel: Hotel Aventino Garden. Front desk is open until 22:00.",
      on: true,
    });
    expect(line(on, "unresolved")!.text).toContain("letting Hotel Aventino Garden know");

    const offLines = buildMessage(delayed, "d1", { ...ALL_ON, includeStays: false });
    expect(line(offLines, "hotel")!.on).toBe(false);
    // The hotel's name must not leak through the open tasks either.
    expect(messageText(offLines)).not.toContain("Aventino");
    expect(line(offLines, "unresolved")!.text).toContain("rebooking the onward flight AZ 201");
  });

  it("includeOpenTasks switches the 'Still sorting' line", () => {
    const on = buildMessage(delayed, "d1", ALL_ON);
    expect(line(on, "unresolved")!.on).toBe(true);
    expect(messageText(on)).toContain("Still sorting: confirming the latest times for BA 286");

    const off = buildMessage(delayed, "d1", { ...ALL_ON, includeOpenTasks: false });
    expect(line(off, "unresolved")!.on).toBe(false);
    expect(messageText(off)).not.toContain("Still sorting");
  });

  it("with everything off the message is only the lead and the flight", () => {
    const lines = buildMessage(delayed, "d1", ALL_OFF);
    expect(lines.filter((l) => l.on).map((l) => l.key)).toEqual(["lead", "flight"]);
    expect(messageText(lines)).not.toMatch(/Aventino|K7QM2X|Still sorting/);
  });

  it("leaves out the hotel line when the trip has no stays", () => {
    const noStays = { ...delayed, stays: [] };
    expect(line(buildMessage(noStays, "d1", ALL_ON), "hotel")).toBeUndefined();
  });
});

describe("buildMessage 'Still sorting' wording", () => {
  const types: [DisruptionType, string, Partial<Flight>][] = [
    ["delay", FIRST, { departAt: "2026-10-16T17:25", arriveAt: "2026-10-17T11:20" }],
    ["cancellation", FIRST, {}],
    ["missed_connection", ONWARD, {}],
    ["rebooked", FIRST, REPLACEMENT],
  ];

  it.each(types)("%s: never shows the share task or advice written to the traveler", (type, flightId, revised) => {
    const insured: Trip = {
      ...baseTrip,
      contacts: [...baseTrip.contacts, { id: "c-ins", kind: "insurance", name: "Northwind Cover" }],
    };
    const trip = report(type, flightId, revised, insured);
    // The checklist really does contain the tasks we expect to be hidden.
    expect(trip.disruptions[0].tasks.map((t) => t.id.split(":")[1])).toEqual(
      expect.arrayContaining(["send_update", "keep_receipts", "contact_insurer"]),
    );
    const message = text(trip, ALL_ON);
    expect(message).toContain("Still sorting:");
    expect(message).not.toMatch(/send an update|receipt|entitled|in writing|insur|Northwind/i);
    expect(message).not.toMatch(/\byou(r)?\b/i);
  });

  it("says everything is sorted once no open task is left for the reader", () => {
    const trip = report("delay", FIRST, { arriveAt: "2026-10-17T11:20" });
    const disruption = trip.disruptions[0];
    const done: Trip = {
      ...trip,
      disruptions: [{ ...disruption, tasks: disruption.tasks.map((t) => ({ ...t, done: true })) }],
    };
    expect(line(buildMessage(done, "d1", ALL_ON), "unresolved")!.text).toBe("Everything else is sorted.");
  });

  it("passes tasks the traveler added through as written", () => {
    const trip = report("delay", FIRST, { arriveAt: "2026-10-17T11:20" });
    const disruption = trip.disruptions[0];
    const withCustom: Trip = {
      ...trip,
      disruptions: [
        { ...disruption, tasks: [...disruption.tasks, { id: "c1", title: "Buy a phone charger", done: false, source: "custom" }] },
      ],
    };
    expect(text(withCustom, ALL_ON)).toMatch(/Still sorting: .*buy a phone charger\./);
  });
});
