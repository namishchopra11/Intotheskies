"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Send, Trash2 } from "lucide-react";
import { AIRCRAFT_TYPES, AIRPORTS, DEMO_METROS, METROS } from "@/lib/jetflex/data";
import { EXAMPLE_PROMPTS, parseRequest } from "@/lib/jetflex/parser";
import { search } from "@/lib/jetflex/search";
import { fmtDate, fmtDur, fmtHHmm, localDate, localHHmm, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import type { EmptyLeg, TripRequest } from "@/lib/jetflex/types";
import { Badge, Button, Card, Field, Input, Notice, Select, SimBadge, Stat } from "./ui";
import { validateRequest } from "./RequestPanel";

const Hero = () => (
  <svg viewBox="0 0 520 300" className="pointer-events-none absolute -right-10 top-0 hidden h-full w-[56%] opacity-90 md:block" aria-hidden>
    <defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0" stopColor="#0B1320" stopOpacity="1" /><stop offset="0.5" stopColor="#0B1320" stopOpacity="0" /></linearGradient></defs>
    {Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M-20 ${250 - i * 22} C 140 ${190 - i * 26}, 330 ${280 - i * 30}, 560 ${120 - i * 14}`} fill="none" stroke="#8294A8" strokeOpacity={0.1 + i * 0.015} />)}
    <path d="M120 230 C 230 150, 350 120, 470 70" fill="none" stroke="#D5B779" strokeOpacity="0.5" strokeDasharray="3 6" />
    <g transform="translate(335 108) rotate(-24)" fill="#F5F4EF">
      <path d="M0 0 L58 -3 C70 -3 76 0 76 3 C76 6 70 9 58 9 L0 6 L-26 18 L-26 12 L-12 3 L-26 -6 L-26 -12 Z" opacity="0.95" />
      <path d="M22 6 L40 30 L32 30 L10 8Z M22 -3 L40 -27 L32 -27 L10 -5Z" fill="#8294A8" />
    </g>
    <rect width="520" height="300" fill="url(#fade)" />
  </svg>
);

const legToRequest = (l: EmptyLeg, base: TripRequest): TripRequest => {
  const tz = AIRPORTS[l.from].tz;
  const mid = Math.min(l.latest, Math.max(l.earliest, l.earliest));
  return { ...base, from: AIRPORTS[l.from].metro, to: AIRPORTS[l.to].metro, departDate: localDate(mid, tz), departTime: localHHmm(mid, tz), returnDate: undefined, pax: Math.min(base.pax, l.cap), flexH: 6 };
};

export function OverviewPage() {
  const router = useRouter();
  const { ready, today, legs, request } = useWorld();
  const { setRequest, saved, unsave, setActive, addHistory } = useJet();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<TripRequest | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const form = draft ?? request;

  const go = (r: TripRequest) => { setRequest(r); router.push("/jetflex/plan"); };
  const submitText = () => {
    const p = parseRequest(text, today, request);
    if (p.question) { setNote(p.question); return; }
    addHistory(text.trim());
    go(p.request);
  };

  const live = useMemo(() => legs.filter((l) => l.published && l.status !== "unavailable" && l.latest > l.earliest).map((l) => ({ l, save: l.charterEst - l.price })).sort((a, b) => b.save - a.save), [legs]);
  const picks = useMemo(() => {
    const seen = new Set<string>();
    return live.filter(({ l }) => { const k = `${l.from}${l.to}`; if (seen.has(k) || localDate(l.earliest, AIRPORTS[l.from].tz) < today) return false; seen.add(k); return true; }).slice(0, 3);
  }, [live, today]);
  const matches = useMemo(() => {
    if (!ready || validateRequest(request, today).length) return null;
    return search(request, { today, legs }).flexProfile.find((p) => p.flexH === request.flexH)?.emptyLegs ?? 0;
  }, [ready, request, today, legs]);
  const sums = { n: saved.length, savings: saved.reduce((a, t) => a + t.savings, 0), time: saved.reduce((a, t) => a + t.timeSaved, 0) };
  const errors = validateRequest(form, today);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-deep px-6 py-10 sm:px-10 sm:py-14">
        <Hero />
        <div className="relative max-w-2xl">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-gold">AI-powered private aviation intelligence</p>
          <h1 className="display text-4xl leading-[1.04] sm:text-5xl md:text-6xl">Your next journey, <span className="text-gold">intelligently planned.</span></h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-steel">JetFlex does not just list private jets. It compares charter, discounted empty legs, first class and hybrid journeys for your party, then tells you which is genuinely best and what you give up.</p>
          <div className="mt-8 rounded-2xl border border-line bg-midnight/80 p-2 focus-within:border-gold">
            <label htmlFor="hero-nl" className="sr-only">Describe your trip</label>
            <textarea id="hero-nl" rows={3} value={text} onChange={(e) => { setText(e.target.value); setNote(null); }} placeholder="Four of us from New York to Aspen Friday, back Sunday evening. Arrive before 4 PM, and we can move up to six hours to save money."
              className="w-full resize-none bg-transparent px-3 py-2 text-[15px] text-warm placeholder:text-steel/60 focus:outline-none" />
            <div className="flex items-center justify-between gap-3 px-2 pb-1"><span className="text-[11px] text-steel">Understood on your device. No AI key needed.</span><Button variant="primary" onClick={submitText} disabled={!text.trim()}><Send size={15} />Plan this trip</Button></div>
          </div>
          {note && <div className="mt-2"><Notice tone="warn">{note} Use the form below or add it to your description.</Notice></div>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => <button key={i} onClick={() => setText(p)} className="max-w-full truncate rounded-full border border-line px-3 py-1 text-xs text-steel hover:border-gold hover:text-warm">{["New York to Miami, flexible", "New York to Aspen, arrive by 4 PM", "Teterboro to Miami, on-time first"][i]}</button>)}
          </div>
        </div>
      </section>

      <section aria-labelledby="qs">
        <h2 id="qs" className="display mb-4 text-2xl">Quick-start planner</h2>
        <Card className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="From">{(id) => <Select id={id} value={form.from} onChange={(e) => setDraft({ ...form, from: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].name}</option>)}</Select>}</Field>
            <Field label="To">{(id) => <Select id={id} value={form.to} onChange={(e) => setDraft({ ...form, to: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].name}</option>)}</Select>}</Field>
            <Field label="Depart">{(id) => <Input id={id} type="date" min={today} value={form.departDate} onChange={(e) => e.target.value && setDraft({ ...form, departDate: e.target.value })} />}</Field>
            <Field label="Return (optional)">{(id) => <Input id={id} type="date" min={form.departDate} value={form.returnDate ?? ""} onChange={(e) => setDraft({ ...form, returnDate: e.target.value || undefined })} />}</Field>
            <Field label="Travelers">{(id) => <Input id={id} type="number" min={1} max={30} value={form.pax} onChange={(e) => setDraft({ ...form, pax: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} />}</Field>
            <Field label="Flexible timing">{(id) => <Select id={id} value={form.flexH} onChange={(e) => setDraft({ ...form, flexH: Number(e.target.value) as TripRequest["flexH"] })}><option value={0}>Fixed schedule</option><option value={2}>Up to 2 hours</option><option value={6}>Up to 6 hours</option><option value={12}>Up to 12 hours</option><option value={24}>Whole day</option></Select>}</Field>
            <Field label="Max budget (optional)">{(id) => <Input id={id} inputMode="numeric" placeholder="Total, USD" value={form.budget ?? ""} onChange={(e) => setDraft({ ...form, budget: Number(e.target.value.replace(/\D/g, "")) || undefined })} />}</Field>
            <div className="flex items-end"><Button variant="primary" className="w-full" disabled={!ready || errors.length > 0} onClick={() => go(form)}>Compare options <ArrowRight size={15} /></Button></div>
          </div>
          {errors.length > 0 && <p className="mt-3 text-xs text-bad">{errors[0]}</p>}
        </Card>
      </section>

      <section aria-labelledby="opp">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 id="opp" className="display text-2xl">Recommended opportunities</h2><SimBadge>Demo inventory is simulated</SimBadge></div>
        {picks.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {picks.map(({ l, save }) => (
              <Card key={l.id} className="flex flex-col p-5">
                <div className="mb-3 flex items-center justify-between"><Badge tone="teal">Empty leg</Badge><span className="text-xs text-steel">{AIRCRAFT_TYPES[l.typeId].short} · {l.cap} seats</span></div>
                <p className="display text-2xl">{METROS[AIRPORTS[l.from].metro].short} → {METROS[AIRPORTS[l.to].metro].short}</p>
                <p className="num mt-1 text-xs text-steel">{l.from} → {l.to} · {fmtDate(localDate(l.earliest, AIRPORTS[l.from].tz))} · {fmtHHmm(localHHmm(l.earliest, AIRPORTS[l.from].tz))}–{fmtHHmm(localHHmm(l.latest, AIRPORTS[l.from].tz))}</p>
                <div className="mt-4 flex items-baseline gap-3"><span className="num text-2xl">{usd(l.price)}</span><span className="num text-sm text-steel line-through">{usd(l.charterEst)}</span></div>
                <p className="mt-1 text-xs text-ok">Illustrative saving {usd(save)} versus a standard charter of {fmtDur(l.durMin)}</p>
                <p className="mt-2 text-xs text-warn">Timing is set by the operator and may change. Not a booking.</p>
                <Button className="mt-auto w-full pt-2.5" onClick={() => go(legToRequest(l, request))}>Plan around this leg</Button>
              </Card>
            ))}
          </div>
        ) : <Card className="p-6 text-sm text-steel">{ready ? "No published empty legs are available in the simulated window. Publish one in Operator Intelligence." : "Loading simulated inventory…"}</Card>}
      </section>

      <section aria-labelledby="ti">
        <h2 id="ti" className="display mb-4 text-2xl">Travel intelligence</h2>
        <Card className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Trips saved" value={sums.n} note="Itineraries you saved from Plan a Trip." />
          <Stat label="Est. savings vs charter" value={usd(sums.savings)} note="Sum across saved trips, against each trip's cheapest charter baseline. Illustrative." />
          <Stat label="Empty-leg matches" value={matches ?? "…"} note={`Itineraries using an empty leg for your current search (${METROS[request.from].short} to ${METROS[request.to].short}, ${request.flexH === 0 ? "fixed" : request.flexH === 24 ? "whole day" : `±${request.flexH}h`}).`} />
          <Stat label="Time potentially saved" value={fmtDur(sums.time)} note="Door-to-door time of saved trips against the quickest first-class option in the same search." />
        </Card>
      </section>

      <section aria-labelledby="rt">
        <div className="mb-4 flex items-end justify-between"><h2 id="rt" className="display text-2xl">Recent trips</h2><Link href="/jetflex/trips" className="text-sm text-gold hover:underline">All trips</Link></div>
        {saved.length ? (
          <div className="divide-y divide-line rounded-2xl border border-line">
            {saved.slice(0, 3).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate">{t.itinerary.name}</p><p className="num text-xs text-steel">{METROS[t.request.from].short} → {METROS[t.request.to].short} · {fmtDate(t.request.departDate)} · {t.itinerary.pax} travelers · {usd(t.itinerary.totalPrice)}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setRequest(t.request); setActive(t.itinerary); router.push("/jetflex/plan"); }}>Open</Button>
                  <Button size="sm" onClick={() => { setRequest(t.request); setActive(t.itinerary); router.push("/jetflex/plan#compare"); }}>Compare</Button>
                  <Button size="sm" variant="danger" aria-label={`Remove ${t.itinerary.name}`} onClick={() => unsave(t.id)}><Trash2 size={14} />Remove</Button>
                </div>
              </div>
            ))}
          </div>
        ) : <Card className="p-6 text-sm text-steel">No saved trips yet. Plan a trip and save an itinerary to see it here.</Card>}
      </section>
    </div>
  );
}
