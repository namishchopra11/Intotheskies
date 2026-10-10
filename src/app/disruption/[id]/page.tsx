"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { computeImpact } from "@/lib/domain/impact";
import { useStoreReady, useTripStore } from "@/lib/store";
import type { DisruptionType } from "@/lib/types";
import { Checklist } from "./Checklist";
import { FlightChange } from "./FlightChange";
import { Risks } from "./Risks";

const TITLES: Record<DisruptionType, string> = {
  delay: "Flight delayed",
  cancellation: "Flight cancelled",
  missed_connection: "Connection missed",
  rebooked: "Flight rebooked",
};

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-dvh max-w-md bg-neutral-50 p-4 text-neutral-900">{children}</main>;
}

function BackLink() {
  return (
    <Link
      href="/"
      className="-ml-2 inline-flex min-h-11 items-center px-2 text-base font-medium text-blue-800 underline-offset-4 hover:underline"
    >
      <span aria-hidden="true">←</span>
      <span className="ml-1">Back to trip</span>
    </Link>
  );
}

function DisruptionView() {
  const { id } = useParams<{ id: string }>();
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);

  const disruption = trip?.disruptions.find((d) => d.id === id);
  const flight = trip?.flights.find((f) => f.id === disruption?.flightId);
  const flightId = disruption?.flightId;

  const impact = useMemo(() => (trip && flightId ? computeImpact(trip, flightId) : null), [trip, flightId]);

  if (!ready) {
    return (
      <Shell>
        <p role="status" className="py-16 text-center text-base text-neutral-500">
          Loading…
        </p>
      </Shell>
    );
  }

  if (!trip || !disruption || !flight || !impact) {
    return (
      <Shell>
        <BackLink />
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <h1 className="text-xl font-semibold">We couldn&apos;t find that update</h1>
          <p className="mt-2 text-base text-neutral-600">It may have been removed from this device.</p>
          <Link
            href="/"
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-700 px-4 text-base font-semibold text-white active:bg-blue-800"
          >
            Go to your trip
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <BackLink />
      <h1 className="mt-2 text-2xl font-semibold">{TITLES[disruption.type]}</h1>

      <div className="mt-4 space-y-4">
        <FlightChange flight={flight} noNewTime={impact.delayMinutes === null} />
        <Risks trip={trip} impact={impact} />
        <Checklist disruption={disruption} contacts={trip.contacts} />
      </div>

      <Link
        href={`/share/${disruption.id}`}
        className="mt-6 flex min-h-14 w-full items-center justify-center rounded-2xl bg-blue-700 px-4 text-lg font-semibold text-white active:bg-blue-800"
      >
        Send an update
      </Link>
    </Shell>
  );
}

export default function DisruptionPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p role="status" className="py-16 text-center text-base text-neutral-500">
            Loading…
          </p>
        </Shell>
      }
    >
      <DisruptionView />
    </Suspense>
  );
}
