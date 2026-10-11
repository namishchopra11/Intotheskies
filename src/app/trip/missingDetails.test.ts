import { expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { missingDetails } from "./missingDetails";

it("accepts a complete trip without demanding seats or ride confirmations", () => {
  const trip = structuredClone(sampleTrip);
  trip.flights.forEach((f) => delete f.seat);
  trip.rides?.forEach((r) => delete r.confirmation);
  expect(missingDetails(trip)).toEqual([]);
});

it("groups missing hotel and pickup details with the right editing IDs", () => {
  const trip = structuredClone(sampleTrip);
  trip.stays[0].address = "  ";
  const ride = trip.rides![0];
  ride.notes = "";
  ride.from = "";
  expect(missingDetails(trip)).toEqual([
    { kind: "stay", id: trip.stays[0].id, label: trip.stays[0].name, fields: ["Hotel address"] },
    { kind: "ride", id: ride.id, label: ride.provider, fields: ["Pickup location", "Meeting instructions"] },
  ]);
});

it("flags missing or invalid flight times without comparing different airport time zones", () => {
  const trip = structuredClone(sampleTrip);
  trip.flights[0].departAt = "";
  trip.flights[0].arriveAt = "2026-02-31T10:30";
  expect(missingDetails(trip)[0].fields).toEqual(["Departure date and time", "Arrival date and time"]);
});

it("does not require an unbooked hotel or ride and offers the first flight", () => {
  const trip = { ...structuredClone(sampleTrip), flights: [], stays: [], rides: [] };
  expect(missingDetails(trip)).toEqual([{ kind: "flight", label: "Your first flight", fields: ["Flight details"] }]);
});

it("uses an existing company contact instead of asking for its phone twice", () => {
  const trip = structuredClone(sampleTrip);
  const ride = trip.rides![0];
  delete ride.phone;
  trip.contacts.push({ id: "driver-contact", kind: "other", name: ride.provider, phone: "+15555550101" });
  expect(missingDetails(trip)).toEqual([]);
  trip.contacts = trip.contacts.filter((c) => c.name !== ride.provider);
  expect(missingDetails(trip)[0].fields).toEqual(["Driver or company phone"]);
});

it("ignores cancelled flight details", () => {
  const trip = structuredClone(sampleTrip);
  trip.flights[0].status = "cancelled";
  trip.flights[0].bookingRef = "";
  expect(missingDetails(trip)).toEqual([]);
});
