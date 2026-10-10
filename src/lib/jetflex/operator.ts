// Operator intelligence: turns idle gaps in an operator's schedule into empty-leg opportunities,
// matches them to (simulated) traveller searches and models the revenue. All figures illustrative.
import { AIRCRAFT_TYPES, AIRPORTS, DEMAND, RULES, primaryGA, type DemandSearch } from "./data";
import { allFleet, anchorFriday, blockMin, resolveSchedule } from "./inventory";
import { FLEX_MIN } from "./journeys";
import { addDays, fmtDate, fmtDur, fmtHHmm, localHHmm, toAbs } from "./time";
import type { EmptyLeg, ImportedInventory, SchedFlight, TripRequest } from "./types";

export type Demand = DemandSearch & { pref: number; date: string; live?: boolean };

export function demandList(today: string, current?: TripRequest | null): Demand[] {
  const anchor = anchorFriday(today);
  const mk = (d: DemandSearch, w: number): Demand => {
    const date = addDays(anchor, d.day + 7 * w);
    return { ...d, id: w ? `${d.id}w${w}` : d.id, date, pref: toAbs(date, d.time, tzOfMetro(d.from)) };
  };
  const list = [0, 1].flatMap((w) => DEMAND.map((d) => mk(d, w)));
  if (current)
    list.push({ id: "LIVE", label: "Your current JetFlex search", from: current.from, to: current.to, day: 0, time: current.departTime, pax: current.pax, flexH: current.flexH, budget: current.budget ?? 60000, date: current.departDate, pref: toAbs(current.departDate, current.departTime, tzOfMetro(current.from)), live: true });
  return list;
}
const tzOfMetro = (m: string) => Object.values(AIRPORTS).find((a) => a.metro === m)!.tz;

export type DemandMatch = { demand: Demand; score: number; dev: number; ok: boolean; reason?: string; parts: { route: number; time: number; capacity: number; price: number } };

export function matchDemand(leg: EmptyLeg, d: Demand, price = leg.price): DemandMatch {
  const [fa, ta] = [AIRPORTS[leg.from], AIRPORTS[leg.to]];
  const miss = (reason: string, dev = 0): DemandMatch => ({ demand: d, score: 0, dev, ok: false, reason, parts: { route: 0, time: 0, capacity: 0, price: 0 } });
  if (fa.metro !== d.from || ta.metro !== d.to) return miss("Different route");
  if (leg.latest < d.pref - 1440 || leg.earliest > d.pref + 1440) return miss("Different date");
  if (d.pax > leg.cap) return miss(`Needs ${d.pax} seats, aircraft has ${leg.cap}`);
  const dep = Math.min(Math.max(d.pref, leg.earliest), leg.latest);
  const dev = Math.abs(dep - d.pref);
  const flex = Math.min(FLEX_MIN[d.flexH as 0 | 2 | 6 | 12 | 24], 1440);
  if (dev > flex) return miss(`Departure ${fmtDur(dev)} from their preferred time (flex ${fmtDur(flex)})`, dev);
  if (price > d.budget) return miss(`Offer ${price.toLocaleString("en-US")} is above their $${d.budget.toLocaleString("en-US")} budget`, dev);
  const parts = {
    route: (primaryGA(fa.metro)?.code === leg.from ? 1 : 0.75) * (primaryGA(ta.metro)?.code === leg.to ? 1 : 0.75),
    time: 1 - dev / Math.max(flex, 60),
    capacity: Math.min(1, d.pax / leg.cap / 0.5),
    price: Math.min(1, (d.budget - price) / price),
  };
  return { demand: d, dev, ok: true, score: Math.round(100 * (0.35 * parts.route + 0.3 * parts.time + 0.15 * parts.capacity + 0.2 * parts.price)) / 100, parts };
}

export const CONVERSION = 0.35; // chance an ideal match actually books (assumption)

export type Opportunity = {
  leg: EmptyLeg;
  matches: DemandMatch[];
  near: DemandMatch[]; // route-compatible searches that fail on one constraint
  confidence: number;
  expected: number;
  empty: { net: number };
  sold: { net: number };
  uplift: number;
  matchScore: number;
  flagged: string;
  suggestions: string[];
  bestPrice: { price: number; confidence: number };
};

const positioningCost = (l: EmptyLeg) => Math.round(l.charterEst * RULES.positioningCostShare);
const confidenceOf = (leg: EmptyLeg, ms: DemandMatch[]) => Math.min(0.95, (1 - ms.filter((m) => m.ok).reduce((p, m) => p * (1 - m.score * CONVERSION), 1)) * (1 - leg.risk));

export function analyze(leg: EmptyLeg, demand: Demand[]): Opportunity {
  const all = demand.map((d) => matchDemand(leg, d));
  const matches = all.filter((m) => m.ok).sort((a, b) => b.score - a.score);
  const near = all.filter((m) => !m.ok && m.reason !== "Different route" && m.reason !== "Different date" && !m.reason!.startsWith("Needs"));
  const confidence = confidenceOf(leg, matches);
  const pc = positioningCost(leg);
  const sold = leg.price - pc - RULES.marginalCost;
  // Price scan: the offer that maximises expected net revenue under the same model.
  let best = { price: leg.price, confidence, v: confidence * (leg.price - RULES.marginalCost) };
  for (let f = 0.3; f <= 0.9; f += 0.05) {
    const price = Math.round((leg.charterEst * f) / 50) * 50;
    const c = confidenceOf(leg, demand.map((d) => matchDemand(leg, d, price)));
    const v = c * (price - RULES.marginalCost);
    if (v > best.v) best = { price, confidence: c, v };
  }
  const suggestions: string[] = [];
  if (best.price !== leg.price) suggestions.push(`Model-optimal offer is ${usd0(best.price)} (${Math.round(best.confidence * 100)}% confidence) versus ${usd0(leg.price)} (${Math.round(confidence * 100)}%).`);
  // Timing: which departure inside the operator window covers the most searches?
  let bt = { t: leg.earliest, n: -1 };
  for (let t = leg.earliest; t <= leg.latest; t += 30) {
    const n = demand.filter((d) => d.from === AIRPORTS[leg.from].metro && d.to === AIRPORTS[leg.to].metro && Math.abs(t - d.pref) <= Math.min(FLEX_MIN[d.flexH as 0 | 2 | 6 | 12 | 24], 1440) && d.pax <= leg.cap).length;
    if (n > bt.n) bt = { t, n };
  }
  if (bt.n > 0) suggestions.push(`Departing around ${fmtHHmm(localHHmm(bt.t, AIRPORTS[leg.from].tz))} fits ${bt.n} route-compatible search${bt.n > 1 ? "es" : ""}.`);
  const priced = near.filter((m) => m.reason?.includes("budget"));
  if (priced.length) suggestions.push(`${priced.length} search${priced.length > 1 ? "es" : ""} fit the route and timing but sit under the offer price.`);
  const primary = primaryGA(AIRPORTS[leg.to].metro)?.code;
  if (primary && primary !== leg.to && matches.length < 2) suggestions.push(`Searches usually ask for ${primary}; ${leg.to} needs a ground transfer, so consider ${primary} if the aircraft can land there.`);
  return {
    leg, matches, near, confidence, expected: Math.round(confidence * leg.price), empty: { net: -pc }, sold: { net: sold }, uplift: leg.price - RULES.marginalCost,
    matchScore: matches.length ? Math.round((matches.slice(0, 3).reduce((a, m) => a + m.score, 0) / Math.min(3, matches.length)) * 100) / 100 : 0,
    flagged: `${leg.aircraftId} lands at ${leg.from} (after ${leg.prev}) but its next booked flight is ${leg.next}. ${fmtDur(leg.gapMin)} idle, so a ${leg.from}→${leg.to} repositioning flight is needed.`,
    suggestions, bestPrice: { price: best.price, confidence: best.confidence },
  };
}
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function rankOpportunities(legs: EmptyLeg[], demand: Demand[]) {
  return legs.map((l) => analyze(l, demand)).sort((a, b) => b.matches.length - a.matches.length || b.expected - a.expected);
}

/** Seeded aircraft plus any that arrived through an operator CSV import (`imported`), with their booked flights. */
export function fleetOverview(today: string, legs: EmptyLeg[], custom: SchedFlight[], imported?: ImportedInventory | null) {
  const planning = toAbs(anchorFriday(today), "00:00", -5);
  const sched = resolveSchedule(today, [...custom, ...(imported?.schedule ?? [])]);
  return allFleet(imported).filter((ac) => AIRCRAFT_TYPES[ac.type]).map((ac) => {
    const t = AIRCRAFT_TYPES[ac.type];
    const flights = sched.filter((f) => f.aircraft === ac.id).map((f) => ({ f, dep: toAbs(f.date!, f.dep, AIRPORTS[f.from].tz) })).sort((a, b) => a.dep - b.dep);
    const done = flights.filter((x) => x.dep + blockMin(x.f.from, x.f.to, t) <= planning);
    const mine = legs.filter((l) => l.aircraftId === ac.id).sort((a, b) => a.earliest - b.earliest);
    const nextLeg = mine.find((l) => l.latest >= planning);
    return {
      aircraft: ac, type: t, location: done.length ? done[done.length - 1].f.to : ac.baseAirport,
      status: nextLeg ? (nextLeg.status === "unavailable" ? "Positioning leg withdrawn" : `Positioning needed ${nextLeg.from}→${nextLeg.to}`) : "On schedule",
      upcoming: flights.filter((x) => x.dep >= planning).slice(0, 4).map((x) => `${x.f.from}→${x.f.to} ${fmtDate(x.f.date!)} ${fmtHHmm(x.f.dep)}`),
      legs: mine.length,
    };
  });
}

export function totals(ops: Opportunity[]) {
  const live = ops.filter((o) => o.leg.published && o.leg.status !== "unavailable");
  return {
    legs: ops.length,
    published: live.length,
    gross: live.reduce((a, o) => a + o.leg.price, 0),
    expected: live.reduce((a, o) => a + o.expected, 0),
    seats: live.reduce((a, o) => a + o.leg.cap, 0),
    matched: live.filter((o) => o.matches.length).length,
  };
}

// ---- Revenue view ---------------------------------------------------------------------------------------
// Where each leg's offer value sits right now. Every number is derived from the same Opportunity list the
// page already shows, so a price, publish or availability edit moves it immediately. Illustrative only.

export type RevenueState = "live" | "unpublished" | "unavailable";
export type RevenueRow = {
  legId: string;
  label: string; // "TEB→OPF"
  from: string;
  to: string;
  aircraftId: string;
  week: 0 | 1;
  earliest: number;
  state: RevenueState;
  offer: number; // current offer price
  expected: number; // offer × model confidence, only while the leg is live
  unsold: number; // offer value of a live leg that the model expects not to sell
  withheld: number; // offer value not on the market (unpublished or unavailable)
  matches: number;
  confidence: number;
};
export type RevenueBucket = { expected: number; unsold: number; withheld: number; gross: number; legs: number; live: number };
export type RevenueProjection = {
  rows: RevenueRow[];
  weeks: [RevenueBucket, RevenueBucket];
  total: RevenueBucket & { positioningCost: number; recoveryShare: number | null };
};

/**
 * Planning week of a leg. Seeded legs carry it in their id (a trailing "w1"). Legs that came from an
 * imported CSV have no such suffix, so when `today` is known they are placed by their departure window.
 */
export const legWeek = (id: string, earliest: number, today?: string): 0 | 1 =>
  /w1$/.test(id) ? 1 : today && earliest >= toAbs(anchorFriday(today), "00:00", -5) + 7 * 1440 ? 1 : 0;
const emptyBucket = (): RevenueBucket => ({ expected: 0, unsold: 0, withheld: 0, gross: 0, legs: 0, live: 0 });
const addTo = (b: RevenueBucket, r: RevenueRow) => {
  b.expected += r.expected; b.unsold += r.unsold; b.withheld += r.withheld; b.gross += r.offer; b.legs += 1; b.live += r.state === "live" ? 1 : 0;
};

/**
 * Splits every detected leg's offer into expected-to-sell, unsold-but-on-market and withheld.
 * Invariant per row and in total: gross = expected + unsold + withheld.
 */
export function revenueProjection(ops: Opportunity[], opts: { today?: string } = {}): RevenueProjection {
  const rows: RevenueRow[] = ops
    .map((o): RevenueRow => {
      const l = o.leg;
      const state: RevenueState = l.status === "unavailable" ? "unavailable" : l.published ? "live" : "unpublished";
      const live = state === "live";
      const expected = live ? Math.min(l.price, o.expected) : 0;
      return {
        legId: l.id, label: `${l.from}→${l.to}`, from: l.from, to: l.to, aircraftId: l.aircraftId, week: legWeek(l.id, l.earliest, opts.today), earliest: l.earliest, state,
        offer: l.price, expected, unsold: live ? l.price - expected : 0, withheld: live ? 0 : l.price,
        matches: o.matches.length, confidence: o.confidence,
      };
    })
    .sort((a, b) => a.earliest - b.earliest);
  const weeks: [RevenueBucket, RevenueBucket] = [emptyBucket(), emptyBucket()];
  const total = emptyBucket();
  for (const r of rows) { addTo(weeks[r.week], r); addTo(total, r); }
  const positioningCost = ops.reduce((a, o) => a - o.empty.net, 0);
  return { rows, weeks, total: { ...total, positioningCost, recoveryShare: positioningCost > 0 ? total.expected / positioningCost : null } };
}

/** Change in each bucket between a baseline (for example, seeded defaults) and the current projection. */
export const revenueChange = (now: RevenueBucket, before: RevenueBucket) => ({
  expected: now.expected - before.expected, unsold: now.unsold - before.unsold, withheld: now.withheld - before.withheld, gross: now.gross - before.gross,
});

// ---- Operator pitch facts -------------------------------------------------------------------------------

export type PitchFacts = {
  fleet: number;
  operators: number;
  legs: number;
  live: number;
  positioningCost: number; // modeled cost of flying every detected leg empty
  emptyHours: number; // block hours of repositioning flying
  seats: number;
  withDemand: number;
  expected: number;
  gross: number;
  recoveryShare: number | null;
  conversion: number;
  top: { label: string; expected: number; offer: number; matches: number } | null;
  controls: { lowestOffer: number | null; marginalCost: number; positioningShare: number };
};

export function pitchFacts(ops: Opportunity[], projection: RevenueProjection = revenueProjection(ops), imported?: ImportedInventory | null): PitchFacts {
  const fleet = allFleet(imported);
  const live = ops.filter((o) => o.leg.published && o.leg.status !== "unavailable");
  const top = live.slice().sort((a, b) => b.expected - a.expected)[0];
  const prices = live.map((o) => o.leg.price);
  return {
    fleet: fleet.length,
    operators: new Set(fleet.map((a) => a.operator)).size,
    legs: ops.length,
    live: live.length,
    positioningCost: projection.total.positioningCost,
    emptyHours: ops.reduce((a, o) => a + o.leg.durMin, 0) / 60,
    seats: live.reduce((a, o) => a + o.leg.cap, 0),
    withDemand: live.filter((o) => o.matches.length > 0).length,
    expected: projection.total.expected,
    gross: live.reduce((a, o) => a + o.leg.price, 0), // published legs only, same basis as totals().gross
    recoveryShare: projection.total.recoveryShare,
    conversion: CONVERSION,
    top: top ? { label: `${top.leg.from}→${top.leg.to}`, expected: top.expected, offer: top.leg.price, matches: top.matches.length } : null,
    controls: { lowestOffer: prices.length ? Math.min(...prices) : null, marginalCost: RULES.marginalCost, positioningShare: RULES.positioningCostShare },
  };
}
