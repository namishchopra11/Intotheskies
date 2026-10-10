import { formatDateTime } from "@/lib/domain/time";
import type { Flight, LocalDateTime } from "@/lib/types";

function TimeRow({
  label,
  place,
  before,
  after,
  cancelled,
}: {
  label: string;
  place: string;
  before: LocalDateTime | undefined;
  after: LocalDateTime;
  cancelled: boolean;
}) {
  const prior = before !== undefined && before !== after ? before : null;
  return (
    <div className="py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label} · {place}
      </p>
      {cancelled ? (
        <p className="mt-1 text-base text-neutral-500 line-through">{formatDateTime(before ?? after)}</p>
      ) : prior !== null ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="sr-only">Was</span>
          <span className="text-base text-neutral-500 line-through">{formatDateTime(prior)}</span>
          <span className="sr-only">now</span>
          <span className="text-lg font-semibold text-neutral-900">{formatDateTime(after)}</span>
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-neutral-900">{formatDateTime(after)}</p>
      )}
    </div>
  );
}

export function FlightChange({
  flight,
  noNewTime,
}: {
  flight: Flight;
  /** True when the flight is cancelled and no replacement times are known. */
  noNewTime: boolean;
}) {
  const original = flight.original;
  const nameChanged =
    original !== undefined &&
    (original.airline !== flight.airline || original.flightNumber !== flight.flightNumber);

  return (
    <section aria-labelledby="flight-heading" className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 id="flight-heading" className="text-sm font-medium text-neutral-500">
        Your flight
      </h2>

      {nameChanged ? (
        <p className="mt-1 text-lg font-semibold text-neutral-900">
          <span className="font-normal text-neutral-500 line-through">
            {original.airline} {original.flightNumber}
          </span>{" "}
          <span aria-hidden="true">→</span>
          <span className="sr-only">changed to</span> {flight.airline} {flight.flightNumber}
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-neutral-900">
          {flight.airline} {flight.flightNumber}
        </p>
      )}
      <p className="text-base text-neutral-700">
        {flight.from} <span aria-hidden="true">→</span>
        <span className="sr-only">to</span> {flight.to}
      </p>

      <div className="mt-3 divide-y divide-neutral-100 border-t border-neutral-100">
        <TimeRow
          label="Departs"
          place={flight.from}
          before={original?.departAt}
          after={flight.departAt}
          cancelled={noNewTime}
        />
        <TimeRow
          label="Arrives"
          place={flight.to}
          before={original?.arriveAt}
          after={flight.arriveAt}
          cancelled={noNewTime}
        />
      </div>

      {noNewTime && (
        <p className="mt-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          Cancelled, no new time yet
        </p>
      )}
    </section>
  );
}
