import { buildMessage, messageText } from "@/app/share/[id]/message";
import { describe, expect, it } from "vitest";
import { sampleTrip } from "@/lib/sampleTrip";
import { TripSchema, type Disruption, type DisruptionType, type Flight, type Trip } from "@/lib/types";
import { buildBriefing } from "./briefing";
import { generateChecklist, recipientTasks, sendUpdateTaskId } from "./checklist";
import { computeImpact } from "./impact";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { decodeShare, encodeShare } from "./shareLink";
import { buildSummary, DEFAULT_SUMMARY_OPTIONS } from "./summary";
import { addMinutes, minutesBetween } from "./time";

const FIRST = "flight-sfo-lhr";
const ONWARD = "flight-lhr-fco";
const STAY = "stay-rome";

// A fixed trip so tests don't move when the Content owner edits sampleTrip.ts.
const baseTrip: Trip = TripSchema.parse({
  id: "t1",
  name: "Rome via London",
  travelerName: "Alex Morgan",
  flights: [
    {
      id: FIRST, airline: "British Airways", flightNumber: "BA 286", from: "SFO", to: "LHR",
      departAt: "2026-10-16T16:40", arriveAt: "2026-10-17T10:35", bookingRef: "K7QM2X", status: "scheduled",
    },
    {
      id: ONWARD, airline: "ITA Airways", flightNumber: "AZ 201", from: "LHR", to: "FCO",
      departAt: "2026-10-17T11:30", arriveAt: "2026-10-17T15:05", bookingRef: "K7QM2X", status: "scheduled",
    },
  ],
  stays: [
    {
      id: STAY, name: "Hotel Aventino Garden", address: "Via di Santa Prisca 14, Roma",
      checkIn: "2026-10-17T15:00", checkOut: "2026-10-21T11:00", confirmation: "HAG-48213", latestCheckIn: "22:00",
    },
  ],
  contacts: [
    { id: "c-ba", kind: "airline", name: "British Airways", phone: "+44 20 7946 0123" },
    { id: "c-ita", kind: "airline", name: "ITA Airways", phone: "+39 06 5550 0177" },
    { id: "c-hotel", kind: "hotel", name: "Hotel Aventino Garden", phone: "+39 06 5550 0142" },
  ],
  disruptions: [],
});

/** Mirrors what the store's reportDisruption does, without the store. */
function report(
  trip: Trip,
  flightId: string,
  type: DisruptionType,
  revised: Partial<Pick<Flight, "airline" | "flightNumber" | "departAt" | "arriveAt">> = {},
  status?: Flight["status"],
): { trip: Trip; disruption: Disruption } {
  const hasTimes = Boolean(revised.departAt || revised.arriveAt);
  const flights = trip.flights.map((f) =>
    f.id !== flightId
      ? f
      : {
          ...f,
          ...revised,
          status:
            status ??
            (type === "delay" ? ("delayed" as const) : type === "rebooked" || hasTimes ? ("rebooked" as const) : ("cancelled" as const)),
          original: f.original ?? {
            airline: f.airline, flightNumber: f.flightNumber, departAt: f.departAt, arriveAt: f.arriveAt,
          },
        },
  );
  const updated = { ...trip, flights };
  const disruption: Disruption = { id: "d1", type, flightId, createdAt: "2026-10-17T09:00:00.000Z", tasks: [] };
  disruption.tasks = generateChecklist(updated, disruption, computeImpact(updated, flightId));
  return { trip: { ...updated, disruptions: [disruption] }, disruption };
}

const delayFirst = (minutes: number) =>
  report(baseTrip, FIRST, "delay", {
    departAt: addMinutes("2026-10-16T16:40", minutes),
    arriveAt: addMinutes("2026-10-17T10:35", minutes),
  });

const titles = (d: Disruption) => d.tasks.map((t) => t.title);

describe("time helpers", () => {
  it("does wall-clock maths across midnight and month ends", () => {
    expect(minutesBetween("2026-10-17T10:35", "2026-10-17T11:30")).toBe(55);
    expect(minutesBetween("2026-10-17T11:30", "2026-10-17T10:35")).toBe(-55);
    expect(addMinutes("2026-10-31T23:30", 45)).toBe("2026-11-01T00:15");
  });
});

describe("the sample trip (acceptance test)", () => {
  it("a 45-minute delay drops the connection from 55 to 10 minutes and adds the two key tasks", () => {
    const first = sampleTrip.flights[0];
    const { trip, disruption } = report(sampleTrip, first.id, "delay", {
      departAt: addMinutes(first.departAt, 45),
      arriveAt: addMinutes(first.arriveAt, 45),
    });
    const impact = computeImpact(trip, first.id);
    expect(impact.delayMinutes).toBe(45);
    expect(impact.connection).toMatchObject({
      flightId: sampleTrip.flights[1].id, minutesBefore: 55, minutesAfter: 10, status: "tight",
    });
    expect(impact.affectedStays).toHaveLength(1);
    expect(titles(disruption).some((t) => /rebook the onward flight/i.test(t))).toBe(true);
    expect(titles(disruption).some((t) => /tell the hotel/i.test(t))).toBe(true);
  });
});

describe("computeImpact", () => {
  it("reports no impact before anything is disrupted", () => {
    expect(computeImpact(baseTrip, FIRST)).toEqual({
      flightId: FIRST,
      delayMinutes: 0,
      connection: { flightId: ONWARD, minutesBefore: 55, minutesAfter: 55, status: "tight" },
      affectedStays: [{ stayId: STAY, reason: expect.any(String) }],
    });
  });

  it("a delay that breaks a connection: missed, and the stay is at risk", () => {
    const { trip } = delayFirst(90);
    const impact = computeImpact(trip, FIRST);
    expect(impact.delayMinutes).toBe(90);
    expect(impact.connection).toEqual({ flightId: ONWARD, minutesBefore: 55, minutesAfter: -35, status: "missed" });
    expect(impact.affectedStays.map((s) => s.stayId)).toEqual([STAY]);
    expect(impact.affectedStays[0].reason).toContain("AZ 201");
  });

  it("a delay that doesn't break a connection: ok, and nothing downstream is affected", () => {
    const roomy = {
      ...baseTrip,
      flights: baseTrip.flights.map((f) =>
        f.id === ONWARD ? { ...f, departAt: "2026-10-17T14:00", arriveAt: "2026-10-17T17:35" } : f,
      ),
    };
    const { trip, disruption } = report(roomy, FIRST, "delay", { arriveAt: "2026-10-17T11:20" });
    const impact = computeImpact(trip, FIRST);
    expect(impact.connection).toEqual({ flightId: ONWARD, minutesBefore: 205, minutesAfter: 160, status: "ok" });
    expect(impact.affectedStays).toEqual([]);
    expect(titles(disruption).some((t) => /onward/i.test(t))).toBe(false);
    expect(titles(disruption).some((t) => /hotel/i.test(t))).toBe(false);
  });

  it("treats exactly 60 minutes as ok and 59 as tight", () => {
    const at = (departAt: string) =>
      computeImpact(
        { ...baseTrip, flights: baseTrip.flights.map((f) => (f.id === ONWARD ? { ...f, departAt } : f)) },
        FIRST,
      ).connection?.status;
    expect(at("2026-10-17T11:35")).toBe("ok");
    expect(at("2026-10-17T11:34")).toBe("tight");
  });

  it("a cancellation with no revised times puts the connection and the stay at risk", () => {
    const { trip } = report(baseTrip, FIRST, "cancellation");
    const impact = computeImpact(trip, FIRST);
    expect(impact.delayMinutes).toBeNull();
    expect(impact.connection).toEqual({ flightId: ONWARD, minutesBefore: 55, minutesAfter: null, status: "missed" });
    expect(impact.affectedStays.map((s) => s.stayId)).toEqual([STAY]);
  });

  it("a cancellation with a replacement flight is judged on the new times", () => {
    const { trip } = report(baseTrip, FIRST, "cancellation", {
      flightNumber: "BA 284", departAt: "2026-10-16T14:00", arriveAt: "2026-10-17T08:10",
    });
    const impact = computeImpact(trip, FIRST);
    expect(impact.delayMinutes).toBe(-145);
    expect(impact.connection).toMatchObject({ minutesAfter: 200, status: "ok" });
    expect(impact.affectedStays).toEqual([]);
  });

  it("arrival past the hotel's latest check-in time affects the stay", () => {
    const { trip } = report(baseTrip, ONWARD, "delay", { arriveAt: "2026-10-17T22:40" });
    const impact = computeImpact(trip, ONWARD);
    expect(impact.connection).toBeNull();
    expect(impact.delayMinutes).toBe(455);
    expect(impact.affectedStays).toHaveLength(1);
    expect(impact.affectedStays[0].reason).toContain("22:00");
  });

  it("arrival before the latest check-in time does not affect the stay", () => {
    const { trip } = report(baseTrip, ONWARD, "delay", { arriveAt: "2026-10-17T21:59" });
    expect(computeImpact(trip, ONWARD).affectedStays).toEqual([]);
  });

  it("arrival on a later date than check-in affects the stay", () => {
    const { trip } = report(baseTrip, ONWARD, "rebooked", {
      flightNumber: "AZ 205", departAt: "2026-10-18T07:00", arriveAt: "2026-10-18T10:35",
    });
    const impact = computeImpact(trip, ONWARD);
    expect(impact.affectedStays).toHaveLength(1);
    expect(impact.affectedStays[0].reason).toContain("Sun 18 Oct");
  });

  it("does not treat a return flight days later as a connection", () => {
    const withReturn: Trip = {
      ...baseTrip,
      flights: [
        ...baseTrip.flights,
        { ...baseTrip.flights[0], id: "ret", from: "FCO", to: "SFO", departAt: "2026-10-21T13:00", arriveAt: "2026-10-21T17:00" },
      ],
    };
    expect(computeImpact(withReturn, ONWARD).connection).toBeNull();
  });

  it("returns an empty impact for an unknown flight", () => {
    expect(computeImpact(baseTrip, "nope")).toEqual({
      flightId: "nope", delayMinutes: 0, connection: null, affectedStays: [],
    });
  });
});

describe("generateChecklist", () => {
  it("orders by urgency and links matching contacts", () => {
    const { disruption } = delayFirst(45);
    const keys = disruption.tasks.map((t) => t.id.split(":")[1]);
    expect(keys).toEqual([
      "confirm_new_times", "rebook_onward", "tell_hotel", "rearrange_pickup",
      "send_update", "ask_entitlements", "keep_receipts",
    ]);
    const byKey = (k: string) => disruption.tasks.find((t) => t.id.split(":")[1] === k)!;
    expect(byKey("rebook_onward").contactId).toBe("c-ita");
    expect(byKey("tell_hotel").contactId).toBe("c-hotel");
    expect(byKey("ask_entitlements").contactId).toBe("c-ba");
    expect(byKey("rebook_onward").title).toContain("AZ 201");
    expect(disruption.tasks.every((t) => !t.done && t.source === "generated")).toBe(true);
    expect(new Set(disruption.tasks.map((t) => t.id)).size).toBe(disruption.tasks.length);
  });

  it("uses a different base list per disruption type", () => {
    const keysFor = (type: DisruptionType) =>
      report(baseTrip, FIRST, type).disruption.tasks.map((t) => t.id.split(":")[1]);
    expect(keysFor("cancellation")).toEqual(expect.arrayContaining(["ask_rebooking_options", "get_it_in_writing"]));
    expect(keysFor("missed_connection")[0]).toBe("go_to_transfer_desk");
    expect(keysFor("cancellation")[0]).toBe("ask_rebooking_options");
    expect(keysFor("rebooked")).toEqual(expect.arrayContaining(["confirm_new_booking", "check_bags"]));
  });

  it("adds the insurer task only when an insurance contact is saved", () => {
    expect(titles(delayFirst(45).disruption).some((t) => /insurer/i.test(t))).toBe(false);
    const insured: Trip = {
      ...baseTrip,
      contacts: [...baseTrip.contacts, { id: "c-ins", kind: "insurance", name: "Northwind Cover" }],
    };
    const { disruption } = report(insured, FIRST, "delay", { arriveAt: "2026-10-17T11:20" });
    const task = disruption.tasks.find((t) => /insurer/i.test(t.title))!;
    expect(task.contactId).toBe("c-ins");
    expect(task.title).toContain("Northwind Cover");
  });

  it("leaves no unfilled placeholders and makes no claims about rights or compensation", () => {
    const types: DisruptionType[] = ["delay", "cancellation", "missed_connection", "rebooked"];
    for (const type of types) {
      for (const t of report({ ...baseTrip, contacts: [] }, FIRST, type).disruption.tasks) {
        const text = `${t.title} ${t.detail ?? ""}`;
        expect(text).not.toMatch(/[{}]/);
        expect(text).not.toMatch(/compensat|legal|by law|regulation|refund|\d+\s?(€|\$|£|eur|usd)/i);
        expect(t.contactId).toBeUndefined();
      }
    }
  });
});

describe("recipientTasks", () => {
  const opts = { includeStays: true };

  it("rewords generated tasks for the reader, in checklist order", () => {
    const { trip, disruption } = delayFirst(45);
    expect(recipientTasks(trip, disruption, opts)).toEqual([
      "Confirming the latest times for BA 286",
      "Rebooking the onward flight AZ 201",
      "Letting Hotel Aventino Garden know about a late arrival",
      "Rearranging the pickup or transfer",
    ]);
  });

  it("leaves out the share task and the traveler's own chores, for every disruption type", () => {
    const insured: Trip = {
      ...baseTrip,
      contacts: [...baseTrip.contacts, { id: "c-ins", kind: "insurance", name: "Northwind Cover" }],
    };
    const types: DisruptionType[] = ["delay", "cancellation", "missed_connection", "rebooked"];
    for (const type of types) {
      const { trip, disruption } = report(insured, FIRST, type);
      const text = recipientTasks(trip, disruption, opts).join("\n");
      expect(text).not.toMatch(/update|receipt|entitled|in writing|insur|Northwind/i);
      expect(text).not.toMatch(/\byou(r)?\b|[{}]/i);
    }
  });

  it("skips done tasks, keeps custom ones as written, and hides the hotel with includeStays off", () => {
    const { trip, disruption } = delayFirst(45);
    const tasks = [
      ...disruption.tasks.map((t) => (t.id.endsWith(":confirm_new_times") ? { ...t, done: true } : t)),
      { id: "c1", title: "Buy a phone charger", done: false, source: "custom" as const },
      { id: "c2", title: "Pack the spare adapter", done: true, source: "custom" as const },
    ];
    const edited = { ...disruption, tasks };
    const on = recipientTasks(trip, edited, opts);
    expect(on).not.toContain("Confirming the latest times for BA 286");
    expect(on).toContain("Buy a phone charger");
    expect(on).not.toContain("Pack the spare adapter");
    expect(on.join(" ")).toContain("Hotel Aventino Garden");

    const off = recipientTasks(trip, edited, { includeStays: false });
    expect(off.join(" ")).not.toContain("Aventino");
    expect(off).toContain("Rebooking the onward flight AZ 201");
  });

  it("ignores generated tasks it does not recognise", () => {
    const { trip, disruption } = delayFirst(45);
    const odd = { ...disruption, tasks: [{ id: "d1:something_new", title: "Do a thing", done: false, source: "generated" as const }] };
    expect(recipientTasks(trip, odd, opts)).toEqual([]);
  });
});

describe("buildSummary", () => {
  it("says what changed, the revised itinerary and what is unresolved", () => {
    const { trip } = delayFirst(45);
    const text = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("BA 286 (San Francisco to London) is delayed by 45 min");
    expect(text).toContain("11:20 instead of 10:35");
    expect(text).toContain("10 min to connect to AZ 201 to Rome (it was 55 min)");
    expect(text).toContain("Revised itinerary:");
    expect(text).toContain("Hotel Aventino Garden");
    expect(text).toContain("Still to sort out:");
    expect(text).toMatch(/- Rebooking the onward flight AZ 201/);
  });

  it("words open tasks for the reader and leaves out the traveler's own chores", () => {
    const { trip } = delayFirst(45);
    const text = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    const still = text.slice(text.indexOf("Still to sort out:"));
    expect(still).toContain("- Confirming the latest times for BA 286");
    expect(still).toContain("- Letting Hotel Aventino Garden know about a late arrival");
    expect(still).not.toMatch(/send an update|receipts|entitled|in writing|\byou(r)?\b/i);
  });

  it("leaves the traveler's own admin tasks out of the message to others", () => {
    const { trip } = delayFirst(45);
    const text = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(text).toMatch(/- Rebooking the onward flight AZ 201/);
    expect(text).not.toMatch(/Send an update to someone|what you're entitled to|Keep receipts/);
    const snapshot = decodeShare(encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS));
    expect(snapshot!.openTasks.join(" ")).not.toMatch(/Send an update to someone|entitled to|receipts/);
    expect(messageText(buildMessage(trip, "d1", DEFAULT_SUMMARY_OPTIONS))).not.toMatch(/send an update|entitled to|receipts/);
    expect(trip.disruptions[0].tasks.some((t) => /receipts/.test(t.title))).toBe(true);
  });

  it("shows booking references only when the option is on", () => {
    const { trip } = delayFirst(45);
    const off = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(off).not.toContain("K7QM2X");
    expect(off).not.toContain("HAG-48213");
    const on = buildSummary(trip, "d1", { ...DEFAULT_SUMMARY_OPTIONS, includeBookingRefs: true });
    expect(on).toContain("K7QM2X");
    expect(on).toContain("HAG-48213");
  });

  it("respects includeStays and includeOpenTasks, and lists only unfinished tasks", () => {
    const { trip } = delayFirst(45);
    const bare = buildSummary(trip, "d1", { includeBookingRefs: false, includeStays: false, includeOpenTasks: false });
    expect(bare).not.toContain("Aventino");
    expect(bare).not.toContain("Still to sort out");

    const allDone: Trip = {
      ...trip,
      disruptions: trip.disruptions.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t, done: true })) })),
    };
    const done = buildSummary(allDone, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(done).toContain("Nothing outstanding.");
    expect(done).not.toContain("- Rebook");
  });

  it("describes a cancellation with no new flight", () => {
    const { trip } = report(baseTrip, FIRST, "cancellation");
    const text = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(text).toContain("BA 286 (San Francisco to London) was cancelled. I don't have a new flight yet.");
    expect(text).toContain("cancelled, no new flight yet");
    expect(text).toContain("at risk");
  });

  it("returns an empty string for an unknown disruption", () => {
    expect(buildSummary(baseTrip, "nope", DEFAULT_SUMMARY_OPTIONS)).toBe("");
  });
});

describe("buildBriefing", () => {
  it("speaks the change, the risk and the first unfinished task without airport codes", () => {
    const { trip } = delayFirst(45);
    const text = buildBriefing(trip, "d1");
    expect(text).toBe(
      "Your flight to London is now 45 minutes late, arriving at 11:20 AM. " +
        "That leaves only 10 minutes for your connection to Rome, and you may reach Hotel Aventino Garden late. " +
        "First, check the latest times for BA 286.",
    );
    expect(text).not.toMatch(/LHR|SFO|FCO|\bmin\b/);
  });

  it("moves on to the next task once the first is done, and handles a cancellation", () => {
    const { trip } = report(baseTrip, FIRST, "cancellation");
    const ticked: Trip = {
      ...trip,
      disruptions: trip.disruptions.map((d) => ({
        ...d,
        tasks: d.tasks.map((t, i) => (i === 0 ? { ...t, done: true } : t)),
      })),
    };
    const text = buildBriefing(ticked, "d1");
    expect(text).toContain("Your flight to London has been cancelled, and there is no new flight yet.");
    expect(text).toContain("Your connection to Rome is at risk");
    expect(text).toContain("First, rebook the onward flight AZ 201.");
    expect(buildBriefing(baseTrip, "nope")).toBe("");
  });
});

describe("share link", () => {
  it("round-trips through a URL-safe fragment", () => {
    const { trip } = delayFirst(45);
    const fragment = encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(fragment).toMatch(/^[A-Za-z0-9_~-]+$/);
    expect(encodeURIComponent(fragment)).toBe(fragment);

    const snapshot = decodeShare(fragment);
    expect(snapshot).not.toBeNull();
    expect(snapshot).toMatchObject({
      v: 1,
      tripName: "Rome via London",
      travelerName: "Alex Morgan",
      disruption: { type: "delay", flightId: FIRST },
      impact: { delayMinutes: 45, connection: { minutesBefore: 55, minutesAfter: 10, status: "tight" } },
    });
    expect(snapshot!.flights).toHaveLength(2);
    expect(snapshot!.flights[0].original?.arriveAt).toBe("2026-10-17T10:35");
    expect(snapshot!.stays[0].name).toBe("Hotel Aventino Garden");
    expect(snapshot!.openTasks).toContain("Rebooking the onward flight AZ 201");
    expect(snapshot!.openTasks).not.toContain("Rebook the onward flight AZ 201");
    expect(decodeShare(`#${fragment}`)).toEqual(snapshot);
  });

  it("no longer carries the summary text, and still reads links that do", () => {
    const { trip } = delayFirst(45);
    const fragment = encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(decodeShare(fragment)!.summary).toBeUndefined();

    const json = JSON.parse(
      decompressFromEncodedURIComponent(fragment.replace(/_/g, "+").replace(/~/g, "$"))!,
    );
    expect(json).not.toHaveProperty("summary");
    json.summary = buildSummary(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    const old = compressToEncodedURIComponent(JSON.stringify(json)).replace(/\+/g, "_").replace(/\$/g, "~");
    expect(old.length).toBeGreaterThan(fragment.length);
    expect(decodeShare(old)).toMatchObject({ tripName: "Rome via London", summary: json.summary });
  });

  it("never lists the send-an-update task, including on links made before it was dropped", () => {
    const { trip } = delayFirst(45);
    expect(trip.disruptions[0].tasks.some((t) => t.id === sendUpdateTaskId("d1"))).toBe(true);
    const snapshot = decodeShare(encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS))!;
    expect(snapshot.openTasks.join(" ")).not.toMatch(/send an update/i);

    const json = JSON.parse(
      decompressFromEncodedURIComponent(encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS).replace(/_/g, "+").replace(/~/g, "$"))!,
    );
    json.openTasks = ["Send an update to someone waiting for you", "Keep receipts for extra costs"];
    const old = compressToEncodedURIComponent(JSON.stringify(json)).replace(/\+/g, "_").replace(/\$/g, "~");
    expect(decodeShare(old)!.openTasks).toEqual(["Keep receipts for extra costs"]);
  });

  it("drops booking references, contacts and phone numbers unless asked", () => {
    const { trip } = delayFirst(45);
    const json = JSON.stringify(decodeShare(encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS)));
    expect(json).not.toContain("K7QM2X");
    expect(json).not.toContain("HAG-48213");
    expect(json).not.toContain("7946");

    const withRefs = decodeShare(encodeShare(trip, "d1", { ...DEFAULT_SUMMARY_OPTIONS, includeBookingRefs: true }))!;
    expect(withRefs.flights[0].bookingRef).toBe("K7QM2X");
    expect(withRefs.stays[0].confirmation).toBe("HAG-48213");

    const noStays = decodeShare(
      encodeShare(trip, "d1", { includeBookingRefs: false, includeStays: false, includeOpenTasks: false }),
    )!;
    expect(noStays.stays).toEqual([]);
    expect(noStays.impact.affectedStays).toEqual([]);
    expect(noStays.openTasks).toEqual([]);
    expect(JSON.stringify(noStays)).not.toContain("Aventino");
  });

  it("returns null for malformed links", async () => {
    const { compressToEncodedURIComponent } = await import("lz-string");
    const { trip } = delayFirst(45);
    const good = encodeShare(trip, "d1", DEFAULT_SUMMARY_OPTIONS);
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("#")).toBeNull();
    expect(decodeShare("not a real link!!")).toBeNull();
    expect(decodeShare(good.slice(0, Math.floor(good.length / 2)))).toBeNull();
    expect(decodeShare(compressToEncodedURIComponent("{not json"))).toBeNull();
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify({ v: 1 })))).toBeNull();
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify({ v: 2, hello: "world" })))).toBeNull();
    expect(decodeShare(compressToEncodedURIComponent(JSON.stringify(null)))).toBeNull();
    expect(encodeShare(trip, "nope", DEFAULT_SUMMARY_OPTIONS)).toBe("");
  });
});
