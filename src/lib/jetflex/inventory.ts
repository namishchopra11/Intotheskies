import { AIRCRAFT_TYPES, AIRPORTS, FLEET, METROS, RULES, SCHEDULE, SCHEDULE_WEEKS } from "./data";
import { addDays, fmtDate, nextDow, toAbs, fmtTime } from "./time";
import type { Aircraft, AircraftType, EmptyLeg, ImportedInventory, LegStatus, SchedFlight } from "./types";

// ---- geography and ground ----------------------------------------------------------------------
export const isDoor = (p: string) => p.startsWith("door:");
const coord = (p: string) => (isDoor(p) ? METROS[p.slice(5)] : AIRPORTS[p]);
export const tzOf = (p: string) => (isDoor(p) ? Object.values(AIRPORTS).find((a) => a.metro === p.slice(5))! : AIRPORTS[p]).tz;

export function distKm(a: string, b: string) {
  const [p, q] = [coord(a), coord(b)];
  const r = Math.PI / 180;
  const h = Math.sin(((q.lat - p.lat) * r) / 2) ** 2 + Math.cos(p.lat * r) * Math.cos(q.lat * r) * Math.sin(((q.lon - p.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** Door-to-airport uses the airport's centre distance; airport-to-airport is road distance at ~55 km/h plus 12 minutes. */
export function groundMin(from: string, to: string) {
  if (isDoor(from) && !isDoor(to) && AIRPORTS[to].metro === from.slice(5)) return AIRPORTS[to].centerMin;
  if (isDoor(to) && !isDoor(from) && AIRPORTS[from].metro === to.slice(5)) return AIRPORTS[from].centerMin;
  return Math.round(((distKm(from, to) * 1.3) / 55) * 60 + 12);
}
export const groundCost = (min: number, pax: number) => Math.ceil(pax / RULES.vehicleSeats) * Math.round((40 + 1.8 * min) / 5) * 5;

// ---- aircraft economics ------------------------------------------------------------------------
export const blockMin = (a: string, b: string, t: AircraftType) => Math.round((distKm(a, b) / t.speed) * 60 + 25);
/** Whole-aircraft one-way price: block hours (90 min minimum) at the class rate, handling fees, then 7.5% federal excise tax. */
export const charterPrice = (t: AircraftType, block: number) =>
  Math.round((((t.rate * Math.max(block, RULES.minBillable)) / 60 + RULES.charterFees) * (1 + RULES.fet)) / 50) * 50;
/** True when the aircraft can fly the distance nonstop with a 10% reserve margin. */
export const canReach = (t: AircraftType, km: number) => km <= (t.range ?? Infinity) * 0.9;
/** Wider timing flexibility lets the operator fill the leg more easily, so the model suggests a deeper discount. */
export const suggestOffer = (charterEst: number, flexH: number) => Math.round((charterEst * (1 - Math.min(0.75, 0.35 + 0.035 * flexH))) / 50) * 50;

export const anchorFriday = (today: string) => nextDow(today, 5);

// ---- empty-leg detection -----------------------------------------------------------------------
export type Overrides = Record<string, { price?: number; status?: LegStatus; published?: boolean }>;
export const OPS_GAP_CAP_H = 72;

export function resolveSchedule(today: string, custom: SchedFlight[] = []) {
  const anchor = anchorFriday(today);
  const seeded: SchedFlight[] = [];
  for (let w = 0; w < SCHEDULE_WEEKS; w++)
    for (const f of SCHEDULE) seeded.push({ ...f, id: w ? `${f.id}w${w}` : f.id, date: addDays(anchor, (f.day ?? 0) + 7 * w) });
  return [...seeded, ...custom].map((f) => ({ ...f, date: f.date ?? addDays(anchor, f.day ?? 0) }));
}

/** Seeded fleet plus any aircraft that arrived through an operator CSV import. */
export const allFleet = (imported?: ImportedInventory | null): Aircraft[] => [...FLEET, ...(imported?.fleet.filter((a) => !FLEET.some((f) => f.id === a.id)) ?? [])];

export function deriveLegs(today: string, overrides: Overrides = {}, custom: SchedFlight[] = [], imported?: ImportedInventory | null): EmptyLeg[] {
  const nowAbs = toAbs(today, "00:00", -5);
  const flights = resolveSchedule(today, [...custom, ...(imported?.schedule ?? [])]);
  const legs: EmptyLeg[] = [];
  for (const ac of allFleet(imported)) {
    const t = AIRCRAFT_TYPES[ac.type];
    if (!t) continue;
    const list = flights
      .filter((f) => f.aircraft === ac.id && AIRPORTS[f.from] && AIRPORTS[f.to])
      .map((f) => {
        const dep = toAbs(f.date!, f.dep, AIRPORTS[f.from].tz);
        return { f, dep, arr: dep + blockMin(f.from, f.to, t) };
      })
      .sort((a, b) => a.dep - b.dep);
    for (let i = 0; i + 1 < list.length; i++) {
      const [a, b] = [list[i], list[i + 1]];
      if (a.f.to === b.f.from) continue;
      if (!canReach(t, distKm(a.f.to, b.f.from))) continue;
      const dur = blockMin(a.f.to, b.f.from, t);
      const earliest = a.arr + RULES.turnaround;
      const latest = b.dep - dur - RULES.turnaround;
      if (latest < earliest || latest < nowAbs || latest - earliest > OPS_GAP_CAP_H * 60) continue;
      const flexH = Math.min(8, (latest - earliest) / 120);
      const charterEst = charterPrice(t, dur);
      const suggested = suggestOffer(charterEst, flexH);
      const id = `EL-${ac.id}-${b.f.id}`;
      const o = overrides[id] ?? {};
      legs.push({
        id, aircraftId: ac.id, typeId: ac.type, operator: ac.operator, from: a.f.to, to: b.f.from, earliest, latest, durMin: dur,
        cap: t.cap, charterEst, suggested, price: o.price ?? suggested, status: o.status ?? "available", published: o.published ?? ac.autoList,
        risk: Math.min(0.4, Math.max(0.12, 0.38 - 0.03 * flexH)), flexH,
        prev: `${a.f.from}→${a.f.to} ${fmtDate(a.f.date!)} ${fmtTime(a.dep, AIRPORTS[a.f.from].tz)}`,
        next: `${b.f.from}→${b.f.to} ${fmtDate(b.f.date!)} ${fmtTime(b.dep, AIRPORTS[b.f.from].tz)}`,
        gapMin: b.dep - a.arr, tail: ac.tail ?? ac.id, source: "detected",
      });
    }
  }
  return applyOffered(legs, imported, overrides, nowAbs).sort((x, y) => x.earliest - y.earliest);
}

/**
 * Rows an operator CSV lists as empty legs either confirm a detected gap (same aircraft and route,
 * departure inside the gap window: the operator's price and status replace the model's) or stand
 * alone as their own leg. The leg's own overrides from the Operator page still win.
 */
function applyOffered(legs: EmptyLeg[], imported: ImportedInventory | null | undefined, overrides: Overrides, nowAbs: number): EmptyLeg[] {
  if (!imported?.offered.length) return legs;
  const fleet = allFleet(imported);
  const out = [...legs];
  const used = new Set<string>();
  for (const row of imported.offered) {
    const ac = fleet.find((a) => a.id === row.aircraftId);
    const t = AIRCRAFT_TYPES[row.typeId];
    if (!ac || !t) continue;
    const status: LegStatus = row.status === "unavailable" ? "unavailable" : row.status === "limited" ? "limited" : "available";
    const hit = out.find((l) => !used.has(l.id) && l.aircraftId === row.aircraftId && l.from === row.from && l.to === row.to && row.dep >= l.earliest - 30 && row.dep <= l.latest + 30);
    if (hit) {
      used.add(hit.id);
      const o = overrides[hit.id] ?? {};
      hit.price = o.price ?? row.price ?? hit.price;
      hit.status = o.status ?? status;
      hit.published = o.published ?? true;
      hit.cap = Math.min(hit.cap, row.seats);
      hit.source = "imported";
      continue;
    }
    if (row.dep < nowAbs) continue;
    const durMin = row.arr - row.dep;
    const charterEst = charterPrice(t, durMin);
    const suggested = suggestOffer(charterEst, 0);
    const id = `EL-${ac.id}-OFFER${row.line}`;
    const o = overrides[id] ?? {};
    out.push({
      id, aircraftId: ac.id, typeId: row.typeId, operator: ac.operator, from: row.from, to: row.to, earliest: row.dep, latest: row.dep, durMin,
      cap: Math.min(t.cap, row.seats), charterEst, suggested, price: o.price ?? row.price ?? suggested, status: o.status ?? status, published: o.published ?? true,
      risk: row.status === "limited" ? 0.3 : 0.15, flexH: 0,
      prev: `Operator CSV import, line ${row.line}`, next: `${row.from}→${row.to} ${fmtDate(row.depDate)} ${fmtTime(row.dep, AIRPORTS[row.from].tz)}`, gapMin: 0,
      tail: ac.tail ?? ac.id, source: "imported",
    });
  }
  return out;
}
