"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, CircleAlert, Compass, Search, ShieldCheck, Armchair } from "lucide-react";
import { METROS, DATA_NOTICE } from "@/lib/jetflex/data";
import { search } from "@/lib/jetflex/search";
import { fmtDate, usd } from "@/lib/jetflex/time";
import type { Itinerary } from "@/lib/jetflex/types";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { Scatter } from "./charts";
import { ItineraryBreakdown } from "./Itinerary";
import { Assistant, Priorities, RequestForm, validateRequest } from "./RequestPanel";
import { Comparison, ExcludedPanel, RankedList, WhyPanel } from "./Results";
import { RouteMap } from "./RouteMap";
import { Badge, Button, Card, EmptyState, Notice, PageHeader, SimBadge, Skeleton } from "./ui";

export const saveMeta = (it: Itinerary, all: Itinerary[]) => {
  const fc = all.filter((i) => i.kind === "first_class").map((i) => i.door2doorMin);
  return { savings: Math.max(0, it.savingsVsCharter ?? 0), timeSaved: fc.length ? Math.max(0, Math.min(...fc) - it.door2doorMin) : 0 };
};

export function PlanPage() {
  const { ready, today, legs, request } = useWorld();
  const setRequest = useJet((s) => s.setRequest);
  const active = useJet((s) => s.active);
  const setActive = useJet((s) => s.setActive);
  const saved = useJet((s) => s.saved);
  const save = useJet((s) => s.save);
  const unsave = useJet((s) => s.unsave);
  const [busy, setBusy] = useState(false);

  const errors = useMemo(() => validateRequest(request, today), [request, today]);
  const result = useMemo(() => (ready && !errors.length ? search(request, { today, legs }) : null), [ready, errors, request, today, legs]);
  const items = useMemo(() => {
    const base = result?.itineraries ?? [];
    return active?.recoveredFrom && !base.some((i) => i.id === active.id) ? [active, ...base] : base;
  }, [result, active]);
  const selected = items.find((i) => i.id === active?.id) ?? items[0] ?? null;
  useEffect(() => { if (selected && selected.id !== active?.id) setActive(selected); }, [selected, active?.id, setActive]);

  const apply = (r: typeof request) => { setRequest(r); setBusy(true); setTimeout(() => setBusy(false), 500); };
  const savedRow = selected ? saved.find((x) => x.itinerary.id === selected.id) : undefined;
  const top = result?.itineraries[0];

  return (
    <>
      <PageHeader eyebrow="Plan a trip" title={<>One request. <span className="text-gold">Every way to fly.</span></>}>
        JetFlex compares private charter, empty legs, first class and hybrid journeys for the same party and dates, door to door, then ranks them against what you care about.
      </PageHeader>
      <div className="grid gap-8 2xl:grid-cols-[390px_1fr]">
        <aside className="grid grid-cols-1 items-start gap-6 [&>*]:min-w-0 md:grid-cols-2 xl:grid-cols-3 2xl:sticky 2xl:top-6 2xl:block 2xl:max-h-[calc(100dvh-3rem)] 2xl:space-y-6 2xl:overflow-y-auto 2xl:pr-2">
          <Card className="p-5"><Assistant req={request} today={today} onApply={apply} /></Card>
          <Card className="space-y-5 p-5">
            <h2 className="display text-xl">Trip details</h2>
            {ready ? <RequestForm req={request} today={today} onChange={setRequest} result={result ?? undefined} /> : <Skeleton className="h-72" />}
          </Card>
          <Card className="p-5">{ready && <Priorities req={request} onChange={setRequest} />}</Card>
        </aside>

        <section className="min-w-0 space-y-8" aria-live="polite">
          {!ready || busy ? (
            <div className="space-y-4" role="status" aria-label="Searching simulated inventory">
              <p className="flex items-center gap-2 text-sm text-gold"><Search size={15} className="animate-pulse" />Searching simulated inventory and ranking…</p>
              <Skeleton className="h-56" /><Skeleton className="h-40" /><Skeleton className="h-64" />
            </div>
          ) : errors.length ? (
            <EmptyState icon={<CircleAlert size={28} />} title="Check your trip details">{errors.join(" ")}</EmptyState>
          ) : result && !items.length ? (
            <>
              <EmptyState icon={<Compass size={28} />} title="No feasible option in the simulated inventory" action={request.flexH < 24 ? <Button variant="primary" onClick={() => setRequest({ ...request, flexH: 24 })}>Allow the whole day</Button> : undefined}>
                Nothing meets every constraint for {METROS[request.from].short} to {METROS[request.to].short} on {fmtDate(request.departDate)}. Try a different date, a larger flexibility window, fewer travelers or a higher budget.
              </EmptyState>
              <ExcludedPanel excluded={result.excluded} req={request} onFlex={(f) => setRequest({ ...request, flexH: f })} />
            </>
          ) : result && selected && top ? (
            <>
              <div className="rise flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="display text-2xl">{METROS[request.from].short} → {METROS[request.to].short}</h2>
                  <p className="num text-sm text-steel">{fmtDate(request.departDate)}{request.returnDate ? ` – ${fmtDate(request.returnDate)}` : " · one way"} · {request.pax} traveler{request.pax > 1 ? "s" : ""} · {items.length} option{items.length > 1 ? "s" : ""}</p>
                </div>
                <SimBadge>{DATA_NOTICE.split(".")[0]}</SimBadge>
              </div>

              <Comparison items={result.itineraries} selectedId={selected.id} topId={top.id} onSelect={(id) => setActive(items.find((i) => i.id === id)!)} />

              <div className="grid gap-6 xl:grid-cols-2">
                <WhyPanel it={selected} req={request} rank={Math.max(1, result.itineraries.findIndex((i) => i.id === selected.id) + 1)} total={result.itineraries.length} />
                <Card className="p-5"><h3 className="display mb-3 text-xl">Route</h3><RouteMap selected={selected} others={result.itineraries.slice(0, 12)} onSelect={(id) => setActive(items.find((i) => i.id === id)!)} /></Card>
              </div>

              <Card className="p-5"><h3 className="display mb-2 text-xl">Price against time</h3><Scatter items={result.itineraries} selectedId={selected.id} onSelect={(id) => setActive(items.find((i) => i.id === id)!)} /></Card>

              <div>
                <h3 className="display mb-3 text-xl">Ranked options</h3>
                <RankedList items={items} selectedId={selected.id} onSelect={(id) => setActive(items.find((i) => i.id === id)!)} />
              </div>

              <Card className="p-5 sm:p-6">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-gold">Selected itinerary</p>
                    <h3 className="display text-2xl">{selected.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">{selected.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}<SimBadge>Illustrative prices</SimBadge></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedRow ? <Button onClick={() => unsave(savedRow.id)}><BookmarkCheck size={15} className="text-ok" />Saved · remove</Button> : <Button variant="primary" onClick={() => save(selected, request, saveMeta(selected, result.itineraries))}><Bookmark size={15} />Save trip</Button>}
                    <Link href="/jetflex/cabin"><Button><Armchair size={15} />Cabin brief</Button></Link>
                    <Link href="/jetflex/shield"><Button><ShieldCheck size={15} />Run JetShield</Button></Link>
                  </div>
                </div>
                <ItineraryBreakdown it={selected} />
                <p className="mt-4 text-xs text-steel">This is decision support, not a booking. {selected.savingsVsCharter != null && selected.kind !== "charter" && <>Estimated saving against the cheapest private charter that meets the same constraints: <span className="text-warm">{usd(selected.savingsVsCharter)}</span>.</>}</p>
              </Card>

              <ExcludedPanel excluded={result.excluded} req={request} onFlex={(f) => setRequest({ ...request, flexH: f })} />
              <Card className="p-5"><h3 className="mb-2 text-sm font-medium">Assumptions behind these numbers</h3><ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-steel">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></Card>
              {request.budget != null && result.itineraries.every((i) => i.totalPrice <= request.budget!) && null}
              {request.pax > 13 && <Notice tone="warn">Parties above 13 exceed every aircraft in the simulated fleet, so only first-class options can appear.</Notice>}
            </>
          ) : null}
        </section>
      </div>
    </>
  );
}
