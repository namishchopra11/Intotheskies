import { LocalDateTimeSchema, type Trip } from "@/lib/types";

export type MissingDetails = {
  kind: "flight" | "stay" | "ride";
  id?: string;
  label: string;
  fields: string[];
};

const blank = (value?: string) => !value?.trim();
const missingTime = (value: string) => !LocalDateTimeSchema.safeParse(value).success;

/** Check saved bookings, without guessing details or requiring a hotel or hired ride. */
export function missingDetails(trip: Trip): MissingDetails[] {
  const issues: MissingDetails[] = [];
  if (trip.flights.length === 0) issues.push({ kind: "flight", label: "Your first flight", fields: ["Flight details"] });
  for (const flight of trip.flights) {
    if (flight.status === "cancelled") continue;
    const fields = [
      blank(flight.airline) && "Airline",
      blank(flight.flightNumber) && "Flight number",
      blank(flight.from) && "Departure airport",
      blank(flight.to) && "Arrival airport",
      missingTime(flight.departAt) && "Departure date and time",
      missingTime(flight.arriveAt) && "Arrival date and time",
      blank(flight.bookingRef) && "Booking reference",
    ].filter((field): field is string => Boolean(field));
    if (fields.length) issues.push({ kind: "flight", id: flight.id, label: flight.flightNumber.trim() || flight.airline.trim() || "Your flight", fields });
  }
  for (const stay of trip.stays) {
    const fields = [
      blank(stay.name) && "Hotel name",
      blank(stay.address) && "Hotel address",
      missingTime(stay.checkIn) && "Check-in date and time",
      missingTime(stay.checkOut) && "Check-out date and time",
      blank(stay.confirmation) && "Confirmation number",
    ].filter((field): field is string => Boolean(field));
    if (fields.length) issues.push({ kind: "stay", id: stay.id, label: stay.name.trim() || "Your hotel", fields });
  }
  for (const ride of trip.rides ?? []) {
    const contact = trip.contacts.some((c) => c.name.trim().toLowerCase() === ride.provider.trim().toLowerCase() && !blank(c.phone));
    const fields = [
      blank(ride.provider) && "Driver or company name",
      missingTime(ride.pickupAt) && "Pickup date and time",
      blank(ride.from) && "Pickup location",
      blank(ride.to) && "Drop-off location",
      blank(ride.notes) && "Meeting instructions",
      blank(ride.phone) && !contact && "Driver or company phone",
    ].filter((field): field is string => Boolean(field));
    if (fields.length) issues.push({ kind: "ride", id: ride.id, label: ride.provider.trim() || "Your pickup", fields });
  }
  return issues;
}
