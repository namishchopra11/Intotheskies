"use client";
import { useMemo, useState } from "react";
import { Hourglass, Sparkles } from "lucide-react";
import { DEMO_METROS, METROS } from "@/lib/jetflex/data";
import { GOALS, parseTimeBack, timeBack, type Goal, type TbOption, type TimeBackInput } from "@/lib/jetflex/timeback";
import { fmtDur, fmtHHmm, nextDow, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import { Badge, Button, Card, cx, EmptyState, Field, Input, Notice, PageHeader, Select, SimBadge, Skeleton } from "./ui";
import { clock, riskLabel } from "./Itinerary";

const EXAMPLE = "I have a two-hour meeting in Chicago at 10am Friday and need to be back in New York for dinner.";

function Bar({ o }: { o: TbOption }) {
  const len = (j: TbOption["it"]["journeys"][number]) => j.segments[j.segments.length - 1].arr - j.segments[0].dep;
  const [a, c] = [len(o.it.journeys[0]), len(o.it.journeys[1])];
  const total = a + o.timeAtDest + c;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-deep" role="img" aria-label={`Outbound ${fmtDur(a)}, at destination ${fmtDur(o.timeAtDest)}, return ${fmtDur(c)}`}>
      <span style={{ width: `${(a / total) * 100}%` }} className="bg-steel/70" /><span style={{ width: `${(o.timeAtDest / total) * 100}%` }} className="bg-gold" /><span style={{ width: `${(c / total) * 100}%` }} className="bg-steel/70" />
    </div>
  );
}

export function TimeBackPage() {
  const { ready, today, legs } = useWorld();
  const setActive = useJet((s) => s.setActive);
  const fri = ready ? nextDow(today, 5) : "2026-01-01";
  const [inp, setInp] = useState<TimeBackInput>({ from: "nyc", to: "chi", date: "", pax: 2, arriveBy: "10:00", meetingMin: 120, homeBy: "19:00", cushionMin: 30, goal: "balanced" });
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const date = inp.date || fri;
  const set = (p: Partial<TimeBackInput>) => setInp({ ...inp, ...p });
  const errors = [inp.from === inp.to && "Origin and destination must differ.", inp.meetingMin < 15 && "Allow at least 15 minutes at the destination.", inp.pax < 1 && "At least one traveler.", date < today && "Date is in the past."].filter(Boolean) as string[];
  const res = useMemo(() => (ready && !errors.length ? timeBack({ ...inp, date }, legs) : null), [ready, inp, date, legs, errors.length]);
  const [sel, setSel] = useState(0);
  const chosen = res?.options[Math.min(sel, (res?.options.length ?? 1) - 1)];
  const apply = () => { const r = parseTimeBack(text, today, { ...inp, date }); setInp(r.input); setNotes(r.notes); setSel(0); };
  if (!ready) return <Skeleton className="h-96" />;
  const dest = METROS[inp.to].short;
  return (
    <>
      <PageHeader eyebrow="TimeBack" title={<>Plan the trip around <span className="text-gold">the thing that matters.</span></>} action={<SimBadge>Deterministic schedule math</SimBadge>}>
        Tell TimeBack when you must be somewhere, how long you need there and when you must be home. It builds every feasible out-and-back from the simulated inventory and shows exactly how much time you get on the ground.
      </PageHeader>
      <div className="grid gap-8 xl:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <label htmlFor="tb-nl" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold"><Sparkles size={14} />Describe the goal</label>
            <textarea id="tb-nl" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="w-full resize-none rounded-xl border border-line bg-deep px-3 py-2.5 text-sm placeholder:text-steel/60 focus:border-gold focus:outline-none" />
            <div className="mt-2 flex flex-wrap gap-2"><Button variant="primary" size="sm" disabled={!text.trim()} onClick={apply}>Fill the form</Button><Button size="sm" onClick={() => setText(EXAMPLE)}>Use example</Button></div>
            {notes.length > 0 && <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-steel">{notes.map((n) => <li key={n}>{n}</li>)}</ul>}
          </Card>
          <Card className="space-y-4 p-5">
            <h2 className="display text-xl">Your commitment</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">{(id) => <Select id={id} value={inp.from} onChange={(e) => set({ from: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].short}</option>)}</Select>}</Field>
              <Field label="Destination">{(id) => <Select id={id} value={inp.to} onChange={(e) => set({ to: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].short}</option>)}</Select>}</Field>
              <Field label="Date">{(id) => <Input id={id} type="date" min={today} value={date} onChange={(e) => e.target.value && set({ date: e.target.value })} />}</Field>
              <Field label="Travelers">{(id) => <Input id={id} type="number" min={1} max={13} value={inp.pax} onChange={(e) => set({ pax: Math.max(1, Math.min(13, Number(e.target.value) || 1)) })} />}</Field>
              <Field label={`Be at ${dest} by`}>{(id) => <Input id={id} type="time" value={inp.arriveBy} onChange={(e) => e.target.value && set({ arriveBy: e.target.value })} />}</Field>
              <Field label="Time needed there (min)">{(id) => <Input id={id} type="number" min={15} step={15} value={inp.meetingMin} onChange={(e) => set({ meetingMin: Number(e.target.value) || 0 })} />}</Field>
              <Field label="Back home by">{(id) => <Input id={id} type="time" value={inp.homeBy} onChange={(e) => e.target.value && set({ homeBy: e.target.value })} />}</Field>
              <Field label="Arrival cushion (min)">{(id) => <Select id={id} value={inp.cushionMin} onChange={(e) => set({ cushionMin: Number(e.target.value) })}>{[0, 15, 30, 60, 90].map((v) => <option key={v} value={v}>{v} min</option>)}</Select>}</Field>
              <Field label="Max budget (optional)" className="col-span-2">{(id) => <Input id={id} inputMode="numeric" placeholder="Total, USD" value={inp.budget ?? ""} onChange={(e) => set({ budget: Number(e.target.value.replace(/\D/g, "")) || undefined })} />}</Field>
            </div>
            <Field label="Optimise for">{() => <div className="grid grid-cols-2 gap-1.5">{(Object.keys(GOALS) as Goal[]).map((g) => <button key={g} onClick={() => { set({ goal: g }); setSel(0); }} aria-pressed={inp.goal === g} className={cx("min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors", inp.goal === g ? "border-gold bg-gold/10" : "border-line text-steel hover:text-warm")}>{GOALS[g].label}</button>)}</div>}</Field>
            {errors.map((e) => <Notice key={e} tone="bad">{e}</Notice>)}
          </Card>
        </div>

        <div className="min-w-0 space-y-6" aria-live="polite">
          {!res ? <Skeleton className="h-64" /> : !res.options.length ? (
            <EmptyState icon={<Hourglass size={28} />} title="No feasible itinerary">{res.reason} Try a later arrival time, a shorter stay, a later return deadline or a smaller cushion.</EmptyState>
          ) : chosen && (
            <>
              <Card className="p-5 sm:p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="gold">{GOALS[inp.goal].label}</Badge>{chosen.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}</div>
                <h2 className="display text-2xl">{chosen.it.name}</h2>
                <div className="num mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div><p className="text-xs text-steel">On the ground</p><p className="text-2xl text-gold">{fmtDur(chosen.timeAtDest)}</p><p className="text-xs text-steel">{fmtDur(chosen.slack)} beyond your {fmtDur(inp.meetingMin)}</p></div>
                  <div><p className="text-xs text-steel">Total travel</p><p className="text-2xl">{fmtDur(chosen.travelMin)}</p><p className="text-xs text-steel">door to door, both ways</p></div>
                  <div><p className="text-xs text-steel">Total cost</p><p className="text-2xl">{usd(chosen.it.totalPrice)}</p><p className="text-xs text-steel">{usd(chosen.it.perPerson)} per person</p></div>
                  <div><p className="text-xs text-steel">Home margin</p><p className="text-2xl">{fmtDur(chosen.homeMargin)}</p><p className="text-xs text-steel">before {fmtHHmm(inp.homeBy)}</p></div>
                </div>
                <div className="mt-5"><Bar o={chosen} /><p className="mt-1.5 flex justify-between text-[11px] text-steel"><span>Outbound</span><span className="text-gold">At {dest}</span><span>Return</span></p></div>
                <div className="mt-5 space-y-2 text-[15px] leading-relaxed">
                  <p>You reach {dest} at <span className="num">{clock(chosen.arriveDoor, `door:${inp.to}`)}</span>, {fmtDur(chosen.arriveMargin)} before your {fmtHHmm(inp.arriveBy)} deadline. That leaves {fmtDur(chosen.timeAtDest)} on the ground, {fmtDur(chosen.slack)} more than the {fmtDur(inp.meetingMin)} you need, and you are home at <span className="num">{clock(chosen.homeAt, `door:${inp.from}`)}</span>.</p>
                  <p className="text-steel">Modeled risk of missing the commitment: <span className="text-warm">{riskLabel(chosen.missRisk)} ({Math.round(chosen.missRisk * 100)}%)</span>, scaled down by your {fmtDur(chosen.arriveMargin)} cushion. Risk of cutting the return close: {Math.round(chosen.homeRisk * 100)}%.</p>
                  {chosen.it.journeys.some((j) => j.segments.some((s) => s.mode === "empty_leg")) && <p className="text-warn">This uses an empty leg: the operator can change or withdraw it, so keep a fallback.</p>}
                </div>
                {res.cheapest && res.cheapest.it.id !== chosen.it.id && (
                  <div className="mt-5 rounded-xl border border-line bg-deep p-4 text-sm">
                    <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-teal">If this is too expensive</p>
                    <p>{res.cheapest.it.name} costs <span className="num text-ok">{usd(chosen.it.totalPrice - res.cheapest.it.totalPrice)}</span> less ({usd(res.cheapest.it.totalPrice)}), with {fmtDur(res.cheapest.timeAtDest)} on the ground ({res.cheapest.timeAtDest >= chosen.timeAtDest ? `${fmtDur(res.cheapest.timeAtDest - chosen.timeAtDest)} more` : `${fmtDur(chosen.timeAtDest - res.cheapest.timeAtDest)} less`}) and a {Math.round(res.cheapest.missRisk * 100)}% modeled risk of missing it.</p>
                  </div>
                )}
                <Button className="mt-4" onClick={() => setActive(chosen.it)}>Use as my active itinerary</Button>
              </Card>
              <div>
                <h3 className="display mb-3 text-xl">All feasible options ({res.options.length})</h3>
                <div className="overflow-x-auto rounded-2xl border border-line">
                  <table className="w-full min-w-[640px] text-sm"><thead className="bg-panel/60 text-left text-xs text-steel"><tr>{["Option", "Cost", "On the ground", "Slack", "Home margin", "Miss risk"].map((h) => <th key={h} scope="col" className="p-3 font-normal">{h}</th>)}</tr></thead>
                    <tbody>{res.options.map((o, i) => (
                      <tr key={o.it.id} onClick={() => setSel(i)} className={cx("cursor-pointer border-t border-line/70 hover:bg-panel/60", o === chosen && "bg-panel-2")}>
                        <td className="p-3"><button className="flex min-h-11 items-center text-left underline-offset-2 hover:underline" aria-pressed={o === chosen} onClick={() => setSel(i)}>{o.it.name}</button><div className="mt-1 flex gap-1">{o.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}</div></td>
                        <td className="num p-3">{usd(o.it.totalPrice)}</td><td className="num p-3">{fmtDur(o.timeAtDest)}</td><td className="num p-3">{fmtDur(o.slack)}</td><td className="num p-3">{fmtDur(o.homeMargin)}</td><td className="num p-3">{Math.round(o.missRisk * 100)}%</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
