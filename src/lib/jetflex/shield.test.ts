import { describe, expect, it } from "vitest";
import { deriveLegs } from "./inventory";
import { defaultRequest, search } from "./search";
import {
  buildRecoveryDiff, buildRecoveryTimeline, countAt, revealedCount, SCENARIOS, simulate, timelineTotalMs, STEP_DELAYS, type TimelineStepId,
} from "./shield";

const today = "2026-10-10";
const legs = deriveLegs(today);
const base = defaultRequest(today);
const committed = { ...base, arriveBy: "23:30" }; // a late arrive-by so the diff has a commitment to check
const it0 = search(base, { today, legs }).itineraries.find((i) => i.kind === "charter")!;
const ORDER: TimelineStepId[] = ["plan", "detect", "search", "rank", "approval"];

describe("recovery timeline", () => {
  for (const sc of SCENARIOS) {
    it(`${sc.id}: five ordered steps with 400 to 700 ms between them`, () => {
      const res = simulate(it0, base, sc.id, "out", legs)!;
      const steps = buildRecoveryTimeline(it0, res);
      expect(steps.map((s) => s.id)).toEqual(ORDER);
      expect(steps[0].at).toBe(0);
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].delayMs).toBeGreaterThanOrEqual(400);
        expect(steps[i].delayMs).toBeLessThanOrEqual(700);
        expect(steps[i].at).toBe(steps[i - 1].at + steps[i].delayMs);
      }
      const search = steps.find((s) => s.id === "search")!;
      expect(search.count).toBe(res.considered);
      expect(res.considered).toBeGreaterThanOrEqual(res.options.length);
      expect(steps.find((s) => s.id === "detect")!.stamp).toMatch(/\d{1,2}:\d{2} (AM|PM) at /);
    });
  }

  it("uses the delays it advertises and is deterministic", () => {
    const res = simulate(it0, base, "weather", "out", legs)!;
    const a = buildRecoveryTimeline(it0, res);
    expect(a).toEqual(buildRecoveryTimeline(it0, res));
    expect(a[4].at).toBe(STEP_DELAYS.detect + STEP_DELAYS.search + STEP_DELAYS.rank + STEP_DELAYS.approval);
  });

  it("reveals steps in order, ticks the count up, and finishes instantly when skipped", () => {
    const res = simulate(it0, base, "aircraft", "out", legs)!;
    const steps = buildRecoveryTimeline(it0, res);
    const total = timelineTotalMs(steps);
    expect(revealedCount(steps, 0)).toBe(1);
    expect(revealedCount(steps, steps[2].at)).toBe(3);
    expect(revealedCount(steps, total)).toBe(steps.length); // skip / reduced motion: jump to the end
    const s = steps[2];
    const seen = [0, 0.25, 0.5, 0.75, 1].map((f) => countAt(s, s.at + f * (s.countMs ?? 0)));
    expect(seen[0]).toBe(0);
    expect(seen[4]).toBe(s.count);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    expect(countAt(s, total + 5000)).toBe(s.count);
    expect(countAt(s, -100)).toBe(0);
  });

  it("says plainly when nothing fits", () => {
    const res = simulate(it0, base, "weather", "out", legs)!;
    const none = { ...res, options: [] };
    const steps = buildRecoveryTimeline(it0, none);
    expect(steps[3].title).toBe("No replacement found");
    expect(steps[3].tone).toBe("bad");
  });
});

describe("recovery diff", () => {
  const res = simulate(it0, base, "weather", "out", legs)!;
  it("reports arrival, cost and what is protected for each option", () => {
    expect(res.options.length).toBeGreaterThan(0);
    const retDep = it0.journeys[1].segments[0].dep;
    for (const o of res.options) {
      const d = buildRecoveryDiff(it0, committed, res, o);
      expect(d.arrival.after).toBe(o.arrival);
      expect(d.arrival.deltaMin).toBe(o.arrival - res.originalArrival);
      expect(d.cost.delta).toBe(o.extraCost);
      expect(d.cost.after - d.cost.before).toBe(o.extraCost);
      const ret = d.protections.find((p) => p.id === "return")!;
      expect(ret.ok).toBe(retDep - o.arrival >= 60);
      expect(d.protections.find((p) => p.id === "party")!.ok).toBe(true);
      const ab = d.protections.find((p) => p.id === "arrive_by");
      expect(ab).toBeTruthy();
    }
  });
  it("omits the arrive-by line when the trip has no commitment and flags a missed one", () => {
    const o = res.options[0];
    const none = buildRecoveryDiff(it0, base, res, o);
    expect(base.arriveBy).toBeUndefined();
    expect(none.protections.some((p) => p.id === "arrive_by")).toBe(false);
    const tight = buildRecoveryDiff(it0, { ...base, arriveBy: "00:01" }, res, o);
    expect(tight.protections.find((p) => p.id === "arrive_by")!.ok).toBe(false);
  });
});
