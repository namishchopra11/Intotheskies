import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { TripSchema } from "@/lib/types";
import { existingIdFor, toImportItems, type ImportResult } from "./importSchema";

let n = 0;
const id = () => `id-${++n}`;

const result: ImportResult = {
  tripName: "Rome via London",
  travelerName: "Alex Morgan",
  flights: [
    {
      airline: "British Airways",
      flightNumber: "ba 286",
      from: "sfo",
      to: "LHR",
      departAt: "2026-10-16T16:40",
      arriveAt: "2026-10-17T10:35",
      bookingRef: "k7qm2x",
      seat: null,
    },
    {
      airline: "ITA Airways",
      flightNumber: "AZ 201",
      from: "LHR",
      to: "FCO",
      departAt: "2026-10-17T11:30",
      arriveAt: null,
      bookingRef: null,
      seat: null,
    },
  ],
  hotels: [
    {
      name: "Hotel Aventino Garden",
      address: "Via di Santa Prisca 14, Rome",
      phone: null,
      checkIn: "2026-10-17T15:00",
      checkOut: "2026-10-21T11:00",
      confirmation: "HAG-1",
      latestCheckIn: "25:00",
    },
  ],
  rides: [
    {
      provider: "Rome Transfers",
      pickupAt: "17 Oct 15:45",
      from: "FCO",
      to: "Hotel",
      phone: null,
      confirmation: null,
      notes: null,
    },
  ],
  notes: [],
};

describe("toImportItems", () => {
  const items = toImportItems(result, id);

  it("normalizes a complete flight", () => {
    const flight = items.find((i) => i.kind === "flight");
    expect(flight?.kind === "flight" && flight.item).toMatchObject({
      flightNumber: "BA 286",
      from: "SFO",
      bookingRef: "K7QM2X",
      seat: undefined,
      status: "scheduled",
    });
  });

  it("skips bookings whose times are missing or malformed", () => {
    const skipped = items.filter((i) => i.kind === "skipped").map((i) => i.label);
    expect(skipped).toEqual(["AZ 201 · LHR → FCO", "Rome Transfers · FCO → Hotel"]);
  });

  it("drops an unreadable latest check-in rather than storing it", () => {
    const stay = items.find((i) => i.kind === "stay");
    expect(stay?.kind === "stay" && stay.item.latestCheckIn).toBeUndefined();
  });

  it("only produces bookings that a saved trip accepts", () => {
    const trip = {
      ...sampleTrip,
      flights: items.flatMap((i) => (i.kind === "flight" ? [i.item] : [])),
      stays: items.flatMap((i) => (i.kind === "stay" ? [i.item] : [])),
    };
    expect(TripSchema.safeParse(trip).success).toBe(true);
  });
});

describe("existingIdFor", () => {
  it("matches a re-imported flight to the one already on the trip", () => {
    const [flight] = toImportItems(result, id);
    expect(existingIdFor(sampleTrip, flight)).toBe(sampleTrip.flights[0].id);
  });

  it("returns undefined when there is no trip", () => {
    const [flight] = toImportItems(result, id);
    expect(existingIdFor(null, flight)).toBeUndefined();
  });
});
