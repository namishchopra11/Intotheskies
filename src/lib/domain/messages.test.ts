import { beforeEach, describe, expect, it } from "vitest";
import { simulateFlightChange } from "@/components/trip/simulateChange";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import { buildDrafts, channelLinks } from "./messages";

function drafts() {
  useTripStore.setState({ trip: structuredClone(sampleTrip) });
  simulateFlightChange("missed");
  const trip = useTripStore.getState().trip!;
  return { trip, list: buildDrafts(trip, trip.disruptions[0].id) };
}

describe("buildDrafts", () => {
  beforeEach(() => useTripStore.getState().resetTrip());

  it("writes a pickup, family and hotel draft with the new arrival time", () => {
    const { list } = drafts();
    expect(list.map((d) => d.kind)).toEqual(["pickup", "family", "hotel"]);
    for (const d of list) expect(d.body).toContain("18:00");
  });

  it("keeps the hotel confirmation to the hotel draft", () => {
    const { list } = drafts();
    expect(list.filter((d) => d.body.includes("HAG-48213")).map((d) => d.kind)).toEqual(["hotel"]);
  });

  it("never puts a booking reference in the family or pickup draft", () => {
    const { trip, list } = drafts();
    for (const d of list.filter((x) => x.kind !== "hotel")) {
      for (const f of trip.flights) expect(d.body).not.toContain(f.bookingRef);
      expect(d.body).not.toContain("HAG-48213");
    }
  });

  it("links each draft to the task it completes", () => {
    const { trip, list } = drafts();
    const d = trip.disruptions[0];
    const pickup = list.find((x) => x.kind === "pickup")!;
    expect(d.tasks.some((t) => t.id === pickup.taskIds[0])).toBe(true);
    expect(list.find((x) => x.kind === "hotel")!.taskIds.length).toBeGreaterThanOrEqual(0);
  });

  it("builds WhatsApp, SMS and mail links, with a contact picker when there is no number", () => {
    const { list } = drafts();
    const links = channelLinks(list[0]);
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/390655500199\?text=/);
    expect(links.sms).toMatch(/^sms:\+390655500199\?&body=/);
    expect(links.mail).toMatch(/^mailto:\?subject=/);
    expect(channelLinks({ ...list[0], phone: undefined }).whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("says so when there is no new arrival time", () => {
    useTripStore.setState({ trip: structuredClone(sampleTrip) });
    simulateFlightChange("cancelled");
    const trip = useTripStore.getState().trip!;
    expect(buildDrafts(trip, trip.disruptions[0].id)[0].body).toContain("don't have a new arrival time");
  });
});
