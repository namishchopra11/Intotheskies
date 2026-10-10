"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Card, Field, FlightStatusBadge, Icon, PageHeader, ThemeToggle } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { formatDate, formatDateTime, timePart } from "@/lib/domain/time";
import { useStoreReady, useTripStore } from "@/lib/store";
import type { Contact, Flight, Stay, Trip } from "@/lib/types";
import { CONTACT_KINDS, ContactSheet, FlightSheet, StaySheet } from "./Sheets";

function Section({ title, onAdd, addLabel, children }: { title: string; onAdd: () => void; addLabel: string; children: ReactNode }) {
  return (
    <section className="px-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button size="sm" variant="ghost" icon="plus" onClick={onAdd} aria-label={addLabel}>
          Add
        </Button>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <Card variant="inset" className="text-ink-2">{children}</Card>
);

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" className="shrink-0" onClick={onClick} aria-label={`Edit ${label}`}>
      Edit
    </Button>
  );
}

function FlightCard({ flight, trip, onEdit }: { flight: Flight; trip: Trip; onEdit: () => void }) {
  const o = flight.original;
  const changed = o && (o.departAt !== flight.departAt || o.arriveAt !== flight.arriveAt);
  const latest = trip.disruptions.findLast((d) => d.flightId === flight.id);
  const open = latest?.tasks.filter((t) => !t.done).length ?? 0;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {flight.airline} <span className="font-num tabular-nums">{flight.flightNumber}</span>
          </p>
          <p className="text-ink-2">
            {cityName(flight.from)} ({flight.from}) <Icon name="arrow-right" size={14} className="inline" /><span className="sr-only">to</span> {cityName(flight.to)} ({flight.to})
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap"><FlightStatusBadge status={flight.status} /></span>
      </div>
      <dl className="font-num mt-3 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
        <dt className="text-ink-3">Departs</dt>
        <dd>{formatDateTime(flight.departAt)}</dd>
        <dt className="text-ink-3">Arrives</dt>
        <dd>{formatDateTime(flight.arriveAt)}</dd>
        {changed && (
          <>
            <dt className="text-ink-3">Was</dt>
            <dd className="text-ink-3 line-through">{timePart(o.departAt)} → {timePart(o.arriveAt)}</dd>
          </>
        )}
        <dt className="text-ink-3">Booking</dt>
        <dd>{flight.bookingRef}{flight.seat && ` · seat ${flight.seat}`}</dd>
      </dl>
      <div className="mt-3 flex items-center justify-between gap-2">
        {latest ? (
          <Button size="sm" variant="secondary" href={`/disruption/${latest.id}`}>
            {open ? `${open} to do` : "View update"}
          </Button>
        ) : (
          <span />
        )}
        <EditButton label={`${flight.flightNumber}`} onClick={onEdit} />
      </div>
    </Card>
  );
}

function StayCard({ stay, onEdit }: { stay: Stay; onEdit: () => void }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{stay.name}</p>
          <p className="text-ink-2">{stay.address}</p>
        </div>
        <EditButton label={stay.name} onClick={onEdit} />
      </div>
      <dl className="font-num mt-3 grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
        <dt className="text-ink-3">Check-in</dt>
        <dd>{formatDateTime(stay.checkIn)}</dd>
        <dt className="text-ink-3">Check-out</dt>
        <dd>{formatDateTime(stay.checkOut)}</dd>
        {stay.latestCheckIn && (
          <>
            <dt className="text-ink-3">Desk open until</dt>
            <dd>{stay.latestCheckIn}</dd>
          </>
        )}
        <dt className="text-ink-3">Confirmation</dt>
        <dd>{stay.confirmation}</dd>
      </dl>
      {stay.phone && (
        <Button size="sm" variant="secondary" icon="phone" href={`tel:${stay.phone.replace(/[^\d+]/g, "")}`} className="mt-3">
          Call {stay.phone}
        </Button>
      )}
    </Card>
  );
}

function ContactCard({ contact, onEdit }: { contact: Contact; onEdit: () => void }) {
  const kind = CONTACT_KINDS.find((k) => k.value === contact.kind)?.label;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{contact.name}</p>
          <Badge tone="neutral" icon={null}>{kind}</Badge>
        </div>
        <EditButton label={contact.name} onClick={onEdit} />
      </div>
      {contact.notes && <p className="mt-2 text-ink-2">{contact.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {contact.phone && (
          <Button size="sm" variant="secondary" icon="phone" href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>
            Call
          </Button>
        )}
        {contact.url && (
          <a className="ck-button ck-button-secondary ck-button-sm" href={contact.url} target="_blank" rel="noreferrer">
            <Icon name="link" size={18} /> Website
          </a>
        )}
      </div>
    </Card>
  );
}

/** Where a "Send help" request on a shared update pays out. Optional; empty clears it. */
function PayoutCard({ saved }: { saved?: string }) {
  const setPayoutAddress = useTripStore((s) => s.setPayoutAddress);
  const [value, setValue] = useState(saved ?? "");
  const [error, setError] = useState<string>();
  const dirty = value.trim() !== (saved ?? "");
  return (
    <section className="px-4">
      <h2 className="mb-2 text-lg font-semibold">Help with costs</h2>
      <Card>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (setPayoutAddress(value)) setValue(value.trim());
            else setError("That doesn't look like a Solana address. Check it and try again.");
          }}
        >
          <Field
            label="Solana address (optional)"
            hint="Add one to let people you share an update with send you USDC. It stays on this device until you ask for help in a shared link."
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(undefined);
            }}
            error={error}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Your wallet's public address"
          />
          <Button type="submit" variant="secondary" disabled={!dirty} icon={!dirty && saved ? "check" : undefined}>
            {!dirty && saved ? "Saved" : saved && value.trim() === "" ? "Remove address" : "Save address"}
          </Button>
        </form>
      </Card>
    </section>
  );
}

type Editing =
  | { kind: "flight"; item?: Flight }
  | { kind: "stay"; item?: Stay }
  | { kind: "contact"; item?: Contact }
  | null;

export function TripView() {
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const loadSample = useTripStore((s) => s.loadSampleTrip);
  const reset = useTripStore((s) => s.resetTrip);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const close = () => setEditing(null);

  if (!ready) {
    return (
      <p role="status" className="py-24 text-center text-ink-3">
        Loading…
      </p>
    );
  }

  if (!trip) {
    return (
      <>
        <PageHeader title="ConnectionKeeper">
          When a flight changes, see what’s at risk, what to do next, and who to tell. Everything stays on this device.
        </PageHeader>
        <div className="px-4">
          <Card className="flex flex-col gap-3">
            <p className="font-semibold">No trip yet</p>
            <p className="text-ink-2">Load a sample trip to see how it works.</p>
            <Button variant="primary" block onClick={loadSample}>
              Load sample trip
            </Button>
          </Card>
        </div>
      </>
    );
  }

  const flights = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
  const stays = [...trip.stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const first = flights[0], last = flights[flights.length - 1];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader eyebrow={trip.travelerName} title={trip.name}>
        {first && `${formatDate(first.departAt)}${last && last !== first ? ` – ${formatDate(last.arriveAt)}` : ""}`}
      </PageHeader>

      {flights.length > 0 && (
        <div className="px-4">
          <Button variant="primary" block icon="alert" href="/disruption/new">
            Report a change
          </Button>
        </div>
      )}

      <Section title="Flights" addLabel="Add flight" onAdd={() => setEditing({ kind: "flight" })}>
        {flights.length === 0 && <Empty>No flights yet.</Empty>}
        {flights.map((f) => (
          <FlightCard key={f.id} flight={f} trip={trip} onEdit={() => setEditing({ kind: "flight", item: f })} />
        ))}
      </Section>

      <Section title="Stays" addLabel="Add stay" onAdd={() => setEditing({ kind: "stay" })}>
        {stays.length === 0 && <Empty>No stays yet.</Empty>}
        {stays.map((s) => (
          <StayCard key={s.id} stay={s} onEdit={() => setEditing({ kind: "stay", item: s })} />
        ))}
      </Section>

      <Section title="Contacts" addLabel="Add contact" onAdd={() => setEditing({ kind: "contact" })}>
        {trip.contacts.length === 0 && <Empty>No contacts yet.</Empty>}
        {trip.contacts.map((c) => (
          <ContactCard key={c.id} contact={c} onEdit={() => setEditing({ kind: "contact", item: c })} />
        ))}
      </Section>

      <PayoutCard key={trip.id} saved={trip.payoutAddress} />

      <div className="flex flex-col gap-3 px-4">
        <ThemeToggle />
        <Button
          variant="ghost"
          block
          onClick={() => (confirmReset ? reset() : setConfirmReset(true))}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? "Tap again to delete this trip" : "Delete trip from this device"}
        </Button>
      </div>

      {editing?.kind === "flight" && <FlightSheet flight={editing.item} onClose={close} />}
      {editing?.kind === "stay" && <StaySheet stay={editing.item} onClose={close} />}
      {editing?.kind === "contact" && <ContactSheet contact={editing.item} onClose={close} />}
    </div>
  );
}
