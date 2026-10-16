"use client";

import { Fragment, useRef, useState } from "react";
import { Icon, SignArrow, cx } from "@/components/ui";
import { MOTION, gsap, useGSAP } from "@/components/ui/gsap";
import { cityName } from "@/lib/domain/airports";
import { isArrivalUnknown, lastLeg, nextLeg } from "@/lib/domain/impact";
import { flightLabel } from "@/lib/domain/text";
import { formatDate, timePart } from "@/lib/domain/time";
import { finalArrival } from "@/lib/domain/timeline";
import type { Disruption, Flight, Trip } from "@/lib/types";
import { useTimeFormat } from "@/lib/useTimeFormat";
import { useTripCountdown } from "./TripCountdown";

export type SignTone = "ok" | "warn" | "bad" | "done";

/** The lamp beside the status word: its own shape per state, so colour is never the only signal. */
const LAMP: Record<SignTone, "circle-check" | "clock" | "circle-x" | "check"> = {
  ok: "circle-check",
  warn: "clock",
  bad: "circle-x",
  done: "check",
};

/** The journey the sign shows: the one with the latest change on it, else the first one flown. */
function journey(trip: Trip, disruption: Disruption | undefined): Flight[] {
  const flights = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt));
  const changed = disruption && flights.find((f) => f.id === disruption.flightId);
  const end = changed ? lastLeg(flights, changed) : flights[0] && lastLeg(flights, flights[0]);
  const start = flights.find((f) => lastLeg(flights, f).id === end?.id) ?? flights[0];
  const legs: Flight[] = [];
  for (let f: Flight | null = start; f && !legs.includes(f); f = nextLeg(flights, f)) legs.push(f);
  return legs;
}

/**
 * The top of the home screen: a full-width sign, flat colour by state (black on time, orange
 * late, red cancelled, yellow when a new plan is ready). It carries the route as airport codes,
 * leave and land times set huge, and a live countdown. When the state changes, the new sign
 * is pasted over the old one from the left, the way the arrow points.
 */
export function StatusSign({
  trip,
  disruption,
  tone,
  status,
}: {
  trip: Trip;
  disruption: Disruption | undefined;
  tone: SignTone;
  /** "On time", "Delayed", "New plan ready". */
  status: string;
}) {
  const displayTime = useTimeFormat();
  const countdown = useTripCountdown(trip);
  const root = useRef<HTMLElement>(null);
  // The colour the sign had before this state, shown underneath while the new one wipes in.
  const [shown, setShown] = useState<{ tone: SignTone; under: SignTone | null }>({ tone, under: null });
  if (shown.tone !== tone) setShown({ tone, under: shown.tone });
  const under = shown.under;
  const legs = journey(trip, disruption);
  const first = legs[0];
  const last = legs[legs.length - 1];
  const arrival = disruption ? finalArrival(trip, disruption.id) : null;
  const unknown = arrival?.unknown ?? (last ? isArrivalUnknown(last) : false);
  const landsAt = arrival?.arriveAt ?? last?.arriveAt;
  const was = arrival && !arrival.unknown && arrival.was !== arrival.arriveAt ? arrival.was : null;
  const leftWas = first?.original && first.original.departAt !== first.departAt ? first.original.departAt : null;
  const key = `${disruption?.id ?? "booked"}-${tone}`;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION.full, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(".ss-field", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.65, ease: "power3.inOut" }, 0)
          .from(".ss-arrow", { xPercent: -60, autoAlpha: 0, duration: 1.1 }, 0.25)
          .from(".ss-in", { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06 }, 0.3)
          .from(".ss-time", { yPercent: 40, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.42)
          .from(".ss-strike", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.45, ease: "power2.out", stagger: 0.1 }, 0.9);
      });
      mm.add(MOTION.reduced, () => {
        gsap.from(".ss-field", { autoAlpha: 0, duration: 0.3 });
      });
    },
    { scope: root, dependencies: [key], revertOnUpdate: true },
  );

  if (!first || !last) return null;

  return (
    <section
      ref={root}
      aria-label="Your trip"
      className="relative overflow-hidden"
      style={under ? { background: `var(--field-${under})` } : undefined}
    >
      <div
        key={key}
        className="ss-field relative isolate overflow-hidden"
        style={{ background: `var(--field-${tone})`, color: `var(--on-field-${tone})` }}
      >
        {/* The motif, huge and cropped by the edge. Decorative: the words below say it all. */}
        <SignArrow
          aria-hidden="true"
          className="ss-arrow pointer-events-none absolute -right-[22%] top-[38px] -z-10 opacity-[0.13]"
          size={250}
        />

        <div className="px-5 pt-4">
          <div className="ss-in flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[17px] font-bold">
              <Icon name={LAMP[tone]} size={20} strokeWidth={2.5} className={tone === "ok" ? "ck-pulse" : undefined} />
              {status}
            </span>
            <span className="truncate text-[14px] font-semibold opacity-75">{trip.name || "Your trip"}</span>
          </div>

          {/* The route as the signs at the airport print it: codes, with arrows between. */}
          <p className="ss-in mt-5 flex flex-wrap items-center gap-x-2 font-display text-[46px] leading-none font-bold">
            {[first.from, ...legs.map((f) => f.to)].map((code, i) => (
              <Fragment key={`${code}-${i}`}>
                {i > 0 && <SignArrow size={26} className="opacity-60" />}
                <span>{code}</span>
              </Fragment>
            ))}
          </p>
          <p className="ss-in mt-1.5 text-[16px] font-medium opacity-80">
            {cityName(first.from)} to {cityName(last.to)}
            {legs.length > 1 && ` · via ${legs.slice(1).map((f) => cityName(f.from)).join(", ")}`}
          </p>

          <dl className="mt-6 mb-5 grid grid-cols-2 gap-4">
            <div className="ss-in">
              <dt className="text-[14px] font-semibold opacity-75">Leaves {formatDate(first.departAt)}</dt>
              <dd className="mt-1 overflow-hidden">
                <span className="ss-time block font-display text-[56px] leading-[0.92] font-bold">
                  <Clock text={displayTime(timePart(first.departAt))} />
                </span>
                {leftWas && <Struck text={displayTime(timePart(leftWas))} />}
              </dd>
            </div>
            <div className="ss-in">
              <dt className="text-[14px] font-semibold opacity-75">{unknown || !landsAt ? "Lands" : `Lands ${formatDate(landsAt)}`}</dt>
              <dd className="mt-1 overflow-hidden">
                <span className="ss-time block font-display text-[56px] leading-[0.92] font-bold">
                  {unknown || !landsAt ? "–:–" : <Clock text={displayTime(timePart(landsAt))} />}
                </span>
                {was && <Struck text={displayTime(timePart(was))} />}
              </dd>
            </div>
          </dl>
        </div>

        {/* A darker strip along the foot of the sign: the clock. */}
        <div className="ss-in flex min-h-12 items-center gap-2.5 bg-black/12 px-5 py-2.5 text-[15px] font-semibold">
          <Icon name={countdown?.live ? "clock" : "calendar"} size={18} />
          <span className="min-w-0 flex-1 truncate font-num">{countdown?.label ?? " "}</span>
          {countdown?.demo ? (
            <span className="shrink-0 rounded-[3px] bg-black/15 px-2 py-0.5 text-[13px]">Demo clock</span>
          ) : (
            <span className="shrink-0 font-num opacity-80">{flightLabel(first.flightNumber)}</span>
          )}
        </div>
      </div>
    </section>
  );
}

/** The old time, crossed out with a bar that draws itself in. */
function Struck({ text }: { text: string }) {
  return (
    <span className={cx("relative mt-1 inline-block font-display text-[22px] leading-none font-bold opacity-70")}>
      <span className="sr-only">was </span>
      {text}
      <span aria-hidden="true" className="ss-strike absolute inset-x-[-2px] top-1/2 h-[3px] -translate-y-1/2 bg-current" />
    </span>
  );
}

/** "4:40 PM" with the AM/PM set small, as on a departures sign. */
function Clock({ text }: { text: string }) {
  const m = text.match(/^(.*?)\s?(AM|PM)$/);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      <span className="ml-1 text-[0.4em] tracking-normal">{m[2]}</span>
    </>
  );
}
