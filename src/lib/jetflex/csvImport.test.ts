import { describe, expect, it } from "vitest";
import { AIRCRAFT_TYPES, FLEET } from "./data";
import {
  mergeImportedInventory, parseOperatorCsv, resolveAircraftType, resolveAirportCode, sampleOperatorCsv, SAMPLE_OPERATOR_CSV,
  SAMPLE_OPERATOR_CSV_WITH_ERRORS, tokenizeCsv,
} from "./csvImport";
import { deriveLegs } from "./inventory";
import { validate } from "./journeys";
import { defaultRequest, search } from "./search";

const today = "2026-10-10"; // Saturday; the anchor Friday is 2026-10-16
const HEADER = "tail,aircraft,origin,destination,departure_local,arrival_local,seats,price,status";
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");
const errorsOf = (r: ReturnType<typeof parseOperatorCsv>) => r.issues.filter((i) => i.severity === "error");

describe("csv tokenizer", () => {
  it("handles quotes, escaped quotes, CRLF, a BOM and blank lines, tracking line numbers", () => {
    const rows = tokenizeCsv('﻿a,b\r\n\r\n"x, y","say ""hi"""\r\n"multi\nline",z\n');
    expect(rows.map((r) => r.cells)).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["multi\nline", "z"]]);
    expect(rows.map((r) => r.line)).toEqual([1, 3, 4]);
  });
});

describe("field resolvers", () => {
  it("matches aircraft by id, name, short name and a unique fragment", () => {
    expect(resolveAircraftType("Phenom 300E")).toBe("phenom");
    expect(resolveAircraftType("gulfstream g450")).toBe("g450");
    expect(resolveAircraftType("G450")).toBe("g450");
    expect(resolveAircraftType("Citation Latitude")).toBe("latitude");
    expect(resolveAircraftType("praetor")).toBe("praetor");
    expect(resolveAircraftType("citation")).toBeNull(); // ambiguous: CJ3+ and Latitude
    expect(resolveAircraftType("Boeing 747")).toBeNull();
  });
  it("accepts IATA and K-prefixed codes and rejects strangers", () => {
    expect(resolveAirportCode("teb")).toBe("TEB");
    expect(resolveAirportCode("KTEB")).toBe("TEB");
    expect(resolveAirportCode("KXYZ")).toBeNull();
    expect(resolveAirportCode("")).toBeNull();
  });
});

describe("operator CSV: the seeded sample", () => {
  const r = parseOperatorCsv(SAMPLE_OPERATOR_CSV, { today });
  it("validates cleanly and normalises to fleet, schedule and offers", () => {
    expect(errorsOf(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.summary).toMatchObject({ rows: 14, accepted: 14, rejected: 0, tails: 5, newTails: 3 });
    expect(r.inventory.fleet.map((a) => a.id).sort()).toEqual(["N520NS", "N770NS", "N880NS"]);
    expect(r.inventory.fleet.every((a) => a.operator === "imported" && a.autoList)).toBe(true);
    expect(r.inventory.schedule.length).toBe(r.summary.booked);
    expect(r.inventory.offered.length).toBe(r.summary.offered);
    expect(r.summary.headline).toMatch(/14 of 14 rows accepted/);
  });
  it("maps a tail that is already in the fleet onto the seeded aircraft id", () => {
    const row = r.inventory.rows.find((x) => x.tail === "N101JX")!;
    expect(row.aircraftId).toBe("JX101");
    expect(r.inventory.fleet.some((a) => a.id === "JX101")).toBe(false);
    expect(r.inventory.schedule.some((s) => s.aircraft === "JX101")).toBe(true);
  });
  it("converts local times with each airport's offset (Aspen is two hours behind New York)", () => {
    const row = r.inventory.rows.find((x) => x.tail === "N770NS" && x.from === "ASE")!;
    expect(row.arr - row.dep).toBeGreaterThan(150);
    expect(row.arr - row.dep).toBeLessThan(300);
    expect(row.arrTime > row.depTime || row.arrDate > row.depDate).toBe(true);
  });
  it("the generator produces a file that validates for any date", () => {
    for (const d of ["2026-10-10", "2026-12-31", "2027-03-01"]) expect(errorsOf(parseOperatorCsv(sampleOperatorCsv(d), { today: d }))).toEqual([]);
  });
});

describe("operator CSV: per-row validation messages", () => {
  const r = parseOperatorCsv(SAMPLE_OPERATOR_CSV_WITH_ERRORS, { today });
  const msg = (line: number) => r.issues.filter((i) => i.line === line && i.severity === "error").map((i) => i.message).join(" | ");
  it("reports every broken row on its own line and keeps the good ones", () => {
    expect(r.ok).toBe(false);
    expect(r.summary).toMatchObject({ rows: 22, accepted: 14, rejected: 8, errors: 8 });
    expect(msg(16)).toMatch(/Unknown airport "KXYZ" in origin/);
    expect(msg(17)).toMatch(/not after departure/);
    expect(msg(18)).toMatch(/Bad departure time "2026-02-31 25:00"/);
    expect(msg(19)).toMatch(/Unknown aircraft "Boeing 747"/);
    expect(msg(20)).toMatch(/14 seats exceeds the Phenom 300E cabin \(6\)/);
    expect(msg(21)).toMatch(/Duplicate of line 3/);
    expect(msg(22)).toMatch(/Price "abc" is not a number/);
    expect(msg(23)).toMatch(/Unknown status "maybe"/);
  });
  it("still merges the accepted rows", () => {
    const m = mergeImportedInventory(today, r.inventory);
    expect(m.added.length).toBeGreaterThan(0);
  });
});

describe("operator CSV: structure and chronology", () => {
  it("rejects a file with a missing required column, an empty file and a header-only file", () => {
    const a = parseOperatorCsv("tail,aircraft,origin\nN1,Phenom 300E,TEB");
    expect(a.ok).toBe(false);
    expect(a.issues[0].message).toMatch(/Missing required columns: destination, departure_local, arrival_local/);
    expect(parseOperatorCsv("").issues[0].message).toMatch(/empty/);
    expect(parseOperatorCsv(HEADER).issues[0].message).toMatch(/no flights/);
  });
  it("understands header aliases, semicolons and quoted cells", () => {
    const text = 'registration;type;from;to;departure;arrival;seats;price\n"N610ZZ";"Phenom 300E";KTEB;KOPF;"2026-10-16 08:00";"2026-10-16 10:40";6;"$5,900"';
    const r = parseOperatorCsv(text, { today });
    expect(errorsOf(r)).toEqual([]);
    expect(r.inventory.rows[0]).toMatchObject({ tail: "N610ZZ", typeId: "phenom", from: "TEB", to: "OPF", price: 5900, status: "booked", seats: 6 });
  });
  it("reads 6.4k and warns when an empty leg has no price", () => {
    const r = parseOperatorCsv(csv("N610ZZ,Phenom 300E,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,6.4k,empty", "N611ZZ,Phenom 300E,TEB,OPF,2026-10-17 08:00,2026-10-17 10:40,,,empty"), { today });
    expect(r.inventory.rows[0].price).toBe(6400);
    expect(r.issues.find((i) => i.severity === "warning" && i.line === 3)?.message).toMatch(/No price/);
  });
  it("rejects overlapping flights and impossible repositioning for one aircraft", () => {
    const r = parseOperatorCsv(
      csv(
        "N620ZZ,Challenger 350,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked",
        "N620ZZ,Challenger 350,TEB,PBI,2026-10-16 09:00,2026-10-16 11:40,,,booked", // departs while still flying
        "N620ZZ,Challenger 350,TEB,PBI,2026-10-16 11:00,2026-10-16 13:30,,,booked", // lands at OPF 10:40, needs a hop to TEB first
      ),
      { today },
    );
    expect(errorsOf(r).map((e) => e.line)).toEqual([3, 4]);
    expect(errorsOf(r)[0].message).toMatch(/Overlaps line 2/);
    expect(errorsOf(r)[1].message).toMatch(/repositioning needs about/);
    expect(r.inventory.rows.map((x) => x.line)).toEqual([2]);
  });
  it("accepts a gap long enough to reposition (that gap is the empty leg)", () => {
    const r = parseOperatorCsv(csv("N621ZZ,Challenger 350,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked", "N621ZZ,Challenger 350,TEB,PBI,2026-10-16 18:00,2026-10-16 20:30,,,booked"), { today });
    expect(errorsOf(r)).toEqual([]);
  });
  it("warns about a very short turnaround", () => {
    const r = parseOperatorCsv(csv("N622ZZ,Phenom 300E,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked", "N622ZZ,Phenom 300E,OPF,TEB,2026-10-16 10:55,2026-10-16 13:30,,,booked"), { today });
    expect(errorsOf(r)).toEqual([]);
    expect(r.issues.some((i) => i.severity === "warning" && /turnaround/.test(i.message))).toBe(true);
  });
  it("rejects a type that contradicts the fleet or an earlier row, and a leg beyond the aircraft's range", () => {
    const r = parseOperatorCsv(
      csv(
        "N101JX,Challenger 350,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked", // N101JX is a Phenom in the fleet
        "N630ZZ,Phenom 300E,TEB,OPF,2026-10-17 08:00,2026-10-17 10:40,,,booked",
        "N630ZZ,Latitude,TEB,OPF,2026-10-18 08:00,2026-10-18 10:40,,,booked",
        "N631ZZ,Phenom 300E,TEB,VNY,2026-10-17 08:00,2026-10-17 13:30,,,booked", // 3,900 km
      ),
      { today },
    );
    const e = errorsOf(r);
    expect(e.map((x) => x.line)).toEqual([2, 4, 5]);
    expect(e[0].message).toMatch(/N101JX is a Phenom 300E in the fleet/);
    expect(e[1].message).toMatch(/listed as a Phenom 300E on line 3/);
    expect(e[2].message).toMatch(/beyond the nonstop range/);
  });
  it("warns about a block time that ignores the time zone, and about flights already in the past", () => {
    const r = parseOperatorCsv(csv("N640ZZ,Challenger 350,TEB,ASE,2026-10-16 08:00,2026-10-16 07:30,,,booked", "N641ZZ,Phenom 300E,TEB,OPF,2026-10-01 08:00,2026-10-01 10:40,,,booked"), { today });
    expect(errorsOf(r)).toEqual([]);
    expect(r.issues.some((i) => i.line === 2 && /far from/.test(i.message))).toBe(true);
    expect(r.issues.some((i) => i.line === 3 && /in the past/.test(i.message))).toBe(true);
  });
  it("files an unknown operator column under the imported operator with a warning", () => {
    const r = parseOperatorCsv(`${HEADER},operator\nN650ZZ,Phenom 300E,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked,Acme Air\nN651ZZ,Phenom 300E,TEB,OPF,2026-10-16 08:00,2026-10-16 10:40,,,booked,Aerolux Jets`, { today });
    expect(r.inventory.fleet.map((a) => [a.id, a.operator])).toEqual([["N650ZZ", "imported"], ["N651ZZ", "aerolux"]]);
    expect(r.issues.some((i) => i.severity === "warning" && /Acme Air/.test(i.message))).toBe(true);
  });
});

describe("merging imported legs into the inventory", () => {
  const imp = parseOperatorCsv(SAMPLE_OPERATOR_CSV, { today }).inventory;
  const m = mergeImportedInventory(today, imp);

  it("runs empty-leg detection on the imported schedule", () => {
    expect(m.legs.length).toBeGreaterThan(m.baseline.length);
    const ids = m.added.map((l) => l.id);
    expect(ids.some((id) => id.startsWith("EL-N520NS-"))).toBe(true); // new aircraft
    expect(ids.some((id) => id.startsWith("EL-JX101-"))).toBe(true); // a booked flight added to a seeded aircraft opened a new gap
    for (const l of m.added) expect(l.from).not.toBe(l.to);
  });
  it("uses the operator's own price and publishes an offered leg", () => {
    const leg = m.legs.find((l) => l.tail === "N520NS" && l.from === "TEB" && l.to === "PBI")!;
    expect(leg).toMatchObject({ price: 6400, published: true, source: "imported", cap: 8 });
    const limited = m.legs.find((l) => l.tail === "N880NS" && l.from === "TEB" && l.to === "FLL")!;
    expect(limited).toMatchObject({ price: 11800, status: "limited" });
  });
  it("applies an unavailable row to the matching seeded leg", () => {
    const before = m.baseline.find((l) => l.id === "EL-JX305-B302")!;
    const after = m.legs.find((l) => l.id === "EL-JX305-B302")!;
    expect([before.status, after.status]).toEqual(["available", "unavailable"]);
    expect(m.changed.map((l) => l.id)).toContain("EL-JX305-B302");
  });
  it("turns a row with no surrounding flights into a standalone offered leg", () => {
    const lone = parseOperatorCsv(csv("N660ZZ,Phenom 300E,TEB,OPF,2026-10-16 09:00,2026-10-16 11:40,6,4800,empty"), { today }).inventory;
    const r = mergeImportedInventory(today, lone);
    expect(r.added).toHaveLength(1);
    expect(r.added[0]).toMatchObject({ id: "EL-N660ZZ-OFFER2", price: 4800, published: true, earliest: r.added[0].latest, source: "imported" });
    expect(r.summary).toMatchObject({ added: 1, explicitOffers: 1, detectedFromGaps: 0 });
  });
  it("keeps Operator page overrides on top of the import", () => {
    const o = mergeImportedInventory(today, imp, { overrides: { "EL-N520NS-IMP4": { price: 7700, published: false } } });
    const leg = o.legs.find((l) => l.id === "EL-N520NS-IMP4")!;
    expect([leg.price, leg.published]).toEqual([7700, false]);
  });
  it("does not mutate its inputs, and the engine with no import is unchanged", () => {
    const snapshot = JSON.stringify(imp);
    mergeImportedInventory(today, imp);
    expect(JSON.stringify(imp)).toBe(snapshot);
    expect(deriveLegs(today)).toEqual(m.baseline);
    expect(FLEET.some((a) => a.id === "N520NS")).toBe(false);
  });
  it("makes the imported legs bookable options in traveler search, and still valid", () => {
    const req = defaultRequest(today);
    const r = search(req, { today, legs: m.legs });
    const imported = r.itineraries.filter((i) => i.journeys.some((j) => j.segments.some((s) => s.mode === "empty_leg" && s.ref?.startsWith("EL-N"))));
    expect(imported.length).toBeGreaterThan(0);
    for (const i of imported) for (const j of i.journeys) expect(validate(j.segments)).toEqual([]);
    const seg = imported[0].journeys.flatMap((j) => j.segments).find((s) => s.ref?.startsWith("EL-N"))!;
    expect(seg.label).toMatch(/N\d{3}NS/); // the tail is shown
    expect(AIRCRAFT_TYPES[seg.typeId!]).toBeTruthy();
  });
  it("the unavailable seeded leg disappears from search results", () => {
    const r = search(defaultRequest(today), { today, legs: m.legs });
    expect(r.itineraries.some((i) => i.journeys.some((j) => j.segments.some((s) => s.ref === "EL-JX305-B302")))).toBe(false);
  });
});
