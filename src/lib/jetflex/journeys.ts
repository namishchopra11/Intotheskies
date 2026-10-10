// Journey generator: builds every feasible one-direction journey (segments in order) between two
// places from the simulated timetable, on-demand charter, published empty legs and hybrid templates.
import { AIRCRAFT_TYPES, AIRPORTS, FC_ROUTES, fcFlightInfo, HYBRIDS, metroAirports, RULES, type FcRoute } from "./data";
import { blockMin, canReach, charterPrice, distKm, groundCost, groundMin, isDoor } from "./inventory";
import { addDays, fmtDay, fmtDur, fmtHHmm, fmtTime, localDate, localHHmm, toAbs } from "./time";
import type { AircraftType, Dir, EmptyLeg, Excluded, Journey, Kind, Segment } from "./types";

export type Spec = {
  from: string; // "door:nyc" or an airport code
  to: string;
  dir: Dir;
  pax: number;
  pref: number; // preferred first-flight departure
  lo: number; // flexibility window
  hi: number;
  dayLo: number; // the whole selected date: used to decide which excluded options are worth mentioning
  dayHi: number;
  readyAt?: number; // stranded travellers cannot start before this
  arriveBy?: number;
  legs: EmptyLeg[]; // published empty legs only
  skip?: (s: Segment) => boolean;
};

export const FLEX_MIN = { 0: 45, 2: 120, 6: 360, 12: 720, 24: Infinity } as const;
export const FLEX_LABEL = { 0: "Fixed schedule", 2: "Up to 2 hours", 6: "Up to 6 hours", 12: "Up to 12 hours", 24: "Whole day" } as const;

const name = (p: string) => (isDoor(p) ? "door" : p);
const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const r5 = (n: number) => Math.round(n / 5) * 5;
/** "3:07 PM–12:23 PM" reads as inverted when the window spans days, so name the day when the two ends differ. */
const windowLabel = (a: number, b: number, tz: number) =>
  localDate(a, tz) === localDate(b, tz) ? `${fmtTime(a, tz)}–${fmtTime(b, tz)}` : `${fmtDay(a, tz)} ${fmtTime(a, tz)} – ${fmtDay(b, tz)} ${fmtTime(b, tz)}`;
const typeName = (id?: string) => (id ? AIRCRAFT_TYPES[id].name : "");

const seg = (s: Pick<Segment, "id" | "mode" | "from" | "to" | "dep" | "arr" | "cost" | "label"> & Partial<Segment>): Segment => ({ gapBefore: 0, gapAfter: 0, risk: 0.03, ...s });

export function groundSeg(from: string, to: string, dep: number, pax: number): Segment {
  const m = groundMin(from, to);
  return seg({ id: `g:${name(from)}>${name(to)}@${dep}`, mode: "ground", from, to, dep, arr: dep + m, cost: groundCost(m, pax), label: `Chauffeured transfer · ${name(from) === "door" ? "your door" : from} → ${name(to) === "door" ? "your door" : to}`, risk: 0.03 });
}
const fcSeg = (r: FcRoute, date: string, time: string, pax: number): Segment => {
  const dep = toAbs(date, time, AIRPORTS[r.from].tz);
  const id = `fc:${r.from}${r.to}@${dep}`;
  const info = fcFlightInfo(r, date, time);
  return seg({
    id, ref: id, mode: "commercial", from: r.from, to: r.to, dep, arr: dep + r.dur, cost: info.fare * pax,
    label: `First class · ${r.from} → ${r.to} · ${info.flightNo}`, gapBefore: RULES.fcGapBefore, gapAfter: RULES.fcGapAfter, risk: 0.14, nonstop: true,
    carrier: info.carrier, flightNo: info.flightNo, equip: info.equip, seatsLeft: info.seatsLeft, fareClass: "First",
    caveat: `Simulated schedule and fare: ${info.carrier}, ${info.equip}, $${info.fare.toLocaleString("en-US")} per passenger × party size, ${info.seatsLeft} first-class seats left (illustrative).`,
  });
};
const charterSeg = (t: AircraftType, from: string, to: string, dep: number, pax: number): Segment => {
  const block = blockMin(from, to, t);
  const id = `ch:${t.id}:${from}${to}@${dep}`;
  return seg({ id, ref: `ch:${t.id}:${from}${to}`, mode: "charter", from, to, dep, arr: dep + block, cost: charterPrice(t, block), label: `Private charter · ${t.name} · ${from} → ${to}`, typeId: t.id, gapBefore: RULES.pvGapBefore, gapAfter: RULES.pvGapAfter, risk: 0.05, caveat: `Whole-aircraft price for up to ${t.cap} passengers; ${pax} travelling.` });
};
const elSeg = (l: EmptyLeg, dep: number): Segment =>
  seg({ id: `el:${l.id}@${dep}`, ref: l.id, mode: "empty_leg", from: l.from, to: l.to, dep, arr: dep + l.durMin, cost: l.price, label: `Empty leg · ${typeName(l.typeId)} · ${l.from} → ${l.to}${l.tail ? ` · ${l.tail}` : ""}`, typeId: l.typeId, gapBefore: RULES.pvGapBefore, gapAfter: RULES.pvGapAfter, risk: l.risk, caveat: "Repositioning flight: timing set by the operator, can change or be withdrawn. Not a confirmed booking." });

/** Chronology and geography check: every segment starts where the last ended, with the minimum transfer time. */
export function validate(segs: Segment[]): string[] {
  const out: string[] = [];
  segs.forEach((s, i) => {
    if (s.arr <= s.dep) out.push(`${s.label} has no duration`);
    if (!i) return;
    const p = segs[i - 1];
    if (p.to !== s.from) out.push(`${p.label} ends at ${name(p.to)} but the next segment starts at ${name(s.from)}`);
    const need = p.mode === "commercial" && s.mode === "commercial" ? RULES.fcConnect : Math.max(p.gapAfter, s.gapBefore);
    if (s.dep - p.arr < need) out.push(`Only ${fmtDur(s.dep - p.arr)} between ${name(p.to)} arrival and the next departure (needs ${fmtDur(need)})`);
  });
  return out;
}

const endpoints = (p: string) => (isDoor(p) ? metroAirports(p.slice(5)) : [AIRPORTS[p]]);
const datesBetween = (lo: number, hi: number, tz: number) => {
  const out: string[] = [];
  for (let d = localDate(lo, tz); d <= localDate(hi, tz); d = addDays(d, 1)) out.push(d);
  return out;
};

export function classify(segs: Segment[]): Kind {
  const f = segs.filter((s) => s.mode !== "ground");
  const c = f.some((s) => s.mode === "commercial");
  const p = f.some((s) => s.mode !== "commercial");
  return c && p ? "hybrid" : c ? "first_class" : f.some((s) => s.mode === "empty_leg") ? "empty_leg" : "charter";
}

export function generate(spec: Spec): { journeys: Journey[]; excluded: Excluded[] } {
  const { pax } = spec;
  const O = endpoints(spec.from);
  const D = endpoints(spec.to);
  const journeys = new Map<string, Journey>();
  const excluded: Excluded[] = [];
  const inWindow = (t: number) => t >= spec.lo && t <= spec.hi;

  const assemble = (flights: Segment[]): { segs?: Segment[]; reason?: string } => {
    const [first, last] = [flights[0], flights[flights.length - 1]];
    const segs = [...flights];
    if (spec.from !== first.from) {
      const m = groundMin(spec.from, first.from);
      if (m > RULES.maxGround) return { reason: `${fmtDur(m)} ground transfer to ${first.from} exceeds the ${fmtDur(RULES.maxGround)} limit` };
      segs.unshift(groundSeg(spec.from, first.from, first.dep - first.gapBefore - m, pax));
    }
    if (spec.to !== last.to) {
      const m = groundMin(last.to, spec.to);
      if (m > RULES.maxGround) return { reason: `${fmtDur(m)} ground transfer from ${last.to} exceeds the ${fmtDur(RULES.maxGround)} limit` };
      segs.push(groundSeg(last.to, spec.to, last.arr + last.gapAfter, pax));
    }
    if (spec.readyAt != null && segs[0].dep < spec.readyAt) return { reason: "Cannot be ready in time" };
    if (spec.arriveBy != null && segs[segs.length - 1].arr > spec.arriveBy) return { reason: "Arrives after your deadline" };
    const issues = validate(segs);
    return issues.length ? { reason: issues[0] } : { segs };
  };

  const add = (flights: Segment[], notes: string[] = []) => {
    if (flights.some((f) => spec.skip?.(f))) return null;
    const { segs, reason } = assemble(flights);
    if (!segs) return reason ?? null;
    const fl = segs.filter((s) => s.mode !== "ground");
    const [a, z] = [segs[0], segs[segs.length - 1]];
    const access = a.mode === "ground" ? a.arr - a.dep : 0;
    const egress = z.mode === "ground" ? z.arr - z.dep : 0;
    const j: Journey = {
      id: hash(segs.map((s) => s.id).join("|")), dir: spec.dir, kind: classify(segs), segments: segs,
      devMin: Math.abs(fl[0].dep - spec.pref), stops: fl.length - 1, match: access <= 60 && egress <= 60 ? "direct" : "nearby", notes,
    };
    journeys.set(j.id, j);
    return null;
  };

  // ---- scheduled first class (nonstop and one stop) ----
  const soldOut = new Set<string>();
  const flightsOn = (a: string, b: string, lo: number, hi: number) =>
    FC_ROUTES.filter((r) => r.from === a && r.to === b).flatMap((r) =>
      datesBetween(lo, hi, AIRPORTS[a].tz).flatMap((d) => r.deps.map((t) => fcSeg(r, d, t, pax))),
    ).filter((f) => {
      if (f.dep < lo || f.dep > hi) return false;
      if ((f.seatsLeft ?? 99) >= pax) return true;
      if (!soldOut.has(f.id)) {
        soldOut.add(f.id);
        excluded.push({ label: `First class · ${f.flightNo} · ${f.from} → ${f.to} · ${fmtHHmm(localHHmm(f.dep, AIRPORTS[f.from].tz))}`, reason: `Only ${f.seatsLeft} first-class seat${f.seatsLeft === 1 ? "" : "s"} left, you need ${pax}` });
      }
      return false;
    });
  for (const o of O.filter((a) => a.comm))
    for (const d of D.filter((a) => a.comm)) {
      if (o.code === d.code) continue;
      for (const f of flightsOn(o.code, d.code, spec.lo, spec.hi)) add([f]);
      const hubs = new Set(FC_ROUTES.filter((r) => r.from === o.code).map((r) => r.to));
      for (const h of hubs) {
        if (h === d.code || !FC_ROUTES.some((r) => r.from === h && r.to === d.code)) continue;
        // A connection only makes sense when the hub is roughly on the way.
        if (distKm(o.code, h) + distKm(h, d.code) > 1.4 * distKm(o.code, d.code)) continue;
        for (const f1 of flightsOn(o.code, h, spec.lo, spec.hi)) {
          const f2 = flightsOn(h, d.code, f1.arr, f1.arr + 1440).find((f) => f.dep >= f1.arr + RULES.fcConnect && f.dep - f1.arr <= 300);
          if (f2) add([{ ...f1, nonstop: false }, f2], [`Connection at ${h}: ${fmtDur(f2.dep - f1.arr)} between flights`]);
        }
      }
    }

  // ---- on-demand private charter ----
  const pickGA = (eps: typeof O, via: string) => {
    const ga = eps.filter((a) => a.ga);
    const pool = ga.length ? ga : metroAirports(eps[0].metro).filter((a) => a.ga);
    return pool.sort((x, y) => groundMin(via, x.code) - groundMin(via, y.code))[0];
  };
  const [co, cd] = [pickGA(O, spec.from), pickGA(D, spec.to)];
  if (co && cd && co.code !== cd.code) {
    const seats = Object.values(AIRCRAFT_TYPES).filter((t) => t.cap >= pax);
    const km = distKm(co.code, cd.code);
    const fit = seats.filter((t) => canReach(t, km)).sort((a, b) => a.cap - b.cap); // stable: the first-listed type wins a tie on seats
    const types = [...new Set([fit[0], fit.find((t) => t.id === "challenger") ?? fit[1]])].filter(Boolean);
    if (!seats.length) excluded.push({ label: "Private charter", reason: `No aircraft in the simulated fleet seats ${pax}` });
    else if (!fit.length) excluded.push({ label: "Private charter", reason: `${co.code} → ${cd.code} is ${Math.round(km).toLocaleString("en-US")} km, beyond the nonstop range of every aircraft that seats ${pax}` });
    const accessMin = spec.from === co.code ? 0 : groundMin(spec.from, co.code);
    const egressMin = spec.to === cd.code ? 0 : groundMin(cd.code, spec.to);
    for (const t of types) {
      const block = blockMin(co.code, cd.code, t);
      let dep = Math.min(Math.max(spec.pref, spec.lo), spec.hi);
      if (spec.readyAt != null) dep = Math.max(dep, spec.readyAt + accessMin + RULES.pvGapBefore);
      if (spec.arriveBy != null) dep = Math.min(dep, spec.arriveBy - egressMin - RULES.pvGapAfter - block);
      dep = r5(dep);
      const reason = !inWindow(dep) ? "Cannot meet your deadline inside your departure window" : add([charterSeg(t, co.code, cd.code, dep, pax)]);
      if (reason) excluded.push({ label: `Private charter · ${t.name}`, reason });
    }
  }

  // ---- published empty legs ----
  const ids = (e: typeof O) => new Set(e.map((a) => a.code));
  const [oc, dc] = [ids(O), ids(D)];
  const egressOf = (to: string) => (spec.to === to ? 0 : groundMin(to, spec.to));
  const accessOf = (from: string) => (spec.from === from ? 0 : groundMin(spec.from, from));
  for (const l of spec.legs) {
    if (!oc.has(l.from) || !dc.has(l.to) || l.latest < spec.dayLo || l.earliest > spec.dayHi) continue;
    const label = `Empty leg · ${typeName(l.typeId)} · ${l.from} → ${l.to}`;
    if (l.status === "unavailable") { excluded.push({ label, reason: "Marked unavailable by the operator" }); continue; }
    if (l.cap < pax) { excluded.push({ label, reason: `Seats ${l.cap}, you need ${pax}` }); continue; }
    let a = Math.max(l.earliest, spec.lo);
    let b = Math.min(l.latest, spec.hi);
    if (spec.readyAt != null) a = Math.max(a, spec.readyAt + accessOf(l.from) + RULES.pvGapBefore);
    if (spec.arriveBy != null) b = Math.min(b, spec.arriveBy - egressOf(l.to) - RULES.pvGapAfter - l.durMin);
    if (a > b) {
      // Which flexibility setting would have caught it?
      const near = Math.min(Math.max(spec.pref, Math.max(l.earliest, spec.dayLo)), Math.min(l.latest, spec.dayHi));
      const dev = Math.abs(near - spec.pref);
      const unlock = (Object.entries(FLEX_MIN).find(([, m]) => dev <= m)?.[0] ?? 24) as unknown as number;
      const late = spec.arriveBy != null && Math.min(l.latest, spec.hi) > b;
      excluded.push({
        label,
        reason: late ? "Would arrive after your deadline" : `Earliest/closest departure is ${fmtHHmm(localHHmm(near, AIRPORTS[l.from].tz))}, ${fmtDur(dev)} from your preferred time`,
        unlockFlexH: late ? undefined : Number(unlock),
      });
      continue;
    }
    const dep = Math.min(b, Math.max(a, r5(Math.min(Math.max(spec.pref, a), b))));
    const reason = add([elSeg(l, dep)], [`Operator window ${windowLabel(l.earliest, l.latest, AIRPORTS[l.from].tz)}`]);
    if (reason) excluded.push({ label, reason });
  }

  // ---- hybrid templates: airline to a hub, ground to a private field, short private hop ----
  for (const h of HYBRIDS) {
    const t = Object.values(AIRCRAFT_TYPES).filter((x) => x.cap >= pax).sort((a, b) => a.cap - b.cap)[0];
    if (!t) continue;
    if (spec.to === `door:${h.metro}`) {
      for (const o of O.filter((a) => a.comm))
        for (const f of flightsOn(o.code, h.hub, spec.lo, spec.hi)) {
          const g = groundSeg(h.hub, h.ga, f.arr + f.gapAfter, pax);
          const c = charterSeg(t, h.ga, h.local, r5(Math.ceil((g.arr + RULES.pvGapBefore) / 5) * 5), pax);
          add([f, g, c], [`Airline to ${h.hub}, ${fmtDur(g.arr - g.dep)} transfer to ${h.ga}, then a private hop`]);
        }
    } else if (spec.from === `door:${h.metro}`) {
      const block = blockMin(h.local, h.ga, t);
      const gm = groundMin(h.ga, h.hub);
      for (const d of D.filter((a) => a.comm))
        for (const f of flightsOn(h.hub, d.code, spec.lo, spec.hi + 720).slice(0, 4)) {
          const dep = r5(Math.min(Math.max(spec.pref, spec.lo), spec.hi, f.dep - RULES.fcGapBefore - gm - RULES.pvGapAfter - block));
          if (dep < spec.lo) continue;
          const c = charterSeg(t, h.local, h.ga, dep, pax);
          const g = groundSeg(h.ga, h.hub, c.arr + RULES.pvGapAfter, pax);
          add([c, g, f], [`Private hop to ${h.ga}, ${fmtDur(g.arr - g.dep)} transfer to ${h.hub}, then the airline`]);
        }
    }
  }

  return { journeys: [...journeys.values()], excluded };
}

export const windowFor = (pref: number, flexH: 0 | 2 | 6 | 12 | 24, dayLo: number, dayHi: number): [number, number] => {
  const w = FLEX_MIN[flexH];
  return [Math.max(dayLo, pref - w), Math.min(dayHi, pref + w)];
};
