import { beforeEach, describe, expect, it } from "vitest";
import { parseOperatorCsv, sampleOperatorCsv } from "./csvImport";
import { FLEET } from "./data";
import { deriveLegs } from "./inventory";
import { safeLocalStorage, sanitizeImported, sanitizeItinerary, sanitizePersisted, sanitizeRequest, useJet } from "./store";
import { defaultRequest, search } from "./search";
import { DEFAULT_CABIN } from "./cabin";

const today = "2026-10-10";
const parsed = parseOperatorCsv(sampleOperatorCsv(today), { today });
const inv = parsed.inventory;
const opts = () => useJet.persist.getOptions();

beforeEach(() => useJet.setState({ imported: null, ops: {}, customFlights: [], request: null, active: null }));

describe("imported inventory in the store", () => {
  it("starts empty and saves, replaces and clears an import", () => {
    expect(inv.rows.length).toBeGreaterThan(0);
    expect(useJet.getState().imported).toBeNull();
    useJet.getState().setImported(inv);
    expect(useJet.getState().imported?.rows.length).toBe(inv.rows.length);
    const one = { ...inv, rows: inv.rows.slice(0, 1) };
    useJet.getState().setImported(one);
    expect(useJet.getState().imported?.rows.length).toBe(1); // replaced, not accumulated
    useJet.getState().clearImported();
    expect(useJet.getState().imported).toBeNull();
  });

  it("is part of what is saved to localStorage", () => {
    useJet.getState().setImported(inv);
    const saved = opts().partialize!(useJet.getState()) as { imported: unknown };
    expect(saved.imported).toEqual(inv);
    // and survives a JSON round trip, which is what localStorage does
    expect(sanitizeImported(JSON.parse(JSON.stringify(saved.imported)))).toEqual(inv);
  });

  it("loads state saved before imports existed", () => {
    const legacy = { request: null, active: null, saved: [], history: [{ id: "h", text: "x", at: "t" }], cabin: useJet.getState().cabin, ops: { a: { price: 5000 } }, customFlights: [] };
    const next = opts().merge!(legacy, useJet.getState()) as ReturnType<typeof useJet.getState>;
    expect(next.imported).toBeNull();
    expect(next.ops).toEqual({ a: { price: 5000 } });
    expect(next.history).toHaveLength(1);
    expect(typeof next.setImported).toBe("function"); // actions are kept
  });

  it("restores a saved import and drops a damaged one", () => {
    const good = opts().merge!({ imported: JSON.parse(JSON.stringify(inv)) }, useJet.getState()) as ReturnType<typeof useJet.getState>;
    expect(good.imported?.offered.length).toBe(inv.offered.length);
    for (const bad of [{ fleet: "no" }, { fleet: [], schedule: [{}], offered: [], rows: [] }, 42, "text", []]) {
      const next = opts().merge!({ imported: bad }, useJet.getState()) as ReturnType<typeof useJet.getState>;
      expect(next.imported).toBeNull();
    }
    expect(sanitizeImported(undefined)).toBeNull();
  });

  it("reset demo clears the import along with operator edits", () => {
    useJet.getState().setImported(inv);
    useJet.getState().patchLeg("x", { price: 1000 });
    useJet.getState().resetDemo();
    expect(useJet.getState().imported).toBeNull();
    expect(useJet.getState().ops).toEqual({});
  });

  it("gives traveler search more legs once applied, and none after clearing", () => {
    const base = deriveLegs(today, {}, []);
    const withImport = deriveLegs(today, {}, [], useJet.getState().imported ?? inv);
    expect(withImport.length).toBeGreaterThan(base.length);
    expect(withImport.some((l) => l.source === "imported")).toBe(true);
    useJet.getState().setImported(inv);
    useJet.getState().clearImported();
    expect(deriveLegs(today, {}, [], useJet.getState().imported).length).toBe(base.length);
    expect(FLEET.length).toBeGreaterThan(0);
  });
});

describe("reading saved state defensively", () => {
  const req = defaultRequest(today);
  const itinerary = search(req, { today, legs: deriveLegs(today) }).itineraries[0];
  const roundTrip = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

  it("keeps a real saved state intact through a JSON round trip", () => {
    const state = {
      request: req, active: itinerary,
      saved: [{ id: "s1", savedAt: "2026-10-10T10:00:00.000Z", request: req, itinerary, savings: 1200, timeSaved: 90 }],
      history: [{ id: "h1", text: "NYC to Miami", at: "2026-10-10T10:00:00.000Z" }],
      cabin: { ...DEFAULT_CABIN, name: "Alex", diet: ["Vegan"], hotMeals: true },
      ops: { L1: { price: 9000, status: "limited", published: true } },
      customFlights: [{ id: "C1", aircraft: "JX101", from: "TEB", to: "OPF", date: "2026-10-13", dep: "08:00" }],
      imported: inv,
    };
    const out = sanitizePersisted(roundTrip(state));
    expect(out).toEqual(roundTrip(state));
  });

  it("falls back to empty values for anything that is not an object", () => {
    for (const junk of [undefined, null, 42, "text", [], true]) {
      const out = sanitizePersisted(junk);
      expect(out.request).toBeNull();
      expect(out.active).toBeNull();
      expect(out.saved).toEqual([]);
      expect(out.history).toEqual([]);
      expect(out.cabin).toEqual(DEFAULT_CABIN);
      expect(out.ops).toEqual({});
      expect(out.customFlights).toEqual([]);
      expect(out.imported).toBeNull();
    }
  });

  it("drops only the parts that are damaged", () => {
    const out = sanitizePersisted({
      request: { ...req, from: "atlantis" }, // not a metro the demo knows
      active: { id: "x" }, // not an itinerary
      saved: [{ id: "ok", savedAt: "t", request: req, itinerary, savings: 5, timeSaved: 1 }, { id: "bad", request: req }, "nope", null],
      history: [{ id: "h", text: "kept", at: "t" }, { id: 1 }, "x"],
      cabin: { ...DEFAULT_CABIN, name: "Sam", tempF: "hot", diet: [1, 2], workspace: "loud" },
      ops: { A: { price: "free", status: "limited" }, B: "x" },
      customFlights: [{ id: "C", aircraft: "JX101", from: "TEB", to: "OPF", dep: "08:00" }, { id: "D" }],
    });
    expect(out.request).toBeNull();
    expect(out.active).toBeNull();
    expect(out.saved.map((s) => s.id)).toEqual(["ok"]);
    expect(out.history.map((h) => h.text)).toEqual(["kept"]);
    expect(out.cabin).toEqual({ ...DEFAULT_CABIN, name: "Sam" });
    expect(out.ops).toEqual({ A: { status: "limited" } });
    expect(out.customFlights.map((f) => f.id)).toEqual(["C"]);
  });

  it("validates requests and itineraries individually", () => {
    expect(sanitizeRequest(roundTrip(req))).toEqual(req);
    expect(sanitizeRequest({ ...req, pax: 0 })).toBeNull();
    expect(sanitizeRequest({ ...req, pax: 2.5 })).toBeNull();
    expect(sanitizeRequest({ ...req, departDate: "tomorrow" })).toBeNull();
    expect(sanitizeRequest({ ...req, flexH: 5 })).toBeNull();
    expect(sanitizeRequest({ ...req, preset: "yolo" })).toBeNull();
    expect(sanitizeRequest({ ...req, weights: { cost: 1 } })).toBeNull();
    expect(sanitizeItinerary(roundTrip(itinerary))).toEqual(roundTrip(itinerary));
    expect(sanitizeItinerary({ ...itinerary, journeys: [] })).toBeNull();
    expect(sanitizeItinerary({ ...itinerary, journeys: [{ segments: [{}] }] })).toBeNull();
    expect(sanitizeItinerary({ ...itinerary, kind: "rocket" })).toBeNull();
  });

  it("merge never produces a state that would crash a screen", () => {
    const next = opts().merge!({ saved: "not a list", history: 7, ops: null, customFlights: {}, cabin: [] }, useJet.getState()) as ReturnType<typeof useJet.getState>;
    expect(Array.isArray(next.saved)).toBe(true);
    expect(Array.isArray(next.history)).toBe(true);
    expect(Array.isArray(next.customFlights)).toBe(true);
    expect(next.ops).toEqual({});
    expect(next.cabin).toEqual(DEFAULT_CABIN);
    expect(typeof next.resetDemo).toBe("function");
  });
});

describe("safe local storage", () => {
  const fake = (init: Record<string, string> = {}) => {
    const m = new Map(Object.entries(init));
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) } as unknown as Storage;
  };
  it("returns JSON text, and null for a missing or corrupted entry", () => {
    const s = safeLocalStorage(() => fake({ good: '{"state":{}}', bad: "{oops" }));
    expect(s.getItem("good")).toBe('{"state":{}}');
    expect(s.getItem("bad")).toBeNull();
    expect(s.getItem("missing")).toBeNull();
  });
  it("swallows a storage that throws on access, read or write", () => {
    const hostile = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("denied"); } } as unknown as Storage;
    const s = safeLocalStorage(() => hostile);
    expect(s.getItem("k")).toBeNull();
    expect(() => s.setItem("k", "v")).not.toThrow();
    expect(() => s.removeItem("k")).not.toThrow();
    const blocked = safeLocalStorage(() => { throw new Error("SecurityError"); });
    expect(blocked.getItem("k")).toBeNull();
    expect(() => blocked.setItem("k", "v")).not.toThrow();
  });
});
