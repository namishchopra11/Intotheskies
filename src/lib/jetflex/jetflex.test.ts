import { describe, expect, it } from "vitest";
import { AIRCRAFT_TYPES, AIRPORTS, DEMAND } from "./data";
import { deriveLegs } from "./inventory";
import { validate } from "./journeys";
import { analyze, demandList } from "./operator";
import { parseRequest } from "./parser";
import { buildBrief, DEFAULT_CABIN } from "./cabin";
import { defaultRequest, PRESETS, search } from "./search";
import { simulate, applyRecovery, SCENARIOS } from "./shield";
import { parseTimeBack, timeBack } from "./timeback";
import { addDays, nextDow } from "./time";
import type { TripRequest } from "./types";

const today = "2026-10-10"; // a Saturday
const legs = deriveLegs(today);
const base = defaultRequest(today);
const run = (r: Partial<TripRequest> = {}, l = legs) => search({ ...base, ...r }, { today, legs: l });

describe("search", () => {
  it("returns options for NYC to Miami, four travelers, on the requested dates", () => {
    const r = run();
    expect(r.itineraries.length).toBeGreaterThan(5);
    for (const i of r.itineraries) {
      expect(i.pax).toBe(4);
      expect(i.journeys[0].segments[0].dep).toBeLessThan(i.journeys[1].segments[0].dep);
    }
  });
  it("compares all four modes and a valid hybrid for Aspen", () => {
    const kinds = new Set(run().itineraries.map((i) => i.kind));
    expect(kinds).toContain("charter"); expect(kinds).toContain("empty_leg"); expect(kinds).toContain("first_class");
    const ase = run({ to: "ase" }).itineraries.filter((i) => i.kind === "hybrid");
    expect(ase.length).toBeGreaterThan(0);
  });
  it("changing priority from cheapest to fastest changes the winner", () => {
    const cheap = run({ preset: "cost", weights: PRESETS.cost.weights }).itineraries[0];
    const fast = run({ preset: "fastest", weights: PRESETS.fastest.weights }).itineraries[0];
    expect(cheap.id).not.toBe(fast.id);
    expect(cheap.totalPrice).toBeLessThan(fast.totalPrice);
    expect(fast.door2doorMin).toBeLessThanOrEqual(cheap.door2doorMin);
  });
  it("flexibility unlocks more empty-leg options", () => {
    const el = (f: TripRequest["flexH"]) => run({ flexH: f }).itineraries.filter((i) => i.journeys.some((j) => j.segments.some((s) => s.mode === "empty_leg"))).length;
    expect(el(2)).toBeGreaterThanOrEqual(el(0));
    expect(el(6)).toBeGreaterThan(el(2));
    expect(el(12)).toBeGreaterThan(el(6));
  });
  it("totals equal the sum of segments and per-person uses party size", () => {
    for (const i of run().itineraries) {
      const sum = i.journeys.flatMap((j) => j.segments).reduce((a, s) => a + s.cost, 0);
      expect(i.totalPrice).toBe(sum);
      expect(i.perPerson).toBe(Math.round(sum / 4));
    }
  });
  it("every itinerary is geographically and chronologically valid", () => {
    for (const i of [...run().itineraries, ...run({ to: "ase" }).itineraries, ...run({ from: "lax", to: "sfo" }).itineraries])
      for (const j of i.journeys) expect(validate(j.segments)).toEqual([]);
  });
  it("respects capacity: 8 travelers rules out the 6-seat empty legs and light charter", () => {
    for (const i of run({ pax: 8 }).itineraries)
      for (const s of i.journeys.flatMap((j) => j.segments)) if (s.typeId) expect(AIRCRAFT_TYPES[s.typeId].cap).toBeGreaterThanOrEqual(8);
  });
  it("budget excludes expensive options", () => {
    const r = run({ budget: 12000 });
    expect(r.itineraries.every((i) => i.totalPrice <= 12000)).toBe(true);
    expect(r.excluded.some((e) => e.reason.includes("budget"))).toBe(true);
  });
  it("arrive-by is honoured at the destination", () => {
    const r = run({ to: "ase", arriveBy: "16:00" });
    for (const i of r.itineraries) {
      const last = i.journeys[0].segments.at(-1)!;
      const tzOffset = AIRPORTS.ASE.tz * 60;
      const localMin = (((last.arr + tzOffset) % 1440) + 1440) % 1440;
      expect(localMin).toBeLessThanOrEqual(16 * 60);
    }
  });
});

describe("operator shared data", () => {
  it("unpublishing or marking an empty leg unavailable removes it from traveler search", () => {
    const withEl = run();
    const ids = new Set(withEl.itineraries.flatMap((i) => i.journeys.flatMap((j) => j.segments.map((s) => s.ref))));
    const target = legs.find((l) => ids.has(l.id))!;
    for (const ov of [{ published: false }, { status: "unavailable" as const }]) {
      const after = run({}, deriveLegs(today, { [target.id]: ov }));
      const ids2 = new Set(after.itineraries.flatMap((i) => i.journeys.flatMap((j) => j.segments.map((s) => s.ref))));
      expect(ids2.has(target.id)).toBe(false);
    }
  });
  it("a price change shows up in traveler totals", () => {
    const el = run().itineraries.find((i) => i.kind === "empty_leg" && i.journeys.length === 2)!;
    const seg = el.journeys[0].segments.find((s) => s.mode === "empty_leg")!;
    const after = run({}, deriveLegs(today, { [seg.ref!]: { price: seg.cost + 1000 } }));
    const same = after.itineraries.find((i) => i.journeys[0].segments.some((s) => s.ref === seg.ref))!;
    expect(same.journeys[0].segments.find((s) => s.ref === seg.ref)!.cost).toBe(seg.cost + 1000);
  });
  it("publishing a detected leg makes it available to travelers", () => {
    const hidden = legs.find((l) => !l.published && l.from === "OPF" && l.to === "TEB" && l.id.endsWith("B502"))!;
    const had = run().itineraries.some((i) => i.journeys.some((j) => j.segments.some((s) => s.ref === hidden.id)));
    const has = run({}, deriveLegs(today, { [hidden.id]: { published: true } })).itineraries.some((i) => i.journeys.some((j) => j.segments.some((s) => s.ref === hidden.id)));
    expect([had, has]).toEqual([false, true]);
  });
  it("opportunity analysis counts demand and models revenue", () => {
    const o = analyze(legs.find((l) => l.from === "TEB" && l.to === "OPF")!, demandList(today));
    expect(o.matches.length).toBeGreaterThan(0);
    expect(o.confidence).toBeGreaterThan(0); expect(o.confidence).toBeLessThan(1);
    expect(DEMAND.length).toBeGreaterThan(5);
  });
});

describe("parser", () => {
  it("extracts the Aspen example", () => {
    const p = parseRequest("I need to fly four people from New York to Aspen on Friday. We need to arrive before 4 PM, return Sunday evening, and can leave up to six hours earlier or later if it saves us money.", today, base);
    expect(p.request).toMatchObject({ from: "nyc", to: "ase", pax: 4, flexH: 6, departDate: nextDow(today, 5), returnDate: addDays(nextDow(today, 5), 2), arriveBy: "16:00", returnTime: "18:00" });
    expect(p.request.weights.cost).toBeGreaterThan(base.weights.cost);
  });
  it("asks one question when the origin is missing", () => {
    expect(parseRequest("take me to Aspen", today, base).question).toMatch(/leaving from/);
  });
  it("understands teterboro and budget shorthand", () => {
    const p = parseRequest("Fly 5 people from Teterboro to Miami next Friday, one way, budget $20k", today, base);
    expect(p.request).toMatchObject({ from: "nyc", to: "mia", pax: 5, budget: 20000, returnDate: undefined });
  });
});

describe("JetShield", () => {
  const it0 = run().itineraries.find((i) => i.kind === "charter")!;
  for (const sc of SCENARIOS) {
    it(`${sc.id}: every replacement is valid and respects the party size and the return leg`, () => {
      const res = simulate(it0, base, sc.id, "out", legs)!;
      expect(res).toBeTruthy();
      const retDep = it0.journeys[1].segments[0].dep;
      for (const o of res.options) {
        expect(validate([...res.keep, ...o.segments])).toEqual([]);
        expect(o.arrival + 60).toBeLessThanOrEqual(retDep);
        for (const s of o.segments) if (s.mode === "charter") expect(s.caveat).toBeTruthy();
      }
    });
  }
  it("weather cancellation yields alternatives that avoid the grounded airport window and the cancelled flight", () => {
    const res = simulate(it0, base, "weather", "out", legs)!;
    const cancelled = it0.journeys[0].segments.find((s) => s.mode === "charter")!;
    expect(res.options.length).toBeGreaterThan(0);
    for (const o of res.options) expect(o.segments.some((s) => s.ref === cancelled.ref)).toBe(false);
  });
  it("applying a recovery produces a coherent itinerary", () => {
    const res = simulate(it0, base, "aircraft", "out", legs)!;
    const next = applyRecovery(it0, base, res, res.options[0]);
    expect(next.recoveredFrom).toBeTruthy();
    for (const j of next.journeys) expect(validate(j.segments)).toEqual([]);
    expect(next.totalPrice).toBe(next.journeys.flatMap((j) => j.segments).reduce((a, s) => a + s.cost, 0));
  });
});

describe("TimeBack", () => {
  const inp = { from: "nyc", to: "chi", date: nextDow(today, 5), pax: 2, arriveBy: "11:00", meetingMin: 120, homeBy: "20:00", cushionMin: 30, goal: "balanced" as const };
  it("every option leaves the required time at the destination and gets home in time", () => {
    const r = timeBack(inp, legs);
    expect(r.options.length).toBeGreaterThan(0);
    for (const o of r.options) { expect(o.timeAtDest).toBeGreaterThanOrEqual(120); expect(o.homeMargin).toBeGreaterThanOrEqual(0); expect(o.arriveMargin).toBeGreaterThanOrEqual(30); }
  });
  it("a longer meeting or earlier deadline changes the answer", () => {
    const a = timeBack(inp, legs), b = timeBack({ ...inp, meetingMin: 300 }, legs), c = timeBack({ ...inp, meetingMin: 600 }, legs);
    expect(Math.min(...b.options.map((o) => o.timeAtDest))).toBeGreaterThanOrEqual(300);
    expect(a.options.length).toBeGreaterThanOrEqual(b.options.length);
    expect(c.options.length).toBe(0);
  });
  it("parses a natural-language goal", () => {
    const { input } = parseTimeBack("I have a two-hour meeting in Chicago at 10am Friday and need to be back in New York for dinner.", today, inp);
    expect(input).toMatchObject({ to: "chi", from: "nyc", meetingMin: 120, arriveBy: "10:00", homeBy: "19:00" });
  });
});

describe("cabin brief", () => {
  it("flags unsupported preferences and covers private flights only", () => {
    const charter = run().itineraries.find((i) => i.kind === "charter" && i.journeys[0].segments.some((s) => s.typeId === "phenom"))!;
    const b = buildBrief({ ...DEFAULT_CABIN, wifi: "required", hotMeals: true, bags: 12 }, charter);
    expect(b.applicable).toBe(true);
    expect(b.conflicts.length).toBeGreaterThanOrEqual(3);
    expect(b.text).toMatch(/No operator has been contacted/);
    const fc = run().itineraries.find((i) => i.kind === "first_class")!;
    expect(buildBrief(DEFAULT_CABIN, fc).applicable).toBe(false);
  });
});
