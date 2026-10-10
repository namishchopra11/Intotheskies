import { describe, expect, it } from "vitest";
import {
  AIRCRAFT_TYPES, AIRPORTS, CARRIERS, DATA_NOTICE, DEMAND, DEMO_METROS, FC_ROUTES, fcBaseFare, fcBlockMin, fcFlightInfo, FLEET, OPERATORS, RULES,
  SCHEDULE, SCHEDULE_WEEKS,
} from "./data";
import { blockMin, canReach, charterPrice, deriveLegs, distKm, resolveSchedule, suggestOffer } from "./inventory";
import { classify, validate } from "./journeys";
import { defaultRequest, search } from "./search";
import { toAbs } from "./time";

const today = "2026-10-10";
const legs = deriveLegs(today);
const base = defaultRequest(today);

describe("fleet and schedule are internally consistent", () => {
  it("has unique ids and N-number style tails, and every aircraft has a known type, operator and base", () => {
    expect(new Set(FLEET.map((a) => a.id)).size).toBe(FLEET.length);
    expect(new Set(FLEET.map((a) => a.tail)).size).toBe(FLEET.length);
    for (const a of FLEET) {
      expect(a.tail).toMatch(/^N\d{1,5}[A-Z]{0,2}$/);
      expect(AIRCRAFT_TYPES[a.type]).toBeTruthy();
      expect(OPERATORS[a.operator]).toBeTruthy();
      expect(AIRPORTS[a.baseAirport]?.ga).toBe(true);
    }
    expect(new Set(SCHEDULE.map((f) => f.id)).size).toBe(SCHEDULE.length);
  });
  it("never teleports an aircraft: consecutive flights overlap nowhere and any gap is long enough to fly the repositioning leg", () => {
    const flights = resolveSchedule(today);
    expect(flights.length).toBe(SCHEDULE.length * SCHEDULE_WEEKS);
    for (const ac of FLEET) {
      const t = AIRCRAFT_TYPES[ac.type];
      const list = flights
        .filter((f) => f.aircraft === ac.id)
        .map((f) => ({ f, dep: toAbs(f.date!, f.dep, AIRPORTS[f.from].tz) }))
        .map((x) => ({ ...x, arr: x.dep + blockMin(x.f.from, x.f.to, t) }))
        .sort((a, b) => a.dep - b.dep);
      expect(list.length, `${ac.id} has flights`).toBeGreaterThan(0);
      for (const x of list) expect(canReach(t, distKm(x.f.from, x.f.to)), `${ac.id} ${x.f.id} is within range`).toBe(true);
      for (let i = 0; i + 1 < list.length; i++) {
        const [a, b] = [list[i], list[i + 1]];
        expect(b.dep, `${ac.id}: ${a.f.id} then ${b.f.id}`).toBeGreaterThanOrEqual(a.arr + RULES.turnaround - 30);
        if (a.f.to !== b.f.from) expect(b.dep - a.arr, `${ac.id}: ${a.f.id}→${b.f.id} repositioning`).toBeGreaterThanOrEqual(blockMin(a.f.to, b.f.from, t) + RULES.turnaround);
      }
    }
  });
  it("detects empty legs for every operator and for the key corridors", () => {
    const ops = new Set(legs.map((l) => l.operator));
    for (const o of ["aerolux", "skyline", "meridian", "harborline"]) expect(ops.has(o)).toBe(true);
    const has = (a: string, b: string) => legs.some((l) => AIRPORTS[l.from].metro === a && AIRPORTS[l.to].metro === b && l.published);
    for (const [a, b] of [["nyc", "mia"], ["mia", "nyc"], ["nyc", "ase"], ["ase", "nyc"], ["nyc", "chi"], ["chi", "nyc"], ["lax", "sfo"], ["sfo", "lax"], ["nyc", "lax"]]) expect(has(a, b), `${a}→${b}`).toBe(true);
    for (const l of legs) { expect(l.tail).toMatch(/^N\d/); expect(l.latest).toBeGreaterThanOrEqual(l.earliest); }
  });
});

describe("price sanity", () => {
  it("charter price rises with block time and with aircraft class, and includes the minimum and the excise tax", () => {
    const order = Object.values(AIRCRAFT_TYPES).sort((a, b) => a.rate - b.rate);
    for (const t of order) {
      expect(charterPrice(t, 180)).toBeGreaterThan(charterPrice(t, 90));
      expect(charterPrice(t, 30)).toBe(charterPrice(t, RULES.minBillable)); // minimum billable time
      expect(charterPrice(t, 120)).toBeGreaterThan(((t.rate * 120) / 60 + RULES.charterFees) * 0.99); // never below rate x hours + fees
    }
    for (let i = 1; i < order.length; i++) expect(charterPrice(order[i], 150)).toBeGreaterThan(charterPrice(order[i - 1], 150));
    const t = AIRCRAFT_TYPES.challenger;
    expect(charterPrice(t, 120)).toBeCloseTo(((t.rate * 2 + RULES.charterFees) * (1 + RULES.fet)), -2);
  });
  it("hourly rates and seat counts stay in believable ranges per class", () => {
    for (const t of Object.values(AIRCRAFT_TYPES)) {
      expect(t.rate).toBeGreaterThan(3000);
      expect(t.rate).toBeLessThan(13000);
      expect(t.cap).toBeGreaterThanOrEqual(6);
      expect(t.cap).toBeLessThanOrEqual(16);
      expect(t.speed).toBeGreaterThan(700);
      expect(t.speed).toBeLessThan(950);
      expect(t.range ?? 0).toBeGreaterThan(3000);
    }
    const light = AIRCRAFT_TYPES.phenom.rate, heavy = AIRCRAFT_TYPES.g450.rate;
    expect(heavy / light).toBeGreaterThan(1.6);
  });
  it("every empty leg is priced between 20% and 75% of the full charter estimate, and over the operator's marginal cost", () => {
    for (const l of legs) {
      expect(l.price / l.charterEst, l.id).toBeGreaterThanOrEqual(0.2);
      expect(l.price / l.charterEst, l.id).toBeLessThanOrEqual(0.75);
      expect(l.price, l.id).toBeGreaterThan(RULES.marginalCost);
    }
    expect(suggestOffer(20000, 8)).toBeLessThan(suggestOffer(20000, 0));
  });
  it("first-class fares: positive, plausible, growing with distance, and time-of-day shaped", () => {
    expect(FC_ROUTES.length).toBeGreaterThan(60);
    for (const r of FC_ROUTES) {
      expect(AIRPORTS[r.from].comm && AIRPORTS[r.to].comm, `${r.from}-${r.to} commercial airports`).toBe(true);
      expect(r.fare).toBeGreaterThan(150);
      expect(r.fare).toBeLessThan(2000);
      expect(r.dur).toBeGreaterThan(40);
      expect(r.dur).toBeLessThan(480);
      expect(r.deps.every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t))).toBe(true);
      expect(CARRIERS[r.carrier].name).toMatch(/\(sim\)$/);
    }
    expect(fcBaseFare("JFK", "LAX")).toBeGreaterThan(fcBaseFare("JFK", "MIA"));
    expect(fcBaseFare("JFK", "MIA")).toBeGreaterThan(fcBaseFare("LAX", "SFO"));
    const r = FC_ROUTES.find((x) => x.from === "JFK" && x.to === "MIA")!;
    const peak = fcFlightInfo(r, "2026-10-16", "07:30").fare; // Friday, early
    const off = fcFlightInfo(r, "2026-10-17", "13:15").fare; // Saturday midday
    expect(peak).toBeGreaterThan(off);
  });
  it("westbound trips take longer than eastbound ones, and block times track distance", () => {
    expect(fcBlockMin("JFK", "LAX")).toBeGreaterThan(fcBlockMin("LAX", "JFK"));
    expect(fcBlockMin("LGA", "ORD")).toBeGreaterThan(fcBlockMin("ORD", "LGA"));
    expect(fcBlockMin("JFK", "LAX")).toBeGreaterThan(300);
    expect(fcBlockMin("JFK", "LAX")).toBeLessThan(420);
    expect(fcBlockMin("LAX", "SFO")).toBeLessThan(100);
  });
});

describe("demo scenarios still hold with the richer data", () => {
  const r = search(base, { today, legs });
  it("NYC to Miami, four travelers, Friday to Sunday, ±6h: charter, empty leg, first class and hybrid all appear", () => {
    expect(base).toMatchObject({ from: "nyc", to: "mia", pax: 4, flexH: 6 });
    const kinds = new Set(r.itineraries.map((i) => i.kind));
    for (const k of ["charter", "empty_leg", "first_class", "hybrid"]) expect(kinds.has(k as never), k).toBe(true);
  });
  it("every itinerary classifies consistently and every journey is valid", () => {
    for (const i of r.itineraries) {
      expect(i.kind).toBe(classify(i.journeys.flatMap((j) => j.segments)));
      for (const j of i.journeys) expect(validate(j.segments)).toEqual([]);
    }
  });
  it("every pair of demo cities has at least one valid option", () => {
    for (const a of DEMO_METROS)
      for (const b of DEMO_METROS) {
        if (a === b) continue;
        const res = search({ ...base, from: a, to: b }, { today, legs });
        expect(res.itineraries.length, `${a}→${b}`).toBeGreaterThan(0);
        for (const i of res.itineraries) for (const j of i.journeys) expect(validate(j.segments), `${a}→${b}`).toEqual([]);
      }
  });
  it("on-demand charter respects aircraft range (a light jet is not offered New York to Los Angeles)", () => {
    const res = search({ ...base, from: "nyc", to: "lax" }, { today, legs });
    const charter = res.itineraries.filter((i) => i.kind === "charter").flatMap((i) => i.journeys.flatMap((j) => j.segments)).filter((s) => s.mode === "charter");
    expect(charter.length).toBeGreaterThan(0);
    for (const s of charter) expect(canReach(AIRCRAFT_TYPES[s.typeId!], distKm(s.from, s.to)), s.label).toBe(true);
    expect(charter.some((s) => s.typeId === "phenom")).toBe(false);
  });
  it("first-class segments carry carrier, flight number and seats, and never exceed the seats left", () => {
    const fc = r.itineraries.flatMap((i) => i.journeys.flatMap((j) => j.segments)).filter((s) => s.mode === "commercial");
    expect(fc.length).toBeGreaterThan(0);
    for (const s of fc) {
      expect(s.flightNo).toMatch(/^[A-Z]{3} \d{3}$/);
      expect(s.carrier).toMatch(/\(sim\)$/);
      expect(s.seatsLeft).toBeGreaterThanOrEqual(4);
      expect(s.caveat).toMatch(/Simulated/);
    }
    const sold = r.excluded.filter((e) => /first-class seat/.test(e.reason));
    expect(sold.length).toBeGreaterThan(0);
  });
  it("everything stays labelled as simulated", () => {
    expect(DATA_NOTICE).toMatch(/Simulated/);
    for (const o of Object.values(OPERATORS)) expect(o.name).toMatch(/\(sim\)$/);
    expect(DEMAND.length).toBeGreaterThan(12);
  });
});
