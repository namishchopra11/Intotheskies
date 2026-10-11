import { LocalDateTimeSchema, type LocalDateTime } from "@/lib/types";

// Used only to anchor the live departure countdown. Stored itinerary times stay local.
const ZONES: Record<string, string> = {
  AMS: "Europe/Amsterdam", ATH: "Europe/Athens", ATL: "America/New_York", AUH: "Asia/Dubai",
  BCN: "Europe/Madrid", BER: "Europe/Berlin", BKK: "Asia/Bangkok", BOM: "Asia/Kolkata",
  BOS: "America/New_York", BRU: "Europe/Brussels", CDG: "Europe/Paris", CPH: "Europe/Copenhagen",
  DEL: "Asia/Kolkata", DEN: "America/Denver", DFW: "America/Chicago", DOH: "Asia/Qatar",
  DUB: "Europe/Dublin", DXB: "Asia/Dubai", EWR: "America/New_York", FCO: "Europe/Rome",
  FRA: "Europe/Berlin", GRU: "America/Sao_Paulo", GVA: "Europe/Zurich", HKG: "Asia/Hong_Kong",
  HND: "Asia/Tokyo", IAD: "America/New_York", IAH: "America/Chicago", ICN: "Asia/Seoul",
  IST: "Europe/Istanbul", JFK: "America/New_York", LAS: "America/Los_Angeles", LAX: "America/Los_Angeles",
  LGA: "America/New_York", LGW: "Europe/London", LHR: "Europe/London", LIS: "Europe/Lisbon",
  MAD: "Europe/Madrid", MAN: "Europe/London", MEX: "America/Mexico_City", MIA: "America/New_York",
  MUC: "Europe/Berlin", MXP: "Europe/Rome", NRT: "Asia/Tokyo", ORD: "America/Chicago",
  ORY: "Europe/Paris", OSL: "Europe/Oslo", PEK: "Asia/Shanghai", PHX: "America/Phoenix",
  PVG: "Asia/Shanghai", SEA: "America/Los_Angeles", SFO: "America/Los_Angeles", SIN: "Asia/Singapore",
  SYD: "Australia/Sydney", VIE: "Europe/Vienna", YUL: "America/Toronto", YVR: "America/Vancouver",
  YYZ: "America/Toronto", ZRH: "Europe/Zurich",
};

/** No device-timezone guessing for unknown airports. */
export function departureInstant(departAt: LocalDateTime, airport: string): number | null {
  const timeZone = ZONES[airport.trim().toUpperCase()];
  if (!timeZone || !LocalDateTimeSchema.safeParse(departAt).success) return null;
  const [year, month, day, hour, minute] = departAt.split(/[-T:]/).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, calendar: "gregory", numberingSystem: "latn", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const localMs = (instant: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]));
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  };
  // Sample both sides of a clock change and validate the result in the airport's zone.
  const offsets = new Set([-86400000, 0, 86400000].map((shift) => localMs(wall + shift) - (wall + shift)));
  const matches = [...offsets].map((offset) => wall - offset).filter((instant) => localMs(instant) === wall);
  // An ambiguous or nonexistent daylight-saving time needs an offset we don't store.
  return matches.length === 1 ? matches[0] : null;
}

export function countdownLabel(departure: number, now: number): string {
  const remaining = Math.ceil((departure - now) / 1000);
  if (remaining <= 0) return "Departure time reached";
  if (remaining > 86400) return `${Math.ceil(remaining / 86400)} days to go`;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${minutes === 1 ? "min" : "mins"} ${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}
