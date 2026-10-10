"use client";

import { useState, type ReactNode } from "react";
import { Button, Field, SelectField, Sheet, TextAreaField } from "@/components/ui";
import { newId } from "@/lib/id";
import { useTripStore } from "@/lib/store";
import type { Contact, ContactKind, Flight, Stay } from "@/lib/types";

type Values = Record<string, string>;

/** A bottom sheet holding one form. Mount it only while open, so its state starts fresh. */
function FormSheet({
  title,
  onClose,
  onSubmit,
  onRemove,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const formId = `form-${title.replace(/\W+/g, "-")}`;
  return (
    <Sheet
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          {onRemove && (
            <Button
              variant="danger"
              onClick={() => (confirming ? onRemove() : setConfirming(true))}
              aria-live="polite"
            >
              {confirming ? "Tap to confirm" : "Remove"}
            </Button>
          )}
          <Button type="submit" form={formId} variant="primary" className="flex-1">
            Save
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {children}
      </form>
    </Sheet>
  );
}

function useValues(initial: Values) {
  const [v, setV] = useState(initial);
  const bind = (k: string, extra?: { upper?: boolean }) => ({
    value: v[k],
    onChange: (e: { target: { value: string } }) =>
      setV((s) => ({ ...s, [k]: extra?.upper ? e.target.value.toUpperCase() : e.target.value })),
  });
  return [v, bind] as const;
}

const opt = (s: string) => s.trim() || undefined;

export function FlightSheet({ flight, onClose }: { flight?: Flight; onClose: () => void }) {
  const upsert = useTripStore((s) => s.upsertFlight);
  const remove = useTripStore((s) => s.removeFlight);
  const [v, bind] = useValues({
    airline: flight?.airline ?? "",
    flightNumber: flight?.flightNumber ?? "",
    from: flight?.from ?? "",
    to: flight?.to ?? "",
    departAt: flight?.departAt ?? "",
    arriveAt: flight?.arriveAt ?? "",
    bookingRef: flight?.bookingRef ?? "",
    seat: flight?.seat ?? "",
  });
  return (
    <FormSheet
      title={flight ? "Edit flight" : "Add flight"}
      onClose={onClose}
      onRemove={flight && (() => (remove(flight.id), onClose()))}
      onSubmit={() => {
        upsert({
          status: "scheduled",
          ...flight,
          id: flight?.id ?? newId(),
          airline: v.airline.trim(),
          flightNumber: v.flightNumber.trim(),
          from: v.from.trim(),
          to: v.to.trim(),
          departAt: v.departAt,
          arriveAt: v.arriveAt,
          bookingRef: v.bookingRef.trim(),
          seat: opt(v.seat),
        });
        onClose();
      }}
    >
      <Field label="Airline" required {...bind("airline")} />
      <Field label="Flight number" required placeholder="BA 286" {...bind("flightNumber")} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" required maxLength={3} minLength={3} placeholder="SFO" {...bind("from", { upper: true })} />
        <Field label="To" required maxLength={3} minLength={3} placeholder="LHR" {...bind("to", { upper: true })} />
      </div>
      <Field label="Departs (local time)" type="datetime-local" required {...bind("departAt")} />
      <Field label="Arrives (local time)" type="datetime-local" required {...bind("arriveAt")} />
      <Field label="Booking reference" required {...bind("bookingRef")} />
      <Field label="Seat" {...bind("seat")} />
    </FormSheet>
  );
}

export function StaySheet({ stay, onClose }: { stay?: Stay; onClose: () => void }) {
  const upsert = useTripStore((s) => s.upsertStay);
  const remove = useTripStore((s) => s.removeStay);
  const [v, bind] = useValues({
    name: stay?.name ?? "",
    address: stay?.address ?? "",
    phone: stay?.phone ?? "",
    checkIn: stay?.checkIn ?? "",
    checkOut: stay?.checkOut ?? "",
    confirmation: stay?.confirmation ?? "",
    latestCheckIn: stay?.latestCheckIn ?? "",
  });
  return (
    <FormSheet
      title={stay ? "Edit stay" : "Add stay"}
      onClose={onClose}
      onRemove={stay && (() => (remove(stay.id), onClose()))}
      onSubmit={() => {
        upsert({
          id: stay?.id ?? newId(),
          name: v.name.trim(),
          address: v.address.trim(),
          phone: opt(v.phone),
          checkIn: v.checkIn,
          checkOut: v.checkOut,
          confirmation: v.confirmation.trim(),
          latestCheckIn: opt(v.latestCheckIn),
        });
        onClose();
      }}
    >
      <Field label="Hotel name" required {...bind("name")} />
      <Field label="Address" required {...bind("address")} />
      <Field label="Phone" type="tel" {...bind("phone")} />
      <Field label="Check-in" type="datetime-local" required {...bind("checkIn")} />
      <Field label="Check-out" type="datetime-local" required {...bind("checkOut")} />
      <Field
        label="Latest check-in time"
        type="time"
        hint="If the hotel closes its desk, e.g. 22:00."
        {...bind("latestCheckIn")}
      />
      <Field label="Confirmation number" required {...bind("confirmation")} />
    </FormSheet>
  );
}

export const CONTACT_KINDS: { value: ContactKind; label: string }[] = [
  { value: "airline", label: "Airline" },
  { value: "hotel", label: "Hotel" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

export function ContactSheet({ contact, onClose }: { contact?: Contact; onClose: () => void }) {
  const upsert = useTripStore((s) => s.upsertContact);
  const remove = useTripStore((s) => s.removeContact);
  const [v, bind] = useValues({
    kind: contact?.kind ?? "airline",
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    url: contact?.url ?? "",
    notes: contact?.notes ?? "",
  });
  return (
    <FormSheet
      title={contact ? "Edit contact" : "Add contact"}
      onClose={onClose}
      onRemove={contact && (() => (remove(contact.id), onClose()))}
      onSubmit={() => {
        upsert({
          id: contact?.id ?? newId(),
          kind: v.kind as ContactKind,
          name: v.name.trim(),
          phone: opt(v.phone),
          url: opt(v.url),
          notes: opt(v.notes),
        });
        onClose();
      }}
    >
      <SelectField label="Type" options={CONTACT_KINDS} {...bind("kind")} />
      <Field label="Name" required {...bind("name")} />
      <Field label="Phone" type="tel" {...bind("phone")} />
      <Field label="Website" type="url" placeholder="https://" {...bind("url")} />
      <TextAreaField label="Notes" {...bind("notes")} />
    </FormSheet>
  );
}
