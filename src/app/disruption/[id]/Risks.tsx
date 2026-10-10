import { Badge, Card, CONNECTION_BADGE } from "@/components/ui";
import { formatDuration } from "@/lib/domain/time";
import type { Impact } from "@/lib/domain/impact";
import type { Trip } from "@/lib/types";

const CONNECTION_LABEL = { ok: "On track", tight: "Tight", missed: "Likely missed" } as const;

export function Risks({ trip, impact }: { trip: Trip; impact: Impact }) {
  const { connection, affectedStays, delayMinutes } = impact;
  const onward = connection ? trip.flights.find((f) => f.id === connection.flightId) : undefined;
  const stays = affectedStays.map((a) => ({
    ...a,
    name: trip.stays.find((s) => s.id === a.stayId)?.name ?? "Your stay",
  }));
  const hasDelay = delayMinutes !== null && delayMinutes !== 0;
  const nothing = stays.length === 0 && (!connection || connection.status === "ok");

  return (
    <Card as="section" aria-labelledby="risks-heading">
      <h2 id="risks-heading" className="text-base font-semibold text-ink">
        What this affects
      </h2>

      {hasDelay && (
        <p className="mt-3 text-base text-ink">
          {delayMinutes > 0
            ? `Arrives ${formatDuration(delayMinutes)} later than planned.`
            : `Arrives ${formatDuration(delayMinutes)} earlier than planned.`}
        </p>
      )}

      {connection && (
        <div className="mt-3 rounded-xl bg-sunk p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-3">Onward connection</p>
              <p className="text-base font-semibold text-ink">
                {onward ? `${onward.flightNumber} · ${onward.from} → ${onward.to}` : "Your next flight"}
              </p>
            </div>
            <Badge tone={CONNECTION_BADGE[connection.status].tone}>
              {connection.minutesAfter === null ? "At risk" : CONNECTION_LABEL[connection.status]}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-ink-2">
            {connection.minutesAfter === null
              ? `You had ${formatDuration(connection.minutesBefore)} to connect. Now unknown until you have a new flight.`
              : connection.minutesAfter < 0
                ? `You had ${formatDuration(connection.minutesBefore)} to connect. It now leaves ${formatDuration(connection.minutesAfter)} before you land.`
                : `Was ${formatDuration(connection.minutesBefore)}, now ${formatDuration(connection.minutesAfter)}`}
          </p>
        </div>
      )}

      {stays.length > 0 && (
        <ul className="mt-3 space-y-2">
          {stays.map((s) => (
            <li key={s.stayId} className="rounded-xl bg-sunk p-3">
              <p className="text-base font-semibold text-ink">{s.name}</p>
              <p className="mt-1 text-sm text-ink-2">{s.reason}</p>
            </li>
          ))}
        </ul>
      )}

      {nothing && <p className="mt-3 text-base text-ink-2">Nothing else on your trip is affected.</p>}
    </Card>
  );
}
