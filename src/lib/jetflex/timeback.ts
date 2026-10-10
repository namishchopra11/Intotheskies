// TimeBack: plan a trip around a commitment (a meeting, an event) and a hard return deadline.
// All numbers are explicit schedule arithmetic over the simulated inventory.
import { generate, type Spec } from "./journeys";
import { parseRequest } from "./parser";
import { defaultRequest, rank, toRaw, type Raw } from "./search";
import { dayEnd, dayStart, fmtDur, toAbs } from "./time";
import { tzOf } from "./inventory";
import type { EmptyLeg, Itinerary, Journey, Weights } from "./types";

export type Goal = "balanced" | "cost" | "time" | "safe";
export const GOALS: Record<Goal, { label: string; weights: Weights }> = {
  balanced: { label: "Balanced", weights: { cost: 3, speed: 3, control: 1, privacy: 1, certainty: 3 } },
  cost: { label: "Lowest cost", weights: { cost: 9, speed: 1, control: 0, privacy: 0, certainty: 2 } },
  time: { label: "Most time at destination", weights: { cost: 1, speed: 9, control: 1, privacy: 0, certainty: 2 } },
  safe: { label: "Safest to make it", weights: { cost: 1, speed: 2, control: 0, privacy: 0, certainty: 9 } },
};

export type TimeBackInput = {
  from: string;
  to: string;
  date: string;
  pax: number;
  arriveBy: string; // HH:mm at the destination door
  meetingMin: number; // time you need at the destination
  homeBy: string; // HH:mm back at your origin door
  cushionMin: number; // aim to arrive this long before the deadline
  budget?: number;
  goal: Goal;
};

export type TbOption = {
  it: Itinerary;
  arriveDoor: number;
  leaveDoor: number;
  timeAtDest: number;
  slack: number; // time at destination beyond what is needed
  homeAt: number;
  homeMargin: number;
  travelMin: number;
  arriveMargin: number; // minutes between arriving and the deadline
  missRisk: number; // risk of missing the commitment (outbound disruption, scaled by cushion)
  homeRisk: number;
  tags: string[];
};
export type TimeBackResult = { options: TbOption[]; cheapest?: TbOption; best?: TbOption; reason?: string; considered: number };

const cushioned = (risk: number, cushion: number) => Math.min(0.95, risk * (cushion < 30 ? 1.3 : cushion >= 120 ? 0.6 : 1));

export function timeBack(inp: TimeBackInput, legs: EmptyLeg[]): TimeBackResult {
  const [tzA, tzB] = [tzOf(`door:${inp.from}`), tzOf(`door:${inp.to}`)];
  const need = toAbs(inp.date, inp.arriveBy, tzB);
  const homeBy = toAbs(inp.date, inp.homeBy, tzA);
  const [dLo, dHi] = [dayStart(inp.date, tzA), dayEnd(inp.date, tzA)];
  const pub = legs.filter((l) => l.published);
  const outSpec: Spec = { from: `door:${inp.from}`, to: `door:${inp.to}`, dir: "out", pax: inp.pax, pref: need - 240, lo: dLo, hi: need, dayLo: dLo, dayHi: dHi, arriveBy: need - inp.cushionMin, legs: pub };
  const outs = generate(outSpec).journeys;
  if (!outs.length) return { options: [], considered: 0, reason: `Nothing in the simulated inventory reaches the destination by ${inp.arriveBy} with a ${fmtDur(inp.cushionMin)} cushion.` };

  const raws: Raw[] = [];
  const extra = new Map<string, Omit<TbOption, "it" | "tags">>();
  for (const o of outs) {
    const arrive = o.segments[o.segments.length - 1].arr;
    const earliestBack = arrive + inp.meetingMin;
    const retSpec: Spec = { from: `door:${inp.to}`, to: `door:${inp.from}`, dir: "ret", pax: inp.pax, pref: earliestBack, lo: earliestBack, hi: homeBy, dayLo: earliestBack, dayHi: homeBy, readyAt: earliestBack, arriveBy: homeBy, legs: pub };
    const rets = generate(retSpec).journeys.slice().sort((a: Journey, b: Journey) => cost(a) - cost(b));
    // Cheapest return per kind keeps the table readable while still showing real trade-offs.
    const seen = new Set<string>();
    for (const r of rets) {
      if (seen.has(r.kind)) continue;
      seen.add(r.kind);
      const raw = toRaw([o, r]);
      if (inp.budget != null && raw.f.price > inp.budget) continue;
      const leave = r.segments[0].dep;
      const homeAt = r.segments[r.segments.length - 1].arr;
      const cushion = need - arrive;
      raws.push(raw);
      extra.set(raw.id, {
        arriveDoor: arrive, leaveDoor: leave, timeAtDest: leave - arrive, slack: leave - arrive - inp.meetingMin, homeAt, homeMargin: homeBy - homeAt,
        travelMin: raw.f.time, arriveMargin: need - arrive, missRisk: cushioned(1 - o.segments.reduce((p, s) => p * (1 - s.risk), 1), cushion),
        homeRisk: cushioned(1 - r.segments.reduce((p, s) => p * (1 - s.risk), 1), homeBy - homeAt),
      });
    }
  }
  if (!raws.length) return { options: [], considered: outs.length, reason: "Outbound options exist, but none leaves time for your commitment and a return before your deadline within budget." };

  const fake = { weights: GOALS[inp.goal].weights, pax: inp.pax, preset: "custom" as const, budget: inp.budget };
  const ranked = rank(raws, fake);
  const options = ranked.map((it): TbOption => ({ it, ...extra.get(it.id)!, tags: [] }));
  const cheapest = options.reduce((a, b) => (b.it.totalPrice < a.it.totalPrice ? b : a));
  const mostTime = options.reduce((a, b) => (b.timeAtDest > a.timeAtDest ? b : a));
  const safest = options.reduce((a, b) => (b.missRisk + b.homeRisk < a.missRisk + a.homeRisk ? b : a));
  cheapest.tags.push("Lowest cost");
  mostTime.tags.push("Most time on the ground");
  safest.tags.push("Lowest risk of missing it");
  return { options, cheapest, best: options[0], considered: outs.length };
}
const cost = (j: Journey) => j.segments.reduce((a, s) => a + s.cost, 0);

// ---- natural-language goal -> inputs --------------------------------------------------------------

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8 };
const MEALS: Record<string, string> = { breakfast: "08:30", lunch: "13:00", dinner: "19:00" };

export function parseTimeBack(text: string, today: string, base: TimeBackInput): { input: TimeBackInput; notes: string[] } {
  const t = text.toLowerCase();
  const p = parseRequest(text, today, { ...defaultRequest(today), from: base.from, to: base.to, departDate: base.date, pax: base.pax });
  const notes: string[] = [];
  const swap = !/\bfrom\b/.test(t) && !/\bto\s+(?!be\b|get\b|have\b|do\b|make\b|see\b|attend\b|meet\b|return\b|go\b|fly\b|leave\b)/.test(t) && p.request.from !== base.from; // "meeting in Chicago ... back in New York": commitment city first
  const out: TimeBackInput = { ...base, from: swap ? p.request.to : p.request.from, to: swap ? p.request.from : p.request.to, date: p.request.departDate, pax: p.request.pax };
  if (p.request.budget) out.budget = p.request.budget;
  const mins = t.match(/(\d+(?:\.\d+)?|one|two|three|four|five|six|eight)[- ]hours?/);
  const half = /half[- ]hour|30[- ]min/.test(t);
  if (mins) { out.meetingMin = Math.round((WORDS[mins[1]] ?? Number(mins[1])) * 60); notes.push(`Need ${fmtDur(out.meetingMin)} at the destination.`); }
  else if (half) { out.meetingMin = 30; notes.push("Need 30m at the destination."); }
  const tm = (s: string) => { const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/); return m ? `${String(((Number(m[1]) % 12) + (m[3] === "pm" ? 12 : 0))).padStart(2, "0")}:${m[2] ?? "00"}` : null; };
  const at = t.match(/(?:meeting|call|event|appointment|conference|lunch|talk)[^.,;]{0,30}?\bat\s+(\d{1,2}(?::\d{2})?\s*[ap]m)/);
  if (p.request.arriveBy) out.arriveBy = p.request.arriveBy;
  else if (at && tm(at[1])) { out.arriveBy = tm(at[1])!; notes.push(`Arrive by the meeting start, ${out.arriveBy}.`); }
  const home = t.match(/(?:back|home|return)[^.;]{0,40}?(?:by|before|for)\s+(breakfast|lunch|dinner|\d{1,2}(?::\d{2})?\s*[ap]m)/);
  if (home) { out.homeBy = MEALS[home[1]] ?? tm(home[1]) ?? out.homeBy; notes.push(`Home by ${out.homeBy}${MEALS[home[1]] ? ` (assuming ${home[1]} is around then)` : ""}.`); }
  if (/cheap|save money|budget/.test(t)) out.goal = "cost";
  else if (/safe|can'?t be late|on time|reliab/.test(t)) out.goal = "safe";
  else if (/more time|fast|quick/.test(t)) out.goal = "time";
  return { input: out, notes };
}
