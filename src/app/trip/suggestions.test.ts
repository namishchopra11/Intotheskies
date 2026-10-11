import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { candidates, matchSuggestions } from "./suggestions";

const values = (source: Parameters<typeof candidates>[0], query: string, draft = {}, trips = [sampleTrip]) =>
  matchSuggestions(candidates(source, draft, trips), query).map((s) => s.value);

describe("booking form predictions", () => {
  it("predicts airlines from a few letters, by name or code", () => {
    expect(values("airline", "brit")[0]).toBe("British Airways");
    expect(values("airline", "lu")).toContain("Lufthansa");
    expect(values("airline", "BA")).toContain("British Airways");
  });

  it("fills the flight-number prefix when an airline is picked", () => {
    const ba = matchSuggestions(candidates("airline", {}, []), "british")[0];
    expect(ba.fill).toEqual({ flightNumber: "BA " });
  });

  it("offers the chosen airline's code first and stops once digits are typed", () => {
    expect(values("flightNumber", "", { airline: "ITA Airways", flightNumber: "" })).toEqual(["AZ "]);
    expect(values("flightNumber", "AZ 2", { airline: "ITA Airways", flightNumber: "AZ 2" })).toEqual([]);
  });

  it("finds airports by code or by city", () => {
    expect(values("airport", "FC")).toEqual(["FCO"]);
    expect(values("airport", "LON")).toEqual(expect.arrayContaining(["LHR", "LGW"]));
    expect(values("airport", "ROM")).toContain("FCO");
  });

  it("suggests hotels from your trips with their address, and well-known chains", () => {
    const [mine] = matchSuggestions(candidates("hotel", {}, [sampleTrip]), "aven");
    expect(mine.value).toBe("Hotel Aventino Garden");
    expect(mine.fill?.address).toContain("Via di Santa Prisca");
    expect(values("hotel", "hil")).toContain("Hilton");
  });

  it("suggests ride places from this trip before anything is typed", () => {
    expect(values("place", "")).toEqual(expect.arrayContaining(["Hotel Aventino Garden", "FCO arrivals"]));
    expect(values("rideProvider", "ub")).toContain("Uber");
  });

  it("shows nothing for an empty field without context, and drops exact matches", () => {
    expect(values("airport", "")).toEqual([]);
    expect(values("airport", "FCO")).toEqual([]);
  });
});
