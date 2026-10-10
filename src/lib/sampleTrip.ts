import type { Trip } from "@/lib/types";

// Demo trip: Alex Morgan, San Francisco to Rome via London, one week from the hackathon.
// The 10:35 arrival and 11:30 onward departure (a 55-minute connection at LHR) drive the
// demo and the tests: keep those two times.
// Alex booked the two flights separately, so they have two airlines and two booking
// references: the "airline app, confirmation emails, hotel" juggling the pitch talks about.
// Flight numbers are plausible examples, not checked against real schedules.
// Phone numbers are made up. UK numbers use Ofcom's reserved drama range (020 7946 0xxx).
// Italy has no reserved range, so the Rome numbers use a 555 pattern that reads as fake;
// do not tap them during the demo.
export const sampleTrip: Trip = {
  id: "trip-sample",
  name: "Rome via London",
  travelerName: "Alex Morgan",
  flights: [
    {
      id: "flight-sfo-lhr",
      airline: "British Airways",
      flightNumber: "BA 286",
      from: "SFO",
      to: "LHR",
      departAt: "2026-10-16T16:40",
      arriveAt: "2026-10-17T10:35",
      bookingRef: "K7QM2X",
      seat: "34A",
      status: "scheduled",
    },
    {
      id: "flight-lhr-fco",
      airline: "ITA Airways",
      flightNumber: "AZ 201",
      from: "LHR",
      to: "FCO",
      departAt: "2026-10-17T11:30",
      arriveAt: "2026-10-17T15:05",
      bookingRef: "W4HT9P",
      seat: "12C",
      status: "scheduled",
    },
  ],
  stays: [
    {
      id: "stay-rome",
      name: "Hotel Aventino Garden",
      address: "Via di Santa Prisca 14, 00153 Roma RM, Italy",
      phone: "+39 06 5550 0142",
      checkIn: "2026-10-17T15:00",
      checkOut: "2026-10-21T11:00",
      confirmation: "HAG-48213",
      latestCheckIn: "22:00",
    },
  ],
  contacts: [
    {
      id: "contact-ba",
      kind: "airline",
      name: "British Airways",
      phone: "+44 20 7946 0123",
      url: "https://www.britishairways.com",
    },
    {
      id: "contact-ita",
      kind: "airline",
      name: "ITA Airways",
      phone: "+39 06 5550 0177",
      url: "https://www.ita-airways.com",
    },
    {
      id: "contact-hotel",
      kind: "hotel",
      name: "Hotel Aventino Garden",
      phone: "+39 06 5550 0142",
      notes: "Front desk closes at 22:00. Call ahead for a late arrival.",
    },
  ],
  people: [
    { id: "person-marco", name: "Marco", role: "pickup", phone: "+39 06 5550 0199" },
    { id: "person-mum", name: "Mum", role: "family", phone: "+44 20 7946 0456" },
  ],
  disruptions: [],
};
