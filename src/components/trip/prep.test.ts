import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { arrivalPlan, bookingCodes, daysUntil, nights, prepItems } from "./prep";

describe("before-you-go reminders", () => {
  const keys = prepItems(sampleTrip).map((i) => i.key);

  it("keeps it to five reminders built from the trip's own bookings", () => {
    expect(keys).toEqual(["documents", "checkin", "connection:flight-lhr-fco", "arrival", "share-plans"]);
    const checkin = prepItems(sampleTrip).find((i) => i.key === "checkin");
    expect(checkin?.title).toBe("Check in for Flight BA 286 and Flight AZ 201");
  });

  it("flags the 55-minute London connection", () => {
    const item = prepItems(sampleTrip).find((i) => i.key === "connection:flight-lhr-fco");
    expect(item?.title).toBe("Plan your London connection");
    expect(item?.detail).toContain("55 min");
  });

  it("has nothing to say about a trip with no flights", () => {
    expect(prepItems({ ...sampleTrip, flights: [] })).toEqual([]);
  });
});

describe("arrival plan", () => {
  it("lands, then the pickup 40 minutes later with a warning, then the hotel", () => {
    const steps = arrivalPlan(sampleTrip);
    expect(steps.map((s) => s.key)).toEqual(["land", "ride:ride-fco", "hotel:stay-rome"]);
    expect(steps[0].time).toBe("15:05");
    expect(steps[1].detail).toContain("40 min after landing");
    expect(steps[1].warn).toBeDefined();
    expect(steps[2].time).toBe("Open"); // check-in opened at 15:00, before landing
    expect(steps[2].warn).toBeUndefined(); // lands before the desk closes at 22:00
  });
});

describe("helpers", () => {
  it("lists one code per booking", () => {
    expect(bookingCodes(sampleTrip).map((c) => c.code)).toEqual(["K7QM2X", "W4HT9P", "HAG-48213", "RAT-7731"]);
  });

  it("counts nights and days by calendar date", () => {
    expect(nights(sampleTrip.stays[0])).toBe(4);
    expect(daysUntil("2026-10-16T16:40", "2026-10-10").label).toBe("in 6 days");
    expect(daysUntil("2026-10-11T08:00", "2026-10-10").label).toBe("tomorrow");
  });
});
