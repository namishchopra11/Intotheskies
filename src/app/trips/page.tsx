"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireProfile } from "@/components/trip/useRequireProfile";
import { Button, Card, Icon, PageHeader, PageTransition } from "@/components/ui";
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
        {ready && today && <div className="flex flex-col gap-7 px-4 pb-28">
          <p className="px-1 text-[14px] text-ink-2">Your next adventures and the ones to remember. Saved on this phone.</p>
          {trip && <section className="flex flex-col gap-2.5" aria-label="Open trip">
            <h2 className="ck-label px-1">Open trip</h2>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-signal text-on-signal"><Icon name="plane" size={20} /></span>
                <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{trip.name || "Untitled trip"}</h3><p className="text-[13px] text-ink-2">{isPastTrip(trip, today) ? "This trip has ended. Keep it in Past trips." : "The trip currently open in Layover"}</p></div>
              </div>
              <Button variant="primary" block href="/">View trip</Button>
              <Button variant="secondary" block icon="check" onClick={() => archive(trip.id)}>Archive trip</Button>
            </Card>
          </section>}
          <TripList title="Upcoming trips" trips={upcoming} empty="Trips you save for later will appear here." past={false} />
          <TripList title="Past trips" trips={past} empty="Finished trips will stay here when you archive them." past />
          <Button variant="secondary" block href="/">Back to home</Button>
        </div>}
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
    <section className="flex flex-col gap-2.5" aria-label={title}>
      <div className="flex items-baseline justify-between px-1"><h2 className="ck-label">{title}</h2><span className="text-[12px] text-ink-2">{trips.length} {trips.length === 1 ? "trip" : "trips"}</span></div>
      {trips.length === 0 ? <Card><p className="text-[14px] text-ink-2">{empty}</p></Card> : (
        <ul className="flex flex-col divide-y divide-line-soft overflow-hidden rounded-card border border-line bg-surface">
          {trips.map((trip) => {
            const end = tripEndDay(trip);
            return <li key={trip.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="truncate font-semibold">{trip.name || "Untitled trip"}</h3><p className="mt-0.5 text-[13px] text-ink-2">{trip.flights.length} {trip.flights.length === 1 ? "flight" : "flights"}{end ? ` · Through ${formatDate(`${end}T00:00`)}` : " · Dates to add"}</p></div>
                <button type="button" aria-label={`Delete trip ${trip.name}`} onClick={() => remove(trip.id)} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-sunk"><Icon name="x" size={18} /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" icon="arrow-right" onClick={() => { open(trip.id); router.push("/trip"); }}>{past ? "Reopen trip" : "Open trip"}</Button>
                {!past && <Button variant="ghost" onClick={() => archive(trip.id)}>Archive</Button>}
              </div>
            </li>;
          })}
        </ul>
      )}
    </section>
  );
}
