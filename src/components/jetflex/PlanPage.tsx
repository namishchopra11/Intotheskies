"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Armchair, Bookmark, BookmarkCheck, ChevronDown, CircleAlert, Compass, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { METROS, DATA_NOTICE } from "@/lib/jetflex/data";
import { defaultRequest, search } from "@/lib/jetflex/search";
import { fmtDate, usd } from "@/lib/jetflex/time";
import type { Itinerary, TripRequest } from "@/lib/jetflex/types";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { Scatter } from "./charts";
import { ItineraryBreakdown } from "./Itinerary";
import { Assistant, Priorities, RequestForm, validateRequest } from "./RequestPanel";
import { Comparison, EmptyLegNotice, ExcludedPanel, RankedList, WhyPanel } from "./Results";
import { RouteMap } from "./RouteMap";
import { Badge, Button, Card, CountUp, EmptyState, ErrorState, Notice, PageHeader, SimBadge, LinkButton, Skeleton, stagger, useMediaQuery, useReducedMotion } from "./ui";

export const saveMeta = (it: Itinerary, all: Itinerary[]) => {
  const fc = all.filter((i) => i.kind === "first_class").map((i) => i.door2doorMin);
  return { savings: Math.max(0, it.savingsVsCharter ?? 0), timeSaved: fc.length ? Math.max(0, Math.min(...fc) - it.door2doorMin) : 0 };
};

/** Placeholder with the same silhouette as the results while a plan "computes". */
function PlanSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Searching simulated inventory">
      <p className="flex items-center gap-2 text-sm text-gold"><Search size={15} className="animate-pulse" aria-hidden />Searching simulated inventory and ranking every option…</p>
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      <Skeleton className="h-60" />
    </div>
  );
}

/** On phones the trip form folds away under a one-line summary so results are not buried. From md up it is always open. */
function MobileFold({ wide, summary, children }: { wide: boolean; summary: ReactNode; children: ReactNode }) {
  if (wide) return <>{children}</>;
  return (
    <details className="group rounded-2xl border border-line bg-panel/70">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0"><span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-steel">Trip details and priorities</span><span className="num block truncate text-sm">{summary}</span></span>
        <span className="flex shrink-0 items-center gap-1 text-sm text-gold">Edit<ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden /></span>
      </summary>
      <div className="space-y-4 border-t border-line p-3">{children}</div>
    </details>
  );
}

export function PlanPage() {
  const { ready, today, legs, request } = useWorld();
  const setRequest = useJet((s) => s.setRequest);
  const active = useJet((s) => s.active);
  const setActive = useJet((s) => s.setActive);
  const saved = useJet((s) => s.saved);
  const save = useJet((s) => s.save);
  const unsave = useJet((s) => s.unsave);
  const wide = useMediaQuery("(min-width: 768px)");
  const reduced = useReducedMotion();

  // A short deliberate "computing" beat on arrival and after a natural-language request.
  const [busy, setBusy] = useState(true);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setBusy(false), reduced ? 150 : 600);
    return () => clearTimeout(t);
  }, [ready, run, reduced]);
  const apply = (r: TripRequest) => { setRequest(r); setBusy(true); setRun((n) => n + 1); };

  const errors = useMemo(() => validateRequest(request, today), [request, today]);
  const result = useMemo(() => (ready && !errors.length ? search(request, { today, legs }) : null), [ready, errors, request, today, legs]);
  const items = useMemo(() => {
    const base = result?.itineraries ?? [];
    return active?.recoveredFrom && !base.some((i) => i.id === active.id) ? [active, ...base] : base;
  }, [result, active]);
  const selected = items.find((i) => i.id === active?.id) ?? items[0] ?? null;
  useEffect(() => { if (selected && selected.id !== active?.id) setActive(selected); }, [selected, active?.id, setActive]);

  const savedRow = selected ? saved.find((x) => x.itinerary.id === selected.id) : undefined;
  const top = result?.itineraries[0];
  const pick = (id: string) => { const it = items.find((i) => i.id === id); if (it) setActive(it); };
  const showBar = Boolean(ready && !busy && result && selected && !errors.length);
  const reset = () => setRequest(defaultRequest(today));
  const summary = `${METROS[request.from].short} → ${METROS[request.to].short} · ${fmtDate(request.departDate)} · ${request.pax} traveler${request.pax > 1 ? "s" : ""}`;

  return (
    <div className={showBar ? "pb-24 md:pb-0" : undefined}>
      <PageHeader eyebrow="Plan a trip" title={<>One request. <span className="text-gold">Every way to fly.</span></>}>
        JetFlex compares private charter, empty legs, first class and hybrid journeys for the same party and dates, door to door, then ranks them against what you care about.
      </PageHeader>
      <div className="grid gap-6 sm:gap-8 2xl:grid-cols-[390px_1fr]">
        <aside className="grid grid-cols-1 items-start gap-4 sm:gap-6 [&>*]:min-w-0 md:grid-cols-2 xl:grid-cols-3 2xl:sticky 2xl:top-6 2xl:block 2xl:max-h-[calc(100dvh-3rem)] 2xl:space-y-6 2xl:overflow-y-auto 2xl:pr-2">
          <Card className="p-4 sm:p-5"><Assistant req={request} today={today} onApply={apply} /></Card>
          <MobileFold wide={wide} summary={ready ? summary : "Loading…"}>
            <Card className="space-y-5 p-4 sm:p-5">
              <h2 className="display text-xl">Trip details</h2>
              {ready ? <RequestForm req={request} today={today} onChange={setRequest} result={result ?? undefined} /> : <Skeleton className="h-72" />}
            </Card>
            <Card className="p-4 sm:p-5">{ready && <Priorities req={request} onChange={setRequest} />}</Card>
          </MobileFold>
        </aside>

        <section className="min-w-0 space-y-8" aria-live="polite" aria-busy={!ready || busy}>
          {!ready || busy ? (
            <PlanSkeleton />
          ) : errors.length ? (
            <ErrorState icon={<CircleAlert size={22} />} title="These trip details need a change" action={<Button variant="primary" onClick={reset}><RotateCcw size={15} />Reset to a sample trip</Button>}>
              <ul className="list-disc space-y-0.5 pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
              <p className="mt-2">Fix the highlighted fields in Trip details, or start again from a sample trip.</p>
            </ErrorState>
          ) : result && !items.length ? (
            <div key={run} className="space-y-6">
              <EmptyState icon={<Compass size={28} />} title="No feasible option in the simulated inventory"
                action={<>
                  {request.flexH < 24 && <Button variant="primary" onClick={() => setRequest({ ...request, flexH: 24 })}>Allow the whole day</Button>}
                  {request.budget != null && <Button onClick={() => setRequest({ ...request, budget: undefined })}>Remove budget cap</Button>}
                  <Button onClick={reset}><RotateCcw size={15} />Reset trip details</Button>
                </>}>
                Nothing meets every constraint for {METROS[request.from].short} to {METROS[request.to].short} on {fmtDate(request.departDate)}. Try a different date, a larger flexibility window, fewer travelers or a higher budget.
              </EmptyState>
              <ExcludedPanel excluded={result.excluded} req={request} onFlex={(f) => setRequest({ ...request, flexH: f })} />
            </div>
          ) : result && selected && top ? (
            <div key={run} className="space-y-8">
              <div className="rise flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="display text-2xl">{METROS[request.from].short} → {METROS[request.to].short}</h2>
                  <p className="num text-sm text-steel">{fmtDate(request.departDate)}{request.returnDate ? ` – ${fmtDate(request.returnDate)}` : " · one way"} · {request.pax} traveler{request.pax > 1 ? "s" : ""} · {items.length} option{items.length > 1 ? "s" : ""}</p>
                </div>
                <SimBadge>{DATA_NOTICE.split(".")[0]}</SimBadge>
              </div>

              <EmptyLegNotice profile={result.flexProfile} req={request} onFlex={(f) => setRequest({ ...request, flexH: f })} />
              <Comparison items={result.itineraries} selectedId={selected.id} topId={top.id} onSelect={pick} />

              <div className="grid gap-6 xl:grid-cols-2">
                <WhyPanel it={selected} req={request} rank={Math.max(1, result.itineraries.findIndex((i) => i.id === selected.id) + 1)} total={result.itineraries.length} />
                <Card className="rise p-4 sm:p-5" style={stagger(2)}><h3 className="display mb-3 text-xl">Route</h3><RouteMap selected={selected} others={result.itineraries.slice(0, 12)} onSelect={pick} /></Card>
              </div>

              <Card className="rise p-4 sm:p-5" style={stagger(3)}><h3 className="display mb-2 text-xl">Price against time</h3><Scatter items={result.itineraries} selectedId={selected.id} onSelect={pick} /></Card>

              <div className="rise" style={stagger(4)}>
                <h3 className="display mb-3 text-xl">Ranked options</h3>
                <RankedList items={items} selectedId={selected.id} onSelect={pick} />
              </div>

              <Card id="selected-itinerary" className="rise scroll-mt-20 p-4 sm:p-6" style={stagger(5)}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.14em] text-gold">Selected itinerary</p>
                    <h3 className="display text-2xl">{selected.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">{selected.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}<SimBadge>Illustrative prices</SimBadge></div>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                    {savedRow ? <Button className="col-span-2" onClick={() => unsave(savedRow.id)}><BookmarkCheck size={15} className="text-ok" />Saved · remove</Button> : <Button variant="primary" className="col-span-2" onClick={() => save(selected, request, saveMeta(selected, result.itineraries))}><Bookmark size={15} />Save trip</Button>}
                    <LinkButton href="/jetflex/cabin"><Armchair size={15} />Cabin brief</LinkButton>
                    <LinkButton href="/jetflex/shield"><ShieldCheck size={15} />JetShield</LinkButton>
                  </div>
                </div>
                <ItineraryBreakdown it={selected} />
                <p className="mt-4 text-xs text-steel">This is decision support, not a booking. {selected.savingsVsCharter != null && selected.kind !== "charter" && <>Estimated saving against the cheapest private charter that meets the same constraints: <span className="text-warm">{usd(selected.savingsVsCharter)}</span>.</>}</p>
              </Card>

              <ExcludedPanel excluded={result.excluded} req={request} onFlex={(f) => setRequest({ ...request, flexH: f })} />
              <Card className="p-4 sm:p-5"><h3 className="mb-2 text-sm font-medium">Assumptions behind these numbers</h3><ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-steel">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul></Card>
              {request.pax > 13 && <Notice tone="warn">Parties above 13 exceed every aircraft in the simulated fleet, so only first-class options can appear.</Notice>}
            </div>
          ) : null}
        </section>
      </div>

      {showBar && selected && (
        <div className="bar-up fixed inset-x-0 bottom-0 z-30 border-t border-line bg-midnight/95 backdrop-blur md:hidden">
          <div className="safe-bottom mx-auto flex max-w-[1240px] items-center gap-3 px-4 pt-3">
            <a href="#selected-itinerary" className="flex min-h-11 min-w-0 flex-1 flex-col justify-center" aria-label={`Selected: ${selected.name}. View itinerary`}>
              <span className="block truncate text-xs text-steel">{selected.name}</span>
              <span className="num block text-lg leading-tight text-warm"><CountUp value={selected.totalPrice} format={usd} /></span>
            </a>
            {savedRow
              ? <Button onClick={() => unsave(savedRow.id)}><BookmarkCheck size={16} className="text-ok" />Saved</Button>
              : <Button variant="primary" onClick={() => save(selected, request, saveMeta(selected, result!.itineraries))}><Bookmark size={16} />Save trip</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
