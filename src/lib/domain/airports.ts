// City names for common airport codes, so text and speech can say "London" not "LHR".
const CITY_BY_AIRPORT: Record<string, string> = {
  AMS: "Amsterdam", ATH: "Athens", ATL: "Atlanta", AUH: "Abu Dhabi", BCN: "Barcelona",
  BER: "Berlin", BKK: "Bangkok", BOM: "Mumbai", BOS: "Boston", BRU: "Brussels",
  CDG: "Paris", CPH: "Copenhagen", DEL: "Delhi", DEN: "Denver", DFW: "Dallas",
  DOH: "Doha", DUB: "Dublin", DXB: "Dubai", EWR: "Newark", FCO: "Rome",
  FRA: "Frankfurt", GRU: "Sao Paulo", GVA: "Geneva", HKG: "Hong Kong", HND: "Tokyo",
  IAD: "Washington", IAH: "Houston", ICN: "Seoul", IST: "Istanbul", JFK: "New York",
  LAS: "Las Vegas", LAX: "Los Angeles", LGA: "New York", LGW: "London", LHR: "London",
  LIS: "Lisbon", MAD: "Madrid", MAN: "Manchester", MEX: "Mexico City", MIA: "Miami",
  MUC: "Munich", MXP: "Milan", NRT: "Tokyo", ORD: "Chicago", ORY: "Paris",
  OSL: "Oslo", PEK: "Beijing", PHX: "Phoenix", PVG: "Shanghai", SEA: "Seattle",
  SFO: "San Francisco", SIN: "Singapore", SYD: "Sydney", VIE: "Vienna", YUL: "Montreal",
  YVR: "Vancouver", YYZ: "Toronto", ZRH: "Zurich",
};

/** Every airport code with a known city, for suggestions while typing. */
export const KNOWN_AIRPORTS: readonly string[] = Object.keys(CITY_BY_AIRPORT);

/** "LHR" -> "London". Unknown codes are returned unchanged. */
export function cityName(airportCode: string): string {
  return CITY_BY_AIRPORT[airportCode.trim().toUpperCase()] ?? airportCode;
}

/** For text-to-speech: "LHR" -> "London", unknown "XYZ" -> "X Y Z" so it is spelled out. */
export function spokenPlace(airportCode: string): string {
  const code = airportCode.trim().toUpperCase();
  return CITY_BY_AIRPORT[code] ?? code.split("").join(" ");
}
