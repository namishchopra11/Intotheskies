import type { Trip } from "@/lib/types";
import { cityName } from "./airports";
import { taskId } from "./checklist";
import { computeImpact } from "./impact";
import { finalArrival } from "./timeline";
import { formatDate, formatDuration, timePart } from "./time";

/** A ready-to-send message for one person or business. Nothing is sent by the app. */
export type Draft = {
  id: string;
  kind: "pickup" | "hotel" | "family";
  name: string;
  phone?: string;
  subject: string;
  body: string;
  /** Checklist tasks that count as done once this draft is opened in a messaging app. */
  taskIds: string[];
};

/** Where the traveler lands now, as one sentence. Wall-clock times, so no maths across airports. */
function arrivalLine(trip: Trip, disruptionId: string): string {
  const a = finalArrival(trip, disruptionId);
  if (!a) return "";
  const city = cityName(a.flight.to);
  if (a.unknown) return `I don't have a new arrival time in ${city} yet.`;
  const c = computeImpact(trip, trip.disruptions.find((d) => d.id === disruptionId)!.flightId).connection;
  const when = `${timePart(a.arriveAt)} on ${formatDate(a.arriveAt)}`;
  if (a.delayMinutes) {
    const dir = a.delayMinutes > 0 ? "later" : "earlier";
    return `I now land in ${city} at ${when} (${formatDuration(Math.abs(a.delayMinutes))} ${dir} than planned).`;
  }
  return `I still expect to land in ${city} at ${when}${c?.status === "tight" ? ", but my connection is tight" : ""}.`;
}

export function buildDrafts(trip: Trip, disruptionId: string): Draft[] {
  const d = trip.disruptions.find((x) => x.id === disruptionId);
  if (!d) return [];
  const arrival = arrivalLine(trip, disruptionId);
  const me = trip.travelerName;
  const drafts: Draft[] = [];

  for (const p of trip.people ?? []) {
    if (p.role === "other") continue;
    const pickup = p.role === "pickup";
    drafts.push({
      id: p.id,
      kind: pickup ? "pickup" : "family",
      name: p.name,
      phone: p.phone,
      subject: "Change of plans",
      body: pickup
        ? `Hi ${p.name}, my flights have changed. ${arrival} Can you adjust the pickup? I'll message again when I'm on the ground.`
        : `Hi ${p.name}, my flights have changed. ${arrival} I'm sorting it out and will keep you posted.`,
      taskIds: [taskId(d.id, pickup ? "rearrange_pickup" : "send_update")],
    });
  }

  const hotelTasks = d.tasks.filter((t) => t.id.startsWith(`${d.id}:tell_hotel`)).map((t) => t.id);
  for (const stay of trip.stays) {
    const phone = stay.phone ?? trip.contacts.find((c) => c.kind === "hotel" && c.name === stay.name)?.phone;
    drafts.push({
      id: stay.id,
      kind: "hotel",
      name: stay.name,
      phone,
      subject: `Late arrival, booking ${stay.confirmation}`,
      body: `Hello, this is ${me}, booking ${stay.confirmation}. My flights have changed. ${arrival}${stay.latestCheckIn ? ` I know the front desk closes at ${stay.latestCheckIn}.` : ""} Please keep my room, and tell me how to get in if I'm late.`,
      taskIds: hotelTasks.filter((id) => id.endsWith(`:${stay.id}`)),
    });
  }
  return drafts;
}

const digits = (phone?: string) => phone?.replace(/\D/g, "") ?? "";

/** Links that open the person's own messaging app with the text filled in. */
export function channelLinks(draft: Draft) {
  const text = encodeURIComponent(draft.body);
  const num = digits(draft.phone);
  return {
    whatsapp: `https://wa.me/${num}?text=${text}`, // no number: WhatsApp's own contact picker opens
    sms: `sms:${num ? `+${num}` : ""}?&body=${text}`, // "?&body=" works on both iOS and Android
    mail: `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${text}`,
  };
}
