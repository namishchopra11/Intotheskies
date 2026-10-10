"use client";

import { Suspense, useMemo } from "react";
import { Button, Card, PageHeader } from "@/components/ui";
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
  return <main className="flex min-h-dvh flex-col pb-6 text-ink">{children}</main>;
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
        <p role="status" className="py-16 text-center text-base text-ink-3">
          Loading…
        </p>
      </Shell>
    );
  }

  if (!trip || !disruption || !flight || !impact) {
    return (
      <Shell>
        <PageHeader title="We couldn't find that update" back={{ href: "/", label: "Back to trip" }} />
        <div className="px-4">
          <Card>
            <p className="text-base text-ink-2">It may have been removed from this device.</p>
            <Button href="/" variant="primary" fullWidth className="mt-4">
              Go to your trip
            </Button>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader title={TITLES[disruption.type]} back={{ href: "/", label: "Back to trip" }} />
      <div className="space-y-4 px-4">
        <FlightChange flight={flight} noNewTime={impact.delayMinutes === null} />
        <Risks trip={trip} impact={impact} />
        <Checklist disruption={disruption} contacts={trip.contacts} />
        <Button href={`/share/${disruption.id}`} variant="primary" fullWidth icon="share">
          Send an update
        </Button>
      </div>
    </Shell>
  );
}

export default function DisruptionPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <p role="status" className="py-16 text-center text-base text-ink-3">
            Loading…
          </p>
        </Shell>
      }
    >
      <DisruptionView />
    </Suspense>
  );
}
