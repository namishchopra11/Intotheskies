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
    detail: "Try the app, the service desk and the phone line at once. Use whichever answers first.",
  },
  go_to_transfer_desk: {
    title: "Go to the service desk for {airline}",
    detail: "Say you missed {flight} and ask for the next available flight.",
  },
  confirm_new_times: {
    title: "Check the latest times for {flight}",
    detail: "Times can change again. Check the airline app or departure board before you move.",
  },
  confirm_new_booking: {
    title: "Check your new booking for {flight}",
    detail: "Check the date, time and seat. Ask whether your bags are on the same flight.",
  },
  rebook_onward: {
    title: "Rebook the onward flight {onwardFlight}",
    detail: "Ask {onwardAirline} if you can still make it, and what the next flight is if you can't.",
  },
  check_bags: {
    title: "Ask where your checked bags are",
    detail: "Find out if they follow you automatically or if you need to collect and recheck them.",
  },
  tell_hotel: {
    title: "Tell the hotel you may arrive late: {hotel}",
    detail: "Ask them to hold your room, and how to get in if you arrive after the front desk closes.",
  },
  rearrange_pickup: {
    title: "Rearrange your pickup or transfer",
    detail: "Send your driver, transfer company or host the new arrival time.",
  },
  send_update: {
    title: "Send an update to someone waiting for you",
    detail: "Use the share button to tell them what changed and what you're doing about it.",
  },
  ask_entitlements: {
    title: "Ask {airline} what you're entitled to",
    detail: "This differs by country and airline, so ask staff directly rather than assuming.",
  },
  get_it_in_writing: {
    title: "Ask for the change in writing",
    detail: "Get an email, text or printed notice from {airline} saying what happened.",
  },
  keep_receipts: {
    title: "Keep receipts for extra costs",
    detail: "Meals, transport, a hotel night. Take a photo of each one.",
  },
  contact_insurer: {
    title: "Contact your travel insurer: {insurer}",
    detail: "Tell them what happened and ask what they need from you.",
  },
} satisfies Record<string, ChecklistCopyEntry>;

export type ChecklistCopyKey = keyof typeof checklistCopy;
