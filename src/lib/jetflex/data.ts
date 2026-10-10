// Centralised SIMULATED inventory. Nothing here is real market data: airports and distances are
// real, but every schedule, fare, fleet, price and availability value is illustrative.
import { dowOf } from "./time";
import type { Aircraft, AircraftType, Airport, Operator, SchedFlight } from "./types";

export const DATA_NOTICE = "Simulated demo inventory. Prices, schedules and availability are illustrative, not bookable.";

export const METROS: Record<string, { name: string; short: string; lat: number; lon: number; aliases: string[] }> = {
  nyc: { name: "New York area", short: "New York", lat: 40.73, lon: -73.99, aliases: ["new york", "nyc", "manhattan", "teterboro", "westchester", "jfk", "laguardia", "newark", "ny area"] },
  mia: { name: "Miami", short: "Miami", lat: 25.77, lon: -80.19, aliases: ["miami", "south florida", "opa-locka", "opa locka", "fort lauderdale", "palm beach"] },
  ase: { name: "Aspen", short: "Aspen", lat: 39.19, lon: -106.82, aliases: ["aspen", "snowmass", "vail"] },
  lax: { name: "Los Angeles", short: "Los Angeles", lat: 34.05, lon: -118.24, aliases: ["los angeles", "la", "lax", "van nuys", "socal"] },
  sfo: { name: "San Francisco Bay Area", short: "San Francisco", lat: 37.77, lon: -122.42, aliases: ["san francisco", "sf", "bay area", "sfo", "san carlos", "oakland", "san jose"] },
  chi: { name: "Chicago", short: "Chicago", lat: 41.88, lon: -87.63, aliases: ["chicago", "chi", "o'hare", "ohare", "midway", "chicago executive"] },
  den: { name: "Denver", short: "Denver", lat: 39.74, lon: -104.99, aliases: ["denver"] },
};

/** Airport the traveller most likely means when a place name is typed. */
export const AIRPORT_ALIASES: Record<string, string> = {
  teterboro: "TEB", westchester: "HPN", jfk: "JFK", laguardia: "LGA", newark: "EWR", "opa-locka": "OPF", "opa locka": "OPF",
  "van nuys": "VNY", "san carlos": "SQL", "o'hare": "ORD", ohare: "ORD", midway: "MDW", "chicago executive": "PWK",
  "fort lauderdale": "FLL", "palm beach": "PBI", vail: "EGE",
};

const ap = (code: string, name: string, city: string, metro: string, lat: number, lon: number, tz: number, comm: boolean, ga: boolean, centerMin: number): Airport =>
  ({ code, name, city, metro, lat, lon, tz, comm, ga, centerMin });

export const AIRPORTS: Record<string, Airport> = Object.fromEntries(
  [
    ap("JFK", "John F. Kennedy Intl", "New York", "nyc", 40.6413, -73.7781, -4, true, false, 55),
    ap("LGA", "LaGuardia", "New York", "nyc", 40.7769, -73.874, -4, true, false, 35),
    ap("EWR", "Newark Liberty Intl", "Newark", "nyc", 40.6895, -74.1745, -4, true, false, 50),
    ap("TEB", "Teterboro", "Teterboro", "nyc", 40.8501, -74.0608, -4, false, true, 40),
    ap("HPN", "Westchester County", "White Plains", "nyc", 41.067, -73.7076, -4, false, true, 55),
    ap("MIA", "Miami Intl", "Miami", "mia", 25.7959, -80.287, -4, true, false, 25),
    ap("FLL", "Fort Lauderdale–Hollywood", "Fort Lauderdale", "mia", 26.0726, -80.1527, -4, true, false, 45),
    ap("OPF", "Miami-Opa Locka Executive", "Opa-locka", "mia", 25.907, -80.2784, -4, false, true, 30),
    ap("PBI", "Palm Beach Intl", "West Palm Beach", "mia", 26.6832, -80.0956, -4, true, true, 75),
    ap("ASE", "Aspen/Pitkin County", "Aspen", "ase", 39.2232, -106.8688, -6, true, true, 8),
    ap("EGE", "Eagle County Regional", "Eagle/Vail", "ase", 39.6426, -106.9159, -6, true, true, 110),
    ap("DEN", "Denver Intl", "Denver", "den", 39.8561, -104.6737, -6, true, false, 40),
    ap("APA", "Centennial", "Denver", "den", 39.5701, -104.8493, -6, false, true, 35),
    ap("LAX", "Los Angeles Intl", "Los Angeles", "lax", 33.9416, -118.4085, -7, true, false, 35),
    ap("VNY", "Van Nuys", "Los Angeles", "lax", 34.2098, -118.49, -7, false, true, 35),
    ap("BUR", "Hollywood Burbank", "Burbank", "lax", 34.2007, -118.359, -7, true, false, 30),
    ap("SFO", "San Francisco Intl", "San Francisco", "sfo", 37.6213, -122.379, -7, true, false, 30),
    ap("OAK", "Oakland Intl", "Oakland", "sfo", 37.7213, -122.2208, -7, true, false, 35),
    ap("SJC", "San José Mineta", "San José", "sfo", 37.3639, -121.9289, -7, true, true, 55),
    ap("SQL", "San Carlos", "San Carlos", "sfo", 37.5119, -122.2495, -7, false, true, 30),
    ap("ORD", "Chicago O'Hare", "Chicago", "chi", 41.9742, -87.9073, -5, true, false, 40),
    ap("MDW", "Chicago Midway", "Chicago", "chi", 41.7868, -87.7522, -5, true, false, 30),
    ap("PWK", "Chicago Executive", "Wheeling", "chi", 42.1142, -87.9015, -5, false, true, 40),
    ap("DPA", "DuPage", "West Chicago", "chi", 41.9078, -88.2486, -5, false, true, 50),
    ap("MMU", "Morristown Municipal", "Morristown", "nyc", 40.7994, -74.4149, -4, false, true, 60),
    ap("FRG", "Republic", "Farmingdale", "nyc", 40.7288, -73.4134, -4, false, true, 58),
    ap("FXE", "Fort Lauderdale Executive", "Fort Lauderdale", "mia", 26.1973, -80.1707, -4, false, true, 45),
    ap("SNA", "John Wayne / Orange County", "Santa Ana", "lax", 33.6757, -117.8683, -7, false, true, 55),
  ].map((a) => [a.code, a]),
);

export const metroAirports = (metro: string) => Object.values(AIRPORTS).filter((a) => a.metro === metro);
/** The airport a private traveller would pick first in each metro. */
export const primaryGA = (metro: string) => metroAirports(metro).filter((a) => a.ga).sort((a, b) => a.centerMin - b.centerMin)[0];
export const DEMO_METROS = ["nyc", "mia", "ase", "lax", "sfo", "chi"];

const at = (id: string, name: string, short: string, cls: AircraftType["cls"], cap: number, speed: number, rate: number, o: Partial<AircraftType>): AircraftType =>
  ({ id, name, short, cls, cap, speed, rate, wifi: "basic", lav: true, galley: "cold", standUp: false, bags: 8, pets: true, bed: false, ...o });

/**
 * Charter class economics (illustrative 2026 USD per block hour, typical seats, block speed and
 * nonstop range in km). Rates are in the range US charter brokers quote for each class; nothing here
 * is a quote.
 */
export const AIRCRAFT_TYPES: Record<string, AircraftType> = Object.fromEntries(
  [
    at("phenom", "Embraer Phenom 300E", "Phenom 300E", "Light jet", 6, 800, 4300, { bags: 8, range: 3650 }),
    at("cj3", "Cessna Citation CJ3+", "CJ3+", "Light jet", 6, 760, 3800, { bags: 6, range: 3700 }),
    at("latitude", "Cessna Citation Latitude", "Latitude", "Midsize", 8, 790, 5600, { standUp: true, bags: 12, range: 5000 }),
    at("challenger", "Challenger 350", "Challenger 350", "Super-midsize", 9, 840, 6800, { wifi: "high-speed", galley: "hot", standUp: true, bags: 14, range: 5900 }),
    at("praetor", "Embraer Praetor 600", "Praetor 600", "Super-midsize", 8, 850, 7400, { wifi: "high-speed", galley: "hot", standUp: true, bags: 16, range: 7200 }),
    at("g450", "Gulfstream G450", "G450", "Heavy jet", 13, 880, 9300, { wifi: "high-speed", galley: "hot", standUp: true, bags: 22, bed: true, range: 8000 }),
    at("global", "Bombardier Global 6000", "Global 6000", "Ultra-long-range", 14, 900, 11800, { wifi: "high-speed", galley: "hot", standUp: true, bags: 28, bed: true, range: 11100 }),
  ].map((t) => [t.id, t]),
);

export const OPERATORS: Record<string, Operator> = {
  aerolux: { id: "aerolux", name: "Aerolux Jets (sim)", base: "TEB", blurb: "Northeast light-to-heavy charter from Teterboro and Westchester" },
  skyline: { id: "skyline", name: "Skyline Charter (sim)", base: "TEB", blurb: "Owner-managed fleet, NYC area and Chicago" },
  meridian: { id: "meridian", name: "Meridian Private Aviation (sim)", base: "OPF", blurb: "Florida-based, flies the New York to South Florida corridor" },
  harborline: { id: "harborline", name: "Harborline Air (sim)", base: "VNY", blurb: "California shuttle and Rocky Mountain charter" },
  imported: { id: "imported", name: "Imported operator feed (sim)", blurb: "Aircraft that arrive through an operator CSV import" },
};

const ac = (id: string, type: string, operator: string, baseAirport: string, autoList: boolean, tail: string): Aircraft => ({ id, type, operator, baseAirport, autoList, tail });
export const FLEET: Aircraft[] = [
  ac("JX101", "phenom", "aerolux", "TEB", true, "N101JX"),
  ac("JX102", "phenom", "aerolux", "VNY", true, "N102JX"),
  ac("JX204", "challenger", "aerolux", "HPN", true, "N204JX"),
  ac("JX305", "g450", "aerolux", "TEB", true, "N305JX"),
  ac("AX411", "challenger", "aerolux", "TEB", true, "N411AX"),
  ac("AX412", "g450", "aerolux", "TEB", true, "N412AX"),
  ac("SK112", "latitude", "skyline", "TEB", true, "N112SK"),
  ac("AX413", "phenom", "aerolux", "PWK", true, "N413AX"),
  ac("SK118", "cj3", "skyline", "TEB", false, "N118SK"),
  ac("SK221", "challenger", "skyline", "TEB", true, "N221SK"),
  ac("MP601", "phenom", "meridian", "OPF", true, "N601MP"),
  ac("MP602", "praetor", "meridian", "FXE", true, "N602MP"),
  ac("MP603", "latitude", "meridian", "PBI", false, "N603MP"),
  ac("HL701", "latitude", "harborline", "VNY", true, "N701HL"),
  ac("HL702", "challenger", "harborline", "VNY", true, "N702HL"),
  ac("AX414", "global", "aerolux", "TEB", true, "N414AX"),
];

/** Fleet key for a registration ("N101JX" -> "JX101"), or the input itself when it is not a seeded tail. */
export const fleetIdForTail = (tail: string) => FLEET.find((a) => a.tail === tail || a.id === tail)?.id ?? tail;

/** Booked (revenue) flights. `day` is days from the anchor Friday. Gaps between them are the repositioning legs. */
const sf = (id: string, aircraft: string, from: string, to: string, day: number, dep: string): SchedFlight => ({ id, aircraft, from, to, day, dep });
export const SCHEDULE: SchedFlight[] = [
  sf("B101", "JX101", "OPF", "TEB", -1, "11:30"), sf("B102", "JX101", "OPF", "TEB", 0, "16:00"),
  sf("B103", "JX101", "TEB", "OPF", 1, "09:00"), sf("B104", "JX101", "TEB", "OPF", 3, "08:00"),
  sf("B201", "JX204", "TEB", "HPN", 0, "08:30"), sf("B202", "JX204", "PBI", "HPN", 2, "12:00"),
  sf("B301", "JX305", "HPN", "TEB", 0, "10:00"), sf("B302", "JX305", "FLL", "TEB", 0, "21:00"),
  sf("B303", "JX305", "TEB", "FLL", 2, "09:00"), sf("B304", "JX305", "TEB", "OPF", 4, "09:00"),
  sf("B401", "SK112", "HPN", "TEB", 0, "16:00"), sf("B402", "SK112", "OPF", "TEB", 1, "12:00"),
  sf("B501", "SK118", "TEB", "OPF", 0, "12:00"), sf("B502", "SK118", "TEB", "OPF", 3, "07:00"),
  sf("B601", "JX102", "SQL", "VNY", -1, "16:00"), sf("B602", "JX102", "SQL", "VNY", 0, "15:30"),
  sf("B603", "JX102", "VNY", "SQL", 1, "10:00"), sf("B604", "JX102", "VNY", "SQL", 3, "08:00"),
  sf("B701", "AX411", "HPN", "TEB", 0, "05:00"), sf("B702", "AX411", "ASE", "TEB", 1, "12:00"),
  sf("B801", "AX412", "TEB", "ASE", 0, "09:00"), sf("B802", "AX412", "TEB", "OPF", 3, "08:00"),
  sf("B901", "SK221", "PWK", "TEB", -1, "12:00"), sf("B902", "SK221", "PWK", "TEB", 0, "20:00"),
  sf("B905", "AX413", "TEB", "PWK", 0, "07:00"), sf("B906", "AX413", "TEB", "OPF", 1, "10:00"),
  // Meridian (Florida corridor). Gaps between these fall out as TEB<->OPF/PBI repositioning legs.
  sf("M101", "MP601", "PBI", "TEB", -1, "09:30"), sf("M102", "MP601", "OPF", "HPN", 0, "17:30"),
  sf("M103", "MP601", "HPN", "PBI", 2, "10:00"), sf("M104", "MP601", "TEB", "OPF", 3, "07:30"),
  sf("M201", "MP602", "OPF", "TEB", 0, "06:30"), sf("M202", "MP602", "PBI", "TEB", 1, "13:00"),
  sf("M203", "MP602", "TEB", "OPF", 3, "09:00"),
  sf("M301", "MP603", "PBI", "TEB", -1, "17:00"), sf("M302", "MP603", "PBI", "HPN", 0, "19:00"),
  sf("M303", "MP603", "HPN", "OPF", 2, "15:00"), sf("M304", "MP603", "TEB", "PBI", 3, "11:00"),
  // Harborline (California and mountain west).
  sf("H101", "HL701", "VNY", "SQL", -1, "18:00"), sf("H102", "HL701", "VNY", "SQL", 1, "08:30"),
  sf("H103", "HL701", "SQL", "VNY", 3, "07:00"),
  sf("H201", "HL702", "ASE", "VNY", 1, "11:00"), sf("H202", "HL702", "ASE", "VNY", 3, "12:00"),
  // Aerolux Global 6000: transcontinental positioning.
  sf("A401", "AX414", "VNY", "TEB", -1, "08:00"), sf("A402", "AX414", "VNY", "TEB", 1, "10:00"),
  sf("A403", "AX414", "TEB", "VNY", 3, "09:00"),
];
export const SCHEDULE_WEEKS = 2;

/**
 * Scheduled first-class service. Carriers are fictional brands (every flight number here is made up).
 * Block time and base fare come from the great-circle distance, so every route follows the same
 * model: ~740 km/h plus 40 minutes of taxi and approach, a tailwind or headwind allowance on east/west
 * routes, and a fare that flattens with distance. The departure lists are local times at the origin.
 */
export const CARRIERS: Record<string, { code: string; name: string }> = {
  crl: { code: "CRL", name: "Crestline Air (sim)" },
  hlc: { code: "HLC", name: "Halcyon Airways (sim)" },
  nbm: { code: "NBM", name: "Northbeam Airlines (sim)" },
  pcc: { code: "PCC", name: "Pacifica Coastal (sim)" },
};

const FC_SPEC: [from: string, to: string, carrier: string, equip: string, deps: string][] = [
  // New York area <-> South Florida
  ["JFK", "MIA", "crl", "A321", "06:00 07:30 09:15 11:00 13:15 15:30 17:45 19:30"], ["LGA", "MIA", "crl", "A320", "06:30 08:00 10:30 12:45 15:00 17:15 19:00"],
  ["EWR", "FLL", "crl", "B737-800", "06:15 08:30 10:45 13:30 16:00 18:20"], ["EWR", "MIA", "crl", "B737-800", "07:05 12:10 17:20"],
  ["JFK", "FLL", "crl", "A321", "07:20 12:00 16:40 20:10"], ["JFK", "PBI", "crl", "A320", "07:45 11:30 16:15"],
  ["LGA", "PBI", "crl", "A319", "08:20 14:10 18:40"], ["EWR", "PBI", "crl", "B737-800", "09:05 15:25 19:35"],
  ["MIA", "JFK", "crl", "A321", "06:10 08:25 10:40 13:00 15:20 17:30 19:50"], ["MIA", "LGA", "crl", "A320", "07:00 09:45 12:15 14:50 17:10 19:25"],
  ["FLL", "EWR", "crl", "B737-800", "06:40 09:30 12:00 14:30 17:45 20:50"], ["MIA", "EWR", "crl", "B737-800", "08:15 13:10 18:20"],
  ["FLL", "JFK", "crl", "A321", "07:50 12:35 16:20 19:10"], ["PBI", "JFK", "crl", "A320", "08:40 12:50 17:25"],
  ["PBI", "LGA", "crl", "A319", "09:30 15:05 19:15"], ["PBI", "EWR", "crl", "B737-800", "10:10 16:00 20:20"],
  // New York area <-> Colorado (Aspen is served through Denver or seasonally nonstop to Eagle)
  ["JFK", "DEN", "hlc", "B737-800", "07:00 12:15 17:10"], ["EWR", "DEN", "hlc", "B737-900", "07:40 13:30 18:20"],
  ["DEN", "ASE", "hlc", "E175", "09:20 11:30 14:40 17:30"], ["DEN", "EGE", "hlc", "E175", "09:45 12:10 15:30"],
  ["EWR", "EGE", "hlc", "B737-800", "08:30"], ["ASE", "DEN", "hlc", "E175", "07:30 09:10 13:00 16:20 18:30"],
  ["EGE", "DEN", "hlc", "E175", "08:25 11:50 15:00"], ["DEN", "JFK", "hlc", "B737-800", "08:30 12:30 15:45 19:20"],
  ["DEN", "EWR", "hlc", "B737-900", "09:10 14:00 18:45"], ["EGE", "EWR", "hlc", "B737-800", "13:10"],
  // New York area <-> Chicago
  ["LGA", "ORD", "nbm", "A320", "06:00 07:15 08:30 10:00 12:00 14:00 16:00 18:00 19:30"], ["JFK", "ORD", "nbm", "B737-800", "07:00 10:30 14:30 18:15"],
  ["EWR", "ORD", "nbm", "B737-800", "06:45 09:30 12:30 15:30 18:00"], ["EWR", "MDW", "nbm", "B737-700", "07:30 11:45 15:20"],
  ["LGA", "MDW", "nbm", "B737-700", "09:15 17:40"],
  ["ORD", "LGA", "nbm", "A320", "06:30 08:00 10:15 12:30 14:30 16:30 18:00 19:30 21:00"], ["ORD", "JFK", "nbm", "B737-800", "08:15 12:00 16:15 19:50"],
  ["ORD", "EWR", "nbm", "B737-800", "07:10 10:40 13:50 17:25 20:05"], ["MDW", "EWR", "nbm", "B737-700", "12:30 16:10 19:45"],
  ["MDW", "LGA", "nbm", "B737-700", "10:20 18:30"],
  // California
  ["LAX", "SFO", "pcc", "A320", "07:00 08:15 09:30 11:00 12:00 13:30 15:00 16:30 18:30"], ["BUR", "OAK", "pcc", "E175", "08:15 13:40 17:50"],
  ["LAX", "SJC", "pcc", "E175", "08:40 15:10"], ["SFO", "LAX", "pcc", "A320", "07:30 09:00 10:15 12:00 13:00 14:30 16:45 19:30"],
  ["OAK", "BUR", "pcc", "E175", "09:00 14:30 18:15"], ["SJC", "LAX", "pcc", "E175", "10:00 17:30"],
  // Transcontinental and mountain connections that make other city pairs usable
  ["JFK", "LAX", "pcc", "A321T", "06:00 08:00 10:30 13:00 16:30 19:00"], ["LAX", "JFK", "pcc", "A321T", "07:00 09:30 12:30 15:00 17:30 22:10"],
  ["JFK", "SFO", "pcc", "A321T", "07:15 09:45 14:20 18:10"], ["SFO", "JFK", "pcc", "A321T", "08:00 10:30 15:15 21:50"],
  ["EWR", "LAX", "pcc", "B787-9", "07:30 11:20 17:40"], ["LAX", "EWR", "pcc", "B787-9", "08:10 13:45 21:30"],
  ["MIA", "LAX", "crl", "A321", "08:00 12:50 17:00"], ["LAX", "MIA", "crl", "A321", "07:20 11:40 15:30"],
  ["ORD", "LAX", "nbm", "B737-800", "07:00 09:15 12:45 16:30"], ["LAX", "ORD", "nbm", "B737-800", "07:45 10:10 13:20 17:00"],
  ["ORD", "SFO", "nbm", "B737-800", "08:05 13:25 17:35"], ["SFO", "ORD", "nbm", "B737-800", "07:40 11:30 16:20"],
  ["MIA", "ORD", "nbm", "A320", "07:55 12:10 17:15"], ["ORD", "MIA", "nbm", "A320", "08:40 13:20 18:05"],
  ["ORD", "DEN", "hlc", "B737-800", "08:15 12:00 15:40 19:10"], ["DEN", "ORD", "hlc", "B737-800", "07:50 11:30 15:00 18:40"],
  ["LAX", "DEN", "hlc", "B737-800", "07:45 12:15 17:30"], ["DEN", "LAX", "hlc", "B737-800", "08:55 13:10 17:45"],
  ["LAX", "ASE", "hlc", "E175", "09:50"], ["ASE", "LAX", "hlc", "E175", "12:30"],
  ["SFO", "DEN", "hlc", "B737-800", "07:10 11:45 16:05"], ["DEN", "SFO", "hlc", "B737-800", "08:00 12:40 17:20"],
  ["ORD", "ASE", "nbm", "E175", "09:30"], ["ASE", "ORD", "nbm", "E175", "13:45"],
  ["MIA", "DEN", "hlc", "B737-800", "07:30 12:20 17:10"], ["DEN", "MIA", "hlc", "B737-800", "09:00 13:40 18:30"],
];

export type FcRoute = { from: string; to: string; dur: number; fare: number; deps: string[]; carrier: string; equip: string };

const r5n = (n: number) => Math.round(n / 5) * 5;
const hashStr = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
};
const gcKm = (a: Airport, b: Airport) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
/** Gate-to-gate minutes: cruise at ~740 km/h plus 40 minutes, with a headwind (west) or tailwind (east) allowance. */
export function fcBlockMin(from: string, to: string) {
  const [a, b] = [AIRPORTS[from], AIRPORTS[to]];
  const wind = b.lon - a.lon > 12 ? 0.9 : b.lon - a.lon < -12 ? 1.05 : 1;
  return r5n(40 + (gcKm(a, b) / 740) * 60 * wind);
}
/** Base first-class fare per passenger: flattens beyond ~1,800 km, with a small stable per-route spread. */
export function fcBaseFare(from: string, to: string) {
  const km = gcKm(AIRPORTS[from], AIRPORTS[to]);
  const spread = 0.94 + (hashStr(`${from}${to}`) % 13) / 100; // 0.94..1.06
  const seasonal = ["EGE", "ASE"].some((c) => c === from || c === to) ? 1.18 : 1;
  return r5n((180 + 0.3 * Math.min(km, 1800) + 0.18 * Math.max(0, km - 1800)) * spread * seasonal);
}
export const FC_ROUTES: FcRoute[] = FC_SPEC.map(([from, to, carrier, equip, d]) => ({
  from, to, carrier, equip, dur: fcBlockMin(from, to), fare: fcBaseFare(from, to), deps: d.split(" "),
}));

/** Per-departure facts the simulated airline would show: flight number, equipment, fare and seats left. */
export function fcFlightInfo(r: FcRoute, date: string, time: string) {
  const carrier = CARRIERS[r.carrier];
  const flightNo = `${carrier.code} ${100 + (hashStr(`${r.from}${r.to}${time}`) % 880)}`;
  const hour = Number(time.slice(0, 2));
  const dow = dowOf(date);
  const peak = hour <= 8 || (hour >= 16 && hour <= 19) ? 1.14 : hour >= 20 || hour < 6 ? 0.9 : 0.95;
  const day = dow === 5 || dow === 0 ? 1.06 : dow === 6 ? 0.9 : 1;
  const h = hashStr(`${r.from}${r.to}${date}${time}`);
  const seatsLeft = h % 10 === 0 ? 1 + ((h >>> 4) % 3) : 4 + ((h >>> 4) % 13);
  return { carrier: carrier.name, flightNo, equip: r.equip, fare: r5n(r.fare * peak * day), seatsLeft };
}

/** Seeded hybrid templates: airline service to a hub, a ground transfer, then a short private hop. */
export const HYBRIDS = [{ metro: "ase", hub: "DEN", ga: "APA", local: "ASE" }];

/** Simulated demand: other travellers' searches, used by the operator view. `day` is from the anchor Friday. */
export type DemandSearch = { id: string; label: string; from: string; to: string; day: number; time: string; pax: number; flexH: number; budget: number };
export const DEMAND: DemandSearch[] = [
  { id: "D1", label: "Family of four, weekend away", from: "nyc", to: "mia", day: 0, time: "09:00", pax: 4, flexH: 6, budget: 16000 },
  { id: "D2", label: "Couple, price-sensitive", from: "nyc", to: "mia", day: 0, time: "10:00", pax: 2, flexH: 12, budget: 9000 },
  { id: "D3", label: "Client delegation", from: "nyc", to: "mia", day: 0, time: "13:00", pax: 6, flexH: 2, budget: 24000 },
  { id: "D4", label: "Ski group", from: "nyc", to: "ase", day: 0, time: "08:00", pax: 4, flexH: 6, budget: 42000 },
  { id: "D5", label: "Returning executives", from: "mia", to: "nyc", day: 2, time: "17:00", pax: 3, flexH: 6, budget: 14000 },
  { id: "D6", label: "Wedding party returning", from: "mia", to: "nyc", day: 2, time: "15:00", pax: 5, flexH: 12, budget: 20000 },
  { id: "D7", label: "Founders, Bay Area hop", from: "lax", to: "sfo", day: 0, time: "12:00", pax: 3, flexH: 6, budget: 9000 },
  { id: "D8", label: "Studio team", from: "sfo", to: "lax", day: 2, time: "18:00", pax: 4, flexH: 2, budget: 11000 },
  { id: "D9", label: "Two partners, Chicago day trip", from: "nyc", to: "chi", day: 0, time: "07:00", pax: 2, flexH: 6, budget: 14000 },
  { id: "D10", label: "Chicago to New York, same day", from: "chi", to: "nyc", day: 0, time: "17:30", pax: 2, flexH: 6, budget: 14000 },
  { id: "D11", label: "Ski group heading home", from: "ase", to: "nyc", day: 2, time: "15:00", pax: 4, flexH: 12, budget: 46000 },
  { id: "D12", label: "Golf weekend, three friends", from: "nyc", to: "mia", day: 0, time: "11:00", pax: 3, flexH: 12, budget: 12000 },
  { id: "D13", label: "Film crew, Los Angeles to the Bay", from: "lax", to: "sfo", day: 1, time: "09:00", pax: 5, flexH: 6, budget: 14000 },
  { id: "D14", label: "Executives, Chicago to New York", from: "chi", to: "nyc", day: 2, time: "18:00", pax: 3, flexH: 6, budget: 17000 },
  { id: "D15", label: "Last-minute Aspen weekend", from: "nyc", to: "ase", day: 1, time: "10:00", pax: 2, flexH: 12, budget: 30000 },
  { id: "D16", label: "Board offsite, New York to Los Angeles", from: "nyc", to: "lax", day: 0, time: "09:00", pax: 5, flexH: 12, budget: 60000 },
];

/** Cost model constants (all illustrative). */
export const RULES = {
  fcGapBefore: 90, // arrive at the airport this long before a first-class departure
  fcGapAfter: 25, // deplane and collect bags
  fcConnect: 55, // minimum airline connection
  fet: 0.075, // US federal excise tax on charter air transportation, applied to every charter price
  pvGapBefore: 15,
  pvGapAfter: 10,
  turnaround: 60, // aircraft turnaround for a repositioning leg
  maxGround: 150, // longest acceptable ground transfer at either end
  vehicleSeats: 4,
  charterFees: 950,
  minBillable: 90,
  marginalCost: 600, // operator catering and handling for a sold empty leg
  positioningCostShare: 0.38, // variable cost of flying a leg, share of the charter estimate
};
