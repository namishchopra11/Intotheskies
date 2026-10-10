// JetShield: deterministic disruption simulation and recovery search over the same simulated
// inventory the search uses. Nothing here touches a real booking.
import { RULES } from "./data";
import { classify, generate, type Spec } from "./journeys";
import { tzOf } from "./inventory";
import { fmtDay, fmtDur, fmtTime, toAbs, usd } from "./time";
import { makeItinerary } from "./search";
import { AIRCRAFT_TYPES } from "./data";
import type { Dir, EmptyLeg, Itinerary, Journey, Segment, TripRequest } from "./types";

export type ScenarioId = "delay" | "aircraft" | "weather" | "missed" | "ground";
export const SCENARIOS: { id: ScenarioId; label: string; blurb: string }[] = [
  { id: "delay", label: "Flight delayed", blurb: "The first flight leaves 2 h 30 m late." },
  { id: "aircraft", label: "Aircraft unavailable", blurb: "The private aircraft is pulled from service." },
  { id: "weather", label: "Weather cancellation", blurb: "Departures from your airport are grounded for 4 hours." },
  { id: "missed", label: "Connection missed", blurb: "You miss the second flight (or the departure, if there is only one)." },
  { id: "ground", label: "Ground transfer delayed", blurb: "A chauffeured transfer runs 90 minutes late." },
];
export const DELAY_MIN = 150;
export const GROUND_DELAY_MIN = 90;

export type SegStatus = "ok" | "delayed" | "cancelled" | "missed";
export type Recovery = {
  id: string;
  name: string;
  segments: Segment[];
  arrival: number;
  vsPlan: number; // minutes later (+) or earlier (-) than the original arrival
  extraCost: number;
  cost: number;
  risk: number;
  score: number;
  kind: ReturnType<typeof classify>;
  notes: string[];
  remaining: string[];
};
export type ShieldResult = {
  scenario: ScenarioId;
  dir: Dir;
  headline: string;
  consequences: string[];
  original: Segment[]; // with the disruption applied, for display
  statuses: SegStatus[];
  stranded: { place: string; readyAt: number } | null;
  originalArrival: number;
  options: Recovery[];
  rejected: { name: string; reason: string }[];
  keep: Segment[]; // already-completed segments kept in a replacement
  considered: number; // candidate journeys generated or ruled out before ranking (for the search step)
};

const need = (p: Segment, s: Segment) => (p.mode === "commercial" && s.mode === "commercial" ? RULES.fcConnect : Math.max(p.gapAfter, s.gapBefore));
const dur = (s: Segment) => s.arr - s.dep;

export function simulate(it: Itinerary, req: TripRequest, scenario: ScenarioId, dir: Dir, legs: EmptyLeg[]): ShieldResult | null {
  const j = it.journeys.find((x) => x.dir === dir);
  if (!j) return null;
  const segs = j.segments.map((s) => ({ ...s }));
  const flights = segs.map((s, i) => (s.mode === "ground" ? -1 : i)).filter((i) => i >= 0);
  const privateIdx = flights.find((i) => segs[i].mode === "charter" || segs[i].mode === "empty_leg");
  const statuses: SegStatus[] = segs.map(() => "ok");
  const consequences: string[] = [];
  const origArrival = segs[segs.length - 1].arr;
  let k = -1; // first segment that can no longer run as planned
  let place = "";
  let readyAt = 0;
  let headline = "";
  let skip: Spec["skip"];
  let keepOriginal: Segment[] | null = null;

  const cancel = (i: number, why: string) => {
    k = i;
    statuses[i] = "cancelled";
    const first = flights[0] === i && segs.slice(0, i).every((s) => s.mode === "ground");
    place = first ? segs[0].from : segs[i].from;
    readyAt = first ? segs[i].dep - 120 : Math.max(segs[i - 1].arr + segs[i - 1].gapAfter, segs[i].dep - 120);
    consequences.push(why, first ? `You are still at ${place.startsWith("door:") ? "home" : place}, so JetShield replans the whole journey.` : `You are at ${place}; JetShield replans from here.`);
    const ref = segs[i].ref;
    skip = (s) => s.ref === ref;
  };

  if (scenario === "aircraft") {
    const i = privateIdx ?? flights[0];
    headline = privateIdx != null ? "Your aircraft is unavailable" : "No private aircraft on this journey; the first flight is cancelled instead";
    cancel(i, `${segs[i].label} will not operate (simulated: aircraft taken out of service).`);
  } else if (scenario === "weather") {
    const i = flights[0];
    headline = `Weather closes ${segs[i].from}`;
    cancel(i, `${segs[i].label} is cancelled: simulated storm grounding departures from ${segs[i].from} for 4 hours.`);
    const [ref, from, until] = [segs[i].ref, segs[i].from, readyAt + 240];
    skip = (s) => s.ref === ref || (s.mode !== "ground" && s.from === from && s.dep < until);
  } else if (scenario === "missed") {
    const i = flights[1] ?? flights[0];
    headline = flights[1] != null ? "You miss your connection" : "You miss your departure";
    k = i;
    statuses[i] = "missed";
    place = segs[i].from;
    readyAt = segs[i].dep + 5;
    consequences.push(`${segs[i].label} departs without you (simulated).`);
    const ref = segs[i].ref;
    skip = (s) => s.ref === ref;
  } else {
    // delay of a flight, or of a chauffeured transfer
    const grounds = segs.map((s, i) => (s.mode === "ground" && i < segs.length - 1 ? i : -1)).filter((i) => i >= 0);
    const gIdx = grounds.find((i) => i > 0) ?? grounds[0] ?? -1;
    const t = scenario === "delay" ? flights[0] : gIdx >= 0 ? gIdx : segs.length - 1;
    const delay = scenario === "delay" ? DELAY_MIN : GROUND_DELAY_MIN;
    headline = scenario === "delay" ? `${segs[t].label.split(" · ").slice(0, 2).join(" · ")} is delayed ${delay} min` : `A ground transfer runs ${delay} minutes late`;
    segs[t].dep += delay;
    segs[t].arr += delay;
    statuses[t] = "delayed";
    consequences.push(`${segs[t].label} is ${delay} minutes late (simulated).`);
    let broke = false;
    for (let i = t + 1; i < segs.length; i++) {
      const prev = segs[i - 1];
      if (segs[i].mode === "ground") {
        const dep = Math.max(segs[i].dep, prev.arr + prev.gapAfter);
        if (dep !== segs[i].dep) { const d = dur(segs[i]); segs[i].dep = dep; segs[i].arr = dep + d; statuses[i] = "delayed"; }
      } else if (segs[i].dep < prev.arr + need(prev, segs[i])) {
        broke = true;
        k = i;
        statuses[i] = "missed";
        place = segs[i].from;
        readyAt = prev.arr + prev.gapAfter;
        consequences.push(`You reach ${place} at the new time, ${Math.round((prev.arr + need(prev, segs[i]) - segs[i].dep))} minutes too late for ${segs[i].label}.`);
        const ref = segs[i].ref;
        skip = (s) => s.ref === ref;
        break;
      } else if (statuses[i - 1] === "delayed") {
        break; // the delay is absorbed by this segment's buffer
      }
    }
    if (!broke) {
      const late = segs[segs.length - 1].arr - origArrival;
      consequences.push(late > 0 ? `The rest of the plan still works but you arrive ${late} minutes late.` : "The rest of the plan absorbs the delay. Your arrival time does not change.");
      keepOriginal = segs;
      // Alternatives are still worth comparing, from the start of the journey.
      k = flights[0] === t ? t : Math.max(0, t);
      place = segs[0].from;
      readyAt = segs[0].dep - 60;
      skip = (s) => s.ref === segs[t].ref;
    }
  }

  const keepFrom = place === segs[0].from && (k === 0 || segs.slice(0, k).every((s) => s.mode === "ground")) ? 0 : k;
  const keep = keepFrom === 0 ? [] : segs.slice(0, keepFrom).map((s) => ({ ...s }));
  const dest = segs[segs.length - 1].to;
  const remainingCost = segs.slice(keepFrom).reduce((a, s) => a + s.cost, 0);
  const arriveByAbs = dir === "out" && req.arriveBy ? toAbs(req.departDate, req.arriveBy, tzOf(dest)) : undefined;
  const retDep = dir === "out" ? it.journeys.find((x) => x.dir === "ret")?.segments[0].dep : undefined;
  const spec: Spec = {
    from: keepFrom === 0 ? segs[0].from : place, to: dest, dir, pax: it.pax, pref: readyAt, lo: readyAt, hi: readyAt + 720, dayLo: readyAt, dayHi: readyAt + 1440,
    readyAt, arriveBy: arriveByAbs, legs: legs.filter((l) => l.published), skip,
  };
  const { journeys, excluded } = generate(spec);
  const rejected = excluded.map((e) => ({ name: e.label, reason: e.reason }));
  const opts: Recovery[] = [];
  const mk = (segments: Segment[], notes: string[]) => {
    const all = [...keep, ...segments];
    const cost = segments.reduce((a, s) => a + s.cost, 0);
    const arrival = segments[segments.length - 1].arr;
    const risk = 1 - segments.reduce((p, s) => p * (1 - s.risk), 1);
    const kind = classify(all);
    const flightSeg = segments.find((s) => s.mode !== "ground");
    const route = segments.filter((s) => s.mode !== "ground");
    const label = { first_class: "First class", charter: "Private charter", empty_leg: "Empty leg", hybrid: "Hybrid" }[classify(segments)];
    const aircraft = flightSeg?.typeId ? ` · ${AIRCRAFT_TYPES[flightSeg.typeId].name}` : "";
    const name = `${label}${aircraft} · ${route[0].from}→${route[route.length - 1].to}`;
    return { name, segments, arrival, cost, risk, kind, notes };
  };
  for (const jr of journeys) opts.push({ ...mk(jr.segments, jr.notes), id: jr.id, vsPlan: 0, extraCost: 0, score: 0, remaining: [] });
  if (keepOriginal) {
    const ks = keepOriginal.slice(keepFrom);
    const o = mk(ks, ["Stay on the original plan, now running late."]);
    opts.push({ ...o, id: "keep", name: "Stay on the delayed plan", cost: 0, vsPlan: 0, extraCost: 0, score: 0, remaining: [] });
  }

  // Constraint checks against the rest of the trip, then transparent scoring.
  const feasible: Recovery[] = [];
  for (const o of opts) {
    if (retDep != null && o.arrival + 60 > retDep) { rejected.push({ name: o.name, reason: "Arrives too late for your return journey" }); continue; }
    o.vsPlan = o.arrival - origArrival;
    o.extraCost = o.id === "keep" ? 0 : o.cost - remainingCost;
    o.remaining = [];
    if (o.risk > 0.25) o.remaining.push(`Modeled disruption risk ${Math.round(o.risk * 100)}%`);
    if (o.segments.some((s) => s.mode === "empty_leg")) o.remaining.push("Empty leg: operator can still change or withdraw it");
    if (o.id === "keep") o.remaining.push("Further delays would strand you again");
    feasible.push(o);
  }
  const rng = (f: (o: Recovery) => number) => { const v = feasible.map(f); return [Math.min(...v), Math.max(...v)]; };
  const [a0, a1] = rng((o) => o.arrival);
  const [c0, c1] = rng((o) => o.id === "keep" ? 0 : o.cost);
  const [r0, r1] = rng((o) => o.risk);
  const norm = (v: number, lo: number, hi: number) => (hi === lo ? 1 : (hi - v) / (hi - lo));
  const w = { a: req.weights.speed + 4, c: req.weights.cost, r: req.weights.certainty };
  for (const o of feasible) o.score = Math.round((100 * (w.a * norm(o.arrival, a0, a1) + w.c * norm(o.id === "keep" ? 0 : o.cost, c0, c1) + w.r * norm(o.risk, r0, r1))) / (w.a + w.c + w.r) * 10) / 10;
  feasible.sort((x, y) => y.score - x.score);

  return {
    scenario, dir, headline, consequences, original: segs, statuses,
    stranded: keepOriginal ? null : { place, readyAt }, originalArrival: origArrival, options: feasible.slice(0, 6), rejected: dedupe(rejected), keep,
    considered: journeys.length + excluded.length + (keepOriginal ? 1 : 0),
  };
}

const dedupe = (r: { name: string; reason: string }[]) => [...new Map(r.map((x) => [x.name + x.reason, x])).values()].slice(0, 8);

/** Swap a recovery option into the itinerary (the user's approval step in the demo). */
export function applyRecovery(it: Itinerary, req: TripRequest, res: ShieldResult, opt: Recovery): Itinerary {
  const journeys: Journey[] = it.journeys.map((j) =>
    j.dir === res.dir ? { ...j, id: `${j.id}>${opt.id}`, segments: [...res.keep, ...opt.segments], kind: classify([...res.keep, ...opt.segments]), notes: [`Recovered: ${opt.name}`] } : j,
  );
  const next = makeItinerary(journeys, { ...req, pax: it.pax });
  return { ...next, id: `${it.id}~${opt.id}`, name: `${it.name} (recovered)`, recoveredFrom: it.name };
}
export const costDelta = (n: number) => (n > 0 ? `+${usd(n)}` : n < 0 ? `−${usd(-n)}` : "no change");

// ---- Recovery timeline -------------------------------------------------------------------------------
// The live-demo sequence: planned itinerary, disruption detected, options searched, replacements ranked,
// awaiting approval. Pure data with relative delays so the screen can play, skip and replay it, and so
// it can be tested without a browser.

export type TimelineStepId = "plan" | "detect" | "search" | "rank" | "approval";
export type TimelineStep = {
  id: TimelineStepId;
  title: string;
  detail: string;
  stamp?: string; // simulated clock time, shown beside the title
  tone: "steel" | "bad" | "gold" | "ok";
  delayMs: number; // after the previous step starts (0 for the first)
  at: number; // ms from the start of the run when this step appears
  count?: number; // a number that ticks up from 0 over countMs once the step appears
  countMs?: number;
};

/** Gaps between steps. Each is within the 400 to 700 ms band so the sequence reads without dragging. */
export const STEP_DELAYS: Record<Exclude<TimelineStepId, "plan">, number> = { detect: 500, search: 600, rank: 700, approval: 500 };
export const COUNT_MS = 600;

const placeLabel = (p: string) => (p.startsWith("door:") ? "home" : p);
const routeOf = (segs: Segment[]) => {
  const f = segs.filter((s) => s.mode !== "ground");
  return f.length ? `${f[0].from}→${f[f.length - 1].to}` : "ground only";
};
const stampOf = (abs: number, place: string) => `${fmtDay(abs, tzOf(place))} ${fmtTime(abs, tzOf(place))} at ${placeLabel(place)}`;

/** When JetShield "notices" the disruption (simulated): ahead of departure, or just after a missed one. */
export function detectedAt(res: ShieldResult): { abs: number; place: string } {
  const i = Math.max(0, res.statuses.findIndex((s) => s !== "ok"));
  const seg = res.original[i];
  if (res.stranded) return { abs: res.stranded.readyAt, place: res.stranded.place };
  const shift = res.scenario === "delay" ? DELAY_MIN : res.scenario === "ground" ? GROUND_DELAY_MIN : 0;
  return { abs: seg.dep - shift - 60, place: seg.from };
}

export function buildRecoveryTimeline(it: Itinerary, res: ShieldResult): TimelineStep[] {
  const j = it.journeys.find((x) => x.dir === res.dir) ?? it.journeys[0];
  const last = j.segments[j.segments.length - 1];
  const sc = SCENARIOS.find((s) => s.id === res.scenario);
  const det = detectedAt(res);
  const best = res.options[0];
  const ruledOut = Math.max(0, res.considered - res.options.length);
  const raw: Omit<TimelineStep, "at" | "delayMs">[] = [
    {
      id: "plan", tone: "steel", title: "Planned itinerary",
      detail: `${routeOf(j.segments)} · ${it.pax} traveler${it.pax > 1 ? "s" : ""} · arrives ${fmtDay(last.arr, tzOf(last.to))} ${fmtTime(last.arr, tzOf(last.to))}.`,
    },
    {
      id: "detect", tone: "bad", title: "Disruption detected", stamp: stampOf(det.abs, det.place),
      detail: `${res.headline} (cause: ${(sc?.label ?? "disruption").toLowerCase()}). ${res.consequences[0] ?? ""}`.trim(),
    },
    {
      id: "search", tone: "steel", title: "Options searched", count: res.considered, countMs: COUNT_MS,
      detail: `Checked against ${it.pax} traveler${it.pax > 1 ? "s" : ""}, timing, aircraft and your return journey.`,
    },
    {
      id: "rank", tone: best ? "gold" : "bad", title: best ? "Replacements ranked" : "No replacement found",
      detail: best
        ? `${res.options.length} feasible, ${ruledOut} ruled out. Best match: ${best.name}${best.vsPlan === 0 ? ", on the original arrival" : `, ${fmtDur(best.vsPlan)} ${best.vsPlan > 0 ? "later" : "earlier"} than planned`}.`
        : "Nothing in the simulated inventory fits your party, timing and return journey.",
    },
    {
      id: "approval", tone: "ok", title: best ? "Awaiting your approval" : "Awaiting your decision",
      detail: "Nothing changes until you approve a replacement. Approving updates this simulated itinerary only.",
    },
  ];
  let at = 0;
  return raw.map((s, n) => {
    const delayMs = n === 0 ? 0 : STEP_DELAYS[s.id as keyof typeof STEP_DELAYS];
    at += delayMs;
    return { ...s, delayMs, at };
  });
}

/** Time until everything, including a ticking count, has finished. */
export const timelineTotalMs = (steps: TimelineStep[]) => steps.reduce((m, s) => Math.max(m, s.at + (s.countMs ?? 0)), 0);
/** How many steps are showing after `elapsedMs`. Steps reveal in order. */
export const revealedCount = (steps: TimelineStep[], elapsedMs: number) => steps.filter((s) => s.at <= elapsedMs).length;
/** The number a counting step shows at `elapsedMs`: 0 before it appears, its final value once done. */
export function countAt(step: TimelineStep, elapsedMs: number): number {
  if (step.count == null) return 0;
  const ms = step.countMs ?? 0;
  if (ms <= 0) return step.count;
  const t = Math.min(1, Math.max(0, (elapsedMs - step.at) / ms));
  return Math.round(step.count * t);
}

// ---- Before / after ----------------------------------------------------------------------------------

export type Protection = { id: "arrive_by" | "return" | "party" | "risk"; label: string; ok: boolean; detail: string };
export type RecoveryDiff = {
  name: string;
  place: string; // where the arrival is measured
  arrival: { before: number; after: number; deltaMin: number };
  cost: { before: number; after: number; delta: number }; // the part of the trip being replaced
  protections: Protection[];
};

/** What approving `opt` changes, and which commitments it keeps. Pure; the screen shows it after approval. */
export function buildRecoveryDiff(it: Itinerary, req: TripRequest, res: ShieldResult, opt: Recovery): RecoveryDiff {
  const dest = res.original[res.original.length - 1].to;
  const tz = tzOf(dest);
  const planned = (it.journeys.find((x) => x.dir === res.dir) ?? it.journeys[0]).segments;
  const costBefore = planned.slice(res.keep.length).reduce((a, s) => a + s.cost, 0); // the part being replaced
  const protections: Protection[] = [];
  if (res.dir === "out" && req.arriveBy) {
    const deadline = toAbs(req.departDate, req.arriveBy, tz);
    const margin = deadline - opt.arrival;
    protections.push({
      id: "arrive_by", label: `Arrive-by commitment, ${fmtTime(deadline, tz)}`, ok: margin >= 0,
      detail: margin >= 0 ? `Arrives ${fmtDur(margin)} before it.` : `Arrives ${fmtDur(margin)} after it. This option does not protect the commitment.`,
    });
  }
  const ret = res.dir === "out" ? it.journeys.find((x) => x.dir === "ret") : undefined;
  if (ret) {
    const dep = ret.segments[0].dep;
    const margin = dep - opt.arrival;
    protections.push({
      id: "return", label: `Return journey, ${fmtTime(dep, tzOf(ret.segments[0].from))}`, ok: margin >= 60,
      detail: margin >= 60 ? `Still departs as booked, ${fmtDur(margin)} after you arrive.` : "Leaves less than an hour after you arrive.",
    });
  }
  protections.push({ id: "party", label: `Party of ${it.pax}`, ok: true, detail: `All ${it.pax} traveler${it.pax > 1 ? "s" : ""} are seated on the replacement.` });
  protections.push({
    id: "risk", label: "Modeled disruption risk", ok: opt.risk <= 0.25,
    detail: `${Math.round(opt.risk * 100)}% across the new segments${opt.segments.some((s) => s.mode === "empty_leg") ? "; empty legs can still be changed or withdrawn by the operator" : ""}.`,
  });
  return {
    name: opt.name, place: dest,
    arrival: { before: res.originalArrival, after: opt.arrival, deltaMin: opt.arrival - res.originalArrival },
    cost: { before: costBefore, after: costBefore + opt.extraCost, delta: opt.extraCost },
    protections,
  };
}
