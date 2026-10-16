"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { Button, Icon, NAV_BACK, PageHeader, PageTransition, SignArrow, cx } from "@/components/ui";
import { lastLeg } from "@/lib/domain/impact";
import { formatDate } from "@/lib/domain/time";
import { useTripStore } from "@/lib/store";
import { isPastTrip, localDay, tripEndDay } from "@/lib/tripArchive";
import type { Trip } from "@/lib/types";

export default function TripsPage() {
  const ready = useRequireProfile();
  const trip = useTripStore((s) => s.trip);
  const saved = useTripStore((s) => s.savedTrips);
  const archive = useTripStore((s) => s.archiveTrip);
  const [today, setToday] = useState("");
  useEffect(() => {
    const first = window.setTimeout(() => setToday(localDay()), 0);
    const timer = window.setInterval(() => setToday(localDay()), 60000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  const upcoming = saved.filter((t) => !isPastTrip(t, today));
  const past = saved.filter((t) => isPastTrip(t, today));

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <PageHeader variant="bar" title="My trips" />
        {ready && today && (
          <div className="flex flex-col gap-10 px-4 pb-28">
            {trip && (
              <section className="ck-rise flex flex-col gap-3" aria-label="Open trip">
                <h2 className="ck-h2">Open trip</h2>
                <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-card bg-plate p-5 text-on-plate">
                  <SignArrow aria-hidden="true" className="pointer-events-none absolute -top-[22%] -right-[16%] -z-10 text-sign opacity-25" size={170} />
                  <div>
                    <h3 className="truncate font-display text-[34px] leading-none font-bold">{trip.name || "Untitled trip"}</h3>
                    <p className="mt-1.5 text-[15px] font-medium text-on-plate-2">
                      {isPastTrip(trip, today) ? "This trip has ended. Keep it in Past trips." : "Open in Layover now"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" block chip="arrow-right" href="/" transitionTypes={NAV_BACK}>
                      View trip
                    </Button>
                    <Button variant="onPlate" block icon="check" onClick={() => archive(trip.id)}>
                      Archive trip
                    </Button>
                  </div>
                </div>
              </section>
            )}
            <TripList title="Upcoming trips" trips={upcoming} empty="Trips you save for later show up here." past={false} />
            <TripList title="Past trips" trips={past} empty="Archived trips stay here." past />
          </div>
        )}
      </main>
    </PageTransition>
  );
}

function TripList({ title, trips, empty, past }: { title: string; trips: Trip[]; empty: string; past: boolean }) {
  const open = useTripStore((s) => s.openSavedTrip);
  const remove = useTripStore((s) => s.removeSavedTrip);
  const archive = useTripStore((s) => s.archiveTrip);
  const router = useRouter();
  return (
    <section className="ck-rise flex flex-col gap-3" aria-label={title} style={{ animationDelay: past ? "160ms" : "80ms" }}>
      <div className="flex items-center gap-3">
        <h2 className="ck-h2">{title}</h2>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] bg-key px-1.5 font-num text-[14px] leading-none font-bold text-on-key">
          {trips.length}
        </span>
      </div>
      {trips.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-4 text-[15px] font-medium text-ink-2">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-[3px]">
          {trips.map((trip) => {
            const end = tripEndDay(trip);
            const first = [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt))[0];
            const last = first && lastLeg(trip.flights, first);
            return (
              <li key={trip.id} className={cx("rounded-card bg-surface p-4", past && "opacity-90")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {first && (
                      <p className="flex items-center gap-1.5 font-display text-[26px] leading-none font-bold">
                        {first.from}
                        <SignArrow size={16} className="opacity-60" />
                        {last.to}
                      </p>
                    )}
                    <h3 className="mt-1 truncate text-[16px] font-bold">{trip.name || "Untitled trip"}</h3>
                    <p className="mt-0.5 text-[14px] text-ink-2">
                      {trip.flights.length} {trip.flights.length === 1 ? "flight" : "flights"}
                      {end ? ` · Through ${formatDate(`${end}T00:00`)}` : " · Dates to add"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete trip ${trip.name}`}
                    onClick={() => remove(trip.id)}
                    className="ck-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-2"
                  >
                    <Icon name="x" size={18} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="plate"
                    size="sm"
                    chip="arrow-right"
                    onClick={() => {
                      open(trip.id);
                      router.push("/trip");
                    }}
                  >
                    {past ? "Reopen trip" : "Open trip"}
                  </Button>
                  {!past && (
                    <Button variant="sunk" size="sm" onClick={() => archive(trip.id)}>
                      Archive
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
