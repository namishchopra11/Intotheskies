"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { FundsRequest } from "@/components/trip/FundsRequest";
import { BackButton, Badge, BrandMark, FLIGHT_STATUS_BADGE, Icon, SignArrow, type Tone as BadgeTone } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { lastLeg } from "@/lib/domain/impact";
import { decodeShare, type ShareSnapshot } from "@/lib/domain/shareLink";
import { formatDate, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import { flightLabel } from "@/lib/domain/text";
import { NO_NAME, connectionState, stayRisk, storyFor, type SnapConnection, type SnapFlight, type SnapStay } from "./story";

// The URL fragment never reaches a server, so it is read on the client only.
// `null` while rendering on the server, then the hash (possibly "").
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => window.location.hash;
const getServerHash = () => null;

type Flight = SnapFlight;
type Stay = SnapStay;
type Connection = SnapConnection;

export default function SharedUpdatePage() {
  const displayTime = useTimeFormat();
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const snapshot = useMemo(() => (hash === null ? undefined : decodeShare(hash)), [hash]);

  return (
    <main className="flex flex-1 flex-col">
      <div className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-3 bg-bg pt-[env(safe-area-inset-top)] pr-5 pl-4">
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
          <BackButton onlyWithHistory className="-my-2" />
          <BrandMark size={26} />
          <span className="font-display text-[24px] leading-none font-bold">Travel update</span>
        </span>
        {snapshot && (
          <span className="inline-flex items-center gap-1.5 font-num text-[15px] font-semibold text-ink-2">
            <Icon name="clock" size={16} strokeWidth={2.25} />
            {displayTime(timeOnly(snapshot.disruption.createdAt))}
          </span>
        )}
      </div>
      {snapshot === undefined ? <Loading /> : snapshot === null ? <BadLink /> : <Update s={snapshot} />}
    </main>
  );
}

type Tone = "ok" | "warn" | "bad" | "done";

/** The sign's colour, from where the journey now stands. */
function toneOf(final: Flight | undefined, c: Connection | null): Tone {
  const state = connectionState(c);
  if (!final || final.status === "cancelled" || state === "missed") return "bad";
  if (state === "unknown" || state === "tight") return "warn";
  if (final.status === "rebooked") return "done";
  if (final.original && final.original.arriveAt !== final.arriveAt) return "warn";
  return "ok";
}

function Update({ s }: { s: ShareSnapshot }) {
  const displayTime = useTimeFormat();
  // A trip imported without a passenger name has none: never start a sentence with "'s".
  const first = s.travelerName.trim().split(/\s+/)[0] || NO_NAME;
  // In the order they're flown: a trip's flights can be saved in any order.
  const flights = [...s.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
  const changed = flights.find((f) => f.id === s.disruption.flightId);
  // Where this journey ends now (on a round trip, not the flight home).
  const final = changed ? lastLeg(flights, changed) : flights.at(-1);
  const c = s.impact.connection;
  const story = storyFor(s, first, changed, final, c);
  const tone = toneOf(final, c);
  const stagger = (i: number) => ({ animationDelay: `${i * 100}ms` });
  const risks = s.impact.affectedStays
    .map((a) => s.stays.find((x) => x.id === a.stayId))
    .filter((x): x is Stay => Boolean(x));

  return (
    <div className="flex flex-1 flex-col">
      {/* The sign: who it's from, what happened, and when they land now, as big as it gets. */}
      <header
        className="ck-wipe relative isolate overflow-hidden px-5 pt-6 pb-7"
        style={{ background: `var(--field-${tone})`, color: `var(--on-field-${tone})` }}
      >
        <SignArrow aria-hidden="true" className="pointer-events-none absolute -right-[24%] -bottom-[14%] -z-10 opacity-[0.13]" size={300} />
        {s.travelerName.trim() && (
          <p className="ck-rise inline-flex items-center gap-2 text-[16px] font-bold" style={stagger(1)}>
            <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] bg-black/15 font-display text-[18px]">
              {s.travelerName.trim().charAt(0).toUpperCase()}
            </span>
            From {s.travelerName}
          </p>
        )}
        <h1 className="ck-rise mt-4 font-display text-[42px] leading-[0.95] font-bold text-balance" style={stagger(2)}>
          {displayTime(story.title)}
        </h1>
        {story.detail && (
          <p className="ck-rise mt-3 text-[17px] leading-snug font-medium opacity-85" style={stagger(3)}>
            {displayTime(story.detail)}
          </p>
        )}
        {final && final.status !== "cancelled" && <Arrival f={final} style={stagger(4)} />}
      </header>

      <Section title="Flights" style={stagger(5)}>
        <ol className="flex flex-col gap-[3px]">
          {flights.map((f) => (
            <li key={f.id}>
              <ItineraryFlight f={f} connection={c?.flightId === f.id ? c : null} />
            </li>
          ))}
        </ol>
      </Section>

      {s.stays.length > 0 && (
        <Section title="Hotel" style={stagger(6)}>
          <ul className="flex flex-col gap-[3px]">
            {s.stays.map((stay) => (
              <li key={stay.id}>
                <HotelStay stay={stay} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(risks.length > 0 || s.openTasks.length > 0) && (
        <Section title="Still sorting" style={stagger(7)}>
          <ul className="flex flex-col gap-[3px]">
            {risks.map((stay) => (
              <li key={stay.id} className="flex min-h-14 items-center gap-3 rounded-card bg-warn-bg px-4 py-3 text-[16px] font-semibold text-warn-fg">
                <Icon name="clock" size={20} strokeWidth={2.5} />
                {displayTime(stayRisk(first, stay, final, c))}
              </li>
            ))}
            {s.openTasks.map((t, i) => (
              <li key={i} className="flex min-h-14 items-center gap-3 rounded-card bg-surface px-4 py-3 text-[16px] font-medium">
                <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-[3px] border-[2.5px] border-ink-2" />
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.fundsRequest && (
        <Section title={first === NO_NAME ? "Help with costs" : `Help ${first} with costs`} style={stagger(8)}>
          <FundsRequest {...s.fundsRequest} tripName={s.tripName} travelerName={s.travelerName} />
        </Section>
      )}

      <div className="min-h-6 flex-1" aria-hidden="true" />
      {/* The close: the name returns at full width, like the sign over a terminal door. */}
      <footer className="mt-14 overflow-hidden bg-plate px-5 pt-6 pb-[max(env(safe-area-inset-bottom),20px)] text-on-plate">
        <p className="text-[15px] font-semibold text-on-plate-2">
          Snapshot from {displayTime(timeOnly(s.disruption.createdAt))} · won&apos;t update
        </p>
        <p className="mt-3 flex items-center gap-3 font-display text-[25vw] leading-[0.8] font-bold sm:text-[124px]" aria-label="Shared with Layover">
          <SignArrow aria-hidden="true" className="h-[0.7em] w-[0.7em] text-sign" />
          <span aria-hidden="true">Layover</span>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, style, children }: { title: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <section className="ck-rise flex flex-col gap-3 px-4 pt-10" style={style}>
      <h2 className="ck-h2">{title}</h2>
      {children}
    </section>
  );
}

/** When they land at their final stop, and how that moved. Same airport, so the maths is safe. */
function Arrival({ f, style }: { f: Flight; style?: CSSProperties }) {
  const displayTime = useTimeFormat();
  const was = f.original?.arriveAt;
  const delta = was ? minutesBetween(was, f.arriveAt) : 0;
  const moved = Boolean(was) && delta !== 0;
  const sameDay = was && was.slice(0, 10) === f.arriveAt.slice(0, 10);
  const [clock, meridiem] = splitClock(displayTime(timePart(f.arriveAt)));
  return (
    <section aria-label="Arrival" className="ck-rise mt-7 flex flex-wrap items-end justify-between gap-x-4 gap-y-2" style={style}>
      <div className="flex flex-col gap-1">
        <span className="text-[15px] font-bold opacity-80">
          {moved ? "New arrival" : "Arrival"} · {cityName(f.to)}
        </span>
        <span className="font-display text-[88px] leading-[0.85] font-bold">
          {clock}
          {meridiem && <span className="ml-1.5 text-[0.36em]">{meridiem}</span>}
        </span>
      </div>
      {moved && was && (
        <div className="flex flex-col items-end gap-1.5 pb-1">
          <span className="font-display text-[22px] leading-none font-bold line-through decoration-[3px] opacity-70">
            <span className="sr-only">was </span>
            {displayTime(sameDay ? timePart(was) : `${formatDate(was)} ${timePart(was)}`)}
          </span>
          <span className="rounded-[3px] bg-black/15 px-2 py-1 font-num text-[15px] leading-none font-bold">
            {delta > 0 ? "+" : "−"}
            {formatDuration(delta)}
          </span>
        </div>
      )}
    </section>
  );
}

function flightBadge(f: Flight, connection: Connection | null): { tone: BadgeTone; label: string } {
  const state = connectionState(connection);
  if (state === "unknown") return { tone: "warn", label: "At risk" };
  if (state === "missed") return { tone: "bad", label: "Likely missed" };
  if (state === "tight") return { tone: "warn", label: "Tight" };
  if (f.status === "rebooked") return { tone: "done", label: "Confirmed" };
  return FLIGHT_STATUS_BADGE[f.status];
}

function ItineraryFlight({ f, connection }: { f: Flight; connection: Connection | null }) {
  const displayTime = useTimeFormat();
  const b = flightBadge(f, connection);
  return (
    <div className="flex flex-col gap-2 rounded-card bg-surface px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-display text-[28px] leading-none font-bold">
          {f.from}
          <SignArrow size={18} className="opacity-60" />
          {f.to}
        </p>
        <Badge tone={b.tone}>{b.label}</Badge>
      </div>
      <p className="text-[15px] font-medium text-ink-2">
        {cityName(f.from)} to {cityName(f.to)} · <span className="whitespace-nowrap">{flightLabel(f.flightNumber)}</span>
      </p>
      {f.status === "cancelled" ? (
        <p className="text-[16px] font-semibold text-bad-fg">Waiting for a new flight</p>
      ) : (
        <p className="font-num text-[20px] font-bold">
          {displayTime(timePart(f.departAt))} – {displayTime(timePart(f.arriveAt))}
        </p>
      )}
      {f.bookingRef && (
        <p className="text-[14px] text-ink-2">
          Ref <span className="font-num font-bold text-ink">{f.bookingRef}</span>
        </p>
      )}
    </div>
  );
}

function HotelStay({ stay }: { stay: Stay }) {
  const displayTime = useTimeFormat();
  return (
    <div className="flex flex-col gap-1.5 rounded-card bg-surface px-4 py-4">
      <p className="font-display text-[26px] leading-none font-bold">{stay.name}</p>
      <p className="text-[15px] text-ink-2">{stay.address}</p>
      <p className="text-[16px] font-semibold">
        {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
      </p>
      {stay.latestCheckIn && (
        <p className="text-[15px] text-ink-2">
          Desk until <span className="font-num font-bold text-ink">{displayTime(stay.latestCheckIn)}</span>
        </p>
      )}
      {stay.confirmation && (
        <p className="text-[14px] text-ink-2">
          Ref <span className="font-num font-bold text-ink">{stay.confirmation}</span>
        </p>
      )}
    </div>
  );
}

/** "6:00 PM" -> ["6:00", "PM"]; "18:00" -> ["18:00", ""]. */
function splitClock(text: string): [string, string] {
  const m = text.match(/^(.*?)\s?(AM|PM)$/);
  return m ? [m[1], m[2]] : [text, ""];
}

// createdAt is a real ISO timestamp, so it is shown in the reader's own time.
function timeOnly(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "earlier";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function BadLink() {
  return (
    <div className="ck-wipe px-5 pt-7 pb-8" style={{ background: "var(--field-bad)", color: "var(--on-field-bad)" }}>
      <Icon name="link" size={28} strokeWidth={2.5} />
      <h1 className="mt-4 font-display text-[52px] leading-[0.9] font-bold">This link is broken.</h1>
      <p className="mt-3 text-[17px] font-medium">Ask for it again.</p>
    </div>
  );
}

function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading the update</span>
      <div className="h-[340px] animate-pulse bg-sunk" />
      <div className="mx-4 mt-10 h-8 w-40 animate-pulse rounded-card bg-sunk" />
      <div className="mx-4 mt-3 h-36 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}
