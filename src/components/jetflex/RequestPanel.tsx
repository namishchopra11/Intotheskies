"use client";
import { useState } from "react";
import { ArrowRightLeft, Minus, Plus, Send, Sparkles } from "lucide-react";
import { DEMO_METROS, METROS } from "@/lib/jetflex/data";
import { FLEX_LABEL } from "@/lib/jetflex/journeys";
import { EXAMPLE_PROMPTS, parseRequest, type Parsed } from "@/lib/jetflex/parser";
import { PRESETS } from "@/lib/jetflex/search";
import type { PresetId, SearchResult, TripRequest, Weights } from "@/lib/jetflex/types";
import { useJet } from "@/lib/jetflex/store";
import { FlexProfile } from "./Results";
import { Badge, Button, cx, Field, Input, Notice, Segmented, Select } from "./ui";

export function validateRequest(r: TripRequest, today: string): string[] {
  const e: string[] = [];
  if (r.from === r.to) e.push("Origin and destination must differ.");
  if (!Number.isInteger(r.pax) || r.pax < 1 || r.pax > 30) e.push("Party size must be between 1 and 30.");
  if (r.departDate < today) e.push("Departure date is in the past.");
  if (r.returnDate && r.returnDate < r.departDate) e.push("Return date is before the departure date.");
  if (r.budget != null && r.budget < 100) e.push("Budget looks too low to be a total trip budget.");
  return e;
}

const WEIGHT_LABEL: Record<keyof Weights, string> = { cost: "Cost", speed: "Speed", control: "Schedule control", privacy: "Privacy", certainty: "Certainty" };

/** The agent box: type a request, see what was understood, edit anything in the form below. */
export function Assistant({ req, today, onApply, compact }: { req: TripRequest; today: string; onApply: (r: TripRequest) => void; compact?: boolean }) {
  const addHistory = useJet((s) => s.addHistory);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [answer, setAnswer] = useState("");
  const run = (t: string, refine = false) => {
    if (!t.trim()) return;
    const p = parseRequest(t, today, req, refine);
    setParsed(p);
    onApply(p.request);
    if (!refine) addHistory(t.trim());
  };
  return (
    <div>
      <label htmlFor="nl" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold"><Sparkles size={14} />Describe your trip</label>
      <div className="rounded-2xl border border-line bg-deep p-2 focus-within:border-gold">
        <textarea id="nl" rows={compact ? 3 : 4} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(text); }}
          placeholder="Find the best way for four people to fly from New York to Miami this Friday, returning Sunday. I can move the departure by up to six hours if it saves money."
          className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-warm placeholder:text-steel/60 focus:outline-none" />
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <span className="text-[11px] text-steel">Parsed on your device with plain rules. No AI service is called.</span>
          <Button variant="primary" size="sm" onClick={() => run(text)} disabled={!text.trim()}><Send size={14} />Plan trip</Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => { setText(p); run(p); }} className="max-w-full truncate rounded-full border border-line px-3 py-1 text-xs text-steel hover:border-gold hover:text-warm" title={p}>{p.length > 52 ? `${p.slice(0, 50)}…` : p}</button>
        ))}
      </div>

      {parsed && (
        <div className="rise mt-4 space-y-3 rounded-2xl border border-line bg-panel/60 p-4" aria-live="polite">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">What I understood</p>
          <div className="flex flex-wrap gap-1.5">{parsed.understood.length ? parsed.understood.map((u) => <Badge key={u.field} tone="teal">{u.field}: {u.value}</Badge>) : <span className="text-sm text-steel">Nothing recognised yet.</span>}</div>
          {parsed.assumptions.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-steel">{parsed.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>}
          {parsed.question && (
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
              <p className="text-sm">{parsed.question}</p>
              <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(`${text} ${answer}`); setText(`${text} ${answer}`); setAnswer(""); }}>
                <Input aria-label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. from Los Angeles" />
                <Button type="submit" variant="primary" size="sm">Answer</Button>
              </form>
              <p className="mt-2 text-xs text-steel">Or just pick the airports in the form below.</p>
            </div>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = (e.currentTarget.elements.namedItem("refine") as HTMLInputElement).value; run(t, true); e.currentTarget.reset(); }}>
            <Input name="refine" aria-label="Refine your request" placeholder="Refine: “make it fastest”, “only 3 people”, “under $20k”" />
            <Button type="submit" size="sm">Refine</Button>
          </form>
        </div>
      )}
    </div>
  );
}

export function RequestForm({ req, today, onChange, result }: { req: TripRequest; today: string; onChange: (r: TripRequest) => void; result?: SearchResult }) {
  const set = (p: Partial<TripRequest>) => onChange({ ...req, ...p });
  const errors = validateRequest(req, today);
  const metros = DEMO_METROS.map((m) => ({ value: m, label: METROS[m].name }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label="From">{(id) => <Select id={id} value={req.from} onChange={(e) => set({ from: e.target.value })}>{metros.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
        <button aria-label="Swap origin and destination" onClick={() => set({ from: req.to, to: req.from })} className="mb-1 rounded-lg border border-line p-2 text-steel hover:text-gold"><ArrowRightLeft size={15} /></button>
        <Field label="To">{(id) => <Select id={id} value={req.to} onChange={(e) => set({ to: e.target.value })}>{metros.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Depart">{(id) => <Input id={id} type="date" min={today} value={req.departDate} onChange={(e) => e.target.value && set({ departDate: e.target.value })} />}</Field>
        <Field label="Return">{(id) => <Input id={id} type="date" min={req.departDate} value={req.returnDate ?? ""} onChange={(e) => set({ returnDate: e.target.value || undefined })} />}</Field>
        <Field label="Preferred departure">{(id) => <Input id={id} type="time" value={req.departTime} onChange={(e) => e.target.value && set({ departTime: e.target.value })} />}</Field>
        <Field label="Preferred return">{(id) => <Input id={id} type="time" value={req.returnTime} disabled={!req.returnDate} onChange={(e) => e.target.value && set({ returnTime: e.target.value })} />}</Field>
        <Field label="Travelers">
          {(id) => (
            <div className="flex items-center gap-1 rounded-xl border border-line bg-deep p-1">
              <button aria-label="Fewer travelers" className="rounded-lg p-2 text-steel hover:text-warm disabled:opacity-30" disabled={req.pax <= 1} onClick={() => set({ pax: req.pax - 1 })}><Minus size={14} /></button>
              <input id={id} inputMode="numeric" className="num w-full bg-transparent text-center text-sm focus:outline-none" value={req.pax} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); set({ pax: Math.min(30, n) }); }} />
              <button aria-label="More travelers" className="rounded-lg p-2 text-steel hover:text-warm disabled:opacity-30" disabled={req.pax >= 30} onClick={() => set({ pax: req.pax + 1 })}><Plus size={14} /></button>
            </div>
          )}
        </Field>
        <Field label="Max budget (total)">{(id) => <Input id={id} inputMode="numeric" placeholder="Optional, USD" value={req.budget ?? ""} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); set({ budget: n ? n : undefined }); }} />}</Field>
        <Field label="Arrive by (destination)" className="col-span-2">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="time" value={req.arriveBy ?? ""} onChange={(e) => set({ arriveBy: e.target.value || undefined })} />
              {req.arriveBy && <Button size="sm" onClick={() => set({ arriveBy: undefined })}>Clear</Button>}
            </div>
          )}
        </Field>
      </div>
      <Field label="Schedule flexibility" hint="Applies to departure on each travel date. The list, scores and map recalculate immediately.">
        {() => (
          <>
            <Segmented label="Schedule flexibility" value={req.flexH} onChange={(v) => set({ flexH: v })} options={([0, 2, 6, 12, 24] as const).map((v) => ({ value: v, label: v === 0 ? "Fixed" : v === 24 ? "Whole day" : `±${v}h` }))} />
            <p className="mt-1 text-xs text-gold">{FLEX_LABEL[req.flexH]}</p>
            {result && <FlexProfile profile={result.flexProfile} current={req.flexH} />}
          </>
        )}
      </Field>
      {errors.map((e) => <Notice key={e} tone="bad">{e}</Notice>)}
    </div>
  );
}

export function Priorities({ req, onChange }: { req: TripRequest; onChange: (r: TripRequest) => void }) {
  const presets = Object.entries(PRESETS).filter(([k]) => k !== "custom") as [PresetId, (typeof PRESETS)["balanced"]][];
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.1em] text-steel">What matters most</p>
      <div className="grid grid-cols-2 gap-1.5">
        {presets.map(([k, p]) => (
          <button key={k} onClick={() => onChange({ ...req, preset: k, weights: p.weights })} aria-pressed={req.preset === k} title={p.blurb}
            className={cx("rounded-xl border px-3 py-2 text-left text-xs transition-colors", req.preset === k ? "border-gold bg-gold/10 text-warm" : "border-line text-steel hover:border-steel hover:text-warm")}>{p.label}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-steel">{PRESETS[req.preset].blurb}</p>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-gold">Fine-tune weights {req.preset === "custom" && <Badge tone="gold">Custom</Badge>}</summary>
        <div className="mt-3 space-y-3">
          {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
            <label key={k} className="grid grid-cols-[110px_1fr_20px] items-center gap-3 text-xs text-steel">
              {WEIGHT_LABEL[k]}
              <input type="range" min={0} max={10} step={1} value={req.weights[k]} onChange={(e) => onChange({ ...req, preset: "custom", weights: { ...req.weights, [k]: Number(e.target.value) } })} />
              <span className="num text-right text-warm">{req.weights[k]}</span>
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
