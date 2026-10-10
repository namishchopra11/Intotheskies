import { Card, Icon } from "@/components/ui";
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
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">
        {label} · {place}
      </p>
      {cancelled ? (
        <p className="mt-1 text-base text-ink-3 line-through">{formatDateTime(before ?? after)}</p>
      ) : prior !== null ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="sr-only">Was</span>
          <span className="text-base text-ink-3 line-through">{formatDateTime(prior)}</span>
          <span className="sr-only">now</span>
          <span className="text-lg font-semibold text-ink">{formatDateTime(after)}</span>
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-ink">{formatDateTime(after)}</p>
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
    <Card as="section" aria-labelledby="flight-heading">
      <h2 id="flight-heading" className="text-sm font-medium text-ink-3">
        Your flight
      </h2>

      {nameChanged ? (
        <p className="mt-1 text-lg font-semibold text-ink">
          <span className="font-normal text-ink-3 line-through">
            {original.airline} {original.flightNumber}
          </span>{" "}
          <Icon name="arrow-right" size={18} className="inline-block align-middle" />
          <span className="sr-only">changed to</span> {flight.airline} {flight.flightNumber}
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-ink">
          {flight.airline} {flight.flightNumber}
        </p>
      )}
      <p className="text-base text-ink-2">
        {flight.from} <Icon name="arrow-right" size={18} className="inline-block align-middle" />
        <span className="sr-only">to</span> {flight.to}
      </p>

      <div className="mt-3 divide-y divide-line border-t border-line">
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
        <p className="mt-1 rounded-xl bg-bad-bg px-3 py-2 text-sm font-medium text-bad-fg">
          Cancelled, no new time yet
        </p>
      )}
    </Card>
  );
}
