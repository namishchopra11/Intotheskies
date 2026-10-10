import { beforeEach, describe, expect, it } from "vitest";
import { parseOperatorCsv, sampleOperatorCsv } from "./csvImport";
import { FLEET } from "./data";
import { deriveLegs } from "./inventory";
import { sanitizeImported, useJet } from "./store";

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
