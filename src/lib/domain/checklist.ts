import { checklistCopy, type ChecklistCopyKey } from "@/lib/content/checklistCopy";
import type { Disruption, Task, Trip } from "@/lib/types";
import type { Impact } from "./impact";

// STUB: returns a fixed plausible list. Real logic lands in Part B.
// Generated task ids are `${disruption.id}:${copyKey}` (plus `:${stayId}` for hotel tasks).
export function generateChecklist(trip: Trip, disruption: Disruption, impact: Impact): Task[] {
  const keys: ChecklistCopyKey[] = ["confirm_new_times", "keep_receipts", "send_update"];
  if (impact.connection && impact.connection.status !== "ok") keys.splice(1, 0, "rebook_onward");
  if (impact.affectedStays.length > 0) keys.splice(keys.length - 2, 0, "tell_hotel");
  return keys.map((key) => ({
    id: `${disruption.id}:${key}`,
    title: checklistCopy[key].title.replace(/\{\w+\}/g, "").replace(/[:\s]+$/, "").trim(),
    detail: undefined,
    done: false,
    contactId: trip.contacts[0]?.id,
    source: "generated" as const,
  }));
}
