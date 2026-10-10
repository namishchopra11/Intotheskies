import { describe, expect, it } from "vitest";
import { deriveLegs } from "./inventory";
import { parseOperatorCsv, sampleOperatorCsv } from "./csvImport";
import { FLEET } from "./data";
import { addDays, toAbs } from "./time";
import { demandList, fleetOverview, legWeek, pitchFacts, rankOpportunities, revenueChange, revenueProjection } from "./operator";

const today = "2026-10-10";
const demand = demandList(today);
const project = (ov = {}) => revenueProjection(rankOpportunities(deriveLegs(today, ov), demand));

describe("operator revenue projection", () => {
  const p = project();
  it("splits every offer into expected, unsold and withheld with nothing lost", () => {
    expect(p.rows.length).toBeGreaterThan(4);
    for (const r of p.rows) {
      expect(r.expected + r.unsold + r.withheld).toBe(r.offer);
      expect(r.expected).toBeGreaterThanOrEqual(0);
      expect(r.unsold).toBeGreaterThanOrEqual(0);
      if (r.state !== "live") { expect(r.expected).toBe(0); expect(r.withheld).toBe(r.offer); }
    }
    const t = p.total;
    expect(t.expected + t.unsold + t.withheld).toBe(t.gross);
    expect(p.weeks[0].gross + p.weeks[1].gross).toBe(t.gross);
    expect(p.weeks[0].legs + p.weeks[1].legs).toBe(p.rows.length);
  });
  it("re-computes when a leg is unpublished, made unavailable or repriced", () => {
    const id = p.rows.find((r) => r.state === "live" && r.expected > 0)!.legId;
    const off = project({ [id]: { published: false } });
    expect(off.total.expected).toBeLessThan(p.total.expected);
    expect(off.total.withheld).toBeGreaterThan(p.total.withheld);
    expect(off.total.gross).toBe(p.total.gross);
    const gone = project({ [id]: { status: "unavailable" } });
    expect(gone.rows.find((r) => r.legId === id)!.state).toBe("unavailable");
    expect(gone.total.expected).toBeLessThan(p.total.expected);
    const row = p.rows.find((r) => r.legId === id)!;
    const dear = project({ [id]: { price: row.offer * 3 } });
    expect(dear.total.gross).toBe(p.total.gross + row.offer * 2);
    expect(revenueChange(dear.total, p.total).gross).toBe(row.offer * 2);
  });
  it("is stable for the same inputs", () => {
    expect(project()).toEqual(p);
  });
});

describe("operator pitch facts", () => {
  it("reports the seeded fleet, not fixed claims", () => {
    const ops = rankOpportunities(deriveLegs(today), demand);
    const f = pitchFacts(ops);
    expect(f.legs).toBe(ops.length);
    expect(f.fleet).toBeGreaterThan(0);
    expect(f.operators).toBeGreaterThan(0);
    expect(f.live).toBeLessThanOrEqual(f.legs);
    expect(f.expected).toBe(revenueProjection(ops).total.expected);
    expect(f.positioningCost).toBeGreaterThan(0);
    expect(f.emptyHours).toBeGreaterThan(0);
    const none = pitchFacts(rankOpportunities(deriveLegs(today, Object.fromEntries(ops.map((o) => [o.leg.id, { published: false }]))), demand));
    expect(none.live).toBe(0);
    expect(none.top).toBeNull();
    expect(none.expected).toBe(0);
  });
});

describe("operator views with an imported CSV", () => {
  const imp = parseOperatorCsv(sampleOperatorCsv(today), { today }).inventory;
  const baseLegs = deriveLegs(today);
  const impLegs = deriveLegs(today, {}, [], imp);

  it("fleetOverview lists imported aircraft with their flights and legs", () => {
    const seeded = fleetOverview(today, baseLegs, []);
    expect(seeded.length).toBe(FLEET.length);
    const all = fleetOverview(today, impLegs, [], imp);
    expect(imp.fleet.length).toBeGreaterThan(0);
    expect(all.length).toBe(FLEET.length + imp.fleet.length);
    for (const a of imp.fleet) {
      const row = all.find((f) => f.aircraft.id === a.id)!;
      expect(row).toBeTruthy();
      expect(row.type).toBeTruthy();
      expect(row.upcoming.length + row.legs).toBeGreaterThan(0);
    }
    // seeded aircraft are unchanged when nothing is imported
    expect(fleetOverview(today, baseLegs, [], null).map((f) => f.aircraft.id)).toEqual(seeded.map((f) => f.aircraft.id));
  });

  it("revenue projection and pitch facts include imported legs", () => {
    const demand = demandList(today);
    const before = revenueProjection(rankOpportunities(baseLegs, demand), { today });
    const ops = rankOpportunities(impLegs, demand);
    const after = revenueProjection(ops, { today });
    expect(after.rows.length).toBeGreaterThan(before.rows.length);
    expect(after.total.expected + after.total.unsold + after.total.withheld).toBe(after.total.gross);
    expect(after.weeks[0].legs + after.weeks[1].legs).toBe(after.rows.length);
    const importedIds = new Set(impLegs.filter((l) => l.source === "imported").map((l) => l.id));
    expect(after.rows.some((r) => importedIds.has(r.legId))).toBe(true);
    expect(pitchFacts(ops, after, imp).fleet).toBe(FLEET.length + imp.fleet.length);
    expect(pitchFacts(ops, after).fleet).toBe(FLEET.length);
  });

  it("places legs without a week suffix by their date when today is known", () => {
    expect(legWeek("EL-X-1w1", 0)).toBe(1);
    expect(legWeek("EL-X-OFFER3", 0, today)).toBe(0);
    const farFuture = toAbs(addDays(today, 20), "12:00", -5); // well beyond the planning week
    expect(legWeek("EL-X-OFFER3", farFuture, today)).toBe(1);
  });
});
