# Layover

Read this first. It is the shared contract for all four sessions working in this repo.

## Product

When a flight is delayed or cancelled, travelers juggle an airline app, confirmation
emails, and a hotel booking. Layover keeps reservations, next steps, and contacts
in one place. When a flight changes it shows what is now at risk downstream, generates a
checklist of what to do, and writes an update for the people waiting on them. The change
itself comes from a simulated airline feed (there is no live flight data; see
"The simulated airline feed" under Routes). The link between those three is the whole demo:
trip data drives the checklist, and both drive the summary.

## Stack

Next.js (App Router, v16), TypeScript, Tailwind v4, pnpm, Zustand with persist to
localStorage, Zod, Vitest, lz-string. Mobile-first; judges will open it on a phone. Trips
stay on the device: no database, and the sign-in on `/login` is a demo profile kept on the
phone (no password, no server account). Two optional server routes send only what the
traveler asks them to:

- `/api/import` (`ANTHROPIC_API_KEY`): turns pasted confirmation text into flights, stays
  and rides for review on `/trip`.
- `/api/speak` (`ELEVENLABS_API_KEY`): turns the spoken summary into audio for "Listen".

Without the keys those features say they are unavailable; everything else works.

- `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`
- Import alias: `@/*` is `src/*`
- Next 16 differs from older versions (for example `params` in a dynamic route is a
  Promise; in a client component read it with `use(params)` or `useParams()`). See
  `AGENTS.md` and `node_modules/next/dist/docs/` when unsure.
- Any component that reads the store must be a client component (`"use client"`).

## The wall-clock-time rule

All times are local wall-clock strings with no timezone: `"2026-10-17T10:35"`
(`YYYY-MM-DDTHH:mm`). There is no timezone conversion anywhere.

This is correct because every comparison the app makes happens at a single location: old
vs new arrival at one airport, arrival vs next departure at the same airport, arrival vs
hotel check-in in the same city.

- **Never compute durations across airports** (no "flight time", no depart-to-arrive maths).
- Never use `new Date(someTripTime)` or `Date.parse`; the device timezone will shift it.
  Use `src/lib/domain/time.ts`: `minutesBetween(from, to)`, `addMinutes(t, n)`,
  `datePart`, `timePart`, `formatDate`, `formatDateTime`, `formatDuration`.
- `<input type="datetime-local">` produces exactly this format.
- `LocalDateTimeSchema` and `ClockTimeSchema` reject values that do not exist
  (`2026-02-31T10:00`, `99:99`), not just ones with the wrong shape.
- `Disruption.createdAt` is the one exception: an ISO timestamp of when it was reported.

## Data model: `src/lib/types.ts`

Zod schemas (`FlightSchema`, `TripSchema`, ...) with inferred types of the same name
without the suffix.

- `Flight`: id, airline, flightNumber, from, to, departAt, arriveAt, bookingRef, seat?,
  status (`scheduled | delayed | cancelled | rebooked`), original? (airline,
  flightNumber, departAt, arriveAt as they were before the first revision)
- `Stay`: id, name, address, phone?, checkIn, checkOut (both full date-times),
  confirmation, latestCheckIn? (`"HH:mm"`)
- `Contact`: id, kind (`airline | hotel | insurance | other`), name, phone?, url?, notes?
- `Task`: id, title, detail?, done, contactId?, source (`generated | custom`)
- `Ride`: id, provider, pickupAt, from, to, phone?, confirmation?, notes?,
  rescheduledFrom? (the booked pickup, kept the first time Layover moves it)
- `AutoAction`: id, kind (`flight | hotel | ride`), status (`done | pending`), title,
  detail?, targetId? (something Layover did by itself; see `autoUpdates.ts`)
- `Disruption`: id, type (`delay | cancellation | missed_connection | rebooked`),
  flightId, createdAt, tasks, actions? (`AutoAction[]`)
- `Person`: id, name, role (`pickup | family | other`), phone? (someone waiting on the
  traveler; `Trip.people` is optional so older saved trips still load; recovery keeps the
  readable ones). `buildTimeline(trip, disruptionId)` in `src/lib/domain/timeline.ts`
  (the home screen's ripple rail) and `buildDrafts(trip, disruptionId)` in
  `src/lib/domain/messages.ts` (per-person messages) are built from these.
- `Trip`: id, name, travelerName, flights, stays, rides?, contacts, people?, disruptions,
  payoutAddress? (a Solana public key for the optional "request funds" add-on; set it only
  through `setPayoutAddress`, see below)
- `Profile` (name, email, guest) and `Settings` (notifyHotel, moveRides, notifications;
  `DEFAULT_SETTINGS` has all on) live next to the trip in the store, not in it.

Use `newId()` from `src/lib/id.ts` for new ids (works on non-HTTPS phone testing too).

## Store: `src/lib/store.ts`

```ts
import { useTripStore, useStoreReady } from "@/lib/store";

const ready = useStoreReady();               // false until localStorage has been read
const trip = useTripStore((s) => s.trip);    // Trip | null
if (!ready) return <Loading />;              // always gate on ready, or you flash "no trip"
```

State is `{ trip, savedTrips, profile, settings, loadNotice }`; all but `loadNotice` are
saved. `loadNotice` is set when the saved trip was only partly readable (`{ kind:
"recovered", dropped }`, the rest loaded) or not at all (`{ kind: "discarded" }`); the home
screen shows it once, with a dismiss. Saved trips are recovered the same way, silently.
Screens other than `/s` gate on `useRequireProfile()` (it sends a visitor with no profile
to `/login`, which also offers "Continue as guest"). Actions (get them with
`useTripStore((s) => s.actionName)`):

| Action | Signature |
| --- | --- |
| `loadSampleTrip` | `() => void` (keeps a saved `payoutAddress`) |
| `resetTrip` | `() => void` |
| `startTrip` | `({ name, travelerName }) => void` (a new empty trip) |
| `updateTripDetails` | `({ name?, travelerName? }) => void` |
| `saveAndCloseTrip` / `openSavedTrip` / `removeSavedTrip` | `() => void` / `(tripId) => void` / `(tripId) => void` |
| `signIn` / `signOut` / `updateProfile` | `(profile) => void` / `({ erase? }?) => void` / `(changes) => void` |
| `updateSettings` | `(changes: Partial<Settings>) => void` |
| `upsertFlight` | `(flight: Flight) => void` (adds, or replaces by id) |
| `removeFlight` | `(flightId: string) => void` (also removes its disruptions) |
| `upsertStay` | `(stay: Stay) => void` |
| `removeStay` | `(stayId: string) => void` |
| `upsertRide` / `removeRide` | `(ride: Ride) => void` / `(rideId: string) => void` |
| `upsertContact` | `(contact: Contact) => void` |
| `removeContact` | `(contactId: string) => void` |
| `setPayoutAddress` | `(address: string) => boolean` (trims; `""` clears; `false` and no change if not a Solana address) |
| `reportDisruption` | `(flightId, type: DisruptionType, revised?: { airline?, flightNumber?, departAt?, arriveAt? }) => string` |
| `toggleTask` | `(disruptionId: string, taskId: string) => void` |
| `addTask` | `(disruptionId: string, title: string, detail?: string) => string` (new task id) |
| `removeTask` | `(disruptionId: string, taskId: string) => void` |
| `dismissLoadNotice` | `() => void` |

`reportDisruption` snapshots `flight.original` on the first revision only, applies the
revised fields, sets the status, runs `planAutoUpdates` (what Layover handles by itself,
per `settings`: the hotel is told, rides meeting the flight get a new pickup time; stored as
`disruption.actions`), generates the checklist for what is left, and returns the new
disruption id. The home screen (`/`) always shows the latest disruption, and `/share/<id>` builds the
update for it. It throws if there is no trip or the flight id is unknown. Reporting the same
change again (same type, nothing new to apply) while the earlier one still has unfinished
tasks returns that disruption's id and changes nothing; a worse delay is a new disruption.
Status it sets: `delay` gives `delayed`; `rebooked` gives `rebooked`; `cancellation` and
`missed_connection` give `cancelled`, or `rebooked` if revised times were supplied.

Nothing in the UI calls `reportDisruption` from a form. The only caller is the simulated
feed, `simulateFlightChange(scenario)` in `src/components/trip/simulateChange.ts` (see Routes below).
Example, a 45-minute delay:

```ts
const id = reportDisruption(flight.id, "delay", {
  departAt: addMinutes(flight.departAt, 45),
  arriveAt: addMinutes(flight.arriveAt, 45),
});
```

## Domain functions: `src/lib/domain/`

Pure functions, no React, no store access.

```ts
// impact.ts
computeImpact(trip: Trip, flightId: string): Impact

type Impact = {
  flightId: string;
  delayMinutes: number | null;        // null = cancelled with no replacement times
  connection: {
    flightId: string;                 // the onward flight
    minutesBefore: number;            // connection time as originally booked
    minutesAfter: number | null;      // connection time now; null = arrival unknown
    status: "ok" | "tight" | "missed";
  } | null;                           // null = no onward flight
  affectedStays: { stayId: string; reason: string }[];
};

// checklist.ts
generateChecklist(trip: Trip, disruption: Disruption, impact: Impact): Task[]

// summary.ts
buildSummary(trip: Trip, disruptionId: string, options: SummaryOptions): string
type SummaryOptions = { includeBookingRefs: boolean; includeStays: boolean; includeOpenTasks: boolean };
DEFAULT_SUMMARY_OPTIONS  // refs off, stays on, open tasks on

// briefing.ts
buildBriefing(trip: Trip, disruptionId: string): string
// Two or three short sentences written to be spoken aloud (text-to-speech): what
// changed, what is at risk, and the first unfinished task. "" if the id is unknown.
// The home screen's "Listen to summary" button plays it with `useSpeech`
// (src/components/trip/useSpeech.ts), which sends only this text to /api/speak
// (ElevenLabs) and plays the audio. The voice is picked in the trip menu.

// autoUpdates.ts
planAutoUpdates(trip, flightId, disruptionId, settings): { actions: AutoAction[]; rides: Ride[] }
// Simulated like the feed: no message really reaches a hotel or driver, but the trip data
// changes (rides get their new pickup time) and the checklist leaves those jobs out.

// summary.ts also: SummaryOptions.fundsRequest?: { amountUsdc: string } | null  (optional, off by default)

// timeline.ts
buildTimeline(trip, disruptionId): TimelineNode[]   // rail of flights, links, stay, people
finalArrival(trip, disruptionId): FinalArrival | null  // where the traveler now lands (or unknown)
// messages.ts
buildDrafts(trip, disruptionId): Draft[]  // pickup / family / hotel messages; channelLinks(draft)
// A person's node turns green when their task is done (pickup: rearrange_pickup, family:
// send_update). A pickup Layover already moved (a ride AutoAction) shows as handled.
// Opening a draft on /share ticks the matching tasks.

// shareLink.ts
encodeShare(trip: Trip, disruptionId: string, options: SummaryOptions): string  // URL fragment
decodeShare(fragment: string): ShareSnapshot | null   // null for anything malformed
```

- A connection under 60 minutes is `tight`; below zero is `missed`. A cancelled flight
  with no replacement times gives `delayMinutes: null`, `minutesAfter: null` and status
  `missed`; show that as "at risk", not as a number.
- The onward connection is the earliest flight leaving the arrival airport within 24
  hours of the originally booked arrival. Stays are matched to the last flight of that
  chain by check-in date.
- `cityName("LHR")` in `airports.ts` gives `"London"` for display (falls back to the code).
- `/share/[id]` is the screen where the traveler picks options, previews the message and
  copies the text or a link. `[id]` is a disruption id. The short preview message is built
  by `buildMessage` in `src/app/share/[id]/message.ts`. The link carries a snapshot of the
  data, not the `buildSummary` text (`encodeShare` leaves it out; `buildSummary` is still
  exported and tested).
- `/s` is the read-only page the recipient opens. The link is `/s#<encodeShare output>`;
  read `window.location.hash` on the client and pass it to `decodeShare` (a leading `#`
  is fine). `ShareSnapshot` (see `ShareSnapshotSchema` in `shareLink.ts`) carries the
  trip name, traveler name, flights, stays, impact and open task titles; `summary` is
  optional and only present on links made before it was dropped. `/s` words the headline and
  the hotel-risk lines from that data in `src/app/s/story.ts`, which has tests.
- The checklist is generated once, when the disruption is reported, and stored on the
  disruption. Render `disruption.tasks`; do not call `generateChecklist` from a screen.

## Optional add-on: request funds (Solana Pay, devnet)

The core flow never depends on this. With no `payoutAddress` or no `fundsRequest` option,
links and pages behave exactly as before, and a malformed `fundsRequest` in a link is
dropped rather than breaking `/s`.

Status: wired end to end. The library (`src/lib/solana/**`, `Trip.payoutAddress`,
`setPayoutAddress`, `SummaryOptions.fundsRequest`, `ShareSnapshot.fundsRequest`) is used by
three screens:

- `/` (trip menu): the "Solana address (optional)" field saves `Trip.payoutAddress` through
  `setPayoutAddress`. "Restart the demo trip" keeps it; "Clear this trip" removes it.
- `/share/[id]`: the "Ask for help" section has an "Add a Send help button" toggle (disabled
  until an address is saved) and an amount field. It puts `fundsRequest` in the link.
- `/s`: when the link carries a `fundsRequest`, the "Help {name} with costs" section renders
  `FundsRequest` (`src/components/trip/FundsRequest.tsx`): the Send help button (a `solana:`
  link), a QR code, a devnet notice and a copy-address fallback.

Every place that mentions it says it is on devnet, Solana's test network. The trip name goes
in the payment's memo, which is public on the blockchain, and the share screen says so.

- `src/lib/solana/config.ts`: `SOLANA_CLUSTER` (the one switch, `"devnet"`), `USDC_MINTS`.
- `src/lib/solana/address.ts`: `isValidSolanaAddress`, `normalizeSolanaAddress`,
  `SolanaAddressSchema`. Use these anywhere an address is entered.
- `src/lib/solana/pay.ts`: `normalizeUsdcAmount`, `buildTransferRequestUrl` (returns a
  `solana:` transfer request or `null`; never throws).
- `ShareSnapshot.fundsRequest?: { recipient, amountUsdc, cluster }`.
- The app only generates a request. No wallet adapter, no keys, no signing, ever.

## Checklist wording: `src/lib/content/checklistCopy.ts`

Title and detail text for every generated task, keyed by a stable id. Plain data, edited
by the Content owner. Wording stays general ("ask the airline what you're entitled to").
Make no claims about legal rights or compensation amounts anywhere in the app.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Everything about the trip: on-track view, then the flap board, the ripple timeline, Handled for you, Do this now and the checklist, share and listen. With no trip: Add your trip, Try the sample trip, saved trips. Also the trip menu (theme, voice, Solana address, Settings, edit the trip, restart or clear the demo trip) |
| `/trip` | Enter or edit flights, hotels and rides by hand, or import them from pasted text |
| `/login` | Demo sign-in (name and email kept on the phone) or Continue as guest |
| `/settings` | Profile, what Layover may do by itself, notifications, theme, sign out |
| `/share/[id]` | Build the update for people waiting: per-person drafts (Send to) and copy text or a link |
| `/s` | Read-only shared update, data in the URL fragment |
| `/ui-kit` | Design reference for the UI primitives (not linked from the app) |

There is no "report a change" screen and no separate disruption screen. Changes arrive on
their own, and the home screen shows the latest one.

### The simulated airline feed

With no backend, the airline feed is simulated. `FlightWatcher`
(`src/components/trip/FlightWatcher.tsx`, mounted in the root layout) waits 6 seconds
(`WATCH_DELAY_MS`) after a trip with no disruptions is on screen at `/` (the home screen's visible
"Simulate a change" button does the same on demand), then calls
`simulateFlightChange()` (`src/components/trip/simulateChange.ts`) and shows a notification
banner. It never runs on `/s`. On the sample trip the change is: BA 286 runs 2h 10m late,
AZ 201 is missed, the traveler is rebooked on AZ 207 (14:25 to 18:00).
"Restart the demo trip" in the home menu reloads the sample trip, which replays it.
Anything that says the app watches live flights must say this is simulated, and so must
anything that says Layover told a hotel or moved a ride.

## Ownership

| Area | Files |
| --- | --- |
| Foundation and logic | `src/lib/**` except `sampleTrip.ts` and `content/` |
| Screens | `src/app/page.tsx`, `src/app/trip/**`, `src/app/login/**`, `src/app/settings/**`, `src/app/api/**`, `src/components/trip/**` |
| Design | `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/**`, `src/app/share/**`, `src/app/s/**`, `public/**` |
| Content | `src/lib/sampleTrip.ts`, `src/lib/content/**`, `docs/**`, `README.md` |

In `sampleTrip.ts`, keep the 10:35 arrival and the 11:30 onward departure; tests depend
on that 55-minute connection.

## Git rules

- Work on a branch named after your area.
- Edit only files you own.
- Open small pull requests to main often.
- If you need a change in someone else's file, ask them instead of making it.
