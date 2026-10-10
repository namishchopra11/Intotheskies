"use client";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AIRCRAFT_TYPES, AIRPORTS, FLEET, METROS, OPERATORS, RULES } from "@/lib/jetflex/data";
import { demandList, fleetOverview, rankOpportunities, totals, type Opportunity } from "@/lib/jetflex/operator";
import { addDays, fmtDate, fmtDur, fmtHHmm, localDate, localHHmm, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import type { LegStatus } from "@/lib/jetflex/types";
import { Badge, Button, Card, cx, Field, Input, Notice, PageHeader, Select, SimBadge, Skeleton, Stat, Toggle } from "./ui";

const when = (l: Opportunity["leg"]) => { const tz = AIRPORTS[l.from].tz; return `${fmtDate(localDate(l.earliest, tz))} · ${fmtHHmm(localHHmm(l.earliest, tz))}–${fmtHHmm(localHHmm(l.latest, tz))}`; };
const pct = (x: number) => `${Math.round(x * 100)}%`;

function Detail({ o }: { o: Opportunity }) {
  const patch = useJet((s) => s.patchLeg);
  const [price, setPrice] = useState(String(o.leg.price));
  const l = o.leg;
  const n = Number(price.replace(/\D/g, ""));
  return (
    <div className="grid gap-6 border-t border-line bg-deep/60 p-5 lg:grid-cols-3">
      <div className="space-y-4 text-sm">
        <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-gold">Why it was flagged</p><p className="leading-relaxed text-steel">{o.flagged}</p></div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-gold">Revenue vs flying empty (illustrative)</p>
          <dl className="num grid grid-cols-[1fr_auto] gap-y-1">
            <dt className="text-steel">Flies empty, net</dt><dd className="text-bad">{usd(o.empty.net)}</dd>
            <dt className="text-steel">Sold at {usd(l.price)}, net</dt><dd className="text-ok">{usd(o.sold.net)}</dd>
            <dt className="text-steel">Uplift if sold</dt><dd>{usd(o.uplift)}</dd>
            <dt className="text-steel">Model confidence</dt><dd>{pct(o.confidence)}</dd>
            <dt className="text-steel">Expected revenue</dt><dd>{usd(o.expected)}</dd>
          </dl>
          <p className="mt-2 text-[11px] leading-snug text-steel">Positioning cost modeled as {pct(RULES.positioningCostShare)} of the charter estimate; handling and catering {usd(RULES.marginalCost)} if sold. Confidence = 1 − Π(1 − match × 35% conversion), × (1 − availability risk {pct(l.risk)}). A model estimate, not a forecast.</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-gold">Actions</p>
          <div className="flex gap-2"><Input aria-label="Offer price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /><Button variant="primary" disabled={!n || n < 500 || n === l.price} onClick={() => patch(l.id, { price: n })}>Set price</Button></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => { setPrice(String(l.suggested)); patch(l.id, { price: l.suggested }); }}>Use suggested {usd(l.suggested)}</Button><Button size="sm" onClick={() => { setPrice(String(o.bestPrice.price)); patch(l.id, { price: o.bestPrice.price }); }}>Use model-optimal {usd(o.bestPrice.price)}</Button></div>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-gold">Compatible demand ({o.matches.length})</p>
          {o.matches.length ? (
            <ul className="divide-y divide-line/60 rounded-xl border border-line text-sm">
              {o.matches.map((m) => (
                <li key={m.demand.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span><span className="block">{m.demand.label}{m.demand.live && <Badge tone="gold" className="ml-2">Live from your search</Badge>}</span><span className="num text-xs text-steel">{m.demand.pax} pax · ±{m.demand.flexH || "0"}h · budget {usd(m.demand.budget)} · departs {fmtDur(m.dev)} from their time</span></span>
                  <span className="num text-right"><span className="text-teal">{m.score.toFixed(2)}</span><span className="block text-[11px] text-steel">route {m.parts.route.toFixed(2)} · time {m.parts.time.toFixed(2)} · seats {m.parts.capacity.toFixed(2)} · price {m.parts.price.toFixed(2)}</span></span>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-xl border border-dashed border-line p-3 text-sm text-steel">No simulated search matches this leg at the current price and timing.</p>}
          <p className="mt-1.5 text-[11px] text-steel">Match score = 35% route + 30% time fit + 15% seat fit + 20% budget headroom. Searches are simulated.</p>
        </div>
        {o.near.length > 0 && <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-warn">Near misses</p><ul className="space-y-0.5 text-xs text-steel">{o.near.slice(0, 4).map((m) => <li key={m.demand.id}>{m.demand.label}: {m.reason}</li>)}</ul></div>}
        {o.suggestions.length > 0 && <div><p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-teal">Suggestions</p><ul className="list-disc space-y-1 pl-5 text-sm text-steel">{o.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      </div>
    </div>
  );
}

export function OperatorPage() {
  const { ready, today, legs, request } = useWorld();
  const patch = useJet((s) => s.patchLeg);
  const custom = useJet((s) => s.customFlights);
  const addFlight = useJet((s) => s.addFlight);
  const removeFlight = useJet((s) => s.removeFlight);
  const [open, setOpen] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ aircraft: "JX101", from: "TEB", to: "OPF", date: "", time: "08:00" });
  const [added, setAdded] = useState<string | null>(null);
  const [nextWeek, setNextWeek] = useState(false);

  // `tick` forces a recompute when "Refresh matching" is pressed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const demand = useMemo(() => demandList(today, request), [today, request, tick]);
  const ops = useMemo(() => (ready ? rankOpportunities(legs, demand) : []), [ready, legs, demand]);
  const fleet = useMemo(() => (ready ? fleetOverview(today, legs, custom) : []), [ready, today, legs, custom]);
  const t = totals(ops);
  const refresh = () => { setBusy(true); setTimeout(() => { setTick((x) => x + 1); setBusy(false); }, 700); };
  const date = form.date || (ready ? addDays(today, 3) : "");
  const gaPorts = Object.values(AIRPORTS).filter((a) => a.ga);
  const submit = () => {
    const id = `C${custom.length + 1}${Date.now().toString(36).slice(-3)}`;
    addFlight({ id, aircraft: form.aircraft, from: form.from, to: form.to, date, dep: form.time });
    setAdded(`Added ${form.aircraft} ${form.from}→${form.to}. Any new repositioning gap appears in the list below, unpublished.`);
  };
  const formErr = form.from === form.to ? "Origin and destination must differ." : null;

  if (!ready) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHeader eyebrow="JetFlex Intelligence · Operator" title={<>Turn empty repositioning legs <span className="text-gold">into revenue.</span></>} action={<SimBadge>Sample fleet · illustrative figures</SimBadge>}>
        JetFlex reads an operator’s schedule, finds aircraft that must fly empty, matches them to traveler searches and models the upside. Changes here feed straight into the traveler search.
      </PageHeader>

      <Card className="mb-8 grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Detected legs" value={t.legs} note="Gaps between consecutive booked flights." />
        <Stat label="Published" value={t.published} note="Visible to travelers right now." />
        <Stat label="Potential gross" value={usd(t.gross)} note="If every published leg sold at its offer. Modeled." />
        <Stat label="Expected revenue" value={usd(t.expected)} note="Offer × model confidence. Not a forecast." />
        <Stat label="Legs with demand" value={`${t.matched}/${t.published}`} note={`${t.seats} seats of otherwise empty capacity.`} />
      </Card>

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="display text-2xl">Detected empty legs</h2><Button onClick={refresh} disabled={busy}><RefreshCw size={15} className={busy ? "animate-spin" : ""} />{busy ? "Refreshing…" : "Refresh matching"}</Button></div>
        {busy ? <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : (
          <div className="overflow-hidden rounded-2xl border border-line">
            {ops.filter((o) => nextWeek || !/w1$/.test(o.leg.id)).map((o) => {
              const l = o.leg;
              const isOpen = open === l.id;
              return (
                <div key={l.id} className="border-b border-line/70 last:border-0">
                  <div className="grid grid-cols-1 items-center gap-3 p-4 lg:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_auto]">
                    <div><p className="text-sm">{l.from} → {l.to} <span className="text-steel">· {METROS[AIRPORTS[l.from].metro].short} to {METROS[AIRPORTS[l.to].metro].short}</span></p><p className="num text-xs text-steel">{when(l)} · {l.aircraftId} {AIRCRAFT_TYPES[l.typeId].short} · {l.cap} seats · {OPERATORS[l.operator].name}</p></div>
                    <div className="num text-sm"><span className="text-warm">{usd(l.price)}</span> <span className="text-steel">offer</span><p className="text-xs text-steel">charter est. {usd(l.charterEst)} · suggested {usd(l.suggested)}</p></div>
                    <div className="flex flex-wrap items-center gap-1.5"><Badge tone={l.published ? "ok" : "steel"}>{l.published ? "Published" : "Detected only"}</Badge>{l.status !== "available" && <Badge tone={l.status === "limited" ? "warn" : "bad"}>{l.status === "limited" ? "Limited" : "Unavailable"}</Badge>}</div>
                    <div className="num text-sm"><p>{o.matches.length} match{o.matches.length === 1 ? "" : "es"}</p><p className="text-xs text-steel">{pct(o.confidence)} conf. · {usd(o.expected)} exp.</p></div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-steel">Publish<Toggle label={`Publish ${l.from} to ${l.to}`} checked={l.published} onChange={(v) => patch(l.id, { published: v })} /></label>
                      <Button size="sm" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l.id)}>Inspect<ChevronDown size={14} className={cx("transition-transform", isOpen && "rotate-180")} /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                    <span className="text-xs text-steel">Availability:</span>
                    {(["available", "limited", "unavailable"] as LegStatus[]).map((s) => <button key={s} onClick={() => patch(l.id, { status: s })} aria-pressed={l.status === s} className={cx("rounded-full border px-2.5 py-0.5 text-xs", l.status === s ? "border-gold bg-gold/10 text-gold" : "border-line text-steel hover:text-warm")}>{s === "unavailable" ? "Mark unavailable" : s[0].toUpperCase() + s.slice(1)}</button>)}
                  </div>
                  {isOpen && <Detail key={`${l.id}-${l.price}-${tick}`} o={o} />}
                </div>
              );
            })}
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm text-steel"><Toggle label="Include the following week" checked={nextWeek} onChange={setNextWeek} />Include the following week ({ops.filter((o) => /w1$/.test(o.leg.id)).length} more legs)</label>
        <p className="mt-2 text-xs text-steel">Published, available legs appear in traveler search immediately. Set one unavailable and it moves to the traveler’s “excluded” list.</p>
      </section>

      <div className="mb-10 grid gap-8 xl:grid-cols-2">
        <section>
          <h2 className="display mb-3 text-2xl">Schedule intelligence</h2>
          <Card className="space-y-4 p-5">
            <p className="text-sm text-steel">Add an upcoming booked flight. If the aircraft’s next departure is somewhere other than where this one ends, JetFlex flags the gap as a repositioning opportunity.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aircraft">{(id) => <Select id={id} value={form.aircraft} onChange={(e) => setForm({ ...form, aircraft: e.target.value })}>{FLEET.map((a) => <option key={a.id} value={a.id}>{a.id} · {AIRCRAFT_TYPES[a.type].short}</option>)}</Select>}</Field>
              <Field label="Date">{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => setForm({ ...form, date: e.target.value })} />}</Field>
              <Field label="From">{(id) => <Select id={id} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>{gaPorts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.city}</option>)}</Select>}</Field>
              <Field label="To">{(id) => <Select id={id} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>{gaPorts.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.city}</option>)}</Select>}</Field>
              <Field label="Departure (local)">{(id) => <Input id={id} type="time" value={form.time} onChange={(e) => e.target.value && setForm({ ...form, time: e.target.value })} />}</Field>
              <div className="flex items-end"><Button variant="primary" className="w-full" disabled={!!formErr} onClick={submit}><Plus size={15} />Add flight</Button></div>
            </div>
            {formErr && <p className="text-xs text-bad">{formErr}</p>}
            {added && <Notice tone="ok"><Check size={15} className="mt-0.5 shrink-0" />{added}</Notice>}
            {custom.length > 0 && <ul className="divide-y divide-line/60 rounded-xl border border-line text-sm">{custom.map((f) => <li key={f.id} className="flex items-center justify-between px-3 py-2"><span className="num">{f.aircraft} {f.from}→{f.to} · {fmtDate(f.date!)} {fmtHHmm(f.dep)}</span><button aria-label="Remove flight" onClick={() => removeFlight(f.id)} className="text-steel hover:text-bad"><Trash2 size={15} /></button></li>)}</ul>}
          </Card>
        </section>
        <section>
          <h2 className="display mb-3 text-2xl">Demand matching</h2>
          <div className="overflow-hidden rounded-2xl border border-line text-sm">
            {demand.slice(0, 12).map((d) => {
              const n = ops.filter((o) => o.leg.published && o.matches.some((m) => m.demand.id === d.id)).length;
              return <div key={d.id} className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-2.5 last:border-0"><span><span className="block">{d.label}{d.live && <Badge tone="gold" className="ml-2">Live</Badge>}</span><span className="num text-xs text-steel">{METROS[d.from].short} → {METROS[d.to].short} · {fmtDate(d.date)} · {d.pax} pax · ±{d.flexH}h · {usd(d.budget)}</span></span><Badge tone={n ? "ok" : "steel"}>{n} leg{n === 1 ? "" : "s"}</Badge></div>;
            })}
          </div>
          <p className="mt-2 text-xs text-steel">Searches are simulated, plus your own current search on Plan a Trip. Ranked by route, timing, seats and budget fit.</p>
        </section>
      </div>

      <section>
        <h2 className="display mb-3 text-2xl">Fleet overview</h2>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[760px] text-sm"><thead className="bg-panel/60 text-left text-xs text-steel"><tr>{["Aircraft", "Type", "Seats", "Operator", "At planning time", "Status", "Next booked flights"].map((h) => <th key={h} scope="col" className="p-3 font-normal">{h}</th>)}</tr></thead>
            <tbody>{fleet.map((f) => <tr key={f.aircraft.id} className="border-t border-line/70"><td className="num p-3">{f.aircraft.id}</td><td className="p-3">{f.type.name}</td><td className="num p-3">{f.type.cap}</td><td className="p-3 text-steel">{OPERATORS[f.aircraft.operator].name}</td><td className="num p-3">{f.location}</td><td className="p-3"><Badge tone={f.status === "On schedule" ? "ok" : f.status.startsWith("Positioning leg withdrawn") ? "bad" : "warn"}>{f.status}</Badge></td><td className="num p-3 text-xs text-steel">{f.upcoming.join(" · ") || "None in window"}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-steel">Sample fleet and schedule, all fictional. “Planning time” is midnight on the anchor Friday.</p>
      </section>
    </>
  );
}
