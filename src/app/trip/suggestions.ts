import { KNOWN_AIRPORTS, cityName } from "@/lib/domain/airports";
import type { Trip } from "@/lib/types";
import type { Draft } from "./entries";

/**
 * Predictions for the manual booking forms. Only for answers that are obvious from a short
 * list or from the traveler's own trips (airlines, airports, ride companies, hotels they have
 * used): never seats, times, phone numbers or confirmation codes.
 */
export type Suggestion = {
  /** What goes in the field. */
  value: string;
  /** Shown in the list, if different from the value. */
  label?: string;
  /** Smaller text on the right, e.g. the airline code or "From your trips". */
  hint?: string;
  /** Other fields to fill when this is picked, but only those that are still empty. */
  fill?: Draft;
  /** Comes from the traveler's own trips or choices, so it's worth showing before any typing. */
  contextual?: boolean;
};

export type SuggestionSource = "airline" | "flightNumber" | "airport" | "hotel" | "rideProvider" | "place";

// Major airlines with their IATA codes. Order is only a tiebreak; matching decides.
const AIRLINES: [code: string, name: string][] = [
  ["AA", "American Airlines"], ["AC", "Air Canada"], ["AF", "Air France"], ["AI", "Air India"],
  ["AK", "AirAsia"], ["AS", "Alaska Airlines"], ["AY", "Finnair"], ["AZ", "ITA Airways"],
  ["B6", "JetBlue"], ["BA", "British Airways"], ["CA", "Air China"], ["CX", "Cathay Pacific"],
  ["DL", "Delta Air Lines"], ["EI", "Aer Lingus"], ["EK", "Emirates"], ["ET", "Ethiopian Airlines"],
  ["EY", "Etihad Airways"], ["F9", "Frontier Airlines"], ["FR", "Ryanair"], ["IB", "Iberia"],
  ["JL", "Japan Airlines"], ["KE", "Korean Air"], ["KL", "KLM"], ["LH", "Lufthansa"],
  ["LX", "SWISS"], ["MH", "Malaysia Airlines"], ["NH", "ANA"], ["NK", "Spirit Airlines"],
  ["NZ", "Air New Zealand"], ["OS", "Austrian Airlines"], ["QF", "Qantas"], ["QR", "Qatar Airways"],
  ["SK", "SAS"], ["SN", "Brussels Airlines"], ["SQ", "Singapore Airlines"], ["TK", "Turkish Airlines"],
  ["TP", "TAP Air Portugal"], ["U2", "easyJet"], ["UA", "United Airlines"], ["VS", "Virgin Atlantic"],
  ["VY", "Vueling"], ["W6", "Wizz Air"], ["WN", "Southwest Airlines"], ["WS", "WestJet"],
];

// Chains people book often; the traveler finishes the name ("Hilton" -> "Hilton London Paddington").
const HOTEL_CHAINS = [
  "Best Western", "citizenM", "Courtyard by Marriott", "Crowne Plaza", "DoubleTree by Hilton",
  "Four Seasons", "Hampton by Hilton", "Hilton", "Holiday Inn", "Holiday Inn Express", "Hyatt Regency",
  "Ibis", "InterContinental", "JW Marriott", "Marriott", "Mercure", "Motel One", "Moxy", "NH Hotel",
  "Novotel", "Park Inn by Radisson", "Premier Inn", "Radisson Blu", "Renaissance", "Sheraton",
  "Sofitel", "The Ritz-Carlton", "Travelodge", "Westin",
];

const RIDE_PROVIDERS = [
  "Uber", "Lyft", "Bolt", "FREENOW", "Grab", "DiDi", "Cabify", "Careem", "Welcome Pickups",
  "Blacklane", "Hotel shuttle", "Airport shuttle", "Taxi", "Private driver", "Train", "Bus",
];

const airlineByName = (name: string) => AIRLINES.find(([, n]) => n.toLowerCase() === name.trim().toLowerCase());

/** Every booking on the traveler's trips, newest trip first, without repeats. */
function unique<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t).toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** All candidates for a field, before filtering by what has been typed. */
export function candidates(source: SuggestionSource, draft: Draft, trips: Trip[]): Suggestion[] {
  switch (source) {
    case "airline": {
      const used = unique(trips.flatMap((t) => t.flights.map((f) => f.airline)), (a) => a);
      const known = AIRLINES.map(([code, name]) => ({ value: name, hint: code, fill: { flightNumber: `${code} ` } }));
      const fromTrips = used.map((a) => ({ ...(known.find((k) => k.value === a) ?? { value: a, hint: "From your trips" }), contextual: true }));
      return unique([...fromTrips, ...known], (s) => s.value);
    }
    case "flightNumber": {
      // Only the airline prefix is predictable, and only until the number is typed.
      if (/\d/.test(draft.flightNumber ?? "")) return [];
      const chosen = airlineByName(draft.airline ?? "");
      const list = chosen ? [chosen, ...AIRLINES.filter((a) => a !== chosen)] : AIRLINES;
      return list.map(([code, name]) => ({ value: `${code} `, label: code, hint: name, contextual: chosen?.[0] === code }));
    }
    case "airport":
      return KNOWN_AIRPORTS.map((code) => ({ value: code, hint: cityName(code) }));
    case "hotel": {
      const used = unique(trips.flatMap((t) => t.stays), (s) => s.name).map((s) => ({
        value: s.name,
        hint: "From your trips",
        fill: { address: s.address, phone: s.phone ?? "" },
        contextual: true,
      }));
      return unique([...used, ...HOTEL_CHAINS.map((value) => ({ value }))], (s) => s.value);
    }
    case "rideProvider": {
      const used = unique(trips.flatMap((t) => (t.rides ?? []).map((r) => r.provider)), (p) => p);
      return unique([...used.map((value) => ({ value, hint: "From your trips", contextual: true })), ...RIDE_PROVIDERS.map((value) => ({ value }))], (s) => s.value);
    }
    case "place": {
      // Where rides usually start or end: the airports and hotels on this trip.
      const trip = trips[0];
      if (!trip) return [];
      const airports = unique(trip.flights.flatMap((f) => [f.to, f.from]), (c) => c).map((code) => ({
        value: `${code} arrivals`,
        hint: cityName(code),
        contextual: true,
      }));
      const hotels = trip.stays.map((s) => ({ value: s.name, hint: "Your hotel", contextual: true }));
      return unique([...hotels, ...airports], (s) => s.value);
    }
  }
}

const words = (s: string) => s.toLowerCase().split(/[\s·,()-]+/).filter(Boolean);

/**
 * The best few matches for what has been typed: anything whose value, label or hint has a
 * word starting with it (or starts with it outright, for multi-word queries). Exact matches
 * are dropped, since there is nothing left to predict.
 */
export function matchSuggestions(list: Suggestion[], query: string, limit = 6): Suggestion[] {
  const q = query.trim().toLowerCase();
  // Nothing typed yet: only offer what the traveler's own trips make likely.
  if (!q) return list.filter((s) => s.contextual).slice(0, limit);
  const scored = list.flatMap((s) => {
    if (s.value.trim().toLowerCase() === q) return [];
    const texts = [s.value, s.label ?? "", s.hint ?? ""].map((t) => t.toLowerCase());
    if (texts.some((t) => t.startsWith(q))) return [{ s, score: texts[0].startsWith(q) ? 0 : 1 }];
    if (texts.some((t) => words(t).some((w) => w.startsWith(q)))) return [{ s, score: 2 }];
    return [];
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.s);
}
