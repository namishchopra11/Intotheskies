"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { triggerFlightChange } from "@/components/trip/simulateChange";
import { useSpeech } from "@/components/trip/useSpeech";
import {
  AppHeader,
  Badge,
  Button,
  CONNECTION_BADGE,
  Field,
  Icon,
  ProgressBar,
  Sheet,
  SignalBar,
  ThemeToggle,
  cx,
  type IconName,
  type Tone,
} from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { buildBriefing } from "@/lib/domain/briefing";
import { TIGHT_CONNECTION_MINUTES, computeImpact, type Impact } from "@/lib/domain/impact";
import { formatDate, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import type { LoadNotice } from "@/lib/recoverTrip";
import { useStoreReady, useTripStore } from "@/lib/store";
import type { Contact, Disruption, Flight, Stay, Trip } from "@/lib/types";

const rise = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export default function TripStatusPage() {
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const loadNotice = useTripStore((s) => s.loadNotice);
  const dismissLoadNotice = useTripStore((s) => s.dismissLoadNotice);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuButton = (
    <button
      type="button"
      aria-label="Trip menu"
      onClick={() => setMenuOpen(true)}
      className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-sunk"
    >
      <Icon name="menu" size={22} />
    </button>
  );

  return (
    <main className="flex flex-1 flex-col">
      <AppHeader action={menuButton} />
      {ready && loadNotice && <LoadNoticeBar notice={loadNotice} onDismiss={dismissLoadNotice} />}
      {!ready ? <Loading /> : trip ? <Status trip={trip} /> : <NoTrip />}
      <TripMenu open={menuOpen} onClose={() => setMenuOpen(false)} hasTrip={Boolean(trip)} />
    </main>
  );
}

function Status({ trip }: { trip: Trip }) {
  const disruption = trip.disruptions[trip.disruptions.length - 1];
  const changed = disruption && trip.flights.find((f) => f.id === disruption.flightId);
  const impact = disruption && changed ? computeImpact(trip, changed.id) : null;
  const first = trip.flights[0];
  const last = trip.flights[trip.flights.length - 1];
  const eyebrow = [
    trip.travelerName,
    first && last && `${cityName(first.from)} → ${cityName(last.to)}`,
    first && formatDate(first.departAt),
  ]
    .filter(Boolean)
    .join(" · ");

  if (!disruption || !changed || !impact) return <OnTrack trip={trip} eyebrow={eyebrow} />;

  return (
    <>
      <SignalBar key={`band-${disruption.id}`} aside={`Updated ${clock(disruption.createdAt)}`}>
        {bannerFor(disruption, changed)}
      </SignalBar>

      <section key={`head-${disruption.id}`} className="ck-rise flex flex-col gap-2 px-5 pt-[22px] pb-[18px]" style={rise(100)}>
        <p className="text-[14px] text-ink-2">{eyebrow}</p>
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em]">
          {headlineFor(disruption, changed, impact)}
        </h1>
      </section>

      {trip.flights.length > 0 && (
        <section
          aria-label="Flights"
          className="ck-rise mx-4 flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface"
          style={rise(220)}
        >
          {trip.flights.flatMap((f) => flightRows(trip, f, impact))}
        </section>
      )}

      <SortingItOut disruption={disruption} impact={impact} contacts={trip.contacts} />

      <Actions trip={trip} disruption={disruption} />

      <StaysSection stays={trip.stays} delay={520} />
      <ContactsSection contacts={trip.contacts} delay={600} />
      <div className="pb-[max(env(safe-area-inset-bottom),26px)]" />
    </>
  );
}

/* ---------- Flights ---------- */

type Row = {
  key: string;
  number: string;
  badge: { tone: Tone; label: string };
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  struck?: boolean;
  isNew?: boolean;
};

function latestFor(trip: Trip, flightId: string): Disruption | undefined {
  return trip.disruptions.filter((d) => d.flightId === flightId).at(-1);
}

/** One row per flight; a replaced flight shows its old booking struck through above the new one. */
function flightRows(trip: Trip, f: Flight, impact: Impact | null) {
  const d = latestFor(trip, f.id);
  const o = f.original;
  const rows: Row[] = [];
  const base = { from: f.from, to: f.to };

  const replaced = o && d && (d.type === "missed_connection" || d.type === "cancellation");
  if (replaced) {
    rows.push({
      ...base,
      key: `${f.id}-was`,
      number: o.flightNumber,
      badge: d.type === "missed_connection" ? { tone: "bad", label: "Missed" } : { tone: "bad", label: "Cancelled" },
      departAt: o.departAt,
      arriveAt: o.arriveAt,
      struck: true,
    });
    if (f.status === "rebooked") {
      rows.push({ ...base, key: f.id, number: withSeat(f), badge: { tone: "done", label: "Rebooked" }, departAt: f.departAt, arriveAt: f.arriveAt, isNew: true });
    }
  } else {
    const c = impact?.connection?.flightId === f.id ? impact.connection : null;
    let badge: Row["badge"];
    if (c?.status === "missed" && c.minutesAfter === null) badge = { tone: "warn", label: "At risk" };
    else if (c?.status === "missed") badge = { tone: "bad", label: "Likely missed" };
    else if (c?.status === "tight") badge = { tone: "warn", label: "Tight connection" };
    else if (f.status === "delayed") {
      const late = o ? minutesBetween(o.arriveAt, f.arriveAt) : 0;
      badge = { tone: "warn", label: late > 0 ? `Delayed ${formatDuration(late)}` : "Delayed" };
    } else if (f.status === "rebooked") badge = { tone: "done", label: "Rebooked" };
    else if (f.status === "cancelled") badge = { tone: "bad", label: "Cancelled" };
    else badge = { tone: "ok", label: "On time" };
    const isNew = f.status === "rebooked";
    rows.push({ ...base, key: f.id, number: isNew ? withSeat(f) : f.flightNumber, badge, departAt: f.departAt, arriveAt: f.arriveAt, struck: f.status === "cancelled", isNew });
  }

  return rows.map((r) => <FlightRow key={r.key} r={r} />);
}

function withSeat(f: Flight) {
  return f.seat ? `${f.flightNumber} · Seat ${f.seat}` : f.flightNumber;
}

function FlightRow({ r }: { r: Row }) {
  return (
    <div className={cx("flex flex-col gap-2 px-4 py-3.5", r.isNew && "bg-surface-2")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-num text-[13px] text-ink-2">{r.number}</span>
        <Badge tone={r.badge.tone}>{r.badge.label}</Badge>
      </div>
      <p
        className={cx(
          "flex flex-wrap items-baseline gap-x-2.5 font-num tabular-nums",
          r.isNew ? "text-[24px] font-semibold" : "text-[20px] font-medium",
          r.struck && "text-ink-faint line-through",
        )}
      >
        {r.struck && <span className="sr-only">Was </span>}
        <span>
          {r.from} {timePart(r.departAt)}
        </span>
        <span className={r.struck ? undefined : "text-ink-faint"} aria-hidden="true">
          →
        </span>
        <span className="sr-only">to</span>
        <span>
          {r.to} {timePart(r.arriveAt)}
        </span>
      </p>
    </div>
  );
}

/* ---------- Checklist ---------- */

function SortingItOut({
  disruption,
  impact,
  contacts,
}: {
  disruption: Disruption;
  impact: Impact;
  contacts: Contact[];
}) {
  const toggleTask = useTripStore((s) => s.toggleTask);
  const removeTask = useTripStore((s) => s.removeTask);
  const total = disruption.tasks.length;
  const done = disruption.tasks.filter((t) => t.done).length;
  // Only a tight connection is "Tight"; a missed or unknown one is simply at risk.
  const riskLabel = impact.connection?.status === "tight" ? "Tight" : "At risk";
  const risks = impact.affectedStays.map((a) => ({ id: a.stayId, text: a.reason }));

  return (
    <section className="ck-rise flex flex-col px-5 pt-[22px]" style={rise(340)}>
      <ProgressBar label="Sorting it out" value={done} max={total} />
      <ul className="mt-1 flex flex-col">
        {risks.map((r) => (
          <li key={r.id} className="flex min-h-13 items-center gap-3 border-b border-line py-2">
            <Icon name="clock" size={20} strokeWidth={2.5} className="text-warn-fg" />
            <span className="flex-1 text-[15px]">{r.text}</span>
            <span className="text-[13px] font-semibold text-warn-fg">{riskLabel}</span>
          </li>
        ))}
        {disruption.tasks.map((t) => {
          const contact = t.contactId ? contacts.find((c) => c.id === t.contactId) : undefined;
          return (
            <li key={t.id} className="flex items-center gap-1 border-b border-line">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                onClick={() => toggleTask(disruption.id, t.id)}
                data-done={t.done}
                className="flex min-h-13 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2 text-left"
              >
                <TaskCircle />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-[15px]">
                  <span className="ck-task-text">{t.title}</span>
                  {t.detail && <span className="text-[14px] leading-snug text-ink-2">{t.detail}</span>}
                </span>
                <span className={cx("ck-task-state text-[13px] font-semibold", t.done ? "text-ok-fg" : "text-ink-2")}>
                  {t.done ? "Done" : "To do"}
                </span>
              </button>
              {contact?.phone && <CallLink name={contact.name} phone={contact.phone} />}
              {t.source === "custom" && (
                <button
                  type="button"
                  aria-label={`Remove task: ${t.title}`}
                  onClick={() => removeTask(disruption.id, t.id)}
                  className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-2 hover:bg-sunk"
                >
                  <Icon name="x" size={18} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <AddTask disruptionId={disruption.id} />
    </section>
  );
}

function AddTask({ disruptionId }: { disruptionId: string }) {
  const addTask = useTripStore((s) => s.addTask);
  const [title, setTitle] = useState("");

  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const text = title.trim();
        if (!text) return;
        addTask(disruptionId, text);
        setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Add your own task"
        placeholder="Add your own task"
        enterKeyHint="done"
        className="min-h-12 min-w-0 flex-1 rounded-control border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <Button type="submit" variant="secondary" size="md" icon="plus" disabled={!title.trim()} aria-label="Add task" />
    </form>
  );
}

function CallLink({ name, phone }: { name: string; phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      aria-label={`Call ${name}`}
      className="ck-key ck-key-secondary inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border-2 border-ink bg-surface text-ink"
    >
      <Icon name="phone" size={18} />
    </a>
  );
}

/**
 * A dashed ring and a filled disc stacked in one spot. The row's data-done decides which
 * shows, so both ticking and unticking animate (see .ck-task-* in globals.css).
 */
function TaskCircle() {
  return (
    <span aria-hidden="true" className="relative inline-flex h-[22px] w-[22px] shrink-0">
      <Icon name="circle-dashed" size={22} className="ck-task-ring absolute inset-0 text-ink-2" />
      <span className="ck-task-disc absolute inset-0 inline-flex items-center justify-center rounded-full bg-meter text-bg">
        <Icon name="check" size={14} strokeWidth={3.5} />
      </span>
    </span>
  );
}

/* ---------- Actions ---------- */

function Actions({ trip, disruption }: { trip: Trip; disruption: Disruption | undefined }) {
  const { supported, speaking, speak, stop } = useSpeech();
  if (!disruption) return null;

  return (
    <div
      className="ck-rise flex flex-col gap-3.5 px-4 pt-6"
      style={rise(460)}
    >
      <Button href={`/share/${disruption.id}`} variant="primary" size="lg" block chip="arrow-right">
        Share the new plan
      </Button>
      {supported && (
        <Button
          variant="secondary"
          block
          chip={speaking ? "x" : "listen"}
          onClick={() => (speaking ? stop() : speak(buildBriefing(trip, disruption.id)))}
          className="text-base"
        >
          {speaking ? "Stop listening" : "Listen to summary"}
        </Button>
      )}
    </div>
  );
}

/* ---------- On track: nothing has changed yet ---------- */

function OnTrack({ trip, eyebrow }: { trip: Trip; eyebrow: string }) {
  const count = trip.flights.length;
  const tight = tightLayover(trip);
  return (
    <>
      <SignalBar
        aside={
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="ck-pulse h-2 w-2 rounded-full bg-current" />
            Simulated feed
          </span>
        }
      >
        {tight ? "On time · tight connection" : "All flights on time"}
      </SignalBar>

      <section className="ck-rise flex flex-col gap-2 px-5 pt-[22px] pb-[18px]" style={rise(100)}>
        <p className="text-[14px] text-ink-2">{eyebrow}</p>
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em]">
          {tight
            ? tight.gap < 0
              ? `Flights are on time, but your ${cityName(tight.airport)} connection doesn't leave enough time.`
              : `Flights are on time, but ${formatDuration(tight.gap)} in ${cityName(tight.airport)} is tight.`
            : "Your trip is on track. Nothing to do right now."}
        </h1>
      </section>

      <section
        aria-label="Flights"
        className="ck-rise mx-4 flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface"
        style={rise(220)}
      >
        {trip.flights.map((f, i) => {
          const next = trip.flights[i + 1];
          return (
            <div key={f.id} className="flex flex-col divide-y divide-line-soft">
              {flightRows(trip, f, null)}
              {next && <ConnectionRow arrive={f} depart={next} />}
            </div>
          );
        })}
      </section>

      <StaysSection stays={trip.stays} delay={340} />
      <ContactsSection contacts={trip.contacts} delay={420} />

      <div className="ck-rise mt-auto px-5 pt-8 pb-[max(env(safe-area-inset-bottom),26px)]" style={rise(500)}>
        <p className="flex items-start gap-2.5 border-t border-line pt-4 text-[13px] leading-snug text-ink-2">
          <span aria-hidden="true" className="ck-pulse mt-1.5 h-2 w-2 shrink-0 rounded-full bg-current text-ok" />
          Following {count === 1 ? "your flight" : `all ${count} flights`} in a simulated airline
          feed; this demo has no live flight data. If the feed changes anything, your plan updates
          itself and you&apos;ll get a notification.
        </p>
      </div>
    </>
  );
}

/* ---------- Stays and contacts (shown in every state) ---------- */

function StaysSection({ stays, delay }: { stays: Stay[]; delay: number }) {
  if (stays.length === 0) return null;
  return (
    <Section title="Where you're staying" delay={delay}>
      {stays.map((s) => (
        <div key={s.id} className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-[14px] text-ink-2">{s.address}</p>
            </div>
            {s.phone && <CallLink name={s.name} phone={s.phone} />}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="ck-label">Check-in</dt>
              <dd className="mt-0.5 font-num text-[17px] font-medium tabular-nums">
                {timePart(s.checkIn)} <span className="font-sans text-[14px] font-normal text-ink-2">{formatDate(s.checkIn)}</span>
              </dd>
            </div>
            {s.latestCheckIn && (
              <div>
                <dt className="ck-label">Front desk until</dt>
                <dd className="mt-0.5 font-num text-[17px] font-medium tabular-nums">{s.latestCheckIn}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </Section>
  );
}

function ContactsSection({ contacts, delay }: { contacts: Contact[]; delay: number }) {
  if (contacts.length === 0) return null;
  return (
    <Section title="If you need them" delay={delay}>
      <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
            <span className="min-w-0 flex-1">
              <span className="block font-num text-[11px] font-semibold tracking-[0.06em] text-ink-2 uppercase">{c.kind}</span>
              <span className="block truncate text-[15px] font-medium">{c.name}</span>
              {c.notes && <span className="mt-0.5 block text-[13px] leading-snug text-ink-2">{c.notes}</span>}
              {c.url && isWebUrl(c.url) && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex min-h-8 items-center text-[13px] font-medium underline underline-offset-4"
                >
                  {new URL(c.url).hostname.replace(/^www\./, "")}
                </a>
              )}
            </span>
            {c.phone && <CallLink name={c.name} phone={c.phone} />}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Only http(s) links are rendered, so a hand-edited saved value can't smuggle in another scheme. */
function isWebUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** The first layover that is already short or negative as booked, measured at its one airport. */
function tightLayover(trip: Trip): { gap: number; airport: string } | null {
  for (let i = 0; i + 1 < trip.flights.length; i++) {
    const gap = minutesBetween(trip.flights[i].arriveAt, trip.flights[i + 1].departAt);
    if (gap < TIGHT_CONNECTION_MINUTES) return { gap, airport: trip.flights[i + 1].from };
  }
  return null;
}

/** The layover between two flights, measured at the one airport they share. */
function ConnectionRow({ arrive, depart }: { arrive: Flight; depart: Flight }) {
  const gap = minutesBetween(arrive.arriveAt, depart.departAt);
  const status = gap < 0 ? "missed" : gap < TIGHT_CONNECTION_MINUTES ? "tight" : "ok";
  const badge = CONNECTION_BADGE[status];
  return (
    <div className="flex items-center justify-between gap-3 bg-surface-2 px-4 py-2.5">
      <span className="flex flex-col">
        <span className="ck-label">Change planes · {depart.from}</span>
        <span className="text-[14px]">
          {gap < 0 ? (
            <>
              Missed by <span className="font-num font-medium tabular-nums">{formatDuration(gap)}</span> in{" "}
              {cityName(depart.from)}
            </>
          ) : (
            <>
              <span className="font-num font-medium tabular-nums">{formatDuration(gap)}</span> in{" "}
              {cityName(depart.from)}
            </>
          )}
        </span>
      </span>
      <Badge tone={badge.tone}>{badge.label}</Badge>
    </div>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: ReactNode }) {
  return (
    <section className="ck-rise flex flex-col gap-2.5 px-4 pt-7" style={rise(delay)}>
      <h2 className="ck-label px-1">{title}</h2>
      {children}
    </section>
  );
}

/* ---------- No trip yet ---------- */

const HOW_IT_WORKS: { n: string; icon: IconName; title: string; body: string }[] = [
  { n: "01", icon: "plane", title: "We watch", body: "Your flights, through a simulated airline feed in this demo." },
  { n: "02", icon: "checks", title: "Your plan rebuilds", body: "A delay or cancellation updates your plan and checklist on its own." },
  { n: "03", icon: "share", title: "Everyone hears", body: "One tap sends the new plan to whoever's waiting for you." },
];

function NoTrip() {
  const loadSampleTrip = useTripStore((s) => s.loadSampleTrip);
  return (
    <div className="flex flex-1 flex-col">
      <SignalBar aside="Nothing to watch">No trip yet</SignalBar>

      <section className="ck-rise flex flex-col gap-2 px-5 pt-[22px] pb-[18px]" style={rise(100)}>
        <p className="text-[14px] text-ink-2">Delays · Cancellations · Missed connections</p>
        <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.01em]">
          Flights change. Your plan keeps up.
        </h1>
      </section>

      <ol
        aria-label="How it works"
        className="ck-rise mx-4 flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface"
        style={rise(220)}
      >
        {HOW_IT_WORKS.map((s) => (
          <li key={s.n} className="flex items-start gap-3.5 px-4 py-3.5">
            <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] bg-signal text-on-signal">
              <Icon name={s.icon} size={20} strokeWidth={2.25} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="font-num text-[13px] text-ink-2">{s.n}</span>
              <span className="text-[17px] leading-tight font-semibold">{s.title}</span>
              <span className="text-[14px] leading-snug text-ink-2">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="ck-rise mt-auto flex flex-col gap-3 px-4 pt-8 pb-[max(env(safe-area-inset-bottom),26px)]" style={rise(340)}>
        <p className="mx-1 mb-1 flex items-start gap-2 text-[13px] leading-[1.4] text-ink-2">
          <Icon name="lock" size={16} className="mt-px" />
          Everything stays on this phone. No account, nothing uploaded.
        </p>
        <Button variant="primary" size="lg" block chip="arrow-right" onClick={loadSampleTrip}>
          Try the sample trip
        </Button>
        <p className="text-center font-num text-[12px] tracking-[0.04em] text-ink-2 uppercase">
          San Francisco → London → Rome
        </p>
      </div>
    </div>
  );
}

function TripMenu({ open, onClose: closeSheet, hasTrip }: { open: boolean; onClose: () => void; hasTrip: boolean }) {
  const loadSampleTrip = useTripStore((s) => s.loadSampleTrip);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const pristine = useTripStore((s) => Boolean(s.trip && s.trip.disruptions.length === 0));
  const [alerts, setAlerts] = useState<NotificationPermission | "unsupported">("unsupported");
  // Restarting or clearing throws the trip away, so each asks once first.
  const [confirming, setConfirming] = useState<"restart" | "clear" | null>(null);
  const onClose = () => {
    setConfirming(null);
    closeSheet();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAlerts("Notification" in window ? Notification.permission : "unsupported");
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Trip menu">
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <span className="ck-label">Appearance</span>
          <ThemeToggle />
        </div>
        {hasTrip && <PayoutAddress />}
        <div className="flex flex-col gap-3">
          {alerts === "default" && (
            <Button
              variant="secondary"
              block
              icon="message"
              onClick={async () => setAlerts(await Notification.requestPermission())}
            >
              Allow phone notifications
            </Button>
          )}
          {pristine && (
            <Button
              variant="secondary"
              block
              onClick={() => {
                triggerFlightChange();
                onClose();
              }}
            >
              Trigger the change now
            </Button>
          )}
          {confirming ? (
            <Confirm
              title={confirming === "restart" ? "Restart the demo trip?" : "Clear this trip?"}
              body={
                confirming === "restart"
                  ? "This replaces your trip with the sample trip. Ticked tasks and a saved Solana address are lost."
                  : "This removes the trip, its checklist and a saved Solana address from this phone."
              }
              confirmLabel={confirming === "restart" ? "Restart" : "Clear trip"}
              danger={confirming === "clear"}
              onCancel={() => setConfirming(null)}
              onConfirm={() => {
                if (confirming === "restart") loadSampleTrip();
                else resetTrip();
                onClose();
              }}
            />
          ) : (
            <>
              <Button
                variant="secondary"
                block
                onClick={() => {
                  if (hasTrip) {
                    setConfirming("restart");
                  } else {
                    loadSampleTrip();
                    onClose();
                  }
                }}
              >
                {hasTrip ? "Restart the demo trip" : "Load the sample trip"}
              </Button>
              {hasTrip && (
                <Button variant="danger" block onClick={() => setConfirming("clear")}>
                  Clear this trip
                </Button>
              )}
            </>
          )}
        </div>
        {hasTrip && (
          <p className="text-[13px] leading-snug text-ink-2">
            Restarting puts the trip back on time. A few seconds later the simulated airline feed
            changes it, and you get the notification again.
          </p>
        )}
      </div>
    </Sheet>
  );
}

function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-3 rounded-card border border-line-strong p-4">
      <p className="font-semibold">{title}</p>
      <p className="text-[14px] leading-snug text-ink-2">{body}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onCancel} autoFocus>
          Keep it
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/** Where an optional "Send help" request on a shared update pays out. Empty clears it. */
function PayoutAddress() {
  const saved = useTripStore((s) => s.trip?.payoutAddress);
  const setPayoutAddress = useTripStore((s) => s.setPayoutAddress);
  const [value, setValue] = useState(saved ?? "");
  const [error, setError] = useState<string>();
  const dirty = value.trim() !== (saved ?? "");
  return (
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
        hint="Lets people you share an update with send you USDC on Solana's test network (devnet). It stays on this device until you add a Send help button to a shared link."
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
      <Button type="submit" variant="secondary" block disabled={!dirty} icon={!dirty && saved ? "check" : undefined}>
        {!dirty && saved ? "Saved" : saved && value.trim() === "" ? "Remove address" : "Save address"}
      </Button>
    </form>
  );
}

/** Said once after a saved trip could not be fully read, instead of silently showing "no trip". */
function LoadNoticeBar({ notice, onDismiss }: { notice: LoadNotice; onDismiss: () => void }) {
  const text =
    notice.kind === "recovered"
      ? `Your saved trip came from an older version of the app. ${notice.dropped} ${
          notice.dropped === 1 ? "item couldn't be read and was" : "items couldn't be read and were"
        } left out. The rest is here.`
      : "Your saved trip couldn't be read, so it was cleared. It may have come from an older version of the app. You can load the sample trip again.";
  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-start gap-2.5 rounded-card border border-line-strong bg-warn-bg py-2.5 pr-1 pl-3.5 text-[14px] leading-snug text-warn-fg"
    >
      <Icon name="circle-alert" size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1 py-0.5">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this message"
        className="-my-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control hover:bg-sunk"
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-5 pt-6" role="status" aria-busy="true">
      <span className="sr-only">Loading your trip</span>
      <div className="h-4 w-52 animate-pulse rounded-badge bg-sunk" />
      <div className="mt-3 h-16 w-full animate-pulse rounded-badge bg-sunk" />
      <div className="mt-5 h-56 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}

/* ---------- Words ---------- */

function bannerFor(d: Disruption, f: Flight): string {
  if (f.status === "rebooked") return "New plan ready";
  if (d.type === "delay") return "Flight delayed";
  return "Needs a new flight";
}

function headlineFor(d: Disruption, f: Flight, impact: Impact): string {
  const instead = `You're on the ${timePart(f.departAt)} instead.`;
  const rebooked = f.status === "rebooked";
  const was = f.original?.flightNumber ?? f.flightNumber;
  switch (d.type) {
    case "missed_connection":
      return `${cityName(f.from)} connection missed. ${rebooked ? instead : "You need a new flight."}`;
    case "cancellation":
      return `${was} was cancelled. ${rebooked ? instead : "You need a new flight."}`;
    case "rebooked":
      return `Your flight changed. ${instead}`;
    case "delay":
    default: {
      const late = impact.delayMinutes;
      const lead = late && late > 0 ? `${f.flightNumber} is ${formatDuration(late)} late.` : `${f.flightNumber} has new times.`;
      const c = impact.connection;
      if (!c) return lead;
      if (c.status === "missed") return `${lead} You'll likely miss your connection.`;
      if (c.status === "tight") return `${lead} Your connection is now tight.`;
      return `${lead} Your connection still works.`;
    }
  }
}

// createdAt is a real ISO timestamp (when it was reported), shown in the phone's own time.
function clock(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "just now";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
