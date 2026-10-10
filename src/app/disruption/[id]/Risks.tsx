import { formatDuration } from "@/lib/domain/time";
import type { Impact } from "@/lib/domain/impact";
import type { Trip } from "@/lib/types";

const STATUS = {
  ok: { label: "On track", className: "bg-green-100 text-green-900" },
  tight: { label: "Tight", className: "bg-amber-100 text-amber-900" },
  missed: { label: "Likely missed", className: "bg-red-100 text-red-900" },
} as const;

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
    <section aria-labelledby="risks-heading" className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="risks-heading" className="text-base font-semibold text-neutral-900">
        What this affects
      </h2>

      {hasDelay && (
        <p className="mt-3 text-base text-neutral-800">
          {delayMinutes > 0
            ? `Arrives ${formatDuration(delayMinutes)} later than planned.`
            : `Arrives ${formatDuration(delayMinutes)} earlier than planned.`}
        </p>
      )}

      {connection && (
        <div className="mt-3 rounded-xl bg-neutral-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">Onward connection</p>
              <p className="text-base font-semibold text-neutral-900">
                {onward ? `${onward.flightNumber} · ${onward.from} → ${onward.to}` : "Your next flight"}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS[connection.status].className}`}
            >
              {connection.minutesAfter === null ? "At risk" : STATUS[connection.status].label}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-700">
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
            <li key={s.stayId} className="rounded-xl bg-neutral-50 p-3">
              <p className="text-base font-semibold text-neutral-900">{s.name}</p>
              <p className="mt-1 text-sm text-neutral-700">{s.reason}</p>
            </li>
          ))}
        </ul>
      )}

      {nothing && <p className="mt-3 text-base text-neutral-700">Nothing else on your trip is affected.</p>}
    </section>
  );
}
