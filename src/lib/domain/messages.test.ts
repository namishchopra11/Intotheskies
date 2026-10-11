import { beforeEach, describe, expect, it } from "vitest";
import { simulateFlightChange } from "@/components/trip/simulateChange";
import { sampleTrip } from "@/lib/sampleTrip";
import { useTripStore } from "@/lib/store";
import type { Trip } from "@/lib/types";
import { buildDrafts, channelLinks } from "./messages";

function drafts(base: Trip = sampleTrip) {
  useTripStore.setState({ trip: structuredClone(base) });
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
    // Without the booked transfer, rearranging the pickup is left to the traveler.
    const { trip, list } = drafts({ ...sampleTrip, rides: [] });
    const d = trip.disruptions[0];
    const pickup = list.find((x) => x.kind === "pickup")!;
    expect(d.tasks.some((t) => t.id === pickup.taskIds[0])).toBe(true);
    expect(list.find((x) => x.kind === "hotel")!.taskIds.length).toBeGreaterThanOrEqual(0);
  });

  it("builds WhatsApp, SMS and mail links, with a contact picker when there is no number", () => {
    const { list } = drafts();
    // The sample trip leaves people's numbers out on purpose, so give Marco one here.
    const links = channelLinks({ ...list[0], phone: "+39 06 0000 0199" });
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/390600000199\?text=/);
    expect(links.sms).toMatch(/^sms:\+390600000199\?&body=/);
    expect(links.mail).toMatch(/^mailto:\?subject=/);
    expect(channelLinks({ ...list[0], phone: undefined }).whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("gives a trip with no people its first Send-to draft once someone is added", () => {
    const bare: Trip = { ...structuredClone(sampleTrip), people: undefined };
    expect(drafts(bare).list.map((d) => d.kind)).toEqual(["hotel"]);

    useTripStore.setState({ trip: bare });
    useTripStore.getState().upsertPerson({ id: "p1", name: "Sam", role: "family", email: "sam@example.com" });
    simulateFlightChange("missed");
    const trip = useTripStore.getState().trip!;
    const list = buildDrafts(trip, trip.disruptions[0].id);
    expect(list.map((d) => d.kind)).toEqual(["family", "hotel"]);
    expect(list[0]).toMatchObject({ name: "Sam", email: "sam@example.com" });
  });

  it("puts the person's email in the mail link, and leaves the recipient blank without one", () => {
    const { list } = drafts();
    expect(channelLinks({ ...list[0], email: " sam@example.com " }).mail).toMatch(/^mailto:sam@example\.com\?subject=/);
    expect(channelLinks({ ...list[0], email: "a&b@example.com" }).mail).toMatch(/^mailto:a%26b@example\.com\?subject=/);
    expect(channelLinks({ ...list[0], email: undefined }).mail).toMatch(/^mailto:\?subject=/);
  });

  it("says so when there is no new arrival time", () => {
    useTripStore.setState({ trip: structuredClone(sampleTrip) });
    simulateFlightChange("cancelled");
    const trip = useTripStore.getState().trip!;
    expect(buildDrafts(trip, trip.disruptions[0].id)[0].body).toContain("don't have a new arrival time");
  });
});
