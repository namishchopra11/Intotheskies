import { formatDate, formatDateTime, minutesBetween } from "@/lib/domain/time";
import { LocalDateTimeSchema, type Flight, type Person, type PersonRole, type Ride, type Stay } from "@/lib/types";
import type { SuggestionSource } from "./suggestions";

/**
 * The kinds of entry the traveler can type in (bookings, and the people waiting on them), described as data so one sheet
 * can edit any of them. A draft is the form's state: every field as a string.
 */
export type Draft = Record<string, string>;

export type FieldSpec = {
  key: string;
  label: string;
  type?: "text" | "tel" | "email" | "datetime-local" | "time" | "select";
  /** For `type: "select"`: the choices. The first one is the default for a new entry. */
  options?: { value: string; label: string }[];
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
  /** Let the subtitle wrap instead of cutting it off (an email address is worth reading in full). */
  wrapSubtitle?: boolean;
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
  title: (f) => `${f.flightNumber} · ${f.from} → ${f.to}`,
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
  subtitle: (s) => `${formatDate(s.checkIn)} → ${formatDate(s.checkOut)}`,
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
  title: (r) => `${r.provider} · ${r.from} → ${r.to}`,
  subtitle: (r) => formatDateTime(r.pickupAt),
};

export const PERSON_ROLES: { value: PersonRole; label: string }[] = [
  { value: "family", label: "Family or friend" },
  { value: "pickup", label: "Picking me up" },
  { value: "other", label: "Someone else" },
];

const roleLabel = (role: PersonRole) => PERSON_ROLES.find((r) => r.value === role)?.label ?? role;

/** Deliberately loose: the point is to catch a typo, not to police what counts as an address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PERSON: EntryKind<Person> = {
  noun: "person",
  wrapSubtitle: true,
  fields: [
    { key: "name", label: "Name", placeholder: "Marco" },
    {
      key: "role",
      label: "How they're waiting",
      type: "select",
      options: PERSON_ROLES,
      hint: "Family and pickup get a message ready to send. Someone else only shows on your timeline.",
    },
    { key: "phone", label: "Phone", type: "tel", optional: true, placeholder: "+39 345 555 0142" },
    { key: "email", label: "Email", type: "email", optional: true, placeholder: "marco@example.com" },
  ],
  toDraft: (p) => ({
    name: p?.name ?? "",
    role: p?.role ?? PERSON_ROLES[0].value,
    phone: p?.phone ?? "",
    email: p?.email ?? "",
  }),
  fromDraft: (d, id) => ({
    id,
    name: d.name.trim(),
    role: PERSON_ROLES.some((r) => r.value === d.role) ? (d.role as PersonRole) : "other",
    phone: opt(d.phone),
    email: opt(d.email),
  }),
  check: (d): Record<string, string> =>
    d.email?.trim() && !EMAIL.test(d.email.trim()) ? { email: "That doesn't look like an email address." } : {},
  title: (p) => p.name,
  subtitle: (p) => [roleLabel(p.role), p.phone ?? p.email].filter(Boolean).join(" · "),
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
