// Centralised SIMULATED inventory. Nothing here is real market data: airports and distances are
// real, but every schedule, fare, fleet, price and availability value is illustrative.
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
  ].map((a) => [a.code, a]),
);

export const metroAirports = (metro: string) => Object.values(AIRPORTS).filter((a) => a.metro === metro);
/** The airport a private traveller would pick first in each metro. */
export const primaryGA = (metro: string) => metroAirports(metro).filter((a) => a.ga).sort((a, b) => a.centerMin - b.centerMin)[0];
export const DEMO_METROS = ["nyc", "mia", "ase", "lax", "sfo", "chi"];

const at = (id: string, name: string, short: string, cls: AircraftType["cls"], cap: number, speed: number, rate: number, o: Partial<AircraftType>): AircraftType =>
  ({ id, name, short, cls, cap, speed, rate, wifi: "basic", lav: true, galley: "cold", standUp: false, bags: 8, pets: true, bed: false, ...o });

export const AIRCRAFT_TYPES: Record<string, AircraftType> = Object.fromEntries(
  [
    at("phenom", "Embraer Phenom 300E", "Phenom 300E", "Light jet", 6, 800, 4300, { bags: 8 }),
    at("latitude", "Cessna Citation Latitude", "Latitude", "Midsize", 8, 790, 5600, { standUp: true, bags: 12 }),
    at("challenger", "Challenger 350", "Challenger 350", "Super-midsize", 9, 840, 6800, { wifi: "high-speed", galley: "hot", standUp: true, bags: 14 }),
    at("g450", "Gulfstream G450", "G450", "Heavy jet", 13, 880, 9300, { wifi: "high-speed", galley: "hot", standUp: true, bags: 22, bed: true }),
  ].map((t) => [t.id, t]),
);

export const OPERATORS: Record<string, Operator> = {
  aerolux: { id: "aerolux", name: "Aerolux Jets (sim)" },
  skyline: { id: "skyline", name: "Skyline Charter (sim)" },
};

const ac = (id: string, type: string, operator: string, baseAirport: string, autoList: boolean): Aircraft => ({ id, type, operator, baseAirport, autoList });
export const FLEET: Aircraft[] = [
  ac("JX101", "phenom", "aerolux", "TEB", true),
  ac("JX102", "phenom", "aerolux", "VNY", true),
  ac("JX204", "challenger", "aerolux", "HPN", true),
  ac("JX305", "g450", "aerolux", "TEB", true),
  ac("AX411", "challenger", "aerolux", "TEB", true),
  ac("AX412", "g450", "aerolux", "TEB", true),
  ac("SK112", "latitude", "skyline", "TEB", true),
  ac("AX413", "phenom", "aerolux", "PWK", true),
  ac("SK118", "phenom", "skyline", "TEB", false),
  ac("SK221", "challenger", "skyline", "TEB", true),
];

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
];
export const SCHEDULE_WEEKS = 2;

/** Scheduled first-class service: [from, to, minutes, fare per passenger (USD), departure times, stops label]. */
type Fc = [string, string, number, number, string];
const FC_RAW: Fc[] = [
  ["JFK", "MIA", 190, 780, "06:30 09:45 13:15 17:40"], ["LGA", "MIA", 185, 720, "07:15 11:30 16:20"], ["EWR", "FLL", 190, 690, "08:00 12:30 18:10"],
  ["MIA", "JFK", 195, 790, "08:20 12:40 16:50 19:30"], ["MIA", "LGA", 190, 740, "10:10 15:30 18:45"], ["FLL", "EWR", 185, 700, "09:30 14:00 17:45 20:50"],
  ["JFK", "DEN", 255, 1150, "07:00 12:15"], ["DEN", "ASE", 55, 520, "11:30 14:40 17:30"], ["EWR", "EGE", 285, 1380, "08:30"],
  ["ASE", "DEN", 55, 520, "09:10 13:00 16:20"], ["DEN", "JFK", 215, 1120, "12:30 15:45 19:20"], ["EGE", "EWR", 225, 1340, "13:10"],
  ["LAX", "SFO", 85, 380, "07:00 09:30 12:00 15:00 18:30"], ["BUR", "OAK", 80, 340, "08:15 13:40 17:50"], ["LAX", "SJC", 75, 320, "08:40 15:10"],
  ["SFO", "LAX", 85, 380, "07:30 10:15 13:00 16:45 19:30"], ["OAK", "BUR", 80, 340, "09:00 14:30 18:15"], ["SJC", "LAX", 75, 320, "10:00 17:30"],
  ["LGA", "ORD", 160, 590, "06:00 07:15 08:30 10:00 12:00 14:00 17:00 19:00"], ["EWR", "MDW", 160, 540, "07:30 11:45 15:20"],
  ["ORD", "LGA", 135, 560, "11:00 13:00 15:00 16:30 18:00 19:30 21:00"], ["MDW", "EWR", 130, 520, "12:30 16:10 19:45"],
];
export type FcRoute = { from: string; to: string; dur: number; fare: number; deps: string[] };
export const FC_ROUTES: FcRoute[] = FC_RAW.map(([from, to, dur, fare, d]) => ({ from, to, dur, fare, deps: d.split(" ") }));

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
];

/** Cost model constants (all illustrative). */
export const RULES = {
  fcGapBefore: 90, // arrive at the airport this long before a first-class departure
  fcGapAfter: 25, // deplane and collect bags
  fcConnect: 55, // minimum airline connection
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
