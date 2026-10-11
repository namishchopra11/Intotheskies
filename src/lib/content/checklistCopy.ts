// Wording for every task the app generates. Safe to edit: this file is plain text data.
//
// Shape: each entry is   key: { title: "...", detail: "..." }
//   - key     Stable id used by the code. Do NOT rename, add or remove keys here;
//             ask the Foundation owner if you need a new task.
//   - title   The short line shown in the checklist. Required.
//   - detail  Optional smaller line under the title. Delete the line to hide it.
//
// Placeholders you can use inside title or detail (they are filled in automatically):
//   {airline}        airline of the disrupted flight         e.g. British Airways
//   {flight}         its flight number                       e.g. BA 286
//   {onwardAirline}  airline of the connecting flight        e.g. ITA Airways
//   {onwardFlight}   its flight number                       e.g. AZ 201
//   {hotel}          name of the affected stay               e.g. Hotel Aventino Garden
//   {insurer}        name of the saved insurance contact
// A placeholder with nothing to fill it becomes a generic phrase ("the airline",
// "your hotel"), so sentences still read correctly.
//
// Tests pin some wording (src/lib/domain/domain.test.ts): the titles of confirm_new_times,
// rebook_onward, tell_hotel (must contain "Tell the hotel") and contact_insurer. If you change
// one of those, update the matching test in the same pull request.
//
// Wording rule: stay general. Say "ask the airline what you're entitled to".
// Never state legal rights, compensation amounts or deadlines; they vary by
// country and airline and we cannot get them right.

export type ChecklistCopyEntry = { title: string; detail?: string };

export const checklistCopy = {
  ask_rebooking_options: {
    title: "Ask {airline} to rebook you",
    detail: "App, desk or phone. Whichever is fastest.",
  },
  go_to_transfer_desk: {
    title: "Go to the {airline} desk",
    detail: "Ask for the next flight.",
  },
  confirm_new_times: {
    title: "Check the latest times for {flight}",
    detail: "They may change again.",
  },
  confirm_new_booking: {
    title: "Check your new booking for {flight}",
    detail: "Date, time, seat and bags.",
  },
  rebook_onward: {
    title: "Rebook the onward flight {onwardFlight}",
    detail: "Ask {onwardAirline} for the next one.",
  },
  check_bags: {
    title: "Ask where your bags are",
  },
  tell_hotel: {
    title: "Tell the hotel you'll be late: {hotel}",
    detail: "Ask them to hold the room.",
  },
  rearrange_pickup: {
    title: "Move your pickup",
    detail: "Send them your new landing time.",
  },
  send_update: {
    title: "Send an update",
    detail: "Use Share update.",
  },
  ask_entitlements: {
    title: "Ask {airline} what you're entitled to",
  },
  get_it_in_writing: {
    title: "Get the change in writing",
  },
  keep_receipts: {
    title: "Keep receipts for extra costs",
  },
  contact_insurer: {
    title: "Call your insurer: {insurer}",
  },
} satisfies Record<string, ChecklistCopyEntry>;

export type ChecklistCopyKey = keyof typeof checklistCopy;

// How a task reads to the person waiting on the traveler: the "Still sorting" line in the
// shared message, the "Still being sorted" list on /s, and the summary text. Same keys and
// placeholders as above; every key must appear here so a new task forces a decision.
//   - a string is the recipient-facing line. It has no "you", so it works whether the
//     reader sees it in the traveler's voice or a third-person page.
//   - null means the task is the traveler's own business (or is the share itself) and is
//     left out of anything the recipient sees.
// Same wording rule: stay general, no claims about rights or compensation.
export const shareCopy = {
  ask_rebooking_options: "Getting rebooked with {airline}",
  go_to_transfer_desk: "Getting rebooked with {airline}",
  confirm_new_times: "Confirming the latest times for {flight}",
  confirm_new_booking: "Confirming the new booking for {flight}",
  rebook_onward: "Rebooking the onward flight {onwardFlight}",
  check_bags: "Finding out where the checked bags are",
  tell_hotel: "Letting {hotel} know about a late arrival",
  rearrange_pickup: "Rearranging the pickup or transfer",
  send_update: null,
  ask_entitlements: null,
  get_it_in_writing: null,
  keep_receipts: null,
  contact_insurer: null,
} satisfies Record<ChecklistCopyKey, string | null>;
