// Operator CSV import. Pure functions, no React, no network, no storage.
//
// WHAT IT DOES
//   An operator uploads (or pastes) a CSV of its aircraft and flights. We validate every row with a
//   per-row message, normalise the good rows to the app's data model, and merge them into the
//   inventory so empty-leg detection runs on them: booked flights become schedule entries (gaps
//   between them are detected as repositioning legs), rows marked empty become explicit offers with
//   the operator's own price, and tails we have never seen become new aircraft.
//
// CSV COLUMNS (header row required; names are case-insensitive, aliases in brackets)
//   tail [registration]        N-number style identifier, e.g. N520NS
//   aircraft [type]            "Phenom 300E", "Challenger 350", "G450", "Citation Latitude", ...
//   origin [from]              airport code known to the demo (TEB, PBI, ...); a leading K is allowed (KTEB)
//   destination [to]
//   departure_local            YYYY-MM-DD HH:mm, local time at the origin airport (24 hour)
//   arrival_local              YYYY-MM-DD HH:mm, local time at the destination airport
//   seats                      optional; defaults to the aircraft's cabin
//   price                      optional whole-aircraft USD offer, "$6,400" and "6.4k" are accepted
//   status                     optional: booked (default) | empty | limited | unavailable
//   operator                   optional extra column: a known operator id or name, else "imported"
//
// API (all pure)
//   parseOperatorCsv(text, { today? })  -> ImportResult { ok, inventory, issues, summary }
//       issues: one entry per problem with the CSV line number, the field and a plain-English message
//       (severity "error" rejects that row, "warning" keeps it). inventory holds the valid rows only.
//   mergeImportedInventory(today, inventory, { overrides?, custom? }) -> MergeResult
//       { legs: EmptyLeg[], baseline: EmptyLeg[], added: EmptyLeg[], changed: EmptyLeg[], summary }
//       legs is the full list the search should use. added are legs that exist only because of the
//       import; changed are legs the operator re-priced or withdrew.
//   deriveLegs(today, overrides, custom, inventory)  (inventory.ts) is the same engine, for callers
//       that only need the leg list (for example the store's useWorld).
//   sampleOperatorCsv(today) / SAMPLE_OPERATOR_CSV / SAMPLE_OPERATOR_CSV_WITH_ERRORS
//       seeded demo files (dates are relative to the Friday after `today`).
//
// Everything is simulated and illustrative. Nothing here talks to an operator.
import { AIRCRAFT_TYPES, AIRPORTS, FLEET, OPERATORS, RULES } from "./data";
import { allFleet, anchorFriday, blockMin, canReach, charterPrice, deriveLegs, distKm, resolveSchedule, type Overrides } from "./inventory";
import { addDays, fmtDur, fmtHHmm, parseLocalDateTime, toAbs } from "./time";
import type { Aircraft, EmptyLeg, ImportedInventory, ImportedRow, SchedFlight } from "./types";

export type ImportIssue = {
  line: number; // 1-based line in the CSV (the header is line 1)
  field?: string;
  severity: "error" | "warning";
  message: string;
  tail?: string;
};

export type ImportSummary = {
  rows: number; // data rows read
  accepted: number;
  rejected: number;
  errors: number;
  warnings: number;
  tails: number; // distinct aircraft among accepted rows
  newTails: number; // of which not in the seeded fleet
  booked: number;
  offered: number; // empty / limited / unavailable rows
  routes: string[]; // distinct "TEB→PBI" among accepted rows
  firstDate: string | null;
  lastDate: string | null;
  headline: string;
};

export type ImportResult = {
  ok: boolean; // at least one row accepted and no row-level errors
  inventory: ImportedInventory;
  issues: ImportIssue[];
  summary: ImportSummary;
};

export type MergeSummary = {
  baseline: number; // legs without the import
  total: number; // legs with the import
  added: number;
  changed: number;
  detectedFromGaps: number; // added legs found by gap detection on the combined schedule
  explicitOffers: number; // added legs that exist only because a row listed them (no booked flights around them)
  operatorPriced: number; // added or changed legs whose price or status came from the CSV
  headline: string;
};

export type MergeResult = { legs: EmptyLeg[]; baseline: EmptyLeg[]; added: EmptyLeg[]; changed: EmptyLeg[]; summary: MergeSummary };

// ---- CSV tokenising ------------------------------------------------------------------------------
/** RFC 4180 style records with the 1-based line each record starts on. Handles quotes, "" escapes and CRLF. */
export function tokenizeCsv(text: string, delimiter = ","): { line: number; cells: string[] }[] {
  const src = text.replace(/^﻿/, "");
  const out: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  const endRecord = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) out.push({ line: start, cells: cells.map((c) => c.trim()) });
    cells = [];
    cell = "";
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else { cell += c; if (c === "\n") line++; }
    } else if (c === '"' && cell.trim() === "") quoted = true;
    else if (c === delimiter) { cells.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      endRecord();
      line++;
      start = line;
    } else cell += c;
  }
  if (cell !== "" || cells.length) endRecord();
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADERS: Record<string, string[]> = {
  tail: ["tail", "tailnumber", "tailno", "registration", "reg", "nnumber"],
  aircraft: ["aircraft", "aircrafttype", "type", "equipment", "model"],
  origin: ["origin", "from", "departureairport", "depairport", "orig"],
  destination: ["destination", "dest", "to", "arrivalairport", "arrairport"],
  departure: ["departurelocal", "departurelocaltime", "departure", "departuretime", "departs", "depart", "etd", "departlocal"],
  arrival: ["arrivallocal", "arrivallocaltime", "arrival", "arrivaltime", "arrives", "arrive", "eta", "arrivelocal"],
  seats: ["seats", "seatsoffered", "capacity", "pax"],
  price: ["price", "priceusd", "usd", "offer", "askingprice", "amount", "fare"],
  status: ["status", "state"],
  operator: ["operator", "company", "carrier"],
};
const REQUIRED = ["tail", "aircraft", "origin", "destination", "departure", "arrival"] as const;
const FIELD_LABEL: Record<string, string> = { tail: "tail", aircraft: "aircraft", origin: "origin", destination: "destination", departure: "departure_local", arrival: "arrival_local", seats: "seats", price: "price", status: "status", operator: "operator" };

// ---- field resolvers --------------------------------------------------------------------------------
/** Matches "Phenom 300E", "phenom 300", "G450", "Gulfstream G450", "CJ3+" to a type id. Ambiguous or unknown gives null. */
export function resolveAircraftType(text: string): string | null {
  const q = norm(text);
  if (!q) return null;
  const types = Object.values(AIRCRAFT_TYPES);
  const exact = types.find((t) => [t.id, t.name, t.short].some((n) => norm(n) === q));
  if (exact) return exact.id;
  if (q.length < 4) return null;
  const hits = types.filter((t) => [t.name, t.short].some((n) => norm(n).includes(q)));
  return hits.length === 1 ? hits[0].id : null;
}

/** "TEB", "teb" and "KTEB" give "TEB"; anything the simulated map does not know gives null. */
export function resolveAirportCode(text: string): string | null {
  const c = text.trim().toUpperCase();
  if (AIRPORTS[c]) return c;
  if (c.length === 4 && c.startsWith("K") && AIRPORTS[c.slice(1)]) return c.slice(1);
  return null;
}

const STATUS_WORDS: Record<string, ImportedRow["status"]> = {
  booked: "booked", confirmed: "booked", charter: "booked", revenue: "booked", scheduled: "booked", sold: "booked",
  empty: "empty", emptyleg: "empty", available: "empty", open: "empty", ferry: "empty", positioning: "empty", repositioning: "empty", deadhead: "empty",
  limited: "limited", tentative: "limited", subject: "limited", hold: "limited",
  unavailable: "unavailable", withdrawn: "unavailable", cancelled: "unavailable", canceled: "unavailable", blocked: "unavailable", maintenance: "unavailable",
};

function parsePrice(raw: string): number | null | "bad" {
  const t = raw.trim().toLowerCase().replace(/usd|\$|,|\s/g, "");
  if (!t) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)(k)?$/);
  if (!m) return "bad";
  const v = Number(m[1]) * (m[2] ? 1000 : 1);
  return Number.isFinite(v) ? Math.round(v) : "bad";
}

const operatorId = (text: string) => {
  const q = norm(text);
  return Object.values(OPERATORS).find((o) => norm(o.id) === q || norm(o.name) === q || norm(o.name.replace(/\(sim\)/i, "")) === q)?.id ?? null;
};

// ---- the parser -------------------------------------------------------------------------------------
type Cand = ImportedRow & { operator: string };

export function parseOperatorCsv(text: string, opts: { today?: string } = {}): ImportResult {
  const issues: ImportIssue[] = [];
  const err = (line: number, message: string, field?: string, tail?: string) => issues.push({ line, field, severity: "error", message, tail });
  const warn = (line: number, message: string, field?: string, tail?: string) => issues.push({ line, field, severity: "warning", message, tail });
  const finish = (cands: Cand[], rows: number): ImportResult => {
    const inventory = buildInventory(cands);
    const summary = summarize(inventory, issues, rows);
    return { ok: summary.accepted > 0 && summary.errors === 0, inventory, issues: issues.sort((a, b) => a.line - b.line || (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1)), summary };
  };

  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim() && !l.trim().startsWith("#")) ?? "";
  const delimiter = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const records = tokenizeCsv(text, delimiter).filter((r) => !r.cells[0].startsWith("#"));
  if (!records.length) {
    err(1, "The file is empty. Add a header row and at least one flight.");
    return finish([], 0);
  }

  // header
  const header = records[0];
  const col: Record<string, number> = {};
  header.cells.forEach((h, i) => {
    const key = Object.entries(HEADERS).find(([, names]) => names.includes(norm(h)))?.[0];
    if (key && col[key] === undefined) col[key] = i;
    else if (!key && h) warn(header.line, `Column "${h}" is not recognised and was ignored.`, h);
  });
  const missing = REQUIRED.filter((k) => col[k] === undefined);
  if (missing.length) {
    err(header.line, `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.map((k) => FIELD_LABEL[k]).join(", ")}. Expected a header such as: tail,aircraft,origin,destination,departure_local,arrival_local,seats,price,status.`);
    return finish([], Math.max(0, records.length - 1));
  }
  const body = records.slice(1);
  if (!body.length) {
    err(header.line, "The file has a header but no flights.");
    return finish([], 0);
  }

  // rows
  const seededTypes = new Map<string, string>(); // tail -> type id, seeded fleet
  for (const a of FLEET) { seededTypes.set(a.id, a.type); if (a.tail) seededTypes.set(a.tail, a.type); }
  const fileTypes = new Map<string, { type: string; line: number }>();
  const good: Cand[] = [];
  const nowAbs = opts.today ? toAbs(opts.today, "00:00", -5) : null;

  for (const rec of body) {
    const cell = (k: string) => (col[k] === undefined ? "" : (rec.cells[col[k]] ?? "").trim());
    const line = rec.line;
    const before = issues.filter((i) => i.severity === "error").length;
    const tail = cell("tail").toUpperCase();
    const tag = tail || undefined;
    if (rec.cells.length > header.cells.length && rec.cells.slice(header.cells.length).some((c) => c)) warn(line, "This row has more cells than the header; the extras were ignored.", undefined, tag);

    if (!tail) err(line, "Tail number is empty.", "tail");
    else if (!/^[A-Z0-9][A-Z0-9-]{2,7}$/.test(tail)) err(line, `Tail "${tail}" does not look like a registration (3 to 8 letters, digits or dashes, e.g. N520NS).`, "tail", tag);

    const typeText = cell("aircraft");
    const typeId = resolveAircraftType(typeText);
    if (!typeText) err(line, "Aircraft type is empty.", "aircraft", tag);
    else if (!typeId) err(line, `Unknown aircraft "${typeText}". Known types: ${Object.values(AIRCRAFT_TYPES).map((t) => t.short).join(", ")}.`, "aircraft", tag);

    const from = resolveAirportCode(cell("origin"));
    const to = resolveAirportCode(cell("destination"));
    if (!from) err(line, `Unknown airport "${cell("origin") || "(blank)"}" in origin. The demo knows ${Object.keys(AIRPORTS).length} airports (for example TEB, HPN, OPF, PBI, VNY).`, "origin", tag);
    if (!to) err(line, `Unknown airport "${cell("destination") || "(blank)"}" in destination.`, "destination", tag);
    if (from && to && from === to) err(line, `Origin and destination are both ${from}.`, "destination", tag);

    const depT = parseLocalDateTime(cell("departure"));
    const arrT = parseLocalDateTime(cell("arrival"));
    const FORMAT = "use YYYY-MM-DD HH:mm, 24-hour local time at that airport";
    if (!depT) err(line, `Bad departure time "${cell("departure") || "(blank)"}": ${FORMAT}.`, "departure_local", tag);
    if (!arrT) err(line, `Bad arrival time "${cell("arrival") || "(blank)"}": ${FORMAT}.`, "arrival_local", tag);

    let dep = 0;
    let arr = 0;
    if (from && to && depT && arrT) {
      dep = toAbs(depT.date, depT.time, AIRPORTS[from].tz);
      arr = toAbs(arrT.date, arrT.time, AIRPORTS[to].tz);
      if (arr <= dep) err(line, `Arrival ${arrT.date} ${arrT.time} is not after departure ${depT.date} ${depT.time}. Times are local to each airport, so ${from}→${to} needs the time-zone difference included.`, "arrival_local", tag);
    }

    // aircraft consistency
    if (tail && typeId) {
      const seeded = seededTypes.get(tail);
      const seen = fileTypes.get(tail);
      if (seeded && seeded !== typeId) err(line, `${tail} is a ${AIRCRAFT_TYPES[seeded].short} in the fleet, not a ${AIRCRAFT_TYPES[typeId].short}.`, "aircraft", tag);
      else if (seen && seen.type !== typeId) err(line, `${tail} is listed as a ${AIRCRAFT_TYPES[seen.type].short} on line ${seen.line} but a ${AIRCRAFT_TYPES[typeId].short} here.`, "aircraft", tag);
    }

    // seats
    let seats = typeId ? AIRCRAFT_TYPES[typeId].cap : 0;
    const seatText = cell("seats");
    if (seatText) {
      const n = Number(seatText);
      if (!Number.isInteger(n) || n < 1) err(line, `Seats "${seatText}" must be a whole number of 1 or more.`, "seats", tag);
      else if (typeId && n > AIRCRAFT_TYPES[typeId].cap) err(line, `${n} seats exceeds the ${AIRCRAFT_TYPES[typeId].short} cabin (${AIRCRAFT_TYPES[typeId].cap}).`, "seats", tag);
      else seats = n;
    }

    // status
    let status: ImportedRow["status"] = "booked";
    const statusText = cell("status");
    if (statusText) {
      const s = STATUS_WORDS[norm(statusText)];
      if (!s) err(line, `Unknown status "${statusText}". Use booked, empty, limited or unavailable.`, "status", tag);
      else status = s;
    }

    // price
    const priceRaw = parsePrice(cell("price"));
    let price: number | null = null;
    if (priceRaw === "bad") err(line, `Price "${cell("price")}" is not a number. Use digits such as 6400, $6,400 or 6.4k.`, "price", tag);
    else if (priceRaw != null) {
      price = priceRaw;
      if (price <= 0 && status !== "unavailable") err(line, "Price must be above zero.", "price", tag);
    }

    // plausibility (warnings)
    if (from && to && typeId && !issues.some((i) => i.line === line && i.severity === "error")) {
      const t = AIRCRAFT_TYPES[typeId];
      const km = distKm(from, to);
      if (!canReach(t, km)) err(line, `${from}→${to} is ${Math.round(km).toLocaleString("en-US")} km, beyond the nonstop range of a ${t.short}.`, "destination", tag);
      else {
        const model = blockMin(from, to, t);
        const actual = arr - dep;
        if (actual < 0.6 * model || actual > 1.8 * model) warn(line, `Block time ${fmtDur(actual)} is far from the ~${fmtDur(model)} a ${t.short} needs for ${from}→${to}. Check the time zones.`, "arrival_local", tag);
        if (price != null && price > 0 && status !== "booked" && price > 1.25 * charterPrice(t, model)) warn(line, `Offer $${price.toLocaleString("en-US")} is above a full charter of this leg (about $${charterPrice(t, model).toLocaleString("en-US")}); it is unlikely to sell.`, "price", tag);
        if (price != null && price > 0 && price < 500) warn(line, `Price $${price} looks too low for a whole-aircraft offer. Is it in thousands?`, "price", tag);
      }
    }
    if (status === "empty" && price == null && !issues.some((i) => i.line === line && i.severity === "error")) warn(line, "No price on an empty leg; JetFlex will use its suggested offer.", "price", tag);
    if (nowAbs != null && arr && arr < nowAbs && !issues.some((i) => i.line === line && i.severity === "error")) warn(line, "This flight is in the past and will not be offered.", "departure_local", tag);

    if (issues.filter((i) => i.severity === "error").length > before) continue;
    const opText = cell("operator");
    let operator = "imported";
    if (opText) {
      const o = operatorId(opText);
      if (o) operator = o;
      else warn(line, `Operator "${opText}" is not a known operator; the aircraft is filed under "${OPERATORS.imported.name}".`, "operator", tag);
    }
    fileTypes.set(tail, fileTypes.get(tail) ?? { type: typeId!, line });
    good.push({
      line, tail, aircraftId: allFleet().find((a) => a.id === tail || a.tail === tail)?.id ?? tail, typeId: typeId!, from: from!, to: to!,
      depDate: depT!.date, depTime: depT!.time, arrDate: arrT!.date, arrTime: arrT!.time, dep, arr, seats, price, status, operator,
    });
  }

  // cross-row checks: duplicates, overlaps and impossible repositioning per aircraft
  const reject = new Set<number>();
  const seen = new Map<string, number>();
  for (const r of good) {
    const key = `${r.tail}|${r.from}|${r.to}|${r.depDate} ${r.depTime}`;
    const first = seen.get(key);
    if (first !== undefined) { err(r.line, `Duplicate of line ${first}: ${r.tail} ${r.from}→${r.to} at ${r.depDate} ${r.depTime}.`, "tail", r.tail); reject.add(r.line); }
    else seen.set(key, r.line);
  }
  const seededByTail = new Map<string, { id: string; dep: number; arr: number; from: string; to: string }[]>();
  if (opts.today) {
    for (const f of resolveSchedule(opts.today)) {
      const a = FLEET.find((x) => x.id === f.aircraft);
      if (!a) continue;
      const dep = toAbs(f.date!, f.dep, AIRPORTS[f.from].tz);
      const list = seededByTail.get(a.id) ?? [];
      list.push({ id: f.id, dep, arr: dep + blockMin(f.from, f.to, AIRCRAFT_TYPES[a.type]), from: f.from, to: f.to });
      seededByTail.set(a.id, list);
    }
  }
  const byAircraft = new Map<string, Cand[]>();
  for (const r of good) if (!reject.has(r.line) && r.status !== "unavailable") byAircraft.set(r.aircraftId, [...(byAircraft.get(r.aircraftId) ?? []), r]);
  for (const [id, rows] of byAircraft) {
    const t = AIRCRAFT_TYPES[rows[0].typeId];
    const chain = rows.slice().sort((a, b) => a.dep - b.dep || a.line - b.line);
    // against the seeded schedule of the same aircraft (booked rows only: offers sit in gaps by design)
    for (const r of chain.filter((c) => c.status === "booked"))
      for (const s of seededByTail.get(id) ?? [])
        if (r.dep < s.arr && s.dep < r.arr && !reject.has(r.line)) {
          err(r.line, `Overlaps the fleet's own ${s.id} (${s.from}→${s.to}); the aircraft cannot be in two places.`, "departure_local", r.tail);
          reject.add(r.line);
        }
    let prev: Cand | null = null;
    for (const r of chain) {
      if (reject.has(r.line)) continue;
      if (prev) {
        if (r.dep < prev.arr) {
          err(r.line, `Overlaps line ${prev.line}: ${r.tail} is still flying ${prev.from}→${prev.to} until ${fmtHHmm(prev.arrTime)} on ${prev.arrDate}.`, "departure_local", r.tail);
          reject.add(r.line);
          continue;
        }
        if (prev.to !== r.from) {
          const need = blockMin(prev.to, r.from, t) + RULES.turnaround;
          if (r.dep - prev.arr < need) {
            err(r.line, `${r.tail} lands at ${prev.to} (line ${prev.line}) but departs ${r.from} only ${fmtDur(r.dep - prev.arr)} later; repositioning needs about ${fmtDur(need)}.`, "origin", r.tail);
            reject.add(r.line);
            continue;
          }
        } else if (r.dep - prev.arr < 30) warn(r.line, `Only ${fmtDur(r.dep - prev.arr)} on the ground at ${r.from} after line ${prev.line}; a turnaround normally takes 30 minutes or more.`, "departure_local", r.tail);
      }
      prev = r;
    }
  }
  return finish(good.filter((r) => !reject.has(r.line)), body.length);
}

function buildInventory(cands: Cand[]): ImportedInventory {
  const rows: ImportedRow[] = cands.map((c) => { const { operator, ...r } = c; void operator; return r; });
  const fleet = new Map<string, Aircraft>();
  for (const r of cands.slice().sort((a, b) => a.dep - b.dep)) {
    if (FLEET.some((a) => a.id === r.aircraftId) || fleet.has(r.aircraftId)) continue;
    fleet.set(r.aircraftId, { id: r.aircraftId, type: r.typeId, operator: r.operator, baseAirport: r.from, autoList: true, tail: r.tail });
  }
  const schedule: SchedFlight[] = rows.filter((r) => r.status === "booked").map((r) => ({ id: `IMP${r.line}`, aircraft: r.aircraftId, from: r.from, to: r.to, date: r.depDate, dep: r.depTime }));
  return { fleet: [...fleet.values()], schedule, offered: rows.filter((r) => r.status !== "booked"), rows };
}

function summarize(inv: ImportedInventory, issues: ImportIssue[], rows: number): ImportSummary {
  const dates = inv.rows.map((r) => r.depDate).sort();
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const s = {
    rows,
    accepted: inv.rows.length,
    rejected: Math.max(0, rows - inv.rows.length),
    errors,
    warnings,
    tails: new Set(inv.rows.map((r) => r.aircraftId)).size,
    newTails: inv.fleet.length,
    booked: inv.schedule.length,
    offered: inv.offered.length,
    routes: [...new Set(inv.rows.map((r) => `${r.from}→${r.to}`))],
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
  const bits = [`${s.accepted} of ${s.rows} row${s.rows === 1 ? "" : "s"} accepted`];
  if (s.accepted) bits.push(`${s.tails} aircraft (${s.newTails} new)`, `${s.booked} booked`, `${s.offered} listed as empty legs`);
  if (s.rejected) bits.push(`${s.rejected} rejected`);
  if (s.warnings) bits.push(`${s.warnings} warning${s.warnings === 1 ? "" : "s"}`);
  return { ...s, headline: bits.join(" · ") };
}

// ---- merge ---------------------------------------------------------------------------------------------
/**
 * Runs empty-leg detection on the seeded inventory with and without the import and reports the
 * difference. Pass the same `overrides` and `custom` flights the app already uses so Operator page
 * edits keep applying.
 */
export function mergeImportedInventory(today: string, inventory: ImportedInventory, opts: { overrides?: Overrides; custom?: SchedFlight[] } = {}): MergeResult {
  const baseline = deriveLegs(today, opts.overrides ?? {}, opts.custom ?? []);
  const legs = deriveLegs(today, opts.overrides ?? {}, opts.custom ?? [], inventory);
  const before = new Map(baseline.map((l) => [l.id, l]));
  const added = legs.filter((l) => !before.has(l.id));
  const changed = legs.filter((l) => {
    const b = before.get(l.id);
    return b && (b.price !== l.price || b.status !== l.status || b.published !== l.published || b.cap !== l.cap);
  });
  const explicit = added.filter((l) => l.id.includes("-OFFER")).length;
  const priced = [...added, ...changed].filter((l) => l.source === "imported").length;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const summary: MergeSummary = {
    baseline: baseline.length,
    total: legs.length,
    added: added.length,
    changed: changed.length,
    detectedFromGaps: added.length - explicit,
    explicitOffers: explicit,
    operatorPriced: priced,
    headline: `${plural(added.length, "new empty leg")} (${added.length - explicit} found in schedule gaps, ${explicit} listed directly), ${plural(changed.length, "existing leg")} updated, ${priced} priced or withdrawn by the operator`,
  };
  return { legs, baseline, added, changed, summary };
}

// ---- seeded sample files ---------------------------------------------------------------------------------
type SampleRow = { tail: string; type: string; from: string; to: string; day: number; dep: string; seats?: number; price?: number; status: string };
const SAMPLE_ROWS: SampleRow[] = [
  // N520NS (Latitude): an owner trip leaves it in New York, then an operator-listed leg south
  { tail: "N520NS", type: "Citation Latitude", from: "OPF", to: "TEB", day: -1, dep: "12:00", status: "booked" },
  { tail: "N520NS", type: "Citation Latitude", from: "TEB", to: "PBI", day: 0, dep: "09:30", seats: 8, price: 6400, status: "empty" },
  { tail: "N520NS", type: "Citation Latitude", from: "PBI", to: "TEB", day: 0, dep: "17:30", status: "booked" },
  { tail: "N520NS", type: "Citation Latitude", from: "TEB", to: "OPF", day: 2, dep: "07:30", status: "booked" },
  { tail: "N520NS", type: "Citation Latitude", from: "OPF", to: "TEB", day: 2, dep: "18:00", seats: 8, price: 5900, status: "empty" },
  { tail: "N520NS", type: "Citation Latitude", from: "TEB", to: "OPF", day: 3, dep: "14:00", status: "booked" },
  // N770NS (Challenger 350): Aspen client trip, then positioning back out west
  { tail: "N770NS", type: "Challenger 350", from: "ASE", to: "TEB", day: 0, dep: "14:00", status: "booked" },
  { tail: "N770NS", type: "Challenger 350", from: "TEB", to: "EGE", day: 1, dep: "10:00", seats: 9, price: 14500, status: "empty" },
  { tail: "N770NS", type: "Challenger 350", from: "EGE", to: "TEB", day: 2, dep: "15:00", status: "booked" },
  // N880NS (G450): a Florida round trip with a limited-availability empty leg
  { tail: "N880NS", type: "Gulfstream G450", from: "OPF", to: "TEB", day: -1, dep: "08:00", status: "booked" },
  { tail: "N880NS", type: "Gulfstream G450", from: "TEB", to: "FLL", day: 0, dep: "11:00", seats: 12, price: 11800, status: "limited" },
  { tail: "N880NS", type: "Gulfstream G450", from: "FLL", to: "TEB", day: 0, dep: "20:00", status: "booked" },
  // N101JX is already in the fleet: one more booked flight creates a new gap
  { tail: "N101JX", type: "Phenom 300E", from: "HPN", to: "OPF", day: 5, dep: "09:00", status: "booked" },
  // N305JX (G450, in the fleet): the operator withdraws its Friday positioning leg
  { tail: "N305JX", type: "Gulfstream G450", from: "TEB", to: "FLL", day: 0, dep: "12:00", seats: 13, price: 13500, status: "unavailable" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (abs: number, tz: number) => {
  const m = ((((abs + tz * 60) % 1440) + 1440) % 1440);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
const dayOf = (abs: number, tz: number) => addDays("1970-01-01", Math.floor((abs + tz * 60) / 1440));

/** Header plus rows, with arrival times computed from the aircraft's block time so the sample always validates. */
export function sampleOperatorCsv(today: string, extra: string[] = []): string {
  const anchor = anchorFriday(today);
  const lines = ["tail,aircraft,origin,destination,departure_local,arrival_local,seats,price,status"];
  for (const r of SAMPLE_ROWS) {
    const date = addDays(anchor, r.day);
    const t = AIRCRAFT_TYPES[resolveAircraftType(r.type)!];
    const dep = toAbs(date, r.dep, AIRPORTS[r.from].tz);
    const arr = dep + blockMin(r.from, r.to, t);
    const tz = AIRPORTS[r.to].tz;
    lines.push([r.tail, r.type, r.from, r.to, `${date} ${r.dep}`, `${dayOf(arr, tz)} ${clock(arr, tz)}`, r.seats ?? "", r.price ?? "", r.status].join(","));
  }
  return [...lines, ...extra].join("\n") + "\n";
}

/** The demo file for the reference date used by the tests (Saturday 2026-10-10, so Friday 2026-10-16). */
export const SAMPLE_OPERATOR_CSV = sampleOperatorCsv("2026-10-10");

/** Rows that each break one rule, to show what the validator says. Appended to the good sample. */
export function sampleOperatorCsvWithErrors(today: string): string {
  const fri = anchorFriday(today);
  const d = (n: number) => addDays(fri, n);
  return sampleOperatorCsv(today, [
    `N931NS,Citation Latitude,KXYZ,PBI,${d(1)} 09:00,${d(1)} 11:30,8,6200,empty`, // unknown airport
    `N932NS,Challenger 350,TEB,OPF,${d(1)} 10:00,${d(1)} 08:00,9,7000,empty`, // arrival before departure
    `N933NS,Phenom 300E,TEB,PBI,2026-02-31 25:00,${d(1)} 11:00,6,5200,empty`, // bad date and time
    `N934NS,Boeing 747,TEB,PBI,${d(1)} 09:00,${d(1)} 11:30,6,5200,empty`, // unknown aircraft
    `N935NS,Phenom 300E,TEB,PBI,${d(1)} 09:00,${d(1)} 11:30,14,5200,empty`, // seats above the cabin
    `N520NS,Citation Latitude,TEB,PBI,${d(0)} 09:30,${d(0)} 12:00,8,6400,empty`, // duplicate of an earlier row
    `N936NS,Challenger 350,TEB,PBI,${d(2)} 09:00,${d(2)} 11:30,9,abc,empty`, // price is not a number
    `N937NS,Challenger 350,TEB,OPF,${d(2)} 09:00,${d(2)} 11:40,9,6100,maybe`, // unknown status
  ]);
}
export const SAMPLE_OPERATOR_CSV_WITH_ERRORS = sampleOperatorCsvWithErrors("2026-10-10");
