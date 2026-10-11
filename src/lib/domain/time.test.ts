import { describe, expect, it } from "vitest";
import { formatClockTime, formatTimeText, minutesBetween, timePart } from "./time";
import { useTripStore } from "@/lib/store";
import { DEFAULT_SETTINGS, SettingsSchema } from "@/lib/types";

describe("time display preference", () => {
  it.each([
    ["00:00", "12:00 AM"], ["00:45", "12:45 AM"],
    ["09:05", "9:05 AM"], ["12:00", "12:00 PM"],
    ["12:45", "12:45 PM"], ["14:25", "2:25 PM"], ["23:59", "11:59 PM"],
  ])("displays %s as %s by default", (clock, expected) => {
    expect(formatClockTime(clock)).toBe(expected);
    expect(formatClockTime(clock, "24h")).toBe(clock);
  });
  it("formats generated copy without double-formatting or changing invalid times", () => {
    expect(formatTimeText("Pickup 14:25, was 09:05; 2:25 PM. Ref 12314:25. Invalid 25:00."))
      .toBe("Pickup 2:25 PM, was 9:05 AM; 2:25 PM. Ref 12314:25. Invalid 25:00.");
    expect(formatClockTime("--:--")).toBe("--:--");
  });
  it("keeps raw time values and calculations independent of display", () => {
    const start = "2026-10-17T14:25";
    expect(formatClockTime(timePart(start))).toBe("2:25 PM");
    expect(timePart(start)).toBe("14:25");
    expect(minutesBetween(start, "2026-10-17T15:05")).toBe(40);
  });
  it("saves and restores the preference without changing the trip", () => {
    useTripStore.getState().loadSampleTrip();
    const trip = useTripStore.getState().trip;
    useTripStore.getState().updateSettings({ timeFormat: "24h" });
    const options = useTripStore.persist.getOptions();
    const saved = options.partialize!(useTripStore.getState());
    useTripStore.getState().updateSettings({ timeFormat: "12h" });
    const restored = options.merge!(saved, useTripStore.getState());
    expect(restored.settings.timeFormat).toBe("24h");
    expect(useTripStore.getState().trip).toBe(trip);
    const legacy = options.merge!({ settings: { voice: "sarah" } }, useTripStore.getState());
    expect(legacy.settings.timeFormat).toBe("12h");
    expect(legacy.settings.voice).toBe("sarah");
  });

  it("defaults older saved settings to 12-hour time and accepts 24-hour time", () => {
    const legacy = { notifyHotel: true, moveRides: true, notifications: true, voice: DEFAULT_SETTINGS.voice, demoControls: DEFAULT_SETTINGS.demoControls };
    expect(SettingsSchema.parse(legacy).timeFormat).toBe("12h");
    expect(SettingsSchema.parse({ ...legacy, timeFormat: "24h" }).timeFormat).toBe("24h");
  });
});
