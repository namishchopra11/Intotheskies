"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CONNECTION_BADGE,
  FLIGHT_STATUS_BADGE,
  Icon,
  type IconName,
  type Tone,
} from "@/components/ui";
import { decodeShare, type ShareSnapshot } from "@/lib/domain/shareLink";
import { formatDate, formatDuration, timePart } from "@/lib/domain/time";
import { isDemoCluster } from "@/lib/solana/config";
import { buildTransferRequestUrl } from "@/lib/solana/pay";
import { copyText } from "../share/[id]/copyText";

// The URL fragment never reaches a server, so it is read on the client only.
// `null` while rendering on the server, then the hash (possibly "").
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => window.location.hash;
const getServerHash = () => null;

type Flight = ShareSnapshot["flights"][number];

export default function SharedUpdatePage() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const snapshot = useMemo(() => (hash === null ? undefined : decodeShare(hash)), [hash]);

  return (
    <main className="flex flex-1 flex-col pb-10">
      <div className="flex items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-2 text-[13px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        <span aria-hidden="true" className="inline-block h-3 w-1 rounded-full bg-signal" />
        ConnectionKeeper · Trip update
      </div>
      {snapshot === undefined ? <Loading /> : snapshot === null ? <BadLink /> : <Update s={snapshot} />}
    </main>
  );
}

function Update({ s }: { s: ShareSnapshot }) {
  const first = s.travelerName.trim().split(/\s+/)[0] || s.travelerName;
  const changed = s.flights.find((f) => f.id === s.disruption.flightId);
  const onward = s.impact.connection
    ? s.flights.find((f) => f.id === s.impact.connection!.flightId)
    : undefined;
  const headline = headlineFor(s, first, changed);

  return (
    <>
      <header className="px-4 pt-2 pb-5">
        <h1 className="text-[30px] leading-[1.12] font-semibold tracking-[-0.01em] text-balance">
          {headline.title}
        </h1>
        <p className="mt-2 text-ink-2">
          {s.travelerName} shared this update about their trip, {s.tripName}.
        </p>
        <p className="mt-1 text-[14px] text-ink-3">Sent {sentAt(s.disruption.createdAt)}</p>
      </header>

      <div className="flex flex-col gap-6 px-4">
        {changed && (
          <Section title="What changed" icon="alert">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FlightName f={changed} />
                <Badge tone={headline.tone}>{headline.badge}</Badge>
              </div>
              <ChangedTimes f={changed} />
            </Card>
          </Section>
        )}

        {s.impact.connection && onward && (
          <Section title="The connection" icon="clock">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  Changing planes at {onward.from}
                </p>
                <Badge tone={CONNECTION_BADGE[s.impact.connection.status].tone}>
                  {CONNECTION_BADGE[s.impact.connection.status].label}
                </Badge>
              </div>
              <p className="mt-2 text-ink-2">{connectionSentence(s.impact.connection, onward)}</p>
            </Card>
          </Section>
        )}

        <Section title="The plan now" icon="plane">
          <Card padding="none" as="div">
            <ol className="divide-y divide-line">
              {s.flights.map((f) => (
                <li key={f.id} className="p-4">
                  <ItineraryFlight f={f} highlight={f.id === s.disruption.flightId} />
                </li>
              ))}
            </ol>
          </Card>
          <p className="mt-2 text-[13px] text-ink-3">All times are local to each airport.</p>
        </Section>

        {s.stays.length > 0 && (
          <Section title="Where they're staying" icon="bed">
            <div className="flex flex-col gap-3">
              {s.stays.map((stay) => {
                const affected = s.impact.affectedStays.find((a) => a.stayId === stay.id);
                return (
                  <Card key={stay.id}>
                    <p className="font-semibold">{stay.name}</p>
                    <p className="mt-0.5 text-[15px] text-ink-2">{stay.address}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-[15px]">
                      <div>
                        <dt className="text-[13px] text-ink-3">Check-in</dt>
                        <dd>
                          {formatDate(stay.checkIn)},{" "}
                          <span className="font-num tabular-nums">{timePart(stay.checkIn)}</span>
                        </dd>
                      </div>
                      {stay.latestCheckIn && (
                        <div>
                          <dt className="text-[13px] text-ink-3">Front desk until</dt>
                          <dd className="font-num tabular-nums">{stay.latestCheckIn}</dd>
                        </div>
                      )}
                      {stay.confirmation && (
                        <div className="col-span-2">
                          <dt className="text-[13px] text-ink-3">Confirmation</dt>
                          <dd className="font-medium tracking-wide">{stay.confirmation}</dd>
                        </div>
                      )}
                    </dl>
                    {affected && (
                      <p className="mt-3 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[14px] text-warn-fg">
                        <Icon name="clock" size={18} className="mt-px" />
                        {first} may arrive later than planned because of the flight change.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </Section>
        )}

        {s.openTasks.length > 0 && (
          <Section title={`Still on ${first}'s list`} icon="info">
            <Card>
              <ul className="flex flex-col gap-2.5">
                {s.openTasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-[3px] h-[18px] w-[18px] shrink-0 rounded-full border-2 border-line-strong"
                    />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>
        )}

        {s.fundsRequest && <SendHelp s={s} first={first} request={s.fundsRequest} />}

        <details className="group rounded-card border border-line bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
            <Icon name="message" size={18} className="text-ink-3" />
            <span className="flex-1">The message {first} sent</span>
            <Icon name="chevron-right" size={18} className="text-ink-3 transition-transform group-open:rotate-90" />
          </summary>
          <p className="border-t border-line px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-2">
            {s.summary}
          </p>
        </details>

        <footer className="flex flex-col gap-3 border-t border-line pt-5 text-[14px] leading-snug text-ink-3">
          <p className="flex items-start gap-2.5">
            <Icon name="clock" size={18} className="mt-px" />
            <span>
              This is a snapshot from when it was sent and won&apos;t update on its own. If plans
              change again, {first} can send a new link.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <Icon name="lock" size={18} className="mt-px" />
            <span>
              The details live in the link itself. Nothing was uploaded, and there&apos;s no
              account behind it.
            </span>
          </p>
        </footer>
      </div>
    </>
  );
}

function SendHelp({
  s,
  first,
  request,
}: {
  s: ShareSnapshot;
  first: string;
  request: NonNullable<ShareSnapshot["fundsRequest"]>;
}) {
  const [copied, setCopied] = useState<boolean | null>(null);
  const url = buildTransferRequestUrl({
    recipient: request.recipient,
    amountUsdc: request.amountUsdc,
    tripName: s.tripName,
    travelerName: s.travelerName,
    cluster: request.cluster,
  });
  if (!url) return null;
  const demo = isDemoCluster(request.cluster);
  return (
    <Section title={`Help ${first} with costs`} icon="user">
      <Card>
        <p className="text-ink-2">{first} is asking for</p>
        <p className="font-num text-[30px] leading-tight font-semibold tabular-nums">
          {request.amountUsdc} <span className="font-sans text-[17px] font-medium text-ink-2">USDC</span>
        </p>
        {demo && (
          <p className="mt-3 flex items-start gap-2 rounded-control bg-warn-bg px-3 py-2.5 text-[14px] text-warn-fg">
            <Icon name="info" size={18} className="mt-px" />
            Demo on Solana&apos;s test network (devnet). No real money moves.
          </p>
        )}
        <a href={url} className={buttonClasses({ variant: "primary", block: true, className: "mt-4" })}>
          <Icon name="arrow-right" size={20} />
          Send help
        </a>
        <p className="mt-2 text-[14px] leading-snug text-ink-3">
          Opens your Solana wallet app{demo ? " (set it to devnet)" : ""}. You check and approve the
          payment there. Nothing is sent from this page.
        </p>
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[13px] text-ink-3">No wallet on this device? Send to this address</p>
          <p className="mt-1 font-num text-[14px] break-all text-ink-2">{request.recipient}</p>
          <Button
            size="sm"
            className="mt-2"
            icon={copied ? "check" : "copy"}
            onClick={async () => setCopied(await copyText(request.recipient))}
          >
            {copied ? "Copied" : copied === false ? "Couldn't copy" : "Copy address"}
          </Button>
        </div>
      </Card>
    </Section>
  );
}

function Section({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-ink-2">
        <Icon name={icon} size={18} className="text-ink-3" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function FlightName({ f }: { f: Flight }) {
  return (
    <p className="font-medium">
      {f.airline} {f.flightNumber}
      <span className="text-ink-3">
        {" "}
        · {f.from} to {f.to}
      </span>
    </p>
  );
}

function ChangedTimes({ f }: { f: Flight }) {
  const o = f.original;
  const cancelled = f.status === "cancelled";
  const rows: { label: string; place: string; now: string; was?: string }[] = [
    { label: "Departs", place: f.from, now: f.departAt, was: o?.departAt },
    { label: "Arrives", place: f.to, now: f.arriveAt, was: o?.arriveAt },
  ];
  if (cancelled) {
    return (
      <p className="mt-3 text-ink-2">
        This flight was cancelled and a replacement isn&apos;t confirmed yet. It was due to land in{" "}
        {f.to} at{" "}
        <span className="font-num tabular-nums">{timePart(o?.arriveAt ?? f.arriveAt)}</span>.
      </p>
    );
  }
  return (
    <>
      {o && (o.flightNumber !== f.flightNumber || o.airline !== f.airline) && (
        <p className="mt-2 text-[14px] text-ink-3">
          Was {o.airline} {o.flightNumber}
        </p>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {rows.map((r) => {
          const moved = r.was && r.was !== r.now;
          return (
            <div key={r.label}>
              <dt className="text-[13px] text-ink-3">
                {r.label} {r.place}
              </dt>
              <dd>
                <span className="font-num text-[26px] leading-tight font-semibold tabular-nums">
                  {timePart(r.now)}
                </span>
                {moved && (
                  <span className="ml-2 font-num text-ink-3 tabular-nums line-through">
                    <span className="sr-only">was </span>
                    {timePart(r.was!)}
                  </span>
                )}
                <span className="block text-[13px] text-ink-3">{formatDate(r.now)}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </>
  );
}

function ItineraryFlight({ f, highlight }: { f: Flight; highlight: boolean }) {
  const b = FLIGHT_STATUS_BADGE[f.status];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {f.airline} {f.flightNumber}
        </p>
        <Badge tone={b.tone}>{b.label}</Badge>
      </div>
      {f.status === "cancelled" ? (
        <p className="mt-1 text-[15px] text-ink-3">
          {f.from} to {f.to}. Waiting for a new flight.
        </p>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <TimePlace t={f.departAt} place={f.from} />
          <Icon name="arrow-right" size={18} className="text-ink-3" />
          <TimePlace t={f.arriveAt} place={f.to} />
        </div>
      )}
      {f.bookingRef && (
        <p className="mt-2 text-[14px] text-ink-3">
          Booking reference <span className="font-medium tracking-wide text-ink-2">{f.bookingRef}</span>
        </p>
      )}
      {highlight && f.original && f.status !== "cancelled" && (
        <p className="mt-1 text-[13px] text-ink-3">Updated times</p>
      )}
    </div>
  );
}

function TimePlace({ t, place }: { t: string; place: string }) {
  return (
    <div className="min-w-0">
      <p className="font-num text-[20px] leading-tight font-semibold tabular-nums">
        {timePart(t)} <span className="font-sans text-[15px] font-medium text-ink-2">{place}</span>
      </p>
      <p className="text-[13px] text-ink-3">{formatDate(t)}</p>
    </div>
  );
}

function headlineFor(s: ShareSnapshot, first: string, f: Flight | undefined) {
  const delay = s.impact.delayMinutes;
  const rebooked = f?.status === "rebooked";
  switch (s.disruption.type) {
    case "delay":
      return {
        title: `${first}'s flight is delayed`,
        badge: delay && delay > 0 ? `${formatDuration(delay)} late` : "Delayed",
        tone: "warn" as Tone,
      };
    case "cancellation":
      return rebooked
        ? { title: `${first} has been rebooked`, badge: "Rebooked", tone: "done" as Tone }
        : { title: `${first}'s flight was cancelled`, badge: "Cancelled", tone: "bad" as Tone };
    case "missed_connection":
      return rebooked
        ? { title: `${first} missed a connection and has been rebooked`, badge: "Rebooked", tone: "done" as Tone }
        : { title: `${first} missed a connection`, badge: "Missed", tone: "bad" as Tone };
    case "rebooked":
    default:
      return { title: `${first} has been rebooked`, badge: "Rebooked", tone: "done" as Tone };
  }
}

function connectionSentence(c: NonNullable<ShareSnapshot["impact"]["connection"]>, onward: Flight) {
  const next = `${onward.flightNumber} at ${timePart(onward.departAt)}`;
  if (c.minutesAfter === null) return `The arrival time isn't known yet, so it's unclear whether they'll make ${next}.`;
  if (c.status === "missed") return `They now land after ${next} leaves, so they'll need a new flight.`;
  const was = `It was ${formatDuration(c.minutesBefore)}.`;
  if (c.status === "tight") return `${formatDuration(c.minutesAfter)} to make ${next}. That's tight. ${was}`;
  return `${formatDuration(c.minutesAfter)} to make ${next}. ${was}`;
}

// createdAt is a real ISO timestamp, so it is shown in the reader's own time.
function sentAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "recently";
  // Same shape as formatDate/timePart elsewhere: "Sat 10 Oct at 11:04".
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day.replace(",", "")} at ${time}, your time`;
}

function BadLink() {
  return (
    <div className="px-4 pt-4">
      <Card className="flex flex-col items-start gap-3 p-5">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sunk text-ink-2">
          <Icon name="link" size={22} />
        </span>
        <h1 className="text-[24px] leading-tight font-semibold">This link didn&apos;t come through</h1>
        <p className="text-ink-2">
          Part of it may have been cut off when it was copied or forwarded, so the trip details
          can&apos;t be shown.
        </p>
        <p className="text-ink-2">
          Ask the person who sent it to send the link again.
        </p>
      </Card>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-4 pt-2" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-64 animate-pulse rounded bg-sunk" />
      <div className="mt-3 h-4 w-52 animate-pulse rounded bg-sunk" />
      <div className="mt-8 h-40 animate-pulse rounded-card bg-sunk" />
      <div className="mt-6 h-56 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}
