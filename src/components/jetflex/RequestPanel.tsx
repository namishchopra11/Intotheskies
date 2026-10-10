"use client";
import { useRef, useState } from "react";
import { ArrowRightLeft, CircleAlert, Minus, Plus, Send, Sparkles } from "lucide-react";
import { DEMO_METROS, METROS } from "@/lib/jetflex/data";
import { FLEX_LABEL } from "@/lib/jetflex/journeys";
import { EXAMPLE_PROMPTS } from "@/lib/jetflex/parser";
import { parseRequestSmart, type SmartParsed } from "@/lib/jetflex/llmParser";
import { PRESETS } from "@/lib/jetflex/search";
import type { PresetId, SearchResult, TripRequest, Weights } from "@/lib/jetflex/types";
import { useJet } from "@/lib/jetflex/store";
import { FlexProfile } from "./Results";
import { Badge, Button, cx, ErrorState, Field, Input, Notice, Segmented, Select } from "./ui";

/**
 * Natural-language parse. Resolves with the model's reading when the server has one configured and
 * with the rule-based parser otherwise (`source` says which). It never rejects.
 */
export const parseText = (text: string, today: string, base: TripRequest, refine = false): Promise<SmartParsed> => parseRequestSmart(text, { today, base, refine });

/** Where a reading came from, for a small badge next to what was understood. */
export const SourceBadge = ({ source }: { source: SmartParsed["source"] }) =>
  source === "llm" ? <Badge tone="gold"><Sparkles size={10} aria-hidden />Read by an AI model</Badge> : <Badge tone="steel">Read by plain rules on your device</Badge>;

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
  const [parsed, setParsed] = useState<SmartParsed | null>(null);
  const [failed, setFailed] = useState<{ text: string; refine: boolean } | null>(null);
  const [answer, setAnswer] = useState("");
  const [reading, setReading] = useState(false);
  const seq = useRef(0);
  const run = async (t: string, refine = false) => {
    if (!t.trim() || reading) return;
    const id = ++seq.current;
    setReading(true);
    const p = await parseText(t, today, req, refine);
    if (id !== seq.current) return;
    setReading(false);
    setParsed(p);
    // Nothing recognised: say so and leave the current trip untouched instead of silently re-planning it.
    if (p.understood.length === 0) { setFailed({ text: t.trim(), refine }); return; }
    setFailed(null);
    onApply(p.request);
    if (!refine) addHistory(t.trim());
  };
  const places = DEMO_METROS.map((m) => METROS[m].short).join(", ");
  return (
    <div>
      <label htmlFor="nl" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold"><Sparkles size={14} />Describe your trip</label>
      <div className="rounded-2xl border border-line bg-deep p-2 focus-within:border-gold">
        <textarea id="nl" rows={compact ? 3 : 4} value={text} onChange={(e) => { setText(e.target.value); if (failed) setFailed(null); }} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void run(text); }}
          placeholder="Find the best way for four people to fly from New York to Miami this Friday, returning Sunday. I can move the departure by up to six hours if it saves money."
          className="block w-full resize-none bg-transparent px-2 py-1.5 text-base leading-relaxed text-warm placeholder:text-steel/60 focus:outline-none sm:text-[15px]" />
        <div className="flex flex-col gap-2 px-1 pb-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-steel">Read by plain rules on your device. An AI model is used only if this demo&apos;s server has one configured.</span>
          <Button variant="primary" size="sm" onClick={() => void run(text)} disabled={!text.trim() || reading}><Send size={14} />{reading ? "Reading…" : "Plan trip"}</Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLE_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => { setText(p); void run(p); }} className={cx("min-h-11 max-w-full items-center truncate rounded-full border border-line px-3 py-1 text-xs text-steel hover:border-gold hover:text-warm sm:min-h-0", i > 1 ? "hidden sm:inline-flex" : "inline-flex")} title={p}>{p.length > 52 ? `${p.slice(0, 50)}…` : p}</button>
        ))}
      </div>

      {failed && (
        <div className="mt-4">
          <ErrorState icon={<CircleAlert size={20} />} title={failed.refine ? "I couldn't apply that change" : "I couldn't find a trip in that"}
            action={!failed.refine ? <Button size="sm" onClick={() => { setText(EXAMPLE_PROMPTS[3]); void run(EXAMPLE_PROMPTS[3]); }}>Try a worked example</Button> : undefined}>
            {failed.refine
              ? <>Try “make it fastest”, “only 3 people” or “under $20k”. Your trip was not changed.</>
              : <>I look for places ({places}), dates, party size, times and what matters to you. Try “Two of us from Chicago to Miami next Friday, back Sunday”. Your current trip was not changed; you can also edit it in the form.</>}
          </ErrorState>
        </div>
      )}

      {parsed && !failed && (
        <div className="rise mt-4 space-y-3 rounded-2xl border border-line bg-panel/60 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">What I understood</p><SourceBadge source={parsed.source} /></div>
          <div className="flex flex-wrap gap-1.5">{parsed.understood.map((u) => <Badge key={u.field} tone="teal">{u.field}: {u.value}</Badge>)}</div>
          {parsed.assumptions.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-xs text-steel">{parsed.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>}
          {parsed.question && (
            <div className="rounded-xl border border-gold/40 bg-gold/5 p-3">
              <p className="text-sm">{parsed.question}</p>
              <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void run(`${text} ${answer}`); setText(`${text} ${answer}`); setAnswer(""); }}>
                <Input aria-label="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="e.g. from Los Angeles" />
                <Button type="submit" variant="primary" size="sm">Answer</Button>
              </form>
              <p className="mt-2 text-xs text-steel">Or just pick the airports in the form below.</p>
            </div>
          )}
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; const t = (form.elements.namedItem("refine") as HTMLInputElement).value; void run(t, true); form.reset(); }}>
            <Input name="refine" aria-label="Refine your request" placeholder="Refine: “make it fastest”, “only 3 people”, “under $20k”" />
            <Button type="submit" size="sm" disabled={reading}>Refine</Button>
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
      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <Field label="From">{(id) => <Select id={id} value={req.from} onChange={(e) => set({ from: e.target.value })}>{metros.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
        <button aria-label="Swap origin and destination" onClick={() => set({ from: req.to, to: req.from })} className="flex h-11 w-11 items-center justify-center justify-self-center rounded-xl border border-line text-steel hover:text-gold sm:mb-0 sm:h-10 sm:w-10"><ArrowRightLeft size={15} className="rotate-90 sm:rotate-0" /></button>
        <Field label="To">{(id) => <Select id={id} value={req.to} onChange={(e) => set({ to: e.target.value })}>{metros.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select>}</Field>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
        <Field label="Depart">{(id) => <Input id={id} type="date" min={today} value={req.departDate} onChange={(e) => e.target.value && set({ departDate: e.target.value })} />}</Field>
        <Field label="Return">{(id) => <Input id={id} type="date" min={req.departDate} value={req.returnDate ?? ""} onChange={(e) => set({ returnDate: e.target.value || undefined })} />}</Field>
        <Field label="Preferred departure">{(id) => <Input id={id} type="time" value={req.departTime} onChange={(e) => e.target.value && set({ departTime: e.target.value })} />}</Field>
        <Field label="Preferred return">{(id) => <Input id={id} type="time" value={req.returnTime} disabled={!req.returnDate} onChange={(e) => e.target.value && set({ returnTime: e.target.value })} />}</Field>
        <Field label="Travelers">
          {(id) => (
            <div className="flex items-center gap-1 rounded-xl border border-line bg-deep p-1">
              <button aria-label="Fewer travelers" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-steel hover:text-warm disabled:opacity-30 sm:h-9 sm:w-9" disabled={req.pax <= 1} onClick={() => set({ pax: req.pax - 1 })}><Minus size={14} /></button>
              <input id={id} inputMode="numeric" className="num h-11 min-w-0 flex-1 bg-transparent text-center text-base focus:outline-none sm:h-auto sm:text-sm" value={req.pax} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); set({ pax: Math.min(30, n) }); }} />
              <button aria-label="More travelers" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-steel hover:text-warm disabled:opacity-30 sm:h-9 sm:w-9" disabled={req.pax >= 30} onClick={() => set({ pax: req.pax + 1 })}><Plus size={14} /></button>
            </div>
          )}
        </Field>
        <Field label="Max budget (total)">{(id) => <Input id={id} inputMode="numeric" placeholder="Optional, USD" value={req.budget ?? ""} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); set({ budget: n ? n : undefined }); }} />}</Field>
        <Field label="Arrive by (destination)" className="min-[420px]:col-span-2">
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
            className={cx("min-h-11 rounded-xl border px-3 py-2 text-left text-xs transition-colors", req.preset === k ? "border-gold bg-gold/10 text-warm" : "border-line text-steel hover:border-steel hover:text-warm")}>{p.label}</button>
        ))}
      </div>
      <p className="mt-2 text-xs text-steel">{PRESETS[req.preset].blurb}</p>
      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gold sm:min-h-0">Fine-tune weights {req.preset === "custom" && <Badge tone="gold">Custom</Badge>}</summary>
        <div className="mt-3 space-y-3">
          {(Object.keys(WEIGHT_LABEL) as (keyof Weights)[]).map((k) => (
            <label key={k} className="grid grid-cols-[96px_1fr_20px] items-center gap-3 text-xs text-steel sm:grid-cols-[110px_1fr_20px]">
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
