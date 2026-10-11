import { checklistCopy, shareCopy, type ChecklistCopyKey } from "@/lib/content/checklistCopy";
import type { Contact, ContactKind, Disruption, DisruptionType, Flight, Task, Trip } from "@/lib/types";
import { computeImpact, type Impact } from "./impact";
import { flightLabel } from "./text";

// Most urgent first. Every key in checklistCopy appears here exactly once.
const URGENCY: ChecklistCopyKey[] = [
  "go_to_transfer_desk",
  "ask_rebooking_options",
  "confirm_new_times",
  "confirm_new_booking",
  "rebook_onward",
  "check_bags",
  "tell_hotel",
  "rearrange_pickup",
  "send_update",
  "ask_entitlements",
  "get_it_in_writing",
  "keep_receipts",
  "contact_insurer",
];

const BASE: Record<DisruptionType, ChecklistCopyKey[]> = {
  delay: ["confirm_new_times", "ask_entitlements"],
  cancellation: ["ask_rebooking_options", "get_it_in_writing", "ask_entitlements"],
  missed_connection: ["go_to_transfer_desk", "check_bags", "ask_entitlements"],
  rebooked: ["confirm_new_booking", "check_bags"],
};

type Vars = Partial<Record<"airline" | "flight" | "onwardAirline" | "onwardFlight" | "hotel" | "insurer", string>>;

const FALLBACK: Required<Vars> = {
  airline: "the airline",
  flight: "your flight",
  onwardAirline: "the airline",
  onwardFlight: "the onward flight",
  hotel: "your hotel",
  insurer: "",
};

// Same blanks as FALLBACK, but worded for someone reading about the traveler.
const RECIPIENT_FALLBACK: Required<Vars> = {
  ...FALLBACK,
  flight: "the flight",
  hotel: "the hotel",
};

function fill(text: string, vars: Vars, fallback: Required<Vars> = FALLBACK): string {
  const filled = text
    .replace(/\{(\w+)\}/g, (_, name: keyof Vars) => vars[name] ?? fallback[name] ?? "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/[:\s]+$/, "")
    .trim();
  return filled.charAt(0).toUpperCase() + filled.slice(1);
}

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** True when every word of the shorter name is a whole word of the longer one. */
function sameName(a: string, b: string): boolean {
  const [short, long] = [words(a), words(b)].sort((x, y) => x.length - y.length);
  return short.length > 0 && short.every((w) => long.includes(w));
}

function findContact(trip: Trip, kind: ContactKind, name?: string): Contact | undefined {
  const ofKind = trip.contacts.filter((c) => c.kind === kind);
  if (name === undefined) return ofKind[0];
  return ofKind.find((c) => sameName(c.name, name));
}

const label = (n: string | undefined) => (n ? flightLabel(n) : undefined);

// The airline that caused the change is the one to ask; the new one for a new booking.
function baseVarsFor(flight: Flight | undefined, onward: Flight | undefined, insurer: Contact | undefined): Vars {
  return {
    airline: flight?.original?.airline ?? flight?.airline,
    flight: label(flight?.original?.flightNumber ?? flight?.flightNumber),
    onwardAirline: onward?.airline,
    onwardFlight: label(onward?.flightNumber),
    insurer: insurer?.name,
  };
}

/** Generated task ids are `${disruptionId}:${copyKey}`, plus `:${stayId}` for hotel tasks. */
export const taskId = (disruptionId: string, key: ChecklistCopyKey, idSuffix = "") => `${disruptionId}:${key}${idSuffix}`;

/** The id of the "send an update" task, so the share screen can tick it off. */
export const sendUpdateTaskId = (disruptionId: string) => taskId(disruptionId, "send_update");

/**
 * Builds the task list for a disruption. Generated task ids are
 * `${disruption.id}:${copyKey}`, plus `:${stayId}` for hotel tasks.
 */
export function generateChecklist(trip: Trip, disruption: Disruption, impact: Impact): Task[] {
  const flight = trip.flights.find((f) => f.id === disruption.flightId);
  const onward = impact.connection
    ? trip.flights.find((f) => f.id === impact.connection?.flightId)
    : undefined;
  const insurer = findContact(trip, "insurance");
  const hasNewFlight = flight?.status === "rebooked";

  const keys = new Set<ChecklistCopyKey>(BASE[disruption.type]);
  // Cancelled or missed, but replacement times are already known: nothing left to request.
  if (hasNewFlight && disruption.type !== "rebooked") {
    keys.delete("ask_rebooking_options");
    keys.delete("go_to_transfer_desk");
    keys.add("confirm_new_booking");
  }
  // Jobs Layover already did by itself (see autoUpdates.ts) are not the traveler's to do.
  const actions = disruption.actions ?? [];
  const hotelHandled = new Set(actions.filter((a) => a.kind === "hotel").map((a) => a.targetId));
  const pickupHandled = actions.some((a) => a.kind === "ride");
  const staysToTell = impact.affectedStays.filter((a) => !hotelHandled.has(a.stayId));

  // Only a trip with a booked ride or someone picking the traveler up has a pickup to move.
  const hasPickup = (trip.rides ?? []).length > 0 || (trip.people ?? []).some((p) => p.role === "pickup");

  const connectionAtRisk = impact.connection !== null && impact.connection.status !== "ok";
  if (connectionAtRisk) keys.add("rebook_onward");
  if (staysToTell.length > 0) keys.add("tell_hotel");
  if ((impact.delayMinutes !== 0 || connectionAtRisk) && hasPickup && !pickupHandled) keys.add("rearrange_pickup");
  keys.add("keep_receipts");
  if (insurer) keys.add("contact_insurer");
  keys.add("send_update");

  const baseVars = baseVarsFor(flight, onward, insurer);
  const causingAirline = baseVars.airline;
  const causingContact = causingAirline ? findContact(trip, "airline", causingAirline) : undefined;

  // The ride company is saved as an "other" contact under the ride's provider name.
  const pickupContact = (trip.rides ?? [])
    .map((r) => findContact(trip, "other", r.provider))
    .find(Boolean);

  // Every task that means calling someone links them, so each gets the same Call button.
  const contactFor: Partial<Record<ChecklistCopyKey, Contact | undefined>> = {
    ask_rebooking_options: causingContact,
    go_to_transfer_desk: causingContact,
    confirm_new_times: flight ? findContact(trip, "airline", flight.airline) : undefined,
    rebook_onward: onward ? findContact(trip, "airline", onward.airline) : undefined,
    check_bags: causingContact,
    rearrange_pickup: pickupContact,
    ask_entitlements: causingContact,
    get_it_in_writing: causingContact,
    contact_insurer: insurer,
  };

  const make = (key: ChecklistCopyKey, vars: Vars, contact?: Contact, idSuffix = ""): Task => {
    const copy: { title: string; detail?: string } = checklistCopy[key];
    return {
      id: taskId(disruption.id, key, idSuffix),
      title: fill(copy.title, vars),
      ...(copy.detail ? { detail: fill(copy.detail, vars) } : {}),
      done: false,
      ...(contact ? { contactId: contact.id } : {}),
      source: "generated",
    };
  };

  const tasks: Task[] = [];
  for (const key of URGENCY) {
    if (!keys.has(key)) continue;
    if (key === "tell_hotel") {
      for (const { stayId } of staysToTell) {
        const stay = trip.stays.find((s) => s.id === stayId);
        if (!stay) continue;
        tasks.push(
          make(key, { ...baseVars, hotel: stay.name }, findContact(trip, "hotel", stay.name), `:${stayId}`),
        );
      }
    } else if (key === "confirm_new_booking") {
      const airline = flight?.airline;
      tasks.push(
        make(key, { ...baseVars, airline, flight: label(flight?.flightNumber) }, airline ? findContact(trip, "airline", airline) : undefined),
      );
    } else {
      tasks.push(make(key, baseVars, contactFor[key]));
    }
  }
  return tasks;
}

/**
 * The open tasks worded for the person waiting on the traveler, in checklist order. Used by
 * the shared message, the link and the summary text, so none of them repeat advice written
 * to the traveler ("keep receipts") or the share task itself.
 *
 * Generated tasks use their shareCopy line (null = left out). Tasks the traveler added
 * themselves are passed through as written. Hotel tasks need `includeStays`, otherwise the
 * hotel's name would leak past the "Hotel details" switch.
 */
export function recipientTasks(trip: Trip, disruption: Disruption, options: { includeStays: boolean }): string[] {
  const flight = trip.flights.find((f) => f.id === disruption.flightId);
  const impact = computeImpact(trip, disruption.flightId);
  const onward = impact.connection ? trip.flights.find((f) => f.id === impact.connection?.flightId) : undefined;
  const baseVars = baseVarsFor(flight, onward, findContact(trip, "insurance"));

  const lines: string[] = [];
  for (const task of disruption.tasks) {
    if (task.done) continue;
    if (task.source === "custom") {
      lines.push(task.title);
      continue;
    }
    if (!task.id.startsWith(`${disruption.id}:`)) continue;
    const [key, stayId] = task.id.slice(disruption.id.length + 1).split(":");
    if (!Object.hasOwn(shareCopy, key)) continue;
    const template = shareCopy[key as ChecklistCopyKey];
    if (!template) continue;

    let vars = baseVars;
    if (key === "tell_hotel") {
      const stay = options.includeStays ? trip.stays.find((s) => s.id === stayId) : undefined;
      if (!stay) continue;
      vars = { ...baseVars, hotel: stay.name };
    } else if (key === "confirm_new_booking") {
      vars = { ...baseVars, airline: flight?.airline, flight: label(flight?.flightNumber) };
    }
    lines.push(fill(template, vars, RECIPIENT_FALLBACK));
  }
  return [...new Set(lines)];
}
