"use client";

import { useTimeFormat } from "@/lib/useTimeFormat";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { DayPlan } from "@/components/trip/DayPlan";
import { StatusSign, type SignTone } from "@/components/trip/StatusSign";
import { NextAction, haptic } from "@/components/trip/NextAction";
import { BeforeYouGo, BookingCodes, TaskSquare } from "@/components/trip/OnTrackDetails";
import { prepItems } from "@/components/trip/prep";
import { ProfileButton } from "@/components/trip/ProfileButton";
import { triggerFlightChange } from "@/components/trip/simulateChange";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { useSpeech } from "@/components/trip/useSpeech";
import {
  AppHeader,
  Badge,
  Button,
  Icon,
  NAV_FORWARD,
  PageTransition,
  Sheet,
  SignArrow,
  ThemeToggle,
  cx,
  type IconName,
} from "@/components/ui";
import { MOTION, gsap, useGSAP } from "@/components/ui/gsap";
import { cityName } from "@/lib/domain/airports";
import { buildBriefing } from "@/lib/domain/briefing";
import { TIGHT_CONNECTION_MINUTES, computeImpact, findConnection, lastLeg, type Impact } from "@/lib/domain/impact";
import { formatDate, formatDuration, minutesBetween, timePart } from "@/lib/domain/time";
import { flightLabel } from "@/lib/domain/text";
import type { LoadNotice } from "@/lib/recoverTrip";
import { finalArrival } from "@/lib/domain/timeline";
import { useTripStore } from "@/lib/store";
import type { AutoAction, Contact, Disruption, Flight, Ride, Stay, Trip } from "@/lib/types";

const rise = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

export default function TripStatusPage() {
  const ready = useRequireProfile();
  const trip = useTripStore((s) => s.trip);
  const loadNotice = useTripStore((s) => s.loadNotice);
  const dismissLoadNotice = useTripStore((s) => s.dismissLoadNotice);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const menuButton = (
    <button
      type="button"
      aria-label="Trip menu"
      data-tour="menu"
      onClick={() => setMenuOpen(true)}
      className="ck-press inline-flex h-11 w-11 items-center justify-center rounded-control text-ink"
    >
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-surface">
        <Icon name="menu" size={20} strokeWidth={2.5} />
      </span>
    </button>
  );

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <AppHeader
          action={
            <span className="flex items-center">
              <ProfileButton />
              {menuButton}
            </span>
          }
        />
        {ready && loadNotice && <LoadNoticeBar notice={loadNotice} onDismiss={dismissLoadNotice} />}
        {!ready ? (
          <Loading />
        ) : !trip ? (
          <NoTrip />
        ) : trip.flights.length === 0 ? (
          <NoFlights trip={trip} />
        ) : (
          <Status trip={trip} />
        )}
        <TripMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          hasTrip={Boolean(trip)}
          onNewTrip={() => {
            setMenuOpen(false);
            setLeaveOpen(true);
          }}
        />
        <LeaveTripSheet open={leaveOpen} onClose={() => setLeaveOpen(false)} />
      </main>
    </PageTransition>
  );
}

/* ---------- After a change ---------- */

function Status({ trip }: { trip: Trip }) {
  const displayTime = useTimeFormat();
  const disruption = trip.disruptions[trip.disruptions.length - 1];
  const changed = disruption && trip.flights.find((f) => f.id === disruption.flightId);
  const impact = disruption && changed ? computeImpact(trip, changed.id) : null;
  const arrival = disruption ? finalArrival(trip, disruption.id) : null;

  if (!disruption || !changed || !impact) return <OnTrack trip={trip} />;

  const open = disruption.tasks.filter((t) => !t.done).length;
  return (
    <>
      <StatusSign trip={trip} disruption={disruption} tone={toneFor(disruption, changed, arrival?.unknown ?? false)} status={bannerFor(disruption, changed)} />

      <Tabs
        resetKey={disruption.id}
        tabs={[
          {
            id: "now",
            label: "Now",
            aside: open > 0 ? String(open) : undefined,
            content: (
              <>
                <section key={`head-${disruption.id}`} className="ck-rise flex flex-col gap-2.5">
                  <h1 className="font-display text-[38px] leading-[0.98] font-bold text-balance">
                    {displayTime(headlineFor(disruption, changed, impact))}
                  </h1>
                  <p className="inline-flex items-center gap-2 text-[14px] font-medium text-ink-2">
                    <Icon name="info" size={16} />
                    Simulated change · not live airline data
                  </p>
                </section>

                <div key={`tasks-${disruption.id}`} className="ck-rise pt-7" style={rise(90)}>
                  <NextAction disruption={disruption} arrival={arrival} contacts={trip.contacts}>
                    <Checklist disruption={disruption} contacts={trip.contacts} />
                  </NextAction>
                </div>

                {(disruption.actions ?? []).length > 0 && (
                  <section key={`handled-${disruption.id}`} className="ck-rise pt-9" style={rise(160)}>
                    <HandledForYou actions={disruption.actions ?? []} />
                  </section>
                )}
              </>
            ),
          },
          {
            id: "day",
            label: "Your day",
            content: <DayPanel trip={trip} disruptionId={disruption.id} />,
          },
          { id: "bookings", label: "Bookings", content: <BookingsPanel trip={trip} /> },
          {
            id: "contacts",
            label: "Contacts",
            content: <ContactsPanel contacts={trip.contacts} />,
          },
        ]}
      />

      <Dock>
        <Actions key={buildBriefing(trip, disruption.id)} trip={trip} disruption={disruption} />
      </Dock>
    </>
  );
}

/* ---------- Tabs: Now · Your day · Bookings · Contacts ---------- */

type Tab = { id: string; label: string; aside?: string; content: ReactNode };

/**
 * The home screen's three panels under the sign. A sign-plate segmented control picks one; a
 * horizontal swipe on the panel moves to the next, and the panel slides in from the side it
 * was swiped from. The control sticks under the header while the panel scrolls.
 */
function Tabs({ tabs, resetKey }: { tabs: Tab[]; resetKey: string }) {
  const base = useId();
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  // A new flight change starts back on Now.
  const [seen, setSeen] = useState(resetKey);
  if (seen !== resetKey) {
    setSeen(resetKey);
    setActive(0);
  }
  const bar = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const first = useRef(true);
  const current = tabs[Math.min(active, tabs.length - 1)];

  const go = (i: number) => {
    if (i === active || i < 0 || i >= tabs.length) return;
    haptic();
    setDir(i > active ? 1 : -1);
    setActive(i);
    // Scrolled past the control: bring the new panel's top up under it.
    const wrap = bar.current?.parentElement;
    if (bar.current && wrap) {
      const stuck = parseFloat(getComputedStyle(bar.current).top) || 0;
      const target = wrap.getBoundingClientRect().top + window.scrollY - stuck;
      if (window.scrollY > target) window.scrollTo({ top: target, behavior: "smooth" });
    }
  };

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add(MOTION.full, () => {
        gsap.fromTo(panel.current, { x: dir * 36, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.42, ease: "expo.out", clearProps: "transform,opacity,visibility" });
      });
      mm.add(MOTION.reduced, () => {
        gsap.fromTo(panel.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, clearProps: "opacity,visibility" });
      });
    },
    { dependencies: [active, resetKey] },
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const to = e.key === "ArrowRight" ? active + 1 : e.key === "ArrowLeft" ? active - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (to === null || to < 0 || to >= tabs.length) return;
    e.preventDefault();
    go(to);
    (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')[to])?.focus();
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.6) go(active + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="flex flex-col">
      <div ref={bar} className="sticky top-[calc(60px+env(safe-area-inset-top))] z-20 bg-bg px-4 pt-3 pb-1">
        <div role="tablist" aria-label="Trip" className="relative grid rounded-control bg-surface p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          <span
            aria-hidden="true"
            className="ck-tab-marker absolute top-1 bottom-1 left-1 rounded-[3px] bg-key"
            style={{ width: `calc((100% - 8px) / ${tabs.length})`, transform: `translateX(${active * 100}%)` }}
          />
          {tabs.map((t, i) => {
            const on = i === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${base}-${t.id}-tab`}
                aria-selected={on}
                aria-controls={`${base}-panel`}
                tabIndex={on ? 0 : -1}
                onClick={() => go(i)}
                onKeyDown={onKeyDown}
                className={cx(
                  "relative z-10 inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-[3px] px-1 text-[15px] font-bold transition-colors duration-300",
                  on ? "text-on-key" : "text-ink-2",
                )}
              >
                {t.label}
                {t.aside && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-sign px-1 font-num text-[13px] leading-none text-on-sign">
                    {t.aside}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={panel}
        role="tabpanel"
        id={`${base}-panel`}
        aria-labelledby={`${base}-${current.id}-tab`}
        className="touch-pan-y px-4 pt-5"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div key={current.id}>{current.content}</div>
      </div>
    </div>
  );
}

/** The bottom band: the screen's main action, always in reach of a thumb. Solid black, like a sign gantry. */
function Dock({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="h-32" />
      <div className="ck-dock pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[520px]">
        <div className="ck-dock-inner pointer-events-auto bg-plate px-4 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] text-on-plate">
          {children}
        </div>
      </div>
    </>
  );
}

/* ---------- Checklist ---------- */

// How long a removed task takes to fold away.
const TASK_FOLD_MS = 320;

function Checklist({ disruption, contacts }: { disruption: Disruption; contacts: Contact[] }) {
  const displayTime = useTimeFormat();
  const toggleTask = useTripStore((s) => s.toggleTask);
  const removeTask = useTripStore((s) => s.removeTask);
  // A removed task folds away first, then leaves the store.
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const remove = (taskId: string) => {
    setRemoving((r) => new Set(r).add(taskId));
    setTimeout(() => {
      removeTask(disruption.id, taskId);
      setRemoving((r) => {
        const next = new Set(r);
        next.delete(taskId);
        return next;
      });
    }, TASK_FOLD_MS);
  };
  return (
    <div className="flex flex-col pt-[3px]">
      <ul className="flex flex-col gap-[3px]">
        {disruption.tasks.map((t) => {
          const contact = t.contactId ? contacts.find((c) => c.id === t.contactId) : undefined;
          return (
            <li
              key={t.id}
              className={cx(
                "ck-rise grid overflow-hidden rounded-card bg-surface transition-[grid-template-rows,opacity,margin] ease-out",
                removing.has(t.id) ? "-mb-[3px] grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
              )}
              style={{ transitionDuration: `${TASK_FOLD_MS}ms` }}
            >
              <div className="flex min-h-0 items-center gap-1 overflow-hidden pr-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={t.done}
                  onClick={() => {
                    haptic();
                    toggleTask(disruption.id, t.id);
                  }}
                  data-done={t.done}
                  className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-3.5 py-2 pl-4 text-left"
                >
                  <TaskSquare />
                  <span className="ck-task-text min-w-0 flex-1 text-[16px] font-medium">{displayTime(t.title)}</span>
                </button>
                {contact?.phone && <CallLink name={contact.name} phone={contact.phone} />}
                {t.source === "custom" && (
                  <button
                    type="button"
                    aria-label={`Remove task: ${displayTime(t.title)}`}
                    onClick={() => remove(t.id)}
                    disabled={removing.has(t.id)}
                    className="ck-press inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-2"
                  >
                    <Icon name="x" size={18} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <AddTask disruptionId={disruption.id} />
    </div>
  );
}

function AddTask({ disruptionId }: { disruptionId: string }) {
  const addTask = useTripStore((s) => s.addTask);
  const [title, setTitle] = useState("");

  return (
    <form
      className="mt-[3px] flex gap-[3px]"
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
        className="min-h-14 min-w-0 flex-1 rounded-card border-2 border-transparent bg-surface px-4 text-[16px] font-medium text-ink outline-none transition-[border-color] placeholder:font-normal placeholder:text-ink-3 focus:border-ink"
      />
      <Button type="submit" variant="plate" icon="plus" disabled={!title.trim()} aria-label="Add task" className="min-h-14 w-14 px-0" />
    </form>
  );
}

function CallLink({ name, phone }: { name: string; phone: string }) {
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      aria-label={`Call ${name}`}
      className="ck-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-key text-on-key"
    >
      <Icon name="phone" size={18} strokeWidth={2.25} />
    </a>
  );
}

/** What Layover already did by itself when the flight changed (see lib/domain/autoUpdates.ts). */
function HandledForYou({ actions }: { actions: AutoAction[] }) {
  const displayTime = useTimeFormat();
  if (actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="ck-h2">Handled for you</h2>
        <span className="text-[13px] font-medium text-ink-2">Simulated · nothing sent</span>
      </div>
      <ul className="flex flex-col gap-[3px]">
        {actions.map((a, i) => {
          const pending = a.status === "pending";
          return (
            <li key={a.id} className="ck-rise flex min-h-16 items-center gap-3.5 rounded-card bg-surface py-3 pr-4 pl-3" style={rise(200 + i * 70)}>
              <span
                aria-hidden="true"
                className={cx("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px]", pending ? "bg-warn-bg text-warn-fg" : "bg-ok-bg text-ok-fg")}
              >
                <Icon name={a.kind === "hotel" ? "bed" : a.kind === "ride" ? "car" : "plane"} size={20} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1 text-[16px] leading-snug font-semibold">{displayTime(a.title)}</span>
              {pending ? (
                <span className="text-[14px] font-bold text-warn-fg">Waiting</span>
              ) : (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-[3px] bg-ok text-white">
                  <Icon name="check" size={16} strokeWidth={3.5} label="Done" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Actions ---------- */

function Actions({ trip, disruption }: { trip: Trip; disruption: Disruption | undefined }) {
  // Chosen in Settings.
  const voice = useTripStore((s) => s.settings.voice);
  const { speaking, loading, error, speak, stop } = useSpeech(voice);
  if (!disruption) return null;

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="ck-rise text-[14px] font-semibold text-sign">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button href={`/share/${disruption.id}`} transitionTypes={NAV_FORWARD} variant="primary" size="lg" block chip="arrow-right" className="flex-1">
          Share update
        </Button>
        <button
          type="button"
          aria-label={loading ? "Loading audio, tap to cancel" : speaking ? "Stop listening" : "Listen to summary (audio by ElevenLabs)"}
          onClick={() => (speaking ? stop() : speak(buildBriefing(trip, disruption.id)))}
          className={cx(
            "ck-press inline-flex h-[60px] w-[60px] shrink-0 cursor-pointer items-center justify-center rounded-control",
            speaking || loading ? "bg-sign text-on-sign" : "bg-white/12 text-on-plate",
          )}
        >
          <Icon name={speaking ? "x" : "listen"} size={24} strokeWidth={2.5} className={loading ? "ck-pulse" : undefined} />
          {loading && <span className="sr-only">Loading</span>}
        </button>
      </div>
    </div>
  );
}

/* ---------- On track: nothing has changed yet ---------- */

function OnTrack({ trip }: { trip: Trip }) {
  const count = trip.flights.length;
  const tight = tightLayover(trip);
  const done = new Set(trip.prepDone ?? []);
  const toDo = prepItems(trip).filter((i) => !done.has(i.key)).length;
  return (
    <>
      <StatusSign trip={trip} disruption={undefined} tone={tight ? "warn" : "ok"} status={tight ? "Tight connection" : "On time"} />

      <Tabs
        resetKey="booked"
        tabs={[
          {
            id: "now",
            label: "Now",
            aside: toDo > 0 ? String(toDo) : undefined,
            content: (
              <>
                <section className="ck-rise flex flex-col gap-2.5">
                  <h1 className="font-display text-[38px] leading-[0.98] font-bold text-balance">
                    {tight
                      ? tight.gap < 0
                        ? `${cityName(tight.airport)} connection is too short.`
                        : `${formatDuration(tight.gap)} to connect in ${cityName(tight.airport)}.`
                      : "On track. Nothing to do."}
                  </h1>
                  <p className="inline-flex items-center gap-2 text-[15px] font-medium text-ink-2">
                    <span aria-hidden="true" className="ck-pulse h-2.5 w-2.5 shrink-0 rounded-[2px] bg-ok" />
                    Watching {count === 1 ? "1 flight" : `${count} flights`} · simulated feed
                  </p>
                </section>
                <BeforeYouGo trip={trip} delay={100} />
              </>
            ),
          },
          { id: "day", label: "Your day", content: <DayPanel trip={trip} disruptionId={null} /> },
          { id: "bookings", label: "Bookings", content: <BookingsPanel trip={trip} /> },
          { id: "contacts", label: "Contacts", content: <ContactsPanel contacts={trip.contacts} /> },
        ]}
      />

      <Dock>
        <Button variant="primary" size="lg" block chip="arrow-right" onClick={() => triggerFlightChange()}>
          Simulate a flight change
        </Button>
      </Dock>
    </>
  );
}

/* ---------- Your day ---------- */

function DayPanel({ trip, disruptionId }: { trip: Trip; disruptionId: string | null }) {
  return (
    <>
      <section className="ck-rise flex flex-col gap-3">
        <h2 className="ck-h2">{disruptionId ? "Your new day" : "Your day"}</h2>
        <DayPlan trip={trip} disruptionId={disruptionId} baseDelay={60} />
      </section>
    </>
  );
}

/* ---------- Bookings: stays, rides and every booking code ---------- */

function BookingsPanel({ trip }: { trip: Trip }) {
  const rides = trip.rides ?? [];
  const codes = trip.flights.length + trip.stays.length + rides.length;
  if (trip.stays.length === 0 && rides.length === 0 && codes === 0) {
    return (
      <div className="ck-rise flex flex-col items-start gap-3 rounded-card bg-surface p-5">
        <p className="text-[16px] font-semibold">No hotels or rides yet.</p>
        <Button href="/trip" transitionTypes={NAV_FORWARD} variant="plate" size="sm" chip="arrow-right">
          Edit your trip
        </Button>
      </div>
    );
  }
  // Each section brings its own top space; the first one in the panel sits right under the tabs.
  return (
    <div className="-mt-9">
      <TripDetails trip={trip} delay={0} />
      <BookingCodes trip={trip} delay={80} />
    </div>
  );
}

/** Hotel and rides, with a call key each. */
function TripDetails({ trip, delay }: { trip: Trip; delay: number }) {
  const rides = trip.rides ?? [];
  if (trip.stays.length === 0 && rides.length === 0) return null;
  const label = [trip.stays.length > 0 && "Stay", rides.length > 0 && "rides"].filter(Boolean).join(" & ");
  return (
    <section className="ck-rise flex flex-col gap-3 pt-9" style={rise(delay)}>
      <h2 className="ck-h2">{label}</h2>
      <div className="flex flex-col gap-[3px]">
        {trip.stays.map((s) => (
          <StayPlate key={s.id} s={s} />
        ))}
        {rides.map((r) => (
          <RidePlate key={r.id} r={r} />
        ))}
      </div>
    </section>
  );
}

function StayPlate({ s }: { s: Stay }) {
  const displayTime = useTimeFormat();
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface py-3.5 pr-3 pl-4">
      <ThingIcon name="bed" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold">{s.name}</p>
        <p className="truncate text-[14px] text-ink-2">{s.address}</p>
        <p className="mt-1 font-num text-[14px] font-semibold">
          In {displayTime(timePart(s.checkIn))} {formatDate(s.checkIn)}
          {s.latestCheckIn && <span className="font-medium text-ink-2"> · desk until {displayTime(s.latestCheckIn)}</span>}
        </p>
      </div>
      {s.phone && <CallLink name={s.name} phone={s.phone} />}
    </div>
  );
}

function RidePlate({ r }: { r: Ride }) {
  const displayTime = useTimeFormat();
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface py-3.5 pr-3 pl-4">
      <ThingIcon name="car" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-bold">{r.provider}</p>
        <p className="truncate text-[14px] text-ink-2">
          {r.from} – {r.to}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-num text-[14px] font-semibold">
          Pickup {displayTime(timePart(r.pickupAt))} {formatDate(r.pickupAt)}
          {r.rescheduledFrom && (
            <span className="font-medium text-ink-faint line-through">
              <span className="sr-only">was </span>
              {displayTime(timePart(r.rescheduledFrom))}
            </span>
          )}
          {r.rescheduledFrom && <Badge tone="done">Moved</Badge>}
        </p>
      </div>
      {r.phone && <CallLink name={r.provider} phone={r.phone} />}
    </div>
  );
}

/* ---------- Contacts ---------- */

const CONTACT_KIND: Record<Contact["kind"], { icon: IconName; word: string }> = {
  airline: { icon: "plane", word: "Airline" },
  hotel: { icon: "bed", word: "Hotel" },
  insurance: { icon: "lock", word: "Insurance" },
  other: { icon: "user", word: "Contact" },
};

function ContactsPanel({ contacts }: { contacts: Contact[] }) {
  return (
    <section className="ck-rise flex flex-col gap-3">
      <h2 className="ck-h2">Who to call</h2>
      {contacts.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card bg-surface p-5">
          <p className="text-[16px] font-semibold">No contacts yet.</p>
          <Button href="/trip" transitionTypes={NAV_FORWARD} variant="plate" size="sm" chip="arrow-right">
            Edit your trip
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-[3px]">
          {contacts.map((c, i) => (
            <li key={c.id} className="ck-rise flex min-h-[72px] items-center gap-3.5 rounded-card bg-surface py-3 pr-3 pl-4" style={rise(60 + i * 50)}>
              <ThingIcon name={CONTACT_KIND[c.kind].icon} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-bold">{c.name}</span>
                <span className="block truncate font-num text-[14px] text-ink-2">{c.phone ?? CONTACT_KIND[c.kind].word}</span>
              </span>
              {/* Every contact gets the same one action, a call. */}
              {c.phone && (
                <a
                  href={`tel:${c.phone.replace(/\s+/g, "")}`}
                  aria-label={`Call ${c.name}`}
                  className="ck-press inline-flex min-h-12 shrink-0 items-center gap-2 rounded-control bg-key px-4 text-[16px] font-bold text-on-key"
                >
                  <Icon name="phone" size={18} strokeWidth={2.25} />
                  Call
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The first layover that is already short as booked, measured at its one airport. */
function tightLayover(trip: Trip): { gap: number; airport: string } | null {
  // In the order they're flown, and only real connections (not the flight home days later).
  for (const f of [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))) {
    const next = findConnection(trip, f);
    if (!next) continue;
    const gap = minutesBetween(f.arriveAt, next.departAt);
    if (gap < TIGHT_CONNECTION_MINUTES) return { gap, airport: next.from };
  }
  return null;
}

/** A small square that says what kind of thing a plate is. */
function ThingIcon({ name }: { name: IconName }) {
  return (
    <span aria-hidden="true" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[3px] bg-sunk text-ink">
      <Icon name={name} size={20} strokeWidth={2.25} />
    </span>
  );
}

/* ---------- No trip yet ---------- */

const HOW_IT_WORKS: { title: string; body: string }[] = [
  { title: "We watch your flights", body: "simulated feed" },
  { title: "Your day re-plans itself", body: "plus a checklist" },
  { title: "One tap tells everyone", body: "text, email or link" },
];

function NoTrip() {
  const savedTrips = useTripStore((s) => s.savedTrips);
  const loadSampleTrip = useTripStore((s) => s.loadSampleTrip);
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION.full, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(".nt-field", { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power3.inOut" })
          .from(".nt-arrow", { xPercent: -50, autoAlpha: 0, duration: 1.2 }, 0.3)
          .from(".nt-head", { y: 24, autoAlpha: 0, duration: 0.8 }, 0.35)
          .from(".nt-step", { x: -16, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.5)
          .from(".nt-cta", { y: 16, autoAlpha: 0, duration: 0.6, stagger: 0.07 }, 0.65);
      });
    },
    { scope: root },
  );
  return (
    <div ref={root} className="flex flex-1 flex-col">
      <section aria-label="How it works" className="nt-field relative isolate overflow-hidden bg-sign px-5 pt-7 pb-8 text-on-sign">
        <SignArrow aria-hidden="true" className="nt-arrow pointer-events-none absolute -right-[30%] -bottom-[18%] -z-10 opacity-[0.14]" size={340} />
        <h1 className="nt-head font-display text-[50px] leading-[0.92] font-bold">Flights change. Your plan keeps up.</h1>
        <ul className="mt-8 flex flex-col gap-3.5">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.title} className="nt-step flex items-center gap-3">
              <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-on-sign text-sign">
                <SignArrow size={20} />
              </span>
              <span className="min-w-0 text-[18px] leading-tight font-bold">
                {s.title} <span className="font-medium opacity-70">· {s.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {savedTrips.length > 0 && <SavedTrips trips={savedTrips} />}

      <div className="mt-auto flex flex-col gap-2 px-4 pt-10 pb-[max(env(safe-area-inset-bottom),20px)]">
        <p className="nt-cta mb-1 flex items-center justify-center gap-1.5 text-[14px] font-medium text-ink-2">
          <Icon name="lock" size={15} />
          Saved on this phone only
        </p>
        <div className="nt-cta">
          <Button variant="primary" size="lg" block chip="arrow-right" href="/trip" transitionTypes={NAV_FORWARD}>
            Add your trip
          </Button>
        </div>
        <div className="nt-cta">
          <Button variant="plate" size="lg" block onClick={loadSampleTrip}>
            Try the sample trip
          </Button>
        </div>
      </div>
    </div>
  );
}

function SavedTrips({ trips }: { trips: Trip[] }) {
  const openSavedTrip = useTripStore((s) => s.openSavedTrip);
  const removeSavedTrip = useTripStore((s) => s.removeSavedTrip);
  return (
    <section className="ck-rise flex flex-col gap-3 px-4 pt-9" style={rise(280)}>
      <h2 className="ck-h2">Saved trips</h2>
      <ul className="flex flex-col gap-[3px]">
        {trips.map((t) => {
          // Where the trip goes: the first flight flown and the end of its journey.
          const first = [...t.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))[0];
          const last = first && lastLeg(t.flights, first);
          const meta = [t.travelerName, first && formatDate(first.departAt)].filter(Boolean);
          return (
            <li key={t.id} className="flex items-center rounded-card bg-surface">
              <button
                type="button"
                onClick={() => openSavedTrip(t.id)}
                className="ck-press flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-4 text-left"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  {first && (
                    <span className="flex items-center gap-1.5 font-display text-[26px] leading-none font-bold">
                      {first.from}
                      <SignArrow size={16} className="opacity-60" />
                      {last.to}
                    </span>
                  )}
                  <span className="mt-1 w-full truncate text-[15px] font-semibold">{t.name || "Untitled trip"}</span>
                  <span className="w-full truncate text-[14px] text-ink-2">{meta.join(" · ")}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeSavedTrip(t.id)}
                aria-label={`Delete saved trip ${t.name}`}
                className="ck-press mr-1.5 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-2"
              >
                <Icon name="x" size={18} strokeWidth={2.5} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** "Start a new trip" in the menu: close this trip, keeping a copy or not, or stay. */
function LeaveTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const saveAndCloseTrip = useTripStore((s) => s.saveAndCloseTrip);
  const resetTrip = useTripStore((s) => s.resetTrip);
  const leave = (fn: () => void) => {
    fn();
    onClose();
    window.scrollTo({ top: 0 });
  };
  return (
    <Sheet open={open} onClose={onClose} title="Start a new trip?">
      <div className="flex flex-col gap-2 pt-1">
        <Button variant="primary" block icon="check" onClick={() => leave(saveAndCloseTrip)}>
          Save it for later
        </Button>
        <Button variant="danger" block onClick={() => leave(resetTrip)}>
          Discard this trip
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Stay on this trip
        </Button>
      </div>
    </Sheet>
  );
}

/** A trip has been started but has no flights yet, so there is nothing to watch. */
function NoFlights({ trip }: { trip: Trip }) {
  return (
    <div className="flex flex-1 flex-col">
      <section className="ck-wipe relative isolate overflow-hidden bg-plate px-5 pt-7 pb-8 text-on-plate">
        <SignArrow aria-hidden="true" className="pointer-events-none absolute -right-[18%] -bottom-[30%] -z-10 text-sign opacity-25" size={260} />
        <p className="text-[15px] font-semibold text-on-plate-2">{[trip.travelerName, trip.name].filter(Boolean).join(" · ") || "New trip"}</p>
        <h1 className="mt-2 font-display text-[52px] leading-[0.9] font-bold">Add a flight to start.</h1>
      </section>
      <div className="ck-rise mt-auto px-4 pt-8 pb-[max(env(safe-area-inset-bottom),20px)]" style={rise(160)}>
        <Button variant="primary" size="lg" block chip="arrow-right" href="/trip" transitionTypes={NAV_FORWARD}>
          Add your bookings
        </Button>
      </div>
    </div>
  );
}

function TripMenu({
  open,
  onClose: closeSheet,
  hasTrip,
  onNewTrip,
}: {
  open: boolean;
  onClose: () => void;
  hasTrip: boolean;
  /** Opens the save-or-discard choice for the current trip. */
  onNewTrip: () => void;
}) {
  const loadSampleTrip = useTripStore((s) => s.loadSampleTrip);
  const resetTrip = useTripStore((s) => s.resetTrip);
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
    <Sheet open={open} onClose={onClose} title="Menu">
      <div className="flex flex-col gap-5 pt-1">
        <div className="flex items-center justify-between gap-3 rounded-card bg-surface py-2 pr-2 pl-4">
          <span className="text-[17px] font-semibold">Appearance</span>
          <ThemeToggle compact />
        </div>
        <MenuGroup>
          {alerts === "default" && (
            <MenuRow icon="message" onClick={async () => setAlerts(await Notification.requestPermission())}>
              Allow phone notifications
            </MenuRow>
          )}
          <MenuRow icon="user" href="/settings" onClick={closeSheet}>
            Settings
          </MenuRow>
          {hasTrip && (
            <MenuRow icon="pencil" href="/trip" onClick={closeSheet}>
              Edit flights, hotels and rides
            </MenuRow>
          )}
          {hasTrip && (
            <MenuRow icon="plus" onClick={onNewTrip}>
              Start a new trip
            </MenuRow>
          )}
        </MenuGroup>
        {confirming ? (
          <Confirm
            title={confirming === "restart" ? "Restart the demo trip?" : "Clear this trip?"}
            body={confirming === "restart" ? "Your ticks are lost." : "Removes it from this phone."}
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
          <MenuGroup>
            <MenuRow
              icon="refresh"
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
            </MenuRow>
            {hasTrip && (
              <MenuRow icon="x" danger onClick={() => setConfirming("clear")}>
                Clear this trip
              </MenuRow>
            )}
          </MenuGroup>
        )}
      </div>
    </Sheet>
  );
}

function MenuGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-[3px]">{children}</div>;
}

function MenuRow({
  icon,
  href,
  danger,
  onClick,
  children,
}: {
  icon: IconName;
  href?: string;
  danger?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls = cx(
    "ck-press flex min-h-14 w-full cursor-pointer items-center gap-3.5 rounded-card bg-surface px-4 text-left text-[17px] font-semibold",
    danger ? "text-bad-fg" : "text-ink",
  );
  const body = (
    <>
      <Icon name={icon} size={20} strokeWidth={2.25} />
      <span className="flex-1">{children}</span>
      {href && <SignArrow size={18} className="ck-key-arrow" />}
    </>
  );
  return href ? (
    <Link href={href} transitionTypes={NAV_FORWARD} onClick={onClick} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
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
    <div role="group" aria-label={title} className="ck-rise flex flex-col gap-3 rounded-card bg-surface p-4">
      <p className="font-display text-[24px] leading-none font-bold">{title}</p>
      <p className="text-[15px] leading-snug text-ink-2">{body}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel} autoFocus className="bg-sunk">
          Keep it
        </Button>
        <Button variant={danger ? "danger" : "plate"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

/** Said once after a saved trip could not be fully read, instead of silently showing "no trip". */
function LoadNoticeBar({ notice, onDismiss }: { notice: LoadNotice; onDismiss: () => void }) {
  const text =
    notice.kind === "recovered"
      ? `${notice.dropped} saved ${notice.dropped === 1 ? "item" : "items"} couldn't be read. The rest is here.`
      : "Your saved trip couldn't be read and was cleared.";
  return (
    <div role="status" className="ck-rise mx-4 mt-1 mb-3 flex items-start gap-2.5 rounded-card bg-warn-bg py-2.5 pr-1 pl-3.5 text-[15px] leading-snug font-medium text-warn-fg">
      <Icon name="circle-alert" size={20} className="mt-0.5 shrink-0" />
      <span className="flex-1 py-0.5">{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss this message"
        className="ck-press -my-1 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-control"
      >
        <Icon name="x" size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading your trip</span>
      <div className="h-[318px] w-full animate-pulse bg-sunk" />
      <div className="mx-4 mt-3 h-[52px] animate-pulse rounded-card bg-sunk" />
      <div className="mx-4 mt-6 h-10 w-3/4 animate-pulse rounded-card bg-sunk" />
      <div className="mx-4 mt-6 h-56 animate-pulse rounded-card bg-sunk" />
    </div>
  );
}

/* ---------- Words ---------- */

function toneFor(d: Disruption, f: Flight, unknown: boolean): SignTone {
  if (f.status === "rebooked" && !unknown) return "done";
  if (d.type === "delay" && !unknown) return "warn";
  return "bad";
}

function bannerFor(d: Disruption, f: Flight): string {
  if (f.status === "rebooked") return "New plan ready";
  if (d.type === "delay") return "Flight delayed";
  return "Needs a new flight";
}

function headlineFor(d: Disruption, f: Flight, impact: Impact): string {
  const instead = `You're on the ${timePart(f.departAt)} instead.`;
  const rebooked = f.status === "rebooked";
  const was = flightLabel(f.original?.flightNumber ?? f.flightNumber);
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
      const lead = late && late > 0 ? `${flightLabel(f.flightNumber)} is ${formatDuration(late)} late.` : `${flightLabel(f.flightNumber)} has new times.`;
      const c = impact.connection;
      if (!c) return lead;
      if (c.status === "missed") return `${lead} You'll likely miss your connection.`;
      if (c.status === "tight") return `${lead} Your connection is now tight.`;
      return `${lead} Your connection still works.`;
    }
  }
}
