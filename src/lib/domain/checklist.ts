import { checklistCopy, type ChecklistCopyKey } from "@/lib/content/checklistCopy";
import type { Contact, ContactKind, Disruption, DisruptionType, Task, Trip } from "@/lib/types";
import type { Impact } from "./impact";

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
  onwardFlight: "",
  hotel: "your hotel",
  insurer: "",
};

function fill(text: string, vars: Vars): string {
  const filled = text
    .replace(/\{(\w+)\}/g, (_, name: keyof Vars) => vars[name] ?? FALLBACK[name] ?? "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/[:\s]+$/, "")
    .trim();
  return filled.charAt(0).toUpperCase() + filled.slice(1);
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findContact(trip: Trip, kind: ContactKind, name?: string): Contact | undefined {
  const ofKind = trip.contacts.filter((c) => c.kind === kind);
  if (name === undefined) return ofKind[0];
  const wanted = normalize(name);
  if (!wanted) return undefined;
  return ofKind.find((c) => {
    const have = normalize(c.name);
    return have !== "" && (have === wanted || have.includes(wanted) || wanted.includes(have));
  });
}

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
  const connectionAtRisk = impact.connection !== null && impact.connection.status !== "ok";
  if (connectionAtRisk) keys.add("rebook_onward");
  if (impact.affectedStays.length > 0) keys.add("tell_hotel");
  if (impact.delayMinutes !== 0 || connectionAtRisk) keys.add("rearrange_pickup");
  keys.add("keep_receipts");
  if (insurer) keys.add("contact_insurer");
  keys.add("send_update");

  // The airline that caused the change is the one to ask; the new one for a new booking.
  const causingAirline = flight?.original?.airline ?? flight?.airline;
  const causingFlight = flight?.original?.flightNumber ?? flight?.flightNumber;
  const baseVars: Vars = {
    airline: causingAirline,
    flight: causingFlight,
    onwardAirline: onward?.airline,
    onwardFlight: onward?.flightNumber,
    insurer: insurer?.name,
  };
  const causingContact = causingAirline ? findContact(trip, "airline", causingAirline) : undefined;

  const contactFor: Partial<Record<ChecklistCopyKey, Contact | undefined>> = {
    ask_rebooking_options: causingContact,
    go_to_transfer_desk: causingContact,
    ask_entitlements: causingContact,
    rebook_onward: onward ? findContact(trip, "airline", onward.airline) : undefined,
    contact_insurer: insurer,
  };

  const make = (key: ChecklistCopyKey, vars: Vars, contact?: Contact, idSuffix = ""): Task => {
    const copy: { title: string; detail?: string } = checklistCopy[key];
    return {
      id: `${disruption.id}:${key}${idSuffix}`,
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
      for (const { stayId } of impact.affectedStays) {
        const stay = trip.stays.find((s) => s.id === stayId);
        if (!stay) continue;
        tasks.push(
          make(key, { ...baseVars, hotel: stay.name }, findContact(trip, "hotel", stay.name), `:${stayId}`),
        );
      }
    } else if (key === "confirm_new_booking") {
      tasks.push(make(key, { ...baseVars, airline: flight?.airline, flight: flight?.flightNumber }));
    } else {
      tasks.push(make(key, baseVars, contactFor[key]));
    }
  }
  return tasks;
}
