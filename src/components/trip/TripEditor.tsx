"use client";

import { useState } from "react";
import { Button, Field, SelectField, Sheet } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { formatDateTime } from "@/lib/domain/time";
import { newId } from "@/lib/id";
import { useTripStore } from "@/lib/store";
import { ContactKindSchema, type Contact, type Flight, type Stay } from "@/lib/types";

type Kind = "flight" | "stay" | "contact";
type Values = Record<string, string>;
type Errors = Record<string, string>;
type Spec = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  code?: boolean;
};

const SPECS: Record<Kind, Spec[]> = {
  flight: [
    { key: "airline", label: "Airline", required: true, placeholder: "British Airways" },
    { key: "flightNumber", label: "Flight number", required: true, placeholder: "BA 286" },
    { key: "from", label: "From (airport code)", required: true, placeholder: "SFO", code: true },
    { key: "to", label: "To (airport code)", required: true, placeholder: "LHR", code: true },
    { key: "departAt", label: "Departs (local time)", type: "datetime-local", required: true },
    { key: "arriveAt", label: "Arrives (local time)", type: "datetime-local", required: true },
    { key: "bookingRef", label: "Booking reference" },
    { key: "seat", label: "Seat" },
  ],
  stay: [
    { key: "name", label: "Hotel name", required: true },
    { key: "address", label: "Address", required: true },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "checkIn", label: "Check-in", type: "datetime-local", required: true },
    { key: "checkOut", label: "Check-out", type: "datetime-local", required: true },
    { key: "confirmation", label: "Confirmation number" },
    { key: "latestCheckIn", label: "Front desk open until", type: "time", hint: "Optional" },
  ],
  contact: [
    {
      key: "kind",
      label: "Type",
      options: ContactKindSchema.options.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
    },
    { key: "name", label: "Name", required: true },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "url", label: "Website", type: "url", placeholder: "https://" },
  ],
};

const BLANK: Record<Kind, Values> = {
  flight: { airline: "", flightNumber: "", from: "", to: "", departAt: "", arriveAt: "", bookingRef: "", seat: "" },
  stay: { name: "", address: "", phone: "", checkIn: "", checkOut: "", confirmation: "", latestCheckIn: "" },
  contact: { kind: "airline", name: "", phone: "", url: "" },
};

const TITLE: Record<Kind, string> = { flight: "Flight", stay: "Hotel", contact: "Contact" };
const opt = (v: string) => v.trim() || undefined;

function validate(kind: Kind, v: Values): Errors {
  const errors: Errors = {};
  for (const s of SPECS[kind]) if (s.required && !v[s.key]?.trim()) errors[s.key] = "Required";
  if (kind === "flight") {
    for (const k of ["from", "to"]) if (!errors[k] && !/^[A-Za-z]{3}$/.test(v[k].trim())) errors[k] = "Use the 3-letter code, like LHR";
  }
  // Check-in and check-out are in the same city, so they can be compared.
  if (kind === "stay" && !errors.checkOut && v.checkIn && v.checkOut <= v.checkIn) errors.checkOut = "Must be after check-in";
  if (kind === "contact" && v.url.trim() && !/^https?:\/\//i.test(v.url.trim())) errors.url = "Start with http:// or https://";
  return errors;
}

const toFlight = (v: Values, base: Partial<Flight> = {}): Flight => ({
  status: "scheduled",
  ...base,
  id: base.id ?? newId(),
  airline: v.airline.trim(),
  flightNumber: v.flightNumber.trim(),
  from: v.from.trim().toUpperCase(),
  to: v.to.trim().toUpperCase(),
  departAt: v.departAt,
  arriveAt: v.arriveAt,
  bookingRef: v.bookingRef.trim(),
  seat: opt(v.seat),
});

const toStay = (v: Values, id = newId()): Stay => ({
  id,
  name: v.name.trim(),
  address: v.address.trim(),
  phone: opt(v.phone),
  checkIn: v.checkIn,
  checkOut: v.checkOut,
  confirmation: v.confirmation.trim(),
  latestCheckIn: opt(v.latestCheckIn),
});

const toContact = (v: Values, base: Partial<Contact> = {}): Contact => ({
  ...base,
  id: base.id ?? newId(),
  kind: ContactKindSchema.parse(v.kind),
  name: v.name.trim(),
  phone: opt(v.phone),
  url: opt(v.url),
});

/** The fields for one item. `onSave` gets valid values only. */
function ItemForm({
  kind,
  initial,
  submitLabel,
  onSave,
  onCancel,
  onDelete,
}: {
  kind: Kind;
  initial: Values;
  submitLabel: string;
  onSave: (v: Values) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  return (
    <form
      className="flex flex-col gap-4 pt-2"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const found = validate(kind, values);
        setErrors(found);
        if (Object.keys(found).length === 0) onSave(values);
      }}
    >
      <Fields kind={kind} values={values} errors={errors} onChange={(k, val) => setValues((p) => ({ ...p, [k]: val }))} />
      <Button type="submit" variant="primary" size="lg" block>
        {submitLabel}
      </Button>
      <Button variant="secondary" block onClick={onCancel}>
        Cancel
      </Button>
      {onDelete && (
        <Button variant="danger" block onClick={onDelete}>
          Remove
        </Button>
      )}
    </form>
  );
}

function Fields({
  kind,
  values,
  errors,
  onChange,
}: {
  kind: Kind;
  values: Values;
  errors: Errors;
  onChange: (key: string, value: string) => void;
}) {
  return SPECS[kind].map((s) =>
    s.options ? (
      <SelectField key={s.key} label={s.label} options={s.options} value={values[s.key]} onChange={(e) => onChange(s.key, e.target.value)} />
    ) : (
      <Field
        key={s.key}
        label={s.label}
        hint={s.hint}
        type={s.type}
        placeholder={s.placeholder}
        value={values[s.key]}
        error={errors[s.key]}
        onChange={(e) => onChange(s.key, e.target.value)}
        autoCapitalize={s.code ? "characters" : undefined}
        autoCorrect="off"
        spellCheck={false}
      />
    ),
  );
}

/** First-time setup: the trip's name, who is travelling, and the first flight. */
export function NewTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const startTrip = useTripStore((s) => s.startTrip);
  const [head, setHead] = useState({ name: "", travelerName: "" });
  const [flight, setFlight] = useState<Values>(BLANK.flight);
  const [errors, setErrors] = useState<Errors>({});

  return (
    <Sheet open={open} onClose={onClose} title="Enter your trip">
      <form
        className="flex flex-col gap-4 pt-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const found = validate("flight", flight);
          if (!head.travelerName.trim()) found.travelerName = "Required";
          setErrors(found);
          if (Object.keys(found).length > 0) return;
          const f = toFlight(flight);
          startTrip({
            id: newId(),
            name: head.name.trim() || `${cityName(f.from)} to ${cityName(f.to)}`,
            travelerName: head.travelerName.trim(),
            flights: [f],
            stays: [],
            contacts: [],
            disruptions: [],
          });
          onClose();
        }}
      >
        <Field label="Your name" value={head.travelerName} error={errors.travelerName} autoComplete="name" onChange={(e) => setHead({ ...head, travelerName: e.target.value })} />
        <Field label="Trip name" hint="Optional" value={head.name} placeholder="Rome via London" onChange={(e) => setHead({ ...head, name: e.target.value })} />
        <h3 className="ck-label pt-2">First flight</h3>
        <Fields kind="flight" values={flight} errors={errors} onChange={(k, v) => setFlight((p) => ({ ...p, [k]: v }))} />
        <p className="text-[13px] leading-snug text-ink-2">Add the rest of your flights, hotels and contacts after this.</p>
        <Button type="submit" variant="primary" size="lg" block>
          Start watching this trip
        </Button>
      </form>
    </Sheet>
  );
}

type Editing = { kind: Kind; id?: string } | null;

/** List, add, edit and remove the trip's flights, hotels and contacts. */
export function ReservationsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const trip = useTripStore((s) => s.trip);
  const { upsertFlight, removeFlight, upsertStay, removeStay, upsertContact, removeContact } = useTripStore.getState();
  const [editing, setEditing] = useState<Editing>(null);
  const close = () => {
    setEditing(null);
    onClose();
  };
  if (!trip) return null;

  let body;
  if (editing) {
    const { kind, id } = editing;
    const flight = kind === "flight" ? trip.flights.find((f) => f.id === id) : undefined;
    const stay = kind === "stay" ? trip.stays.find((s) => s.id === id) : undefined;
    const contact = kind === "contact" ? trip.contacts.find((c) => c.id === id) : undefined;
    const existing: Record<string, unknown> = flight ?? stay ?? contact ?? {};
    const initial: Values = { ...BLANK[kind] };
    for (const k in initial) if (typeof existing[k] === "string") initial[k] = existing[k];
    const done = () => setEditing(null);
    body = (
      <ItemForm
        key={`${kind}-${id ?? "new"}`}
        kind={kind}
        initial={initial}
        submitLabel={id ? "Save changes" : `Add ${TITLE[kind].toLowerCase()}`}
        onCancel={done}
        onSave={(v) => {
          if (kind === "flight") upsertFlight(toFlight(v, flight));
          else if (kind === "stay") upsertStay(toStay(v, id));
          else upsertContact(toContact(v, contact));
          done();
        }}
        onDelete={
          id && (kind !== "flight" || flight?.status === "scheduled")
            ? () => {
                if (kind === "flight") removeFlight(id);
                else if (kind === "stay") removeStay(id);
                else removeContact(id);
                done();
              }
            : undefined
        }
      />
    );
  } else {
    const groups: { kind: Kind; heading: string; rows: { id: string; title: string; sub: string; locked?: boolean }[] }[] = [
      {
        kind: "flight",
        heading: "Flights",
        rows: trip.flights.map((f) => ({
          id: f.id,
          title: `${f.flightNumber} · ${f.from} → ${f.to}`,
          sub: formatDateTime(f.departAt),
          // A flight the airline has changed is edited by the airline feed, not by hand.
          locked: f.status !== "scheduled",
        })),
      },
      { kind: "stay", heading: "Hotels", rows: trip.stays.map((s) => ({ id: s.id, title: s.name, sub: `Check-in ${formatDateTime(s.checkIn)}` })) },
      { kind: "contact", heading: "Contacts", rows: trip.contacts.map((c) => ({ id: c.id, title: c.name, sub: c.phone ?? c.kind })) },
    ];
    body = (
      <div className="flex flex-col gap-6 pt-2">
        {groups.map((g) => (
          <section key={g.kind} className="flex flex-col gap-2">
            <h3 className="ck-label">{g.heading}</h3>
            {g.rows.length > 0 && (
              <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
                {g.rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-1 pr-2 pl-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{r.title}</span>
                      <span className="block truncate text-[13px] text-ink-2">{r.locked ? "Changed by the airline" : r.sub}</span>
                    </span>
                    {!r.locked && (
                      <Button variant="ghost" size="sm" aria-label={`Edit ${r.title}`} onClick={() => setEditing({ kind: g.kind, id: r.id })}>
                        Edit
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="secondary" block icon="plus" onClick={() => setEditing({ kind: g.kind })}>
              Add {TITLE[g.kind].toLowerCase()}
            </Button>
          </section>
        ))}
      </div>
    );
  }

  return (
    <Sheet open={open} onClose={close} title={editing ? `${editing.id ? "Edit" : "Add"} ${TITLE[editing.kind].toLowerCase()}` : "Your reservations"}>
      {body}
    </Sheet>
  );
}
