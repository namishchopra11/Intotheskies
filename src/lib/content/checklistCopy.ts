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
// Wording rule: stay general. Say "ask the airline what you're entitled to".
// Never state legal rights, compensation amounts or deadlines; they vary by
// country and airline and we cannot get them right.

export type ChecklistCopyEntry = { title: string; detail?: string };

export const checklistCopy = {
  ask_rebooking_options: {
    title: "Ask {airline} to rebook you",
    detail: "Use the app, the service desk and the phone line at the same time; take whichever answers first.",
  },
  go_to_transfer_desk: {
    title: "Go to the {airline} transfer or service desk",
    detail: "Tell them you missed {flight} and ask for the next available flight.",
  },
  confirm_new_times: {
    title: "Check the latest times for {flight}",
    detail: "Delays often change. Look at the airline app or the departure board again before you move.",
  },
  confirm_new_booking: {
    title: "Check your new booking for {flight}",
    detail: "Confirm the date, time, seat and that your bags are on the same flight.",
  },
  rebook_onward: {
    title: "Rebook the onward flight {onwardFlight}",
    detail: "Ask {onwardAirline} whether you will make the connection and what the next option is if you don't.",
  },
  check_bags: {
    title: "Ask where your checked bags are",
    detail: "Find out whether they will follow you automatically or need to be collected and rechecked.",
  },
  tell_hotel: {
    title: "Tell the hotel you'll arrive late: {hotel}",
    detail: "Ask them to hold the room and how to get in after the front desk closes.",
  },
  rearrange_pickup: {
    title: "Rearrange your pickup or transfer",
    detail: "Let your driver, transfer company or whoever is meeting you know the new arrival time.",
  },
  send_update: {
    title: "Send an update to someone you trust",
    detail: "Use the share button below to send them what changed.",
  },
  ask_entitlements: {
    title: "Ask {airline} what you're entitled to",
    detail: "This varies by country and airline, so ask staff directly rather than assuming.",
  },
  get_it_in_writing: {
    title: "Ask for the change in writing",
    detail: "An email or printed notice from {airline} saying what happened is useful later.",
  },
  keep_receipts: {
    title: "Keep receipts for anything extra you pay for",
    detail: "Food, transport and accommodation. Take a photo of each one.",
  },
  contact_insurer: {
    title: "Contact your travel insurer: {insurer}",
    detail: "Tell them what happened and ask what they need from you.",
  },
} satisfies Record<string, ChecklistCopyEntry>;

export type ChecklistCopyKey = keyof typeof checklistCopy;
