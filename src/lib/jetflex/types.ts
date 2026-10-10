// JetFlex domain types. Times are absolute minutes (UTC epoch / 60); see time.ts.

export type Mode = "commercial" | "charter" | "empty_leg" | "ground";
export type Kind = "first_class" | "charter" | "empty_leg" | "hybrid";
export type LegStatus = "available" | "limited" | "unavailable";
export type Dir = "out" | "ret";

export type Airport = {
  code: string;
  name: string;
  city: string;
  metro: string;
  lat: number;
  lon: number;
  tz: number; // hours from UTC (daylight time assumed; only differences matter)
  comm: boolean; // scheduled airline service
  ga: boolean; // private / FBO service
  centerMin: number; // minutes from the city centre ("door") by car
};

export type AircraftType = {
  id: string;
  name: string;
  short: string;
  cls: "Light jet" | "Super-midsize" | "Midsize" | "Heavy jet" | "Ultra-long-range";
  cap: number;
  speed: number; // km/h block speed
  rate: number; // illustrative USD per block hour
  range?: number; // km, nonstop with the typical charter cabin load (illustrative)
  wifi: "none" | "basic" | "high-speed";
  lav: boolean; // enclosed lavatory
  galley: "cold" | "hot";
  standUp: boolean;
  bags: number;
  pets: boolean;
  bed: boolean;
};

export type Aircraft = {
  id: string; // stable fleet key used in leg ids and the schedule (keep it stable)
  type: string;
  operator: string;
  baseAirport: string;
  autoList: boolean;
  tail?: string; // tail-number style registration for display, e.g. "N305JX" (fictional)
};
export type Operator = { id: string; name: string; blurb?: string; base?: string };

export type SchedFlight = { id: string; aircraft: string; from: string; to: string; day?: number; date?: string; dep: string };

/** A repositioning leg detected between two scheduled flights of the same aircraft. */
export type EmptyLeg = {
  id: string;
  aircraftId: string;
  typeId: string;
  operator: string;
  from: string;
  to: string;
  earliest: number;
  latest: number; // latest departure
  durMin: number;
  cap: number;
  charterEst: number;
  suggested: number; // model-suggested offer
  price: number; // current offer (operator override applied)
  status: LegStatus;
  published: boolean;
  risk: number; // 0..1 chance the leg changes or is withdrawn
  flexH: number; // half-width of the timing window, hours (capped)
  prev: string; // description of the flight before / after, for "why flagged"
  next: string;
  gapMin: number; // idle time between the two scheduled flights
  tail?: string; // registration of the aircraft, for display
  source?: "detected" | "imported"; // imported = offered explicitly in an operator CSV
};

export type Segment = {
  id: string;
  mode: Mode;
  from: string;
  to: string;
  dep: number;
  arr: number;
  cost: number;
  label: string;
  gapBefore: number;
  gapAfter: number;
  risk: number;
  ref?: string; // timetable key / empty-leg id / aircraft id (disruption matching)
  typeId?: string;
  caveat?: string;
  nonstop?: boolean;
  carrier?: string; // scheduled first class: simulated carrier name
  flightNo?: string; // e.g. "CRL 214" (simulated)
  equip?: string; // aircraft family on the scheduled service
  seatsLeft?: number; // first-class seats still open in the simulated inventory
  fareClass?: string;
};

export type Journey = {
  id: string;
  dir: Dir;
  kind: Kind;
  segments: Segment[];
  devMin: number; // |first flight departure - preferred|
  stops: number;
  match: "direct" | "nearby";
  notes: string[];
};

export type Weights = { cost: number; speed: number; control: number; privacy: number; certainty: number };
export type PresetId = "balanced" | "cost" | "fastest" | "control" | "private" | "ontime" | "custom";

export type TripRequest = {
  from: string; // metro id
  to: string;
  departDate: string; // YYYY-MM-DD, local at origin
  returnDate?: string;
  pax: number;
  flexH: 0 | 2 | 6 | 12 | 24;
  departTime: string; // HH:mm
  returnTime: string;
  arriveBy?: string; // HH:mm local at destination, on departDate
  budget?: number;
  preset: PresetId;
  weights: Weights;
};

export type Features = {
  cost: number;
  time: number;
  ground: number;
  stops: number;
  dev: number;
  risk: number;
  privacy: number;
  control: number;
};

export type ScorePart = { key: string; label: string; weight: number; norm: number; points: number };

export type Itinerary = {
  id: string;
  name: string;
  kind: Kind;
  journeys: Journey[];
  pax: number;
  totalPrice: number;
  perPerson: number;
  door2doorMin: number;
  groundMin: number;
  groundCost: number;
  stops: number;
  devMin: number;
  risk: number;
  privacy: number;
  control: number;
  tags: string[];
  feasible: boolean;
  issues: string[];
  score: number;
  parts: ScorePart[];
  savingsVsCharter: number | null;
  savingsVsFirst: number | null;
  overBudget: boolean;
  explanation: string[];
  tradeoffs: string[];
  recoveredFrom?: string;
};

export type Excluded = { label: string; reason: string; unlockFlexH?: number };

export type SearchResult = {
  itineraries: Itinerary[];
  excluded: Excluded[];
  assumptions: string[];
  flexProfile: { flexH: number; emptyLegs: number; total: number }[];
};

/** A flight row accepted from an operator CSV (see csvImport.ts), normalised to the app's time model. */
export type ImportedRow = {
  line: number; // 1-based line in the CSV file
  tail: string;
  aircraftId: string; // fleet id the row belongs to (the seeded id when the tail is already in the fleet)
  typeId: string;
  from: string;
  to: string;
  depDate: string; // local at origin, YYYY-MM-DD
  depTime: string; // HH:mm local at origin
  arrDate: string;
  arrTime: string;
  dep: number; // absolute minutes
  arr: number;
  seats: number;
  price: number | null; // whole-aircraft offer in USD, null when the row did not give one
  status: "booked" | "empty" | "limited" | "unavailable";
};

/** Normalised operator inventory that can be merged into the empty-leg engine. */
export type ImportedInventory = {
  fleet: Aircraft[]; // tails that are not in the seeded fleet
  schedule: SchedFlight[]; // booked flights, same shape as the Operator page's custom flights
  offered: ImportedRow[]; // rows the operator already lists as empty legs (with their own price)
  rows: ImportedRow[]; // every accepted row
};
