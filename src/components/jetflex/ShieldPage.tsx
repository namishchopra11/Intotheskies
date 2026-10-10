"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, CloudLightning, PlaneTakeoff, ShieldAlert, ShieldCheck, Unplug, Wrench, Car, Timer } from "lucide-react";
import { applyRecovery, buildRecoveryDiff, buildRecoveryTimeline, costDelta, SCENARIOS, simulate, type Recovery, type RecoveryDiff, type ScenarioId, type ShieldResult } from "@/lib/jetflex/shield";
import { search } from "@/lib/jetflex/search";
import { fmtDur, usd } from "@/lib/jetflex/time";
import type { Dir, Itinerary } from "@/lib/jetflex/types";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { clock, dayOf, ItineraryBreakdown, ModeIcon, riskLabel, riskTone, SegmentRow } from "./Itinerary";
import { ShieldTimeline } from "./ShieldTimeline";
import { Badge, Button, Card, cx, EmptyState, Field, Notice, PageHeader, Select, SimBadge, Skeleton } from "./ui";

const ICON: Record<ScenarioId, typeof Timer> = { delay: Timer, aircraft: Wrench, weather: CloudLightning, missed: Unplug, ground: Car };

export function ShieldPage() {
  const { ready, today, legs, request } = useWorld();
  const { active, saved, setActive, setRequest, replaceSaved } = useJet();
  const [pickId, setPickId] = useState("");
  const [scenario, setScenario] = useState<ScenarioId>("weather");
  const [dir, setDir] = useState<Dir>("out");
  const [res, setRes] = useState<ShieldResult | null>(null);
  const [runId, setRunId] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState<RecoveryDiff | null>(null);

  const cands = useMemo(() => { const m = new Map<string, Itinerary>(); [active, ...saved.map((s) => s.itinerary)].forEach((i) => i && m.set(i.id, i)); return [...m.values()]; }, [active, saved]);
  const it = cands.find((c) => c.id === pickId) ?? cands[0];
  const savedRow = it ? saved.find((s) => s.itinerary.id === it.id) : undefined;
  const req = savedRow?.request ?? request;
  const hasRet = it?.journeys.some((j) => j.dir === "ret");
  const useDir: Dir = hasRet ? dir : "out";

  const loadDemo = () => {
    const r = search(request, { today, legs });
    const best = r.itineraries.find((i) => i.kind === "charter") ?? r.itineraries[0];
    if (best) setActive(best);
  };
  const run = () => {
    if (!it) return;
    const r = simulate(it, req, scenario, useDir, legs);
    setDone(null); setConfirm(false); setRes(r); setSel(r?.options[0]?.id ?? null); setRunId((n) => n + 1);
  };
  const steps = useMemo(() => (it && res ? buildRecoveryTimeline(it, res) : []), [it, res]);
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setConfirm(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm]);
  const chosen: Recovery | undefined = res?.options.find((o) => o.id === sel);
  const approve = () => {
    if (!it || !res || !chosen) return;
    const diff = buildRecoveryDiff(it, req, res, chosen);
    const next = applyRecovery(it, req, res, chosen);
    setActive(next); setRequest(req);
    if (savedRow) replaceSaved(savedRow.id, next);
    setDone(diff); setConfirm(false); setRes(null); setPickId(next.id);
  };
  const destPlace = res?.original[res.original.length - 1].to ?? "";

  if (!ready) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHeader eyebrow="JetShield" title={<>When the plan breaks, <span className="text-gold">the next one is ready.</span></>} action={<SimBadge>Simulated disruptions only</SimBadge>}>
        Pick a trip, trigger a disruption, and JetShield searches the same simulated inventory for replacements that still fit your party, timing and return. Nothing here changes a real booking.
      </PageHeader>

      {!it ? (
        <EmptyState icon={<ShieldCheck size={28} />} title="Choose an itinerary to protect" action={<div className="flex gap-2"><Button variant="primary" onClick={loadDemo}>Use the demo itinerary</Button><Link href="/jetflex/plan"><Button>Plan a trip</Button></Link></div>}>
          JetShield works on the itinerary you selected in Plan a Trip or any saved trip. The demo itinerary is the New York to Miami private charter for four.
        </EmptyState>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Card className="space-y-4 p-5">
              <Field label="Itinerary">{(id) => <Select id={id} value={it.id} onChange={(e) => { setPickId(e.target.value); setRes(null); setDone(null); }}>{cands.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
              {hasRet && <Field label="Disrupt which direction?">{() => <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-deep p-1">{(["out", "ret"] as Dir[]).map((d) => <button key={d} onClick={() => setDir(d)} aria-pressed={useDir === d} className={cx("rounded-lg py-1.5 text-xs", useDir === d ? "bg-gold font-semibold text-midnight" : "text-steel")}>{d === "out" ? "Outbound" : "Return"}</button>)}</div>}</Field>}
              <fieldset>
                <legend className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-steel">Scenario</legend>
                <div className="space-y-1.5">
                  {SCENARIOS.map((s) => { const I = ICON[s.id]; return (
                    <label key={s.id} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors", scenario === s.id ? "border-gold bg-gold/5" : "border-line hover:border-steel")}>
                      <input type="radio" name="scenario" className="sr-only" checked={scenario === s.id} onChange={() => setScenario(s.id)} />
                      <I size={18} className={scenario === s.id ? "text-gold" : "text-steel"} aria-hidden />
                      <span><span className="block text-sm">{s.label}</span><span className="block text-xs text-steel">{s.blurb}</span></span>
                    </label>); })}
                </div>
              </fieldset>
              <Button variant="primary" className="w-full" onClick={run}><ShieldAlert size={16} />Simulate disruption</Button>
            </Card>
            <Card className="p-5"><h3 className="display mb-3 text-lg">Current plan</h3><p className="mb-3 text-sm">{it.name}</p><ItineraryBreakdown it={it} /></Card>
          </div>

          <div className="min-w-0 space-y-6">
            {done && <Outcome diff={done} />}
            {!res && !done && <EmptyState icon={<ShieldCheck size={28} />} title="Nothing disrupted yet">Choose a scenario and run the simulation. You will watch JetShield detect what breaks, search replacements and rank them, then wait for your approval.</EmptyState>}
            {res && (
              <ShieldTimeline key={runId} steps={steps}>
                <Notice tone="warn"><ShieldAlert size={16} className="mt-0.5 shrink-0" /><span><strong>Simulation.</strong> This disruption is invented by JetShield for the demo. No operator feed is connected.</span></Notice>
                <Card className="p-5 sm:p-6">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone="bad">Disruption</Badge><h2 className="display text-2xl">{res.headline}</h2></div>
                  <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-steel">{res.consequences.map((c) => <li key={c}>{c}</li>)}</ul>
                  <ul className="divide-y divide-line/70 rounded-xl border border-line px-4">{res.original.map((s, i) => <SegmentRow key={s.id} s={s} status={res.statuses[i]} prev={res.original[i - 1]} />)}</ul>
                  <p className="num mt-3 text-sm text-steel">Planned arrival {dayOf(res.originalArrival, destPlace)} {clock(res.originalArrival, destPlace)}{res.stranded && <> · you are at <span className="text-warm">{res.stranded.place.startsWith("door:") ? "home" : res.stranded.place}</span> from {clock(res.stranded.readyAt, res.stranded.place)}</>}</p>
                </Card>

                <div>
                  <h2 className="display mb-1 text-2xl">Replacement options</h2>
                  <p className="mb-3 text-sm text-steel">Ranked by arrival time, price and certainty using your trip priorities. Additional cost assumes the unused part of the original plan is credited back (illustrative).</p>
                  {res.options.length ? (
                    <ol className="space-y-3">
                      {res.options.map((o, n) => (
                        <li key={o.id}>
                          <button onClick={() => setSel(o.id)} aria-pressed={sel === o.id} className={cx("w-full rounded-2xl border p-4 text-left transition-colors sm:p-5", sel === o.id ? "border-gold bg-panel-2" : "border-line bg-panel/60 hover:border-steel")}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0"><div className="mb-1 flex flex-wrap items-center gap-1.5"><span className="num text-xs text-steel">#{n + 1}</span>{n === 0 && <Badge tone="gold">Best match</Badge>}<Badge tone={riskTone(o.risk)}>{riskLabel(o.risk)} risk</Badge></div><p className="text-[15px]">{o.name}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-steel">{o.segments.filter((s) => s.mode !== "ground").map((s) => <span key={s.id} className="inline-flex items-center gap-1"><ModeIcon mode={s.mode} size={13} />{s.from}→{s.to} {clock(s.dep, s.from)}</span>)}</p></div>
                              <div className="num text-right"><p className="text-lg">{clock(o.arrival, destPlace)}</p><p className={cx("text-xs", o.vsPlan > 0 ? "text-warn" : "text-ok")}>{o.vsPlan === 0 ? "On the original arrival" : `${fmtDur(o.vsPlan)} ${o.vsPlan > 0 ? "later" : "earlier"} than planned`}</p><p className={cx("mt-1 text-sm", o.extraCost > 0 ? "text-warn" : "text-ok")}>{costDelta(o.extraCost)}</p></div>
                            </div>
                            {(o.remaining.length > 0 || o.notes.length > 0) && <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-steel">{[...o.notes, ...o.remaining].map((r) => <li key={r}>{r}</li>)}</ul>}
                          </button>
                        </li>
                      ))}
                    </ol>
                  ) : <EmptyState title="No feasible option found">No alternative in the current simulated inventory meets your party size, timing and the rest of your trip. A larger flexibility window or budget may open options.</EmptyState>}
                  {res.rejected.length > 0 && (
                    <details className="mt-3 rounded-xl border border-line p-3 text-sm"><summary className="cursor-pointer text-steel">Considered but not feasible ({res.rejected.length})</summary><ul className="mt-2 space-y-1 text-xs text-steel">{res.rejected.map((r, i) => <li key={i}><span className="text-warm">{r.name}</span>: {r.reason}</li>)}</ul></details>
                  )}
                  {chosen && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/40 bg-gold/5 p-4">
                      <p className="text-sm">Selected: <strong>{chosen.name}</strong>, arriving {clock(chosen.arrival, destPlace)} for {costDelta(chosen.extraCost)}.</p>
                      <Button variant="primary" onClick={() => setConfirm(true)}><PlaneTakeoff size={15} />Review & approve</Button>
                    </div>
                  )}
                </div>
              </ShieldTimeline>
            )}
          </div>
        </div>
      )}

      {confirm && chosen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/80 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal aria-label="Approve replacement" onClick={() => setConfirm(false)}>
          <div className="rise w-full max-w-md rounded-2xl border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="display mb-2 text-2xl">Switch to this plan?</h2>
            <p className="text-sm text-steel">{chosen.name}</p>
            <dl className="num my-4 grid grid-cols-2 gap-y-1.5 text-sm"><dt className="text-steel">New arrival</dt><dd className="text-right">{clock(chosen.arrival, destPlace)}</dd><dt className="text-steel">Versus plan</dt><dd className="text-right">{fmtDur(chosen.vsPlan)} {chosen.vsPlan > 0 ? "later" : "earlier"}</dd><dt className="text-steel">Additional cost</dt><dd className="text-right">{costDelta(chosen.extraCost)}</dd><dt className="text-steel">New segments</dt><dd className="text-right">{usd(chosen.cost)}</dd></dl>
            <Notice tone="warn">Demo only. Approving updates your simulated itinerary in this browser. It does not rebook anything or secure an aircraft.</Notice>
            <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="primary" onClick={approve}>Approve in demo</Button></div>
          </div>
        </div>
      )}
    </>
  );
}

/** After approval: what changed against the plan, and which commitments the new plan still protects. */
function Outcome({ diff }: { diff: RecoveryDiff }) {
  const { arrival, cost, protections } = diff;
  const later = arrival.deltaMin > 0;
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { top.current?.scrollIntoView({ block: "start" }); }, []);
  return (
    <div ref={top} className="jf-step scroll-mt-20 space-y-3">
      <Notice tone="ok"><CircleCheck size={16} className="mt-0.5 shrink-0" /><span><strong>Switched in the demo:</strong> your itinerary now uses “{diff.name}”. This updated the simulated plan only; no real booking, aircraft or ticket was changed.</span></Notice>
      <Card className="p-5 sm:p-6">
        <h2 className="display mb-4 text-2xl">Before and after</h2>
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[300px] text-sm">
            <caption className="sr-only">Planned itinerary compared with the approved replacement</caption>
            <thead><tr className="text-left text-xs text-steel"><th scope="col" className="pb-2 font-normal" /><th scope="col" className="pb-2 font-normal">Before</th><th scope="col" className="pb-2 font-normal">After</th><th scope="col" className="pb-2 text-right font-normal">Change</th></tr></thead>
            <tbody className="divide-y divide-line/60">
              <tr><th scope="row" className="py-2 pr-3 text-left font-normal text-steel">Arrival</th><td className="py-2">{clock(arrival.before, diff.place)}</td><td className="py-2">{clock(arrival.after, diff.place)}</td><td className={cx("py-2 text-right", later ? "text-warn" : "text-ok")}>{arrival.deltaMin === 0 ? "On time" : `${fmtDur(arrival.deltaMin)} ${later ? "later" : "earlier"}`}</td></tr>
              <tr><th scope="row" className="py-2 pr-3 text-left font-normal text-steel">Cost of the replaced part</th><td className="py-2">{usd(cost.before)}</td><td className="py-2">{usd(cost.after)}</td><td className={cx("py-2 text-right", cost.delta > 0 ? "text-warn" : "text-ok")}>{costDelta(cost.delta)}</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.14em] text-gold">What is protected</h3>
        <ul className="space-y-2">
          {protections.map((p) => (
            <li key={p.id} className="flex items-start gap-2.5 text-sm">
              {p.ok ? <CircleCheck size={16} className="mt-0.5 shrink-0 text-ok" aria-hidden /> : <CircleAlert size={16} className="mt-0.5 shrink-0 text-warn" aria-hidden />}
              <span><span className="text-warm">{p.label}</span> <Badge tone={p.ok ? "ok" : "warn"}>{p.ok ? (p.id === "risk" ? "Within limit" : "Kept") : "Check"}</Badge><span className="mt-0.5 block text-xs text-steel">{p.detail}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[11px] leading-snug text-steel">Illustrative figures over simulated inventory. Cost assumes the unused part of the original plan is credited back.</p>
      </Card>
    </div>
  );
}
