import { describe, expect, it } from "vitest";
import { countdownLabel, departureInstant } from "./countdown";
import { KNOWN_AIRPORTS } from "./airports";

describe("live departure countdown", () => {
  it("anchors departure to the airport rather than the device timezone", () => {
    expect(departureInstant("2026-10-12T14:25", "SFO")).toBe(Date.UTC(2026, 9, 12, 21, 25));
    expect(departureInstant("2026-10-12T14:25", "LHR")).toBe(Date.UTC(2026, 9, 12, 13, 25));
    expect(departureInstant("2026-10-12T14:25", "DEL")).toBe(Date.UTC(2026, 9, 12, 8, 55));
  });
  it("handles daylight-saving transitions without guessing ambiguous times", () => {
    expect(departureInstant("2026-03-08T02:30", "JFK")).toBeNull();
    expect(departureInstant("2026-11-01T01:30", "JFK")).toBeNull();
    expect(departureInstant("2026-03-08T03:30", "JFK")).toBe(Date.UTC(2026, 2, 8, 7, 30));
  });
  it("covers the app's known airports and leaves unknown airports on the calendar fallback", () => {
    for (const code of KNOWN_AIRPORTS) expect(departureInstant("2026-10-12T14:25", code)).not.toBeNull();
    expect(departureInstant("2026-10-12T14:25", "XYZ")).toBeNull();
  });
  it("counts down every second with correct minute and hour rollover", () => {
    const departure = Date.UTC(2026, 9, 12, 21, 25);
    const now = departure - (17 * 3600 + 23 * 60 + 20) * 1000;
    expect(countdownLabel(departure, now)).toBe("17 hours 23 mins 20 seconds");
    expect(countdownLabel(departure, now + 1000)).toBe("17 hours 23 mins 19 seconds");
    expect(countdownLabel(departure, departure - 3600000)).toBe("1 hour 0 mins 0 seconds");
    expect(countdownLabel(departure, departure - 3599000)).toBe("0 hours 59 mins 59 seconds");
  });
  it("switches at 24 hours and never displays negative time", () => {
    expect(countdownLabel(86401000, 0)).toBe("2 days to go");
    expect(countdownLabel(86400000, 0)).toBe("24 hours 0 mins 0 seconds");
    expect(countdownLabel(1000, 0)).toBe("0 hours 0 mins 1 second");
    expect(countdownLabel(0, 0)).toBe("Departure time reached");
    expect(countdownLabel(0, 1000)).toBe("Departure time reached");
  });
});
