"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import { useMemo, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { FundsRequest } from "@/components/trip/FundsRequest";
import { BackButton, Badge, BrandMark, Card, FLIGHT_STATUS_BADGE, Icon, type Tone } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { lastLeg } from "@/lib/domain/impact";
import { decodeShare, type ShareSnapshot } from "@/lib/domain/shareLink";
import { formatDate, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import { flightLabel } from "@/lib/domain/text";
import { connectionState, stayRisk, storyFor, type SnapConnection, type SnapFlight, type SnapStay } from "./story";

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
      <div className="flex items-center justify-between gap-3 bg-band px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3 font-num text-[12px] tracking-[0.04em] text-on-band uppercase">
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
          <BackButton onlyWithHistory className="-my-2 text-on-band hover:bg-transparent hover:opacity-80" />
          Travel update
        </span>
        {snapshot && <span className="text-signal">{displayTime(timeOnly(snapshot.disruption.createdAt))}</span>}
      </div>
      {snapshot === undefined ? <Loading /> : snapshot === null ? <BadLink /> : <Update s={snapshot} />}
    </main>
  );
}

function Update({ s }: { s: ShareSnapshot }) {
  const displayTime = useTimeFormat();
  // A trip imported without a passenger name has none: never start a sentence with "'s".
  const first = s.travelerName.trim().split(/\s+/)[0] || "Your traveler";
  // In the order they're flown: a trip's flights can be saved in any order.
  const flights = [...s.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
  const changed = flights.find((f) => f.id === s.disruption.flightId);
  // Where this journey ends now (on a round trip, not the flight home).
  const final = changed ? lastLeg(flights, changed) : flights.at(-1);
  const c = s.impact.connection;
  const story = storyFor(s, first, changed, final, c);
  const stagger = (i: number) => ({ animationDelay: `${i * 110}ms` });
  const risks = s.impact.affectedStays
    .map((a) => s.stays.find((x) => x.id === a.stayId))
    .filter((x): x is Stay => Boolean(x));

  return (
    <div className="flex flex-1 flex-col">
      <header className="ck-rise flex flex-col gap-2.5 px-5 pt-7 pb-5">
        {s.travelerName.trim() && <p className="text-[15px] text-ink-2">From {s.travelerName}</p>}
        <h1 className="text-[32px] leading-[1.12] font-semibold tracking-[-0.01em]">
          {displayTime(story.title)}
        </h1>
        {story.detail && <p className="leading-normal text-ink-body">{displayTime(story.detail)}</p>}
      </header>

      {final && final.status !== "cancelled" && <ArrivalCard f={final} style={stagger(1)} />}

      <Section title="Flights" className="pt-7" style={stagger(2)}>
        <ol className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
          {flights.map((f) => (
            <li key={f.id}>
              <ItineraryFlight f={f} connection={c?.flightId === f.id ? c : null} />
            </li>
          ))}
        </ol>
      </Section>

      {s.stays.length > 0 && (
        <Section title="Hotel" className="pt-6" style={stagger(3)}>
          <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
            {s.stays.map((stay) => (
              <li key={stay.id}>
                <HotelStay stay={stay} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(risks.length > 0 || s.openTasks.length > 0) && (
        <Section title="Still sorting" className="pt-6" gap="gap-2.5" style={stagger(4)}>
          <ul className="flex flex-col">
            {risks.map((stay) => (
              <li key={stay.id} className="flex min-h-13 items-center gap-3 border-b border-line py-2 text-[15px]">
                <Icon name="clock" size={20} strokeWidth={2.5} className="text-warn-fg" />
                {displayTime(stayRisk(first, stay, final, c))}
              </li>
            ))}
            {s.openTasks.map((t, i) => (
              <li key={i} className="flex min-h-13 items-center gap-3 border-b border-line py-2 text-[15px]">
                <Icon name="circle-dashed" size={20} className="text-ink-2" />
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {s.fundsRequest && (
        <Section title={`Help ${first} with costs`} className="pt-6" style={stagger(5)}>
          <FundsRequest {...s.fundsRequest} tripName={s.tripName} travelerName={s.travelerName} />
        </Section>
      )}

      <div className="min-h-6 flex-1" aria-hidden="true" />
      <footer className="flex flex-col gap-3.5 border-t border-line px-5 pt-6 pb-[max(env(safe-area-inset-bottom),28px)]">
        <p className="text-[13px] text-ink-2">
          Snapshot from {displayTime(timeOnly(s.disruption.createdAt))}. Won&apos;t update.
        </p>
        <span className="inline-flex items-center gap-2 text-[13px] text-ink-2">
          <BrandMark size={18} className="rounded-[3px]" />
          Shared with Layover
        </span>
      </footer>
    </div>
  );
}

function Section({
  title,
  className,
  gap = "gap-3",
  style,
  children,
}: {
  title: string;
  className?: string;
  gap?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className={`ck-rise flex flex-col px-5 ${gap} ${className ?? ""}`} style={style}>
      <h2 className="ck-label">{title}</h2>
      {children}
    </section>
  );
}

/** The yellow card: when they land at their final stop, and how that moved. Same airport, so the maths is safe. */
function ArrivalCard({ f, style }: { f: Flight; style?: CSSProperties }) {
  const displayTime = useTimeFormat();
  const was = f.original?.arriveAt;
  const delta = was ? minutesBetween(was, f.arriveAt) : 0;
  const moved = Boolean(was) && delta !== 0;
  const sameDay = was && was.slice(0, 10) === f.arriveAt.slice(0, 10);
  return (
    <section
      aria-label="Arrival"
      className="ck-rise mx-4 flex flex-wrap items-end justify-between gap-4 rounded-card bg-signal p-[18px] text-on-signal"
      style={style}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-num text-[12px] font-semibold tracking-[0.06em] uppercase">
          {moved ? "New arrival" : "Arrival"} · {f.to}
        </span>
        <span className="font-num text-[36px] leading-none font-semibold tabular-nums">{displayTime(timePart(f.arriveAt))}</span>
      </div>
      {moved && was && (
        <div className="flex flex-col items-end gap-0.5 text-[14px]">
          <span className="line-through">
            was {displayTime(sameDay ? timePart(was) : `${formatDate(was)} ${timePart(was)}`)}
          </span>
          <span className="font-semibold">
            {delta > 0 ? "+" : "−"}
            {formatDuration(delta)}
          </span>
        </div>
      )}
    </section>
  );
}

function flightBadge(f: Flight, connection: Connection | null): { tone: Tone; label: string } {
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
    <div className="flex flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 text-[14px] text-ink-2">
          {cityName(f.from)} – {cityName(f.to)} · <span className="whitespace-nowrap">{flightLabel(f.flightNumber)}</span>
        </p>
        <Badge tone={b.tone}>{b.label}</Badge>
      </div>
      {f.status === "cancelled" ? (
        <p className="text-[15px] text-ink-2">Waiting for a new flight</p>
      ) : (
        <p className="font-num text-[20px] font-medium tabular-nums">
          {displayTime(timePart(f.departAt))} – {displayTime(timePart(f.arriveAt))}
        </p>
      )}
      {f.bookingRef && (
        <p className="text-[13px] text-ink-2">
          Ref <span className="font-num font-medium text-ink">{f.bookingRef}</span>
        </p>
      )}
    </div>
  );
}

function HotelStay({ stay }: { stay: Stay }) {
  const displayTime = useTimeFormat();
  return (
    <div className="flex flex-col gap-1.5 px-4 py-3.5">
      <p className="text-[17px] leading-snug font-medium">{stay.name}</p>
      <p className="text-[14px] text-ink-2">{stay.address}</p>
      <p className="text-[15px]">
        {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
      </p>
      {stay.latestCheckIn && (
        <p className="text-[14px] text-ink-2">
          Desk until <span className="font-num font-medium text-ink">{displayTime(stay.latestCheckIn)}</span>
        </p>
      )}
      {stay.confirmation && (
        <p className="text-[13px] text-ink-2">
          Ref <span className="font-num font-medium text-ink">{stay.confirmation}</span>
        </p>
      )}
    </div>
  );
}

// createdAt is a real ISO timestamp, so it is shown in the reader's own time.
function timeOnly(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "earlier";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function BadLink() {
  return (
    <div className="ck-rise px-4 pt-6">
      <Card className="flex flex-col items-start gap-3 p-5">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-sunk text-ink-2">
          <Icon name="link" size={22} />
        </span>
        <h1 className="text-[24px] leading-tight font-semibold">This link is broken</h1>
        <p className="text-ink-2">Ask for it again.</p>
      </Card>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-5 pt-7" role="status" aria-busy="true">
      <span className="sr-only">Loading the update</span>
      <div className="h-4 w-32 animate-pulse rounded-badge bg-sunk" />
      <div className="mt-3 h-9 w-64 animate-pulse rounded-badge bg-sunk" />
      <div className="mt-6 h-24 animate-pulse rounded-card bg-sunk" />
      <div className="mt-7 h-48 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}
