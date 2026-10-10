"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CircleAlert, Send, ShieldCheck, Trash2, WifiOff, Wallet } from "lucide-react";
import { AIRCRAFT_TYPES, AIRPORTS, DEMO_METROS, METROS } from "@/lib/jetflex/data";
import { EXAMPLE_PROMPTS } from "@/lib/jetflex/parser";
import { search } from "@/lib/jetflex/search";
import { fmtDate, fmtDur, fmtHHmm, localDate, localHHmm, usd } from "@/lib/jetflex/time";
import { useJet, useWorld } from "@/lib/jetflex/store";
import type { EmptyLeg, TripRequest } from "@/lib/jetflex/types";
import { Photo, type PhotoId } from "./Photo";
import { Badge, Button, Card, CountUp, EmptyState, ErrorState, Field, Input, LinkButton, Notice, Select, SimBadge, Skeleton, Stat, stagger } from "./ui";
import { parseText, validateRequest } from "./RequestPanel";

const legToRequest = (l: EmptyLeg, base: TripRequest): TripRequest => {
  const tz = AIRPORTS[l.from].tz;
  const mid = Math.min(l.latest, Math.max(l.earliest, l.earliest));
  return { ...base, from: AIRPORTS[l.from].metro, to: AIRPORTS[l.to].metro, departDate: localDate(mid, tz), departTime: localHHmm(mid, tz), returnDate: undefined, pax: Math.min(base.pax, l.cap), flexH: 6 };
};

/** A photo-backed entry point. Works with the built-in illustration when no photo has been added. */
function Tile({ photo, title, children, href, onClick }: { photo: PhotoId; title: string; children: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <Photo id={photo} className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]" sizes="(min-width: 640px) 33vw, 100vw" credit="none" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/55 to-transparent" />
      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-warm/20 bg-midnight/50 text-warm backdrop-blur"><ArrowUpRight size={15} aria-hidden /></span>
      <span className="absolute inset-x-0 bottom-0 block p-4 text-left">
        <span className="display block text-xl leading-tight">{title}</span>
        <span className="mt-1 block text-[13px] leading-snug text-warm/75">{children}</span>
      </span>
    </>
  );
  const cls = "group relative block min-h-[148px] w-full overflow-hidden rounded-2xl border border-line bg-deep transition-colors hover:border-gold/60 aspect-[16/7] sm:aspect-[4/3]";
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function OverviewPage() {
  const router = useRouter();
  const { ready, today, legs, request } = useWorld();
  const { setRequest, saved, unsave, setActive, addHistory } = useJet();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<TripRequest | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState(false);
  const [reading, setReading] = useState(false);
  const heroInput = useRef<HTMLTextAreaElement>(null);
  const form = draft ?? request;

  const go = (r: TripRequest) => { setRequest(r); router.push("/jetflex/plan"); };
  const submitText = async (t = text) => {
    if (reading || !t.trim()) return;
    setReading(true);
    const p = await parseText(t, today, request);
    setReading(false);
    // Nothing recognised at all: explain instead of planning the previous trip again.
    if (p.understood.length === 0) { setProblem(true); setNote(null); return; }
    if (p.question) { setProblem(false); setNote(p.question); return; }
    addHistory(t.trim());
    go(p.request);
  };
  const tryDemo = () => {
    setText(EXAMPLE_PROMPTS[0]);
    setNote(null);
    setProblem(false);
    heroInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    heroInput.current?.focus({ preventScroll: true });
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
    <div className="space-y-10 sm:space-y-12">
      <section className="relative isolate overflow-hidden rounded-3xl border border-line bg-deep" aria-labelledby="hero-h">
        <Photo id="jet-apron" className="absolute inset-0" priority sizes="(min-width: 1280px) 1180px, 100vw" />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-b from-midnight/85 via-midnight/75 to-midnight/90 md:bg-gradient-to-r md:from-midnight md:via-midnight/85 md:to-midnight/5" />
        <div className="relative max-w-2xl px-5 py-8 sm:px-10 sm:py-14">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-gold">AI-powered private aviation intelligence</p>
          <h1 id="hero-h" className="display text-[2.15rem] leading-[1.05] sm:text-5xl md:text-6xl">Your next journey, <span className="text-gold">intelligently planned.</span></h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-warm/70">JetFlex does not just list private jets. It compares charter, discounted empty legs, first class and hybrid journeys for your party, then tells you which is genuinely best and what you give up.</p>
          <div className="mt-7 rounded-2xl border border-line bg-midnight/85 p-2 backdrop-blur focus-within:border-gold sm:mt-8">
            <label htmlFor="hero-nl" className="sr-only">Describe your trip</label>
            <textarea id="hero-nl" ref={heroInput} rows={3} value={text} onChange={(e) => { setText(e.target.value); setNote(null); setProblem(false); }}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim()) void submitText(); }}
              placeholder="Four of us from New York to Aspen Friday, back Sunday evening. Arrive before 4 PM, and we can move up to six hours to save money."
              className="block w-full resize-none bg-transparent px-3 py-2 text-base text-warm placeholder:text-steel/60 focus:outline-none sm:text-[15px]" />
            <div className="flex flex-col gap-2 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[11px] text-steel">Works with no AI key: plain rules read it on your device. An AI model is used only if the server has one.</span>
              <Button variant="primary" onClick={() => void submitText()} disabled={!text.trim() || reading}><Send size={15} />{reading ? "Reading…" : "Plan this trip"}</Button>
            </div>
          </div>
          {problem && (
            <div className="mt-3">
              <ErrorState icon={<CircleAlert size={20} />} title="I couldn't find a trip in that"
                action={<><Button size="sm" onClick={tryDemo}>Use the Miami example</Button><span className="self-center text-xs text-steel">or fill in the planner below</span></>}>
                Say where from and to, and ideally when and how many of you: “Two of us from Chicago to Miami next Friday, back Sunday.”
              </ErrorState>
            </div>
          )}
          {note && <div className="mt-2"><Notice tone="warn">{note} Use the form below or add it to your description.</Notice></div>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => <button key={i} onClick={() => { setText(p); setNote(null); setProblem(false); }} className="inline-flex min-h-11 max-w-full items-center truncate rounded-full border border-line bg-midnight/50 px-3 py-1 text-xs text-warm/70 hover:border-gold hover:text-warm sm:min-h-0">{["New York to Miami, flexible", "New York to Aspen, arrive by 4 PM", "Teterboro to Miami, on-time first"][i]}</button>)}
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-warm/60">
            <li className="inline-flex items-center gap-1.5"><WifiOff size={13} aria-hidden />Runs on your device</li>
            <li className="inline-flex items-center gap-1.5"><ShieldCheck size={13} aria-hidden />No account, no booking</li>
            <li className="inline-flex items-center gap-1.5"><Wallet size={13} aria-hidden />Illustrative prices</li>
          </ul>
        </div>
      </section>

      <section aria-label="Explore JetFlex" className="grid gap-3 sm:grid-cols-3">
        <Tile photo="cabin-interior" title="Your cabin, remembered" href="/jetflex/cabin">Save how you like to fly once and get a service brief for every private option.</Tile>
        <Tile photo="runway-dusk" title="Empty legs, found for you" href="#opp">Repositioning flights at a fraction of a standard charter.</Tile>
        <Tile photo="miami-skyline" title="Try the Miami demo" onClick={tryDemo}>Four travelers, New York to Miami, flexible by six hours.</Tile>
      </section>

      <section aria-labelledby="qs">
        <h2 id="qs" className="display mb-4 text-2xl">Quick-start planner</h2>
        <Card className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
            <Field label="From">{(id) => <Select id={id} value={form.from} onChange={(e) => setDraft({ ...form, from: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].name}</option>)}</Select>}</Field>
            <Field label="To">{(id) => <Select id={id} value={form.to} onChange={(e) => setDraft({ ...form, to: e.target.value })}>{DEMO_METROS.map((m) => <option key={m} value={m}>{METROS[m].name}</option>)}</Select>}</Field>
            <Field label="Depart">{(id) => <Input id={id} type="date" min={today} value={form.departDate} onChange={(e) => e.target.value && setDraft({ ...form, departDate: e.target.value })} />}</Field>
            <Field label="Return (optional)">{(id) => <Input id={id} type="date" min={form.departDate} value={form.returnDate ?? ""} onChange={(e) => setDraft({ ...form, returnDate: e.target.value || undefined })} />}</Field>
            <Field label="Travelers">{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={30} value={form.pax} onChange={(e) => setDraft({ ...form, pax: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} />}</Field>
            <Field label="Flexible timing">{(id) => <Select id={id} value={form.flexH} onChange={(e) => setDraft({ ...form, flexH: Number(e.target.value) as TripRequest["flexH"] })}><option value={0}>Fixed schedule</option><option value={2}>Up to 2 hours</option><option value={6}>Up to 6 hours</option><option value={12}>Up to 12 hours</option><option value={24}>Whole day</option></Select>}</Field>
            <Field label="Max budget (optional)">{(id) => <Input id={id} inputMode="numeric" placeholder="Total, USD" value={form.budget ?? ""} onChange={(e) => setDraft({ ...form, budget: Number(e.target.value.replace(/\D/g, "")) || undefined })} />}</Field>
            <div className="flex items-end"><Button variant="primary" className="w-full" disabled={!ready || errors.length > 0} onClick={() => go(form)}>Compare options <ArrowRight size={15} /></Button></div>
          </div>
          {errors.length > 0 && <p className="mt-3 text-xs text-bad" role="alert">{errors[0]}</p>}
        </Card>
      </section>

      <section id="opp" className="scroll-mt-20" aria-labelledby="opp-h">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h2 id="opp-h" className="display text-2xl">Recommended opportunities</h2><SimBadge>Demo inventory is simulated</SimBadge></div>
        {!ready ? (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
        ) : picks.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {picks.map(({ l, save }, n) => (
              <Card key={l.id} className="rise flex flex-col p-5" style={stagger(n)}>
                <div className="mb-3 flex items-center justify-between"><Badge tone="teal">Empty leg</Badge><span className="text-xs text-steel">{AIRCRAFT_TYPES[l.typeId].short} · {l.cap} seats</span></div>
                <p className="display text-2xl">{METROS[AIRPORTS[l.from].metro].short} → {METROS[AIRPORTS[l.to].metro].short}</p>
                <p className="num mt-1 text-xs text-steel">{l.from} → {l.to} · {fmtDate(localDate(l.earliest, AIRPORTS[l.from].tz))} · {fmtHHmm(localHHmm(l.earliest, AIRPORTS[l.from].tz))}–{fmtHHmm(localHHmm(l.latest, AIRPORTS[l.from].tz))}</p>
                <div className="mt-4 flex items-baseline gap-3"><span className="num text-2xl"><CountUp value={l.price} format={usd} /></span><span className="num text-sm text-steel line-through">{usd(l.charterEst)}</span></div>
                <p className="mt-1 text-xs text-ok">Illustrative saving {usd(save)} versus a standard charter of {fmtDur(l.durMin)}</p>
                <p className="mt-2 text-xs text-warn">Timing is set by the operator and may change. Not a booking.</p>
                <Button className="mt-4 w-full" onClick={() => go(legToRequest(l, request))}>Plan around this leg</Button>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No empty legs are published right now" action={<><LinkButton href="/jetflex/operator" variant="primary">Open Operator Intelligence</LinkButton><Button onClick={tryDemo}>Plan a trip anyway</Button></>}>
            Nothing in the simulated window is both published and available. In Operator Intelligence you can publish a detected leg or mark one available, then it shows up here and in Plan a Trip.
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="ti">
        <h2 id="ti" className="display mb-4 text-2xl">Travel intelligence</h2>
        <Card className="grid grid-cols-2 gap-x-4 gap-y-6 p-5 sm:gap-6 sm:p-6 lg:grid-cols-4">
          <Stat label="Trips saved" value={<CountUp value={sums.n} />} note="Itineraries you saved from Plan a Trip." />
          <Stat label="Est. savings vs charter" value={<CountUp value={sums.savings} format={usd} />} note="Sum across saved trips, against each trip's cheapest charter baseline. Illustrative." />
          <Stat label="Empty-leg matches" value={matches == null ? "…" : <CountUp value={matches} />} note={`Itineraries using an empty leg for your current search (${METROS[request.from].short} to ${METROS[request.to].short}, ${request.flexH === 0 ? "fixed" : request.flexH === 24 ? "whole day" : `±${request.flexH}h`}).`} />
          <Stat label="Time potentially saved" value={<CountUp value={sums.time} format={fmtDur} />} note="Door-to-door time of saved trips against the quickest first-class option in the same search." />
        </Card>
      </section>

      <section aria-labelledby="rt">
        <div className="mb-4 flex items-end justify-between"><h2 id="rt" className="display text-2xl">Recent trips</h2><Link href="/jetflex/trips" className="inline-flex min-h-11 items-center text-sm text-gold hover:underline sm:min-h-0">All trips</Link></div>
        {saved.length ? (
          <div className="divide-y divide-line rounded-2xl border border-line">
            {saved.slice(0, 3).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate">{t.itinerary.name}</p><p className="num text-xs text-steel">{METROS[t.request.from].short} → {METROS[t.request.to].short} · {fmtDate(t.request.departDate)} · {t.itinerary.pax} travelers · {usd(t.itinerary.totalPrice)}</p></div>
                <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
                  <Button size="sm" onClick={() => { setRequest(t.request); setActive(t.itinerary); router.push("/jetflex/plan"); }}>Open</Button>
                  <Button size="sm" onClick={() => { setRequest(t.request); setActive(t.itinerary); router.push("/jetflex/plan#compare"); }}>Compare</Button>
                  <Button size="sm" variant="danger" aria-label={`Remove ${t.itinerary.name}`} onClick={() => unsave(t.id)}><Trash2 size={14} />Remove</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No saved trips yet" action={<><Button variant="primary" onClick={tryDemo}>Try the Miami demo</Button><LinkButton href="/jetflex/plan">Open the planner</LinkButton></>}>
            Plan a trip and save the itinerary you like. It will appear here, ready to reopen, compare or protect with JetShield.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
