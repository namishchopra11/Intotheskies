"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, Button, Field, Icon, PageHeader, PageTransition, SelectField, Sheet, SignArrow, cx, type IconName } from "@/components/ui";
import { newId } from "@/lib/id";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { useTripStore } from "@/lib/store";
import { useTimeFormat } from "@/lib/useTimeFormat";
import type { Trip } from "@/lib/types";
import { FLIGHT, PERSON, RIDE, STAY, validate, type Draft, type EntryKind } from "./entries";
import { DateTimeField } from "./DateTimeField";
import { ImportSheet } from "./ImportSheet";
import { START_TRIP_ID, leaveStartTrip } from "./leaveStartTrip";
import { missingDetails } from "./missingDetails";

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
        data-tour="import"
        className="ck-press relative isolate mx-4 flex w-[calc(100%-2rem)] cursor-pointer items-center gap-4 overflow-hidden rounded-card bg-sign px-5 py-5 text-left text-on-sign"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[30px] leading-[0.95] font-bold">Import a confirmation</span>
          <span className="mt-1.5 block text-[15px] leading-snug font-semibold opacity-75">Screenshot, PDF or email</span>
        </span>
        <span aria-hidden="true" className="inline-flex h-13 w-13 shrink-0 items-center justify-center rounded-[3px] bg-on-sign text-sign">
          <SignArrow size={26} className="ck-key-arrow" />
        </span>
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
      <p className="ck-h2 px-5 pt-9 pb-1">Or type it in</p>
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
          spellCheck
          autoCorrect="on"
          autoCapitalize="sentences"
          placeholder="Rome via London"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={tried && !name.trim() ? "Required." : undefined}
        />
        <div className="mt-auto pt-6 pb-[max(env(safe-area-inset-bottom),24px)]">
          <Button data-tour="bookings" type="submit" variant="primary" size="lg" block chip="arrow-right">
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
  const missing = missingDetails(trip);
  const missingCount = missing.reduce((total, issue) => total + issue.fields.length, 0);

  return (
    <div className="flex flex-1 flex-col">
      <div className="ck-rise" style={rise(0)}>
        <ImportCard />
      </div>
      <button
        type="button"
        onClick={() => setEditing({ kind: "details" })}
        style={rise(70)}
        className="ck-rise ck-press mx-4 mt-[3px] flex w-[calc(100%-2rem)] cursor-pointer items-center gap-3 rounded-card bg-plate px-5 py-4 text-left text-on-plate"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[28px] leading-none font-bold">{trip.name || "Untitled trip"}</span>
          <span className="mt-1 block text-[15px] font-medium text-on-plate-2">{trip.travelerName || "Trip details"}</span>
        </span>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[3px] bg-white/12">
          <Icon name="pencil" size={18} strokeWidth={2.25} />
        </span>
      </button>

      <section aria-label="Missing booking details" className="ck-rise mx-4 mt-[3px] flex flex-col gap-[3px]" style={rise(100)}>
        <div className={cx("flex items-center gap-3 rounded-card px-4 py-3.5", missingCount ? "bg-accent-soft" : "bg-ok-bg text-ok-fg")}>
          <Icon name={missingCount ? "circle-alert" : "circle-check"} size={22} strokeWidth={2.5} className="shrink-0" />
          <h2 className="text-[16px] leading-snug font-bold">
            {missingCount ? `${missingCount} ${missingCount === 1 ? "detail" : "details"} to add before you go` : "Booking details look complete"}
          </h2>
        </div>
        {missing.map((issue) => (
          <button
            key={`${issue.kind}:${issue.id ?? "new"}`}
            type="button"
            aria-label={`Add missing details for ${issue.label}`}
            onClick={() => setEditing({ kind: issue.kind, id: issue.id })}
            className="ck-press flex w-full cursor-pointer items-center gap-3 rounded-card bg-surface px-4 py-3.5 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold">{issue.label}</span>
              <span className="mt-0.5 block text-[14px] leading-snug text-ink-2">Missing: {issue.fields.join(", ")}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-bold">
              Add <SignArrow size={16} className="ck-key-arrow" />
            </span>
          </button>
        ))}
      </section>

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
        hint="Each gets a message ready when a flight changes."
        items={people}
        kind={PERSON}
        onAdd={() => setEditing({ kind: "person" })}
        onEdit={(id) => setEditing({ kind: "person", id })}
      />

      <div className="ck-dock ck-rise sticky bottom-0 z-20 mt-auto pt-10" style={rise(470)}>
        <div className="ck-dock-inner bg-plate px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)]">
          <Button variant="primary" size="lg" block chip="arrow-right" disabled={empty} onClick={() => router.push("/")}>
            Done
          </Button>
        </div>
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
  const displayTime = useTimeFormat();
  return (
    <section className="ck-rise flex flex-col gap-3 px-4 pt-10" style={rise(delay)}>
      <div className="flex items-center gap-3">
        <h2 className="ck-h2">{title}</h2>
        {items.length > 0 && (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] bg-key px-1.5 font-num text-[14px] leading-none font-bold text-on-key">
            {items.length}
          </span>
        )}
      </div>
      {hint && <p className="-mt-1 text-[15px] leading-snug font-medium text-ink-2">{hint}</p>}
      <div className="flex flex-col gap-[3px]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onEdit(item.id)}
            className="ck-press flex w-full cursor-pointer items-center gap-3.5 rounded-card bg-surface py-3.5 pr-4 pl-3 text-left"
          >
            <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-sunk text-ink">
              <Icon name={icon} size={20} strokeWidth={2.25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cx("block truncate", kind.mono ? "font-display text-[26px] leading-none font-bold" : "text-[17px] font-bold")}>{kind.title(item)}</span>
              <span className={cx("mt-1 block text-[14px] text-ink-2", kind.wrapSubtitle ? "break-words" : "truncate")}>
                {displayTime(kind.subtitle(item))}
              </span>
            </span>
            <SignArrow size={18} className="ck-key-arrow text-ink-2" />
          </button>
        ))}
        <button
          type="button"
          data-tour={kind.noun === "flight" ? "bookings" : undefined}
          onClick={onAdd}
          className="ck-press flex min-h-14 w-full cursor-pointer items-center gap-3.5 rounded-card bg-sunk pr-4 pl-3 text-left text-[16px] font-bold"
        >
          <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-key text-on-key">
            <Icon name="plus" size={20} strokeWidth={2.5} />
          </span>
          Add {items.length > 0 ? "another" : "a"} {kind.noun}
        </button>
      </div>
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
        <Field label="Trip name" spellCheck autoCorrect="on" autoCapitalize="sentences" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </Sheet>
  );
}
