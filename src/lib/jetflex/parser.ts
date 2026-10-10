// Deterministic natural-language trip parser. No AI provider and no network: regular
// expressions plus date arithmetic. Everything it infers is reported back so the traveller can edit it.
import { METROS } from "./data";
import { addDays, fmtDate, fmtHHmm, nextDow } from "./time";
import { PRESETS } from "./search";
import type { TripRequest, Weights } from "./types";

export type Understood = { field: string; value: string };
export type Parsed = { request: TripRequest; understood: Understood[]; assumptions: string[]; question: string | null };

export const EXAMPLE_PROMPTS = [
  "Find the best way for four people to travel from the New York area to Miami this Friday, returning Sunday. I can move the departure by up to six hours if it saves money.",
  "I need to fly four people from New York to Aspen on Friday. We need to arrive before 4 PM, return Sunday evening, and can leave up to six hours earlier or later if it saves us money.",
  "Fly five people from Teterboro to Miami next Friday. I care more about arriving on time than getting the absolute cheapest price, but show me deals if I can shift my departure.",
  "Two of us from Los Angeles to San Francisco Friday morning, back Sunday evening. Fastest option, budget under $12k.",
];

const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13 };
const num = (s: string) => NUM_WORDS[s] ?? Number(s);
const NUM = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen)";
const DOWS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYPART: Record<string, string> = { morning: "09:00", noon: "12:00", afternoon: "15:00", evening: "18:00", night: "20:00" };
const TIME = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|a\\.m\\.|p\\.m\\.)";

const toHHmm = (h: number, m: string | undefined, ap: string | undefined) => {
  let hh = h;
  if (ap) hh = (h % 12) + (ap.startsWith("p") ? 12 : 0);
  return `${String(hh).padStart(2, "0")}:${m ?? "00"}`;
};

type Hit = { metro: string; idx: number; len: number };
function findPlaces(t: string): Hit[] {
  const hits: Hit[] = [];
  for (const [metro, m] of Object.entries(METROS))
    for (const a of m.aliases) {
      const re = new RegExp(`(?<![a-z])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "g");
      for (const x of t.matchAll(re)) hits.push({ metro, idx: x.index!, len: a.length });
    }
  hits.sort((a, b) => b.len - a.len);
  const kept: Hit[] = [];
  for (const h of hits) if (!kept.some((k) => h.idx < k.idx + k.len && k.idx < h.idx + h.len)) kept.push(h);
  return kept.sort((a, b) => a.idx - b.idx);
}

function weightsFrom(text: string): { weights: Weights; found: string[] } {
  const w = { ...PRESETS.balanced.weights };
  const found: string[] = [];
  const bump = (k: keyof Weights, n: number, why: string) => { w[k] += n; if (!found.includes(why)) found.push(why); };
  const rules: [RegExp, keyof Weights, number, string][] = [
    [/cheap|lowest (?:total )?cost|sav(?:e|es|ing)(?: us| me)? money|saving|deal|affordable|price/, "cost", 4, "lowest cost"],
    [/fast|quick|shortest|minimum travel time|least time|save time|door[- ]to[- ]door/, "speed", 5, "minimum travel time"],
    [/fewest connections|non-?stop|no connections|direct/, "speed", 3, "fewest connections"],
    [/on[- ]time|reliab|certain|can'?t be late|cannot be late|punctual|don'?t want to miss/, "certainty", 5, "arriving on time"],
    [/private|privacy|uninterrupted|quiet/, "privacy", 5, "private, uninterrupted travel"],
    [/control|my (?:own )?schedule|leave when|whenever/, "control", 4, "schedule control"],
    [/best (?:overall )?experience|luxury|comfort|premium/, "privacy", 3, "best overall experience"],
    [/flexible departure|shift (?:my|our) departure|move the departure|move (?:my|our) departure/, "cost", 2, "flexible departure for savings"],
  ];
  for (const [re, k, n, why] of rules) if (re.test(text)) bump(k, n, why);
  return { weights: w, found };
}

export function parseRequest(raw: string, today: string, base: TripRequest, refine = false): Parsed {
  const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const req: TripRequest = refine ? { ...base } : { ...base, arriveBy: undefined, budget: undefined };
  const understood: Understood[] = [];
  const assumptions: string[] = [];
  let question: string | null = null;
  const say = (field: string, value: string) => understood.push({ field, value });

  // ---- passengers ----
  let pax: number | null = null;
  const m1 = t.match(new RegExp(`${NUM}\\s+(?:people|persons?|passengers?|pax|adults|travell?ers|guests|of us|friends|colleagues)`));
  const m2 = t.match(new RegExp(`(?:party|group|family|team) of ${NUM}`)) ?? t.match(new RegExp(`\\bfor ${NUM}\\b(?!\\s*(?:hours?|hrs?|am|pm|k\\b|%))`));
  if (m1) pax = num(m1[1]);
  else if (m2) pax = num(m2[1]);
  else if (/\bsolo\b|just me|\bmyself\b/.test(t)) pax = 1;
  else if (/\bcouple\b|the two of us|\bmy (?:wife|husband|partner)\b/.test(t)) pax = 2;
  if (pax != null && pax >= 1 && pax <= 30) { req.pax = pax; say("Travelers", String(pax)); }
  else assumptions.push(`Party size not mentioned, using ${req.pax}.`);
  if (req.pax > 13) assumptions.push("Parties above 13 exceed every aircraft in the simulated fleet; only first class can seat them.");

  // ---- places ----
  const places = findPlaces(t);
  const fromIdx = t.search(/\bfrom\b/);
  const toIdx = t.search(/\bto\b/);
  let origin: Hit | undefined;
  let dest: Hit | undefined;
  if (fromIdx >= 0) {
    origin = places.find((p) => p.idx > fromIdx && (toIdx < 0 || toIdx < fromIdx || p.idx < toIdx));
    dest = places.find((p) => p !== origin && p.idx > (origin?.idx ?? fromIdx));
  }
  if (!origin || !dest) {
    const sorted = places.filter((p, i) => i === 0 || p.metro !== places[i - 1].metro);
    if (sorted.length >= 2) [origin, dest] = [origin ?? sorted[0], dest ?? sorted[1]];
    else if (sorted.length === 1) {
      const p = sorted[0];
      const isDest = /\b(?:to|in|into|for)\s+(?:the\s+)?[a-z' .-]*$/.test(t.slice(0, p.idx)) || (toIdx >= 0 && toIdx < p.idx);
      if (isDest) dest = p; else origin = p;
    }
  }
  if (origin) { req.from = origin.metro; say("From", METROS[origin.metro].name); }
  if (dest) { req.to = dest.metro; say("To", METROS[dest.metro].name); }
  if (!origin || !dest) question = !origin && !dest ? "Where are you flying from and to?" : !origin ? `Where are you leaving from to reach ${METROS[req.to].short}?` : `Where would you like to go from ${METROS[req.from].short}?`;
  if (req.from === req.to) question = "Origin and destination are the same. Pick two different places.";

  // ---- dates ----
  type Tok = { idx: number; len: number; date: string };
  const toks: Tok[] = [];
  const nextWord = /(?:\b(this|next|coming)\s+)?\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g;
  for (const x of t.matchAll(nextWord)) toks.push({ idx: x.index!, len: x[0].length, date: `dow:${DOWS.indexOf(x[2])}:${x[1] === "next" ? 1 : 0}` });
  for (const x of t.matchAll(/\b(today|tomorrow)\b/g)) toks.push({ idx: x.index!, len: x[0].length, date: x[1] === "today" ? today : addDays(today, 1) });
  for (const x of t.matchAll(new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "g"))) {
    const mo = MONTHS.indexOf(x[1]) + 1;
    let y = Number(today.slice(0, 4));
    let d = `${y}-${String(mo).padStart(2, "0")}-${String(Number(x[2])).padStart(2, "0")}`;
    if (d < today) d = `${++y}-${d.slice(5)}`;
    toks.push({ idx: x.index!, len: x[0].length, date: d });
  }
  for (const x of t.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)) {
    let y = Number(today.slice(0, 4));
    let d = `${y}-${String(Number(x[1])).padStart(2, "0")}-${String(Number(x[2])).padStart(2, "0")}`;
    if (d < today) d = `${++y}-${d.slice(5)}`;
    toks.push({ idx: x.index!, len: x[0].length, date: d });
  }
  toks.sort((a, b) => a.idx - b.idx);
  const retMarkers = [...t.matchAll(/\b(?:return(?:ing|s)?|back|come back|coming back|fly back|home on)\b/g)].map((x) => x.index!);
  const isRet = (k: Tok) => retMarkers.some((m) => m < k.idx && k.idx - m <= 40);
  const dep = toks.find((k) => !isRet(k));
  const ret = toks.find((k) => isRet(k));
  const resolve = (tok: string, after?: string) => {
    if (!tok.startsWith("dow:")) return tok;
    const [, dow, nx] = tok.split(":").map(Number) as unknown as [string, number, number];
    return after ? nextDow(addDays(after, 1), dow) : nextDow(today, dow, nx === 1);
  };
  if (dep) { req.departDate = resolve(dep.date); say("Depart", fmtDate(req.departDate)); }
  else if (/weekend/.test(t)) { req.departDate = nextDow(today, 5); say("Depart", fmtDate(req.departDate)); }
  else assumptions.push(`No departure date found, using ${fmtDate(req.departDate)}.`);
  if (req.departDate < today) assumptions.push("That departure date is in the past. Pick a future date.");
  if (/one[- ]way/.test(t)) { req.returnDate = undefined; say("Trip", "One way"); }
  else if (ret) { req.returnDate = resolve(ret.date, req.departDate); say("Return", fmtDate(req.returnDate)); }
  else if (/weekend/.test(t)) { req.returnDate = addDays(req.departDate, 2); say("Return", fmtDate(req.returnDate)); }
  else if (/round[- ]?trip|and back|return/.test(t)) { req.returnDate = addDays(req.departDate, 2); assumptions.push(`Round trip with no return date, assuming ${fmtDate(req.returnDate)}.`); }
  else if (!refine) { req.returnDate = undefined; assumptions.push("No return date mentioned, planning one way. Add a return date below for a round trip."); }
  if (req.returnDate && req.returnDate < req.departDate) { req.returnDate = addDays(req.departDate, 2); assumptions.push("Return was before departure, moved it to two days after."); }

  // ---- times and day parts ----
  const near = (idx: number, span: number) => t.slice(Math.max(0, idx), idx + span);
  const arrive = t.match(new RegExp(`(?:arriv\\w*|land\\w*|be (?:there|in \\w+)|get (?:there|in))[^.;]{0,40}?(?:before|by|no later than|prior to)\\s+${TIME}`)) ?? t.match(new RegExp(`(?:before|by|no later than)\\s+${TIME}\\s+(?:arrival|at (?:the )?destination)`));
  if (arrive) { req.arriveBy = toHHmm(Number(arrive[1]), arrive[2], arrive[3]); say("Arrive by", fmtHHmm(req.arriveBy)); }
  const leave = t.match(new RegExp(`(?:leave|depart\\w*|leaving|wheels up|takeoff|take off)\\s+(?:at |around |about |after )?${TIME}`));
  if (leave) { req.departTime = toHHmm(Number(leave[1]), leave[2], leave[3]); say("Preferred departure", fmtHHmm(req.departTime)); }
  else {
    const dp = [...t.matchAll(/\b(morning|noon|afternoon|evening|night)\b/g)].find((x) => !retMarkers.some((m) => m < x.index! && x.index! - m <= 40) && (!dep || Math.abs(x.index! - dep.idx) <= 25));
    if (dp && !/arriv/.test(t.slice(Math.max(0, dp.index! - 25), dp.index!))) { req.departTime = DAYPART[dp[1]]; say("Preferred departure", `${dp[1]} (${fmtHHmm(req.departTime)})`); }
    else if (!arrive) assumptions.push(`No departure time given, centering the search on ${fmtHHmm(req.departTime)}.`);
    else req.departTime = base.departTime;
  }
  const rm = retMarkers.map((m) => near(m, 60));
  for (const seg of rm) {
    const tm = seg.match(new RegExp(TIME));
    const dp = seg.match(/\b(morning|noon|afternoon|evening|night)\b/);
    if (tm) { req.returnTime = toHHmm(Number(tm[1]), tm[2], tm[3]); say("Preferred return", fmtHHmm(req.returnTime)); break; }
    if (dp) { req.returnTime = DAYPART[dp[1]]; say("Preferred return", `${dp[1]} (${fmtHHmm(req.returnTime)})`); break; }
  }

  // ---- flexibility ----
  const fx = t.match(new RegExp(`(?:up to|within|±|\\+/-|plus or minus|as much as|by up to)\\s*${NUM}\\s*(?:hours?|hrs?|h)\\b`)) ?? t.match(new RegExp(`${NUM}\\s*(?:hours?|hrs?)\\s*(?:earlier|later|either way|before or after)`));
  const snap = (h: number): TripRequest["flexH"] => (h <= 0 ? 0 : h <= 2 ? 2 : h <= 6 ? 6 : h <= 12 ? 12 : 24);
  if (/fully flexible|completely flexible|any ?time|whole day|all day/.test(t)) req.flexH = 24;
  else if (fx) req.flexH = snap(num(fx[1]));
  else if (/fixed schedule|can'?t move|cannot move|exact time|no flexibility|not flexible/.test(t)) req.flexH = 0;
  else if (/flexible|can shift|can move|shift (?:my|our)|move (?:my|our)/.test(t)) req.flexH = 6;
  else if (!refine) { req.flexH = 2; assumptions.push("No flexibility mentioned, assuming up to 2 hours either way."); }
  if (fx || /flexible|fixed|any ?time|can shift|can move|cannot move|can'?t move/.test(t)) say("Flexibility", { 0: "Fixed schedule", 2: "Up to 2 hours", 6: "Up to 6 hours", 12: "Up to 12 hours", 24: "Whole day" }[req.flexH]);

  // ---- budget ----
  const bm = t.match(/budget[^.\d$]{0,20}\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|grand)?/) ?? t.match(/(?:under|below|max(?:imum)?|no more than|at most|less than|capped? at)\s*\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|grand)?/) ?? t.match(/(?:under|below|max(?:imum)?|no more than|at most|less than|up to)\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|grand)\b/);
  if (bm) {
    let v = Number(bm[1].replace(/,/g, ""));
    if (bm[2]) v *= 1000;
    if (new RegExp(`${bm[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:per|a|each)\\s*(?:person|passenger|head)`).test(t)) v *= req.pax;
    if (v >= 100) { req.budget = Math.round(v); say("Budget", `$${req.budget.toLocaleString("en-US")} total`); }
  }

  // ---- priorities ----
  const than = t.match(/(?:care|matter\w*|prioriti[sz]\w*|important)\s+(?:more\s+)?(?:about|to me)?\s*(.+?)\s+(?:more )?than\s+(.+?)(?=,|;|\.|\bbut\b|$)/);
  const main = than ? t.replace(than[2], " ") : t;
  const { weights, found } = weightsFrom(main);
  if (than) {
    const lose = weightsFrom(than[2]);
    const keys: Record<string, keyof Weights> = { "lowest cost": "cost", "minimum travel time": "speed", "arriving on time": "certainty", "private, uninterrupted travel": "privacy", "schedule control": "control" };
    for (const f of lose.found) if (keys[f]) weights[keys[f]] = Math.max(1, weights[keys[f]] - 2);
  }
  if (found.length) {
    req.weights = weights;
    const preset = (Object.entries(PRESETS) as [TripRequest["preset"], (typeof PRESETS)["balanced"]][]).find(([k, p]) => k !== "custom" && JSON.stringify(p.weights) === JSON.stringify(weights));
    req.preset = preset ? preset[0] : "custom";
    say("Priorities", found.join(", "));
  } else {
    req.weights = base.weights;
    req.preset = base.preset;
    assumptions.push(`No priority stated, using the "${PRESETS[base.preset].label}" ranking.`);
  }
  return { request: req, understood, assumptions: refine ? assumptions.filter((a) => !/^No |^Party size/.test(a)) : assumptions, question };
}
