// Search, ranking and explanation. The score shown to users and the explanation text are both
// derived from the same normalised factors, so the "why" always matches the ranking.
import { AIRCRAFT_TYPES, AIRPORTS, METROS } from "./data";
import { classify, FLEX_MIN, generate, windowFor, type Spec } from "./journeys";
import { anchorFriday, tzOf } from "./inventory";
import { addDays, dayEnd, dayStart, fmtDate, fmtDur, fmtHHmm, fmtTime, nextDow, toAbs, usd } from "./time";
import type { EmptyLeg, Excluded, Features, Itinerary, Journey, Kind, PresetId, ScorePart, SearchResult, TripRequest, Weights } from "./types";

export const PRESETS: Record<PresetId, { label: string; blurb: string; weights: Weights }> = {
  balanced: { label: "Balanced", blurb: "Price, time and certainty weighed together", weights: { cost: 3, speed: 3, control: 2, privacy: 2, certainty: 3 } },
  cost: { label: "Lowest cost", blurb: "Cheapest total trip wins", weights: { cost: 9, speed: 1, control: 1, privacy: 0, certainty: 2 } },
  fastest: { label: "Fastest", blurb: "Least door-to-door time and fewest connections", weights: { cost: 1, speed: 9, control: 2, privacy: 1, certainty: 2 } },
  control: { label: "Schedule control", blurb: "Leave when you want, change plans", weights: { cost: 1, speed: 2, control: 9, privacy: 2, certainty: 3 } },
  private: { label: "Private & quiet", blurb: "Uninterrupted, private cabin", weights: { cost: 1, speed: 2, control: 3, privacy: 9, certainty: 2 } },
  custom: { label: "Custom mix", blurb: "Your own weights", weights: { cost: 3, speed: 3, control: 2, privacy: 2, certainty: 3 } },
  ontime: { label: "Arrive on time", blurb: "Lowest chance of a disrupted arrival", weights: { cost: 2, speed: 3, control: 2, privacy: 1, certainty: 9 } },
};

export const defaultRequest = (today: string): TripRequest => {
  const fri = nextDow(today, 5);
  return { from: "nyc", to: "mia", departDate: fri, returnDate: addDays(fri, 2), pax: 4, flexH: 6, departTime: "09:00", returnTime: "17:00", preset: "balanced", weights: PRESETS.balanced.weights };
};

const KEYS: { key: keyof Features; label: string; low: boolean }[] = [
  { key: "cost", label: "Total cost", low: true },
  { key: "time", label: "Door-to-door time", low: true },
  { key: "ground", label: "Ground time", low: true },
  { key: "stops", label: "Connections", low: true },
  { key: "dev", label: "Fit to your schedule", low: true },
  { key: "risk", label: "Certainty", low: true },
  { key: "privacy", label: "Privacy", low: false },
  { key: "control", label: "Schedule control", low: false },
];
const featureWeights = (w: Weights): Record<keyof Features, number> => ({
  cost: w.cost, time: 0.6 * w.speed, ground: 0.2 * w.speed, stops: 0.2 * w.speed, dev: 0.4 * w.control, control: 0.6 * w.control, privacy: w.privacy, risk: w.certainty,
});

const CONTROL = { commercial: 0.35, charter: 0.95, empty_leg: 0.1, ground: 0 } as const;
const KIND_LABEL: Record<Kind, string> = { first_class: "First class", charter: "Private charter", empty_leg: "Empty leg", hybrid: "Hybrid" };
export const kindLabel = (k: Kind) => KIND_LABEL[k];
const jLabel = (j: Journey) => (j.kind === "hybrid" ? "First class + private hop" : KIND_LABEL[j.kind]);

function features(js: Journey[]): Omit<Features, never> & { groundCost: number; price: number } {
  const segs = js.flatMap((j) => j.segments);
  const flights = segs.filter((s) => s.mode !== "ground");
  const flightMin = flights.reduce((a, s) => a + (s.arr - s.dep), 0) || 1;
  const price = segs.reduce((a, s) => a + s.cost, 0);
  const jRisk = js.map((j) => 1 - j.segments.reduce((p, s) => p * (1 - s.risk), 1));
  return {
    cost: price,
    price,
    groundCost: segs.filter((s) => s.mode === "ground").reduce((a, s) => a + s.cost, 0),
    time: js.reduce((a, j) => a + (j.segments[j.segments.length - 1].arr - j.segments[0].dep), 0),
    ground: segs.filter((s) => s.mode === "ground").reduce((a, s) => a + (s.arr - s.dep), 0),
    stops: js.reduce((a, j) => a + j.stops, 0),
    dev: js.reduce((a, j) => a + j.devMin, 0),
    risk: 1 - jRisk.reduce((p, r) => p * (1 - r), 1),
    privacy: flights.reduce((a, s) => a + (s.mode === "commercial" ? 0.25 : 1) * (s.arr - s.dep), 0) / flightMin,
    control: flights.reduce((a, s) => a + CONTROL[s.mode] * (s.arr - s.dep), 0) / flightMin,
  };
}

const typeOf = (j: Journey) => j.segments.find((s) => s.typeId)?.typeId;
function nameOf(js: Journey[]): string {
  const [o, r] = js;
  const t = typeOf(o);
  const route = (j: Journey) => {
    const f = j.segments.filter((s) => s.mode !== "ground");
    return `${f[0].from}→${f[f.length - 1].to}`;
  };
  if (!r || (o.kind === r.kind && typeOf(o) === typeOf(r) && o.kind !== "empty_leg")) {
    const base = jLabel(o);
    const f0 = o.segments.find((s) => s.mode !== "ground")!;
    return t ? `${base} · ${AIRCRAFT_TYPES[t].name}` : `${base} · ${route(o)} · ${fmtTime(f0.dep, AIRPORTS[f0.from].tz)}`;
  }
  const tag = (j: Journey) => (typeOf(j) ? ` (${AIRCRAFT_TYPES[typeOf(j)!].short})` : "");
  return `${jLabel(o)}${tag(o)} out, ${jLabel(r).toLowerCase()}${tag(r)} back`;
}

const hashIds = (ids: string[]) => {
  let h = 5381;
  for (const c of ids.join("|")) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
  return `it-${(h >>> 0).toString(36)}`;
};

export type Raw = Pick<Itinerary, "id" | "name" | "kind" | "journeys"> & { f: ReturnType<typeof features> };

export function toRaw(js: Journey[]): Raw {
  const all = js.flatMap((j) => j.segments);
  return { id: hashIds(js.map((j) => j.id)), name: nameOf(js), kind: classify(all), journeys: js, f: features(js) };
}

/** Normalise each factor 0..1 (1 = best in this result set) and combine with the traveller's weights. */
export function scoreAll(raws: Raw[], weights: Weights, pax: number): Itinerary[] {
  const fw = featureWeights(weights);
  const total = Object.values(fw).reduce((a, b) => a + b, 0);
  const range = Object.fromEntries(KEYS.map(({ key }) => [key, [Math.min(...raws.map((r) => r.f[key])), Math.max(...raws.map((r) => r.f[key]))]]));
  const items = raws.map((r): Itinerary => {
    const parts: ScorePart[] = KEYS.map(({ key, label, low }) => {
      const [mn, mx] = range[key];
      const norm = mx === mn ? 1 : low ? (mx - r.f[key]) / (mx - mn) : (r.f[key] - mn) / (mx - mn);
      return { key, label, weight: total ? fw[key] / total : 0, norm, points: total ? (100 * fw[key] * norm) / total : 0 };
    });
    return {
      id: r.id, name: r.name, kind: r.kind, journeys: r.journeys, pax, totalPrice: r.f.price, perPerson: Math.round(r.f.price / pax), door2doorMin: r.f.time,
      groundMin: r.f.ground, groundCost: r.f.groundCost, stops: r.f.stops, devMin: r.f.dev, risk: r.f.risk, privacy: r.f.privacy, control: r.f.control,
      tags: [], feasible: true, issues: [], score: Math.round(parts.reduce((a, p) => a + p.points, 0) * 10) / 10, parts, savingsVsCharter: null, savingsVsFirst: null,
      overBudget: false, explanation: [], tradeoffs: [],
    };
  });
  return items.sort((a, b) => b.score - a.score || a.totalPrice - b.totalPrice);
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const POS: Record<string, (i: Itinerary) => string> = {
  cost: (i) => `${usd(i.totalPrice)} total (${usd(i.perPerson)} per person)`,
  time: (i) => `${fmtDur(i.door2doorMin)} door to door`,
  ground: (i) => `only ${fmtDur(i.groundMin)} of ground transfers`,
  stops: (i) => (i.stops ? `${i.stops} connection${i.stops > 1 ? "s" : ""}` : "no connections"),
  dev: (i) => (i.devMin ? `departs within ${fmtDur(i.devMin)} of your preferred time` : "departs at your preferred time"),
  risk: (i) => `a modeled ${pct(i.risk)} chance of disruption`,
  privacy: (i) => `${pct(i.privacy)} of flying time in a private cabin`,
  control: (i) => `${pct(i.control)} schedule control`,
};
const NEG = (i: Itinerary, k: string, s: { minCost: number; minTime: number; minGround: number }) =>
  ({
    cost: `${usd(i.totalPrice - s.minCost)} above the cheapest option`,
    time: `${fmtDur(i.door2doorMin - s.minTime)} longer door to door than the fastest`,
    ground: `${fmtDur(i.groundMin)} of ground transfers`,
    stops: `${i.stops} connection${i.stops > 1 ? "s" : ""}`,
    dev: `departs ${fmtDur(i.devMin)} away from your preferred time`,
    risk: `a modeled ${pct(i.risk)} chance of disruption`,
    privacy: "shared cabin on at least part of the trip",
    control: "little room to change plans",
  })[k] ?? "";

export function annotate(items: Itinerary[], req: Pick<TripRequest, "preset" | "budget">) {
  if (!items.length) return;
  const st = { minCost: Math.min(...items.map((i) => i.totalPrice)), minTime: Math.min(...items.map((i) => i.door2doorMin)), minGround: Math.min(...items.map((i) => i.groundMin)) };
  const charter = items.filter((i) => i.kind === "charter").sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const first = items.filter((i) => i.kind === "first_class").sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const best = (f: (i: Itinerary) => number, dir: 1 | -1) => items.reduce((a, b) => (dir * (f(b) - f(a)) < 0 ? b : a));
  best((i) => i.totalPrice, 1).tags.push("Lowest price");
  best((i) => i.door2doorMin, 1).tags.push("Fastest");
  best((i) => i.risk, 1).tags.push("Most certain");
  best((i) => i.control, -1).tags.push("Most control");
  items.forEach((it, idx) => {
    it.savingsVsCharter = charter ? charter.totalPrice - it.totalPrice : null;
    it.savingsVsFirst = first ? first.totalPrice - it.totalPrice : null;
    const strengths = it.parts.filter((p) => p.weight > 0.05 && p.norm >= 0.7).sort((a, b) => b.points - a.points).slice(0, 2);
    const weaknesses = it.parts.filter((p) => p.norm <= 0.35).sort((a, b) => a.norm - b.norm).slice(0, 3);
    const ex: string[] = [];
    if (idx === 0) {
      const next = items[1];
      const lead = next ? it.parts.map((p, k) => ({ p, d: p.points - next.parts[k].points })).sort((a, b) => b.d - a.d)[0] : null;
      ex.push(`Ranks first with ${it.score.toFixed(1)} points under "${PRESETS[req.preset].label}"${strengths.length ? `: ${strengths.map((s) => `${s.label.toLowerCase()} (${POS[s.key](it)})`).join(" and ")}` : ""}.`);
      if (next && lead && lead.d > 0.5) ex.push(`It leads ${next.name} by ${(it.score - next.score).toFixed(1)} points, mostly on ${lead.p.label.toLowerCase()}.`);
    } else {
      const top = items[0];
      const gap = it.parts.map((p, k) => ({ p, d: top.parts[k].points - p.points })).sort((a, b) => b.d - a.d)[0];
      ex.push(`Ranks #${idx + 1}, ${(top.score - it.score).toFixed(1)} points behind ${top.name}${gap.d > 0.5 ? `, mainly on ${gap.p.label.toLowerCase()}` : ""}.`);
      if (strengths.length) ex.push(`Strengths: ${strengths.map((s) => POS[s.key](it)).join("; ")}.`);
    }
    if (it.kind === "empty_leg" || it.journeys.some((j) => j.segments.some((s) => s.mode === "empty_leg")))
      ex.push("Empty legs are repositioning flights: timing is set by the operator and can change or be withdrawn. Treat this as a request, not a confirmed booking.");
    if (it.savingsVsCharter && it.kind !== "charter") ex.push(`${it.savingsVsCharter > 0 ? "Saves" : "Costs"} ${usd(Math.abs(it.savingsVsCharter))} compared with the private charter baseline.`);
    it.explanation = ex;
    it.tradeoffs = weaknesses.map((w) => NEG(it, w.key, st)).filter(Boolean);
    if (it.journeys.some((j) => j.match === "nearby")) it.tradeoffs.push("Uses a nearby airport with a longer ground transfer.");
    it.overBudget = req.budget != null && it.totalPrice > req.budget;
  });
}

function pair(outs: Journey[], rets: Journey[]): Journey[][] {
  if (!rets.length) return outs.map((o) => [o]);
  const cheapest = (l: Journey[]) => l.slice().sort((a, b) => cost(a) - cost(b) || a.devMin - b.devMin)[0];
  const cost = (j: Journey) => j.segments.reduce((a, s) => a + s.cost, 0);
  const pairs = new Map<string, Journey[]>();
  const put = (o: Journey, r?: Journey) => {
    if (!o || !r) return;
    const arrive = o.segments[o.segments.length - 1].arr;
    if (r.segments[0].dep < arrive + 60) return;
    pairs.set(o.id + r.id, [o, r]);
  };
  for (const o of outs) put(o, cheapest(rets.filter((r) => r.kind === o.kind && (o.kind !== "charter" || typeOf(r) === typeOf(o)))));
  const bestOf = (l: Journey[], k: Kind) => cheapest(l.filter((j) => j.kind === k));
  const mixes: [Kind, Kind][] = [["empty_leg", "charter"], ["charter", "empty_leg"], ["empty_leg", "first_class"], ["first_class", "empty_leg"], ["charter", "first_class"], ["first_class", "charter"]];
  for (const [a, b] of mixes) put(bestOf(outs, a), bestOf(rets, b));
  return [...pairs.values()];
}

export function rank(raws: Raw[], req: Pick<TripRequest, "weights" | "pax" | "preset" | "budget">) {
  const items = scoreAll(raws, req.weights, req.pax);
  annotate(items, req);
  return items;
}
export const makeItinerary = (js: Journey[], req: Pick<TripRequest, "weights" | "pax" | "preset" | "budget">) => rank([toRaw(js)], req)[0];

export type Ctx = { today: string; legs: EmptyLeg[] };

export function buildSpecs(req: TripRequest, legs: EmptyLeg[]): { out: Spec; ret?: Spec } {
  const [tzA, tzB] = [tzOf(`door:${req.from}`), tzOf(`door:${req.to}`)];
  const mk = (from: string, to: string, date: string, time: string, tz: number, dir: "out" | "ret", arriveBy?: number): Spec => {
    const pref = toAbs(date, time, tz);
    const [dayLo, dayHi] = [dayStart(date, tz), dayEnd(date, tz)];
    const [lo, hi] = windowFor(pref, req.flexH, dayLo, dayHi);
    return { from: `door:${from}`, to: `door:${to}`, dir, pax: req.pax, pref, lo, hi, dayLo, dayHi, arriveBy, legs: legs.filter((l) => l.published) };
  };
  return {
    out: mk(req.from, req.to, req.departDate, req.departTime, tzA, "out", req.arriveBy ? toAbs(req.departDate, req.arriveBy, tzB) : undefined),
    ret: req.returnDate ? mk(req.to, req.from, req.returnDate, req.returnTime, tzB, "ret") : undefined,
  };
}

function core(req: TripRequest, legs: EmptyLeg[]) {
  const { out, ret } = buildSpecs(req, legs);
  const go = generate(out);
  const gr = ret ? generate(ret) : { journeys: [], excluded: [] as Excluded[] };
  const raws = pair(go.journeys, gr.journeys).map(toRaw);
  return { raws, excluded: [...go.excluded.map((e) => ({ ...e, label: `${e.label} (outbound)` })), ...gr.excluded.map((e) => ({ ...e, label: `${e.label} (return)` }))], out, ret };
}

export function search(req: TripRequest, ctx: Ctx): SearchResult {
  const base = core(req, ctx.legs);
  const excluded = [...base.excluded];
  const keep = base.raws.filter((r) => {
    if (req.budget != null && r.f.price > req.budget) {
      excluded.push({ label: r.name, reason: `${usd(r.f.price)} is over your ${usd(req.budget)} budget` });
      return false;
    }
    return true;
  });
  const itineraries = rank(keep, req);
  const flexProfile = ([0, 2, 6, 12, 24] as const).map((flexH) => {
    const r = flexH === req.flexH ? base : core({ ...req, flexH }, ctx.legs);
    const ok = r.raws.filter((x) => req.budget == null || x.f.price <= req.budget);
    return { flexH, total: ok.length, emptyLegs: ok.filter((x) => x.journeys.some((j) => j.segments.some((s) => s.mode === "empty_leg"))).length };
  });
  const w = FLEX_MIN[req.flexH];
  const anchor = anchorFriday(ctx.today);
  const assumptions = [
    `Departure window: ${req.flexH === 24 ? `any time on ${fmtDate(req.departDate)}` : `${fmtHHmm(req.departTime)} ± ${fmtDur(w)} on ${fmtDate(req.departDate)}`}${req.returnDate ? `; return around ${fmtHHmm(req.returnTime)} on ${fmtDate(req.returnDate)}` : ""}.`,
    "Chauffeured ground transfers are included at both ends of every option, so modes compare door to door.",
    "First class assumes 90 min at the airport before departure and 25 min after landing; private flights assume 15 and 10 minutes.",
    "Charter and empty-leg prices are for the whole aircraft; per-person figures divide the trip total by your party size.",
    "Savings are measured against the cheapest private charter that meets the same constraints.",
    `Simulated empty-leg inventory covers ${fmtDate(addDays(anchor, -1))} to ${fmtDate(addDays(anchor, 11))}.`,
  ];
  return { itineraries, excluded, assumptions, flexProfile };
}

export const routeLabel = (req: Pick<TripRequest, "from" | "to">) => `${METROS[req.from].short} → ${METROS[req.to].short}`;
