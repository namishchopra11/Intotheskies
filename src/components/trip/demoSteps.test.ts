import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import type { Profile, Trip } from "@/lib/types";
import { nextDemoStep } from "./demoSteps";

const guest: Profile = { name: "", email: "", guest: true };
const changed: Trip = {
  ...sampleTrip,
  disruptions: [{ id: "d1", type: "delay", flightId: sampleTrip.flights[0].id, createdAt: "2026-10-10T12:00:00Z", tasks: [] }],
};
const kind = (path: string, trip: Trip | null, profile: Profile | null = guest) => {
  const s = nextDemoStep(path, { trip, profile });
  return s.kind === "go" ? `go ${s.to}` : s.kind;
};

describe("demo walkthrough", () => {
  it("goes through every screen in order", () => {
    expect(kind("/login", null, null)).toBe("guest");
    expect(kind("/", null)).toBe("go /trip");
    expect(kind("/trip", null)).toBe("sample");
    expect(kind("/trip", sampleTrip)).toBe("go /"); // the filled-in bookings, then the trip
    expect(kind("/", sampleTrip)).toBe("change");
    expect(kind("/", changed)).toBe("go /share/d1");
    expect(kind("/share/d1", changed)).toBe("recipient");
    expect(kind("/s", changed)).toBe("go /settings");
    expect(kind("/settings", changed)).toBe("restart");
  });

  it("sends anyone not logged in to log in, except on the recipient's page", () => {
    expect(kind("/settings", sampleTrip, null)).toBe("go /login");
    expect(kind("/s", changed, null)).toBe("go /login");
  });

  it("falls back to home for a share link it can't build", () => {
    expect(kind("/share/unknown", changed)).toBe("go /");
    expect(kind("/ui-kit", changed)).toBe("go /");
  });
});
