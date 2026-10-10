"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Field, PageHeader, SelectField } from "@/components/ui";
import { cityName } from "@/lib/domain/airports";
import { addMinutes, formatDateTime } from "@/lib/domain/time";
import { useStoreReady, useTripStore } from "@/lib/store";
import type { DisruptionType } from "@/lib/types";

const TYPES: { value: DisruptionType; label: string; hint: string }[] = [
  { value: "delay", label: "Delayed", hint: "Same flight, new times" },
  { value: "cancellation", label: "Cancelled", hint: "Add new times if you have them" },
  { value: "missed_connection", label: "Missed connection", hint: "Add new times if you have them" },
  { value: "rebooked", label: "Rebooked", hint: "The airline put you on another flight" },
];
const DELAYS = [15, 30, 45, 60, 120];

export function ReportForm() {
  const ready = useStoreReady();
  const trip = useTripStore((s) => s.trip);
  const report = useTripStore((s) => s.reportDisruption);
  const router = useRouter();
  const preselected = useSearchParams().get("flight");

  const [flightId, setFlightId] = useState(preselected ?? "");
  const [type, setType] = useState<DisruptionType>("delay");
  // "" = untouched: delay/rebooked fall back to the flight's current times.
  const [depart, setDepart] = useState("");
  const [arrive, setArrive] = useState("");
  const [airline, setAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [error, setError] = useState("");

  if (!ready) return <p role="status" className="py-24 text-center text-ink-3">Loading…</p>;

  const flights = trip ? [...trip.flights].sort((a, b) => a.departAt.localeCompare(b.departAt)) : [];
  const flight = flights.find((f) => f.id === flightId) ?? flights[0];

  if (!trip || !flight) {
    return (
      <>
        <PageHeader title="Report a change" back={{ href: "/", label: "Trip" }} />
        <div className="px-4">
          <Card className="flex flex-col gap-3">
            <p className="text-ink-2">Add a flight to your trip first.</p>
            <Button variant="primary" block href="/">Go to trip</Button>
          </Card>
        </div>
      </>
    );
  }

  const needsTimes = type === "delay" || type === "rebooked";
  const departAt = depart || (needsTimes ? flight.departAt : "");
  const arriveAt = arrive || (needsTimes ? flight.arriveAt : "");

  const pickType = (t: DisruptionType) => {
    setType(t);
    setDepart("");
    setArrive("");
    setError("");
  };
  const pickFlight = (id: string) => {
    setFlightId(id);
    setDepart("");
    setArrive("");
  };
  const shiftBy = (n: number) => {
    setDepart(addMinutes(flight.departAt, n));
    setArrive(addMinutes(flight.arriveAt, n));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needsTimes && departAt === flight.departAt && arriveAt === flight.arriveAt && !airline && !flightNumber) {
      setError(type === "delay" ? "Pick how late it is, or enter the new times." : "Enter the new flight's details.");
      return;
    }
    const id = report(flight.id, type, {
      airline: airline.trim() || undefined,
      flightNumber: flightNumber.trim() || undefined,
      departAt: departAt || undefined,
      arriveAt: arriveAt || undefined,
    });
    router.push(`/disruption/${id}`);
  };

  return (
    <>
      <PageHeader title="Report a change" back={{ href: "/", label: "Trip" }}>
        Tell us what happened and we’ll show what’s at risk and what to do next.
      </PageHeader>
      <form onSubmit={submit} className="flex flex-col gap-5 px-4 pb-10">
        <SelectField
          label="Which flight?"
          value={flight.id}
          onChange={(e) => pickFlight(e.target.value)}
          options={flights.map((f) => ({
            value: f.id,
            label: `${f.flightNumber} · ${cityName(f.from)} → ${cityName(f.to)} · ${formatDateTime(f.departAt)}`,
          }))}
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 font-medium">What happened?</legend>
          {TYPES.map((t) => (
            <label
              key={t.value}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-control border px-3.5 py-2 ${
                type === t.value ? "border-accent bg-sunk" : "border-line-strong bg-surface"
              }`}
            >
              <input type="radio" name="type" className="size-5 accent-[var(--accent)]" checked={type === t.value} onChange={() => pickType(t.value)} />
              <span>
                <span className="block font-medium">{t.label}</span>
                <span className="block text-[14px] text-ink-3">{t.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {type === "delay" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 font-medium">How late?</legend>
            <div className="flex flex-wrap gap-2">
              {DELAYS.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={departAt === addMinutes(flight.departAt, n) ? "primary" : "secondary"}
                  onClick={() => shiftBy(n)}
                >
                  +{n < 60 ? `${n} min` : `${n / 60} h`}
                </Button>
              ))}
            </div>
          </fieldset>
        )}

        {type === "rebooked" && (
          <>
            <Field label="Airline" placeholder={flight.airline} value={airline} onChange={(e) => setAirline(e.target.value)} />
            <Field label="Flight number" placeholder={flight.flightNumber} value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} />
          </>
        )}

        <Field
          label={needsTimes ? "New departure (local time)" : "Replacement departure (optional)"}
          type="datetime-local"
          hint={needsTimes ? undefined : "Leave blank if you don't have one yet."}
          value={departAt}
          onChange={(e) => setDepart(e.target.value)}
        />
        <Field
          label={needsTimes ? "New arrival (local time)" : "Replacement arrival (optional)"}
          type="datetime-local"
          value={arriveAt}
          onChange={(e) => setArrive(e.target.value)}
        />

        {error && <p role="alert" className="text-bad-fg">{error}</p>}
        <Button type="submit" variant="primary" block>
          Show what’s affected
        </Button>
      </form>
    </>
  );
}
