import { formatDate, formatDateTime, minutesBetween } from "@/lib/domain/time";
import { LocalDateTimeSchema, type Flight, type Ride, type Stay } from "@/lib/types";
import type { SuggestionSource } from "./suggestions";

/**
 * The three kinds of booking the traveler can type in, described as data so one sheet
 * can edit any of them. A draft is the form's state: every field as a string.
 */
export type Draft = Record<string, string>;

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "tel" | "datetime-local" | "time";
  placeholder?: string;
  hint?: string;
  optional?: boolean;
  /** Airport codes: three letters, upper-cased as you type. */
  airport?: boolean;
  /** Half width, so two fields sit side by side. */
  half?: boolean;
  /** Offer predictions while typing (see suggestions.ts). Only for obvious answers. */
  suggest?: SuggestionSource;
};

export type EntryKind<T extends { id: string }> = {
  noun: string;
  /** Show the title in the monospaced figure font (flight numbers and airport codes). */
  mono?: boolean;
  fields: FieldSpec[];
  toDraft: (item?: T) => Draft;
  fromDraft: (draft: Draft, id: string, existing?: T) => T;
  /** Errors beyond "required" and airport codes, keyed by field. */
  check?: (draft: Draft) => Record<string, string>;
  title: (item: T) => string;
  subtitle: (item: T) => string;
};

const opt = (v: string) => v.trim() || undefined;

export const FLIGHT: EntryKind<Flight> = {
  noun: "flight",
  mono: true,
  fields: [
    { key: "airline", label: "Airline", placeholder: "British Airways", suggest: "airline" },
    { key: "flightNumber", label: "Flight number", placeholder: "BA 286", suggest: "flightNumber" },
    { key: "from", label: "From", placeholder: "SFO", airport: true, half: true, suggest: "airport" },
    { key: "to", label: "To", placeholder: "LHR", airport: true, half: true, suggest: "airport" },
    { key: "departAt", label: "Departs", type: "datetime-local", hint: "Local time at the departure airport." },
    { key: "arriveAt", label: "Arrives", type: "datetime-local", hint: "Local time at the arrival airport." },
    { key: "bookingRef", label: "Booking reference", placeholder: "K7QM2X", half: true },
    { key: "seat", label: "Seat", placeholder: "34A", optional: true, half: true },
  ],
  toDraft: (f) => ({
    airline: f?.airline ?? "",
    flightNumber: f?.flightNumber ?? "",
    from: f?.from ?? "",
    to: f?.to ?? "",
    departAt: f?.departAt ?? "",
    arriveAt: f?.arriveAt ?? "",
    bookingRef: f?.bookingRef ?? "",
    seat: f?.seat ?? "",
  }),
  fromDraft: (d, id, existing) => ({
    ...existing,
    id,
    airline: d.airline.trim(),
    flightNumber: d.flightNumber.trim().toUpperCase(),
    from: d.from.trim(),
    to: d.to.trim(),
    departAt: d.departAt,
    arriveAt: d.arriveAt,
    bookingRef: d.bookingRef.trim().toUpperCase(),
    seat: opt(d.seat)?.toUpperCase(),
    status: existing?.status ?? "scheduled",
  }),
  // No departure-vs-arrival check: the two times are at different airports.
  check: (d): Record<string, string> =>
    d.from && d.from === d.to ? { to: "Arrival airport is the same as departure." } : {},
  title: (f) => `${f.flightNumber} · ${f.from} – ${f.to}`,
  subtitle: (f) => `${f.airline} · ${formatDateTime(f.departAt)}`,
};

export const STAY: EntryKind<Stay> = {
  noun: "hotel",
  fields: [
    { key: "name", label: "Hotel name", placeholder: "Hotel Artemide", suggest: "hotel" },
    { key: "address", label: "Address", placeholder: "Via Nazionale 22, Rome" },
    { key: "checkIn", label: "Check-in", type: "datetime-local" },
    { key: "checkOut", label: "Check-out", type: "datetime-local" },
    { key: "confirmation", label: "Confirmation number", placeholder: "HA-58213" },
    { key: "latestCheckIn", label: "Latest check-in", type: "time", optional: true, half: true, hint: "If the front desk closes." },
    { key: "phone", label: "Phone", type: "tel", optional: true, half: true },
  ],
  toDraft: (s) => ({
    name: s?.name ?? "",
    address: s?.address ?? "",
    checkIn: s?.checkIn ?? "",
    checkOut: s?.checkOut ?? "",
    confirmation: s?.confirmation ?? "",
    latestCheckIn: s?.latestCheckIn ?? "",
    phone: s?.phone ?? "",
  }),
  fromDraft: (d, id) => ({
    id,
    name: d.name.trim(),
    address: d.address.trim(),
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    confirmation: d.confirmation.trim(),
    latestCheckIn: opt(d.latestCheckIn),
    phone: opt(d.phone),
  }),
  // Check-in and check-out are in the same city, so comparing them is safe.
  check: (d): Record<string, string> =>
    isDateTime(d.checkIn) && isDateTime(d.checkOut) && minutesBetween(d.checkIn, d.checkOut) <= 0
      ? { checkOut: "Check-out needs to be after check-in." }
      : {},
  title: (s) => s.name,
  subtitle: (s) => `${formatDate(s.checkIn)} – ${formatDate(s.checkOut)}`,
};

export const RIDE: EntryKind<Ride> = {
  noun: "ride",
  fields: [
    { key: "provider", label: "Who's driving", placeholder: "Uber, hotel shuttle, a driver's name", suggest: "rideProvider" },
    { key: "pickupAt", label: "Pickup", type: "datetime-local" },
    { key: "from", label: "From", placeholder: "FCO arrivals", half: true, suggest: "place" },
    { key: "to", label: "To", placeholder: "Hotel Artemide", half: true, suggest: "place" },
    { key: "confirmation", label: "Confirmation", optional: true, half: true },
    { key: "phone", label: "Driver or company phone", type: "tel", optional: true, half: true },
    { key: "notes", label: "Notes", optional: true, placeholder: "Meeting point, car, sign name" },
  ],
  toDraft: (r) => ({
    provider: r?.provider ?? "",
    pickupAt: r?.pickupAt ?? "",
    from: r?.from ?? "",
    to: r?.to ?? "",
    confirmation: r?.confirmation ?? "",
    phone: r?.phone ?? "",
    notes: r?.notes ?? "",
  }),
  fromDraft: (d, id) => ({
    id,
    provider: d.provider.trim(),
    pickupAt: d.pickupAt,
    from: d.from.trim(),
    to: d.to.trim(),
    confirmation: opt(d.confirmation),
    phone: opt(d.phone),
    notes: opt(d.notes),
  }),
  title: (r) => `${r.provider} · ${r.from} – ${r.to}`,
  subtitle: (r) => formatDateTime(r.pickupAt),
};

const isDateTime = (v: string | undefined) => LocalDateTimeSchema.safeParse(v).success;

/** Required fields filled, airport codes well formed, dates read, then the kind's own checks. */
export function validate<T extends { id: string }>(kind: EntryKind<T>, draft: Draft): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of kind.fields) {
    const v = draft[f.key]?.trim() ?? "";
    if (!v && !f.optional) errors[f.key] = "Required.";
    else if (v && f.airport && !/^[A-Z]{3}$/.test(v)) errors[f.key] = "Three-letter airport code.";
    else if (v && f.type === "datetime-local" && !isDateTime(v)) errors[f.key] = "Add both a date and a time.";
  }
  return { ...kind.check?.(draft), ...errors };
}
