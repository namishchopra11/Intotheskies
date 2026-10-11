"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, Button, Card, Field, Icon, PageHeader, PageTransition, SelectField, Sheet, cx, type IconName } from "@/components/ui";
import { newId } from "@/lib/id";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { FLIGHT, PERSON, RIDE, STAY, validate, type Draft, type EntryKind } from "./entries";
import { DateTimeField } from "./DateTimeField";
import { ImportSheet } from "./ImportSheet";
import { START_TRIP_ID, leaveStartTrip } from "./leaveStartTrip";

// Bookings build up in order when they appear: import, trip name, flights, hotels, rides.
const rise = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
import { candidates, matchSuggestions, type Suggestion } from "./suggestions";

/** The "fill it in for me" entry point, at the top of the screen. */
function ImportCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-4 flex cursor-pointer items-center gap-3.5 rounded-card bg-signal px-4 py-3.5 text-left text-on-signal"
      >
        <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-ink/10">
          <Icon name="copy" size={20} strokeWidth={2.25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Import from a confirmation</span>
          <span className="block text-[14px] leading-snug opacity-80">Screenshot, PDF or email. We fill in the details.</span>
        </span>
        <Icon name="chevron-right" size={18} />
      </button>
      {open && <ImportSheet onClose={() => setOpen(false)} />}
    </>
  );
}

/** Where the traveler types in their own flights, hotels and rides. */
export default function TripEditPage() {
  const ready = useRequireProfile();
  const trip = useTripStore((s) => s.trip);

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <PageHeader variant="bar" title="Your trip" />
        {!ready ? null : trip ? <Bookings trip={trip} /> : <StartTrip />}
      </main>
    </PageTransition>
  );
}

function StartTrip() {
  const startTrip = useTripStore((s) => s.startTrip);
  const signedInName = useTripStore((s) => s.profile?.name ?? "");
  const [name, setName] = useState("");
  const [tried, setTried] = useState(false);

  return (
    <div id={START_TRIP_ID} className="flex flex-1 flex-col">
      <ImportCard />
      <p className="ck-label px-5 pt-7 pb-1">Or type it in</p>
      <form
        className="flex flex-1 flex-col gap-4 px-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (name.trim()) leaveStartTrip(() => startTrip({ name, travelerName: signedInName }));
        }}
      >
        <Field
          label="Trip name"
          placeholder="Rome via London"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={tried && !name.trim() ? "Required." : undefined}
        />
        <div className="mt-auto pt-6 pb-[max(env(safe-area-inset-bottom),24px)]">
          <Button type="submit" variant="primary" size="lg" block chip="arrow-right">
            Start adding bookings
          </Button>
        </div>
      </form>
    </div>
  );
}

type Editing =
  | { kind: "flight"; id?: string }
  | { kind: "stay"; id?: string }
  | { kind: "ride"; id?: string }
  | { kind: "person"; id?: string }
  | { kind: "details" };

function Bookings({ trip }: { trip: Trip }) {
  const router = useRouter();
  const store = useTripStore();
  const [editing, setEditing] = useState<Editing | null>(null);
  const close = () => setEditing(null);
  const rides = trip.rides ?? [];
  const people = trip.people ?? [];
  const empty = trip.flights.length + trip.stays.length + rides.length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="ck-rise" style={rise(0)}>
        <ImportCard />
      </div>
      <button
        type="button"
        onClick={() => setEditing({ kind: "details" })}
        style={rise(70)}
        className="ck-rise mx-4 mt-3 flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 text-left hover:bg-sunk"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">{trip.name || "Untitled trip"}</span>
          <span className="block text-[14px] text-ink-2">{trip.travelerName}</span>
        </span>
        <Icon name="pencil" size={18} className="text-ink-2" />
      </button>

      <Section
        delay={150}
        icon="plane"
        title="Flights"
        items={trip.flights}
        kind={FLIGHT}
        onAdd={() => setEditing({ kind: "flight" })}
        onEdit={(id) => setEditing({ kind: "flight", id })}
      />
      <Section
        delay={230}
        icon="bed"
        title="Hotels"
        items={trip.stays}
        kind={STAY}
        onAdd={() => setEditing({ kind: "stay" })}
        onEdit={(id) => setEditing({ kind: "stay", id })}
      />
      <Section
        delay={310}
        icon="car"
        title="Rides"
        items={rides}
        kind={RIDE}
        onAdd={() => setEditing({ kind: "ride" })}
        onEdit={(id) => setEditing({ kind: "ride", id })}
      />
      <Section
        delay={390}
        icon="user"
        title="Who's waiting"
        hint="Add the people expecting you. Each one gets a message ready to send when a flight changes."
        items={people}
        kind={PERSON}
        onAdd={() => setEditing({ kind: "person" })}
        onEdit={(id) => setEditing({ kind: "person", id })}
      />

      <div className="ck-rise mt-auto px-4 pt-8 pb-[max(env(safe-area-inset-bottom),24px)]" style={rise(470)}>
        <Button variant="primary" size="lg" block chip="arrow-right" disabled={empty} onClick={() => router.push("/")}>
          Done
        </Button>
      </div>

      {editing?.kind === "details" && <DetailsSheet trip={trip} onClose={close} />}
      {editing?.kind === "flight" && (
        <EntrySheet kind={FLIGHT} items={trip.flights} id={editing.id} onClose={close} onSave={store.upsertFlight} onRemove={store.removeFlight} />
      )}
      {editing?.kind === "stay" && (
        <EntrySheet kind={STAY} items={trip.stays} id={editing.id} onClose={close} onSave={store.upsertStay} onRemove={store.removeStay} />
      )}
      {editing?.kind === "ride" && (
        <EntrySheet kind={RIDE} items={rides} id={editing.id} onClose={close} onSave={store.upsertRide} onRemove={store.removeRide} />
      )}
      {editing?.kind === "person" && (
        <EntrySheet kind={PERSON} items={people} id={editing.id} onClose={close} onSave={store.upsertPerson} onRemove={store.removePerson} />
      )}
    </div>
  );
}

function Section<T extends { id: string }>({
  delay,
  icon,
  title,
  hint,
  items,
  kind,
  onAdd,
  onEdit,
}: {
  delay: number;
  icon: IconName;
  title: string;
  /** One line under the title, for a section whose purpose isn't obvious from its name. */
  hint?: string;
  items: T[];
  kind: EntryKind<T>;
  onAdd: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <section className="ck-rise flex flex-col gap-2.5 px-4 pt-7" style={rise(delay)}>
      <h2 className="ck-label px-1">{title}</h2>
      {hint && <p className="-mt-1 px-1 text-[14px] leading-snug text-ink-2">{hint}</p>}
      {items.length > 0 && (
        <Card as="div" padding="none" className="divide-y divide-line-soft overflow-hidden">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onEdit(item.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-sunk"
            >
              <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-sunk text-ink">
                <Icon name={icon} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate font-semibold", kind.mono && "font-num")}>{kind.title(item)}</span>
                <span className={cx("block text-[14px] text-ink-2", kind.wrapSubtitle ? "break-words" : "truncate")}>
                  {kind.subtitle(item)}
                </span>
              </span>
              <Icon name="chevron-right" size={18} className="text-ink-3" />
            </button>
          ))}
        </Card>
      )}
      <Button variant="secondary" size="sm" block icon="plus" onClick={onAdd}>
        Add {items.length > 0 ? "another" : "a"} {kind.noun}
      </Button>
    </section>
  );
}

function EntrySheet<T extends { id: string }>({
  kind,
  items,
  id,
  onClose,
  onSave,
  onRemove,
}: {
  kind: EntryKind<T>;
  items: T[];
  id?: string;
  onClose: () => void;
  onSave: (item: T) => void;
  onRemove: (id: string) => void;
}) {
  const existing = id ? items.find((i) => i.id === id) : undefined;
  const [draft, setDraft] = useState<Draft>(() => kind.toDraft(existing));
  const [tried, setTried] = useState(false);
  const errors = tried ? validate(kind, draft) : {};
  // The open trip first, then saved ones: where "from your trips" predictions come from.
  const trip = useTripStore((s) => s.trip);
  const savedTrips = useTripStore((s) => s.savedTrips);
  const trips = useMemo(() => (trip ? [trip, ...savedTrips] : savedTrips), [trip, savedTrips]);

  const setField = (key: string, value: string, airport?: boolean) =>
    setDraft((d) => ({ ...d, [key]: airport ? value.toUpperCase() : value }));
  // A picked prediction may fill other fields too (an airline fills its flight-number
  // prefix, a hotel from your trips fills its address), but never overwrites what's typed.
  const applyFill = (fill: Draft | undefined) =>
    fill &&
    setDraft((d) => {
      const next = { ...d };
      for (const [k, v] of Object.entries(fill)) if (!next[k]?.trim()) next[k] = v;
      return next;
    });

  const submit = () => {
    setTried(true);
    if (Object.keys(validate(kind, draft)).length > 0) return;
    onSave(kind.fromDraft(draft, existing?.id ?? newId(), existing));
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? `Edit ${kind.noun}` : `Add a ${kind.noun}`}
      footer={
        <Button variant="primary" block onClick={submit}>
          {existing ? "Save changes" : `Add ${kind.noun}`}
        </Button>
      }
    >
      <form
        className="flex flex-wrap gap-x-3 gap-y-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {kind.fields.map((f) =>
          f.type === "datetime-local" ? (
            <DateTimeField
              key={f.key}
              label={f.label}
              hint={f.hint}
              value={draft[f.key] ?? ""}
              onChange={(v) => setField(f.key, v)}
              error={errors[f.key]}
              className="w-full"
            />
          ) : f.type === "select" ? (
            <SelectField
              key={f.key}
              label={f.label}
              hint={f.hint}
              options={f.options ?? []}
              value={draft[f.key] ?? ""}
              onChange={(e) => setField(f.key, e.target.value)}
              error={errors[f.key]}
              className="w-full"
            />
          ) : f.suggest ? (
            <Autocomplete<Suggestion>
              key={f.key}
              label={f.optional ? `${f.label} (optional)` : f.label}
              placeholder={f.placeholder}
              hint={f.hint}
              value={draft[f.key] ?? ""}
              maxLength={f.airport ? 3 : undefined}
              autoCapitalize={f.airport ? "characters" : undefined}
              onChange={(v) => setField(f.key, v, f.airport)}
              options={matchSuggestions(candidates(f.suggest, draft, trips), draft[f.key] ?? "")}
              onPick={(o) => applyFill(o.fill)}
              error={errors[f.key]}
              className={cx(f.half ? "min-w-0 flex-[1_1_calc(50%-6px)]" : "w-full")}
            />
          ) : (
            <Field
              key={f.key}
              label={f.optional ? `${f.label} (optional)` : f.label}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
              hint={f.hint}
              value={draft[f.key] ?? ""}
              maxLength={f.airport ? 3 : undefined}
              autoCapitalize={f.airport ? "characters" : undefined}
              onChange={(e) =>
                setDraft((d) => ({ ...d, [f.key]: f.airport ? e.target.value.toUpperCase() : e.target.value }))
              }
              error={errors[f.key]}
              className={cx(f.half ? "min-w-0 flex-[1_1_calc(50%-6px)]" : "w-full")}
            />
          ),
        )}
        <button type="submit" hidden />
        {existing && (
          <Button
            variant="danger"
            size="sm"
            block
            className="mt-2"
            onClick={() => {
              onRemove(existing.id);
              onClose();
            }}
          >
            Remove this {kind.noun}
          </Button>
        )}
      </form>
    </Sheet>
  );
}

function DetailsSheet({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const updateTripDetails = useTripStore((s) => s.updateTripDetails);
  const [name, setName] = useState(trip.name);
  const valid = name.trim();

  return (
    <Sheet
      open
      onClose={onClose}
      title="Trip details"
      footer={
        <Button
          variant="primary"
          block
          disabled={!valid}
          onClick={() => {
            updateTripDetails({ name, travelerName: trip.travelerName });
            onClose();
          }}
        >
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <Field label="Trip name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </Sheet>
  );
}
