# ConnectionKeeper

Read this first. It is the shared contract for all four sessions working in this repo.

## Product

When a flight is delayed or cancelled, travelers juggle an airline app, confirmation
emails, and a hotel booking. ConnectionKeeper keeps reservations, next steps, and contacts
in one place. The user tells it what changed; it shows what is now at risk downstream,
generates a checklist of what to do, and writes an update for the people waiting on them.
The link between those three is the whole demo: trip data drives the checklist, and both
drive the summary.

## Stack

Next.js (App Router, v16), TypeScript, Tailwind v4, pnpm, Zustand with persist to
localStorage, Zod, Vitest, lz-string. Mobile-first; judges will open it on a phone. All
data stays on the device: no backend, no accounts.

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
- `Disruption`: id, type (`delay | cancellation | missed_connection | rebooked`),
  flightId, createdAt, tasks, notes?
- `Trip`: id, name, travelerName, flights, stays, contacts, disruptions, payoutAddress?
  (a Solana public key for the optional "request funds" add-on; set it only through
  `setPayoutAddress`, see below)

Use `newId()` from `src/lib/id.ts` for new ids (works on non-HTTPS phone testing too).

## Store: `src/lib/store.ts`

```ts
import { useTripStore, useStoreReady } from "@/lib/store";

const ready = useStoreReady();               // false until localStorage has been read
const trip = useTripStore((s) => s.trip);    // Trip | null
if (!ready) return <Loading />;              // always gate on ready, or you flash "no trip"
```

State is `{ trip: Trip | null }`. Actions (get them with
`useTripStore((s) => s.actionName)`):

| Action | Signature |
| --- | --- |
| `loadSampleTrip` | `() => void` |
| `resetTrip` | `() => void` |
| `upsertFlight` | `(flight: Flight) => void` (adds, or replaces by id) |
| `removeFlight` | `(flightId: string) => void` (also removes its disruptions) |
| `upsertStay` | `(stay: Stay) => void` |
| `removeStay` | `(stayId: string) => void` |
| `upsertContact` | `(contact: Contact) => void` |
| `removeContact` | `(contactId: string) => void` |
| `setPayoutAddress` | `(address: string) => boolean` (trims; `""` clears; `false` and no change if not a Solana address) |
| `reportDisruption` | `(flightId, type: DisruptionType, revised?: { airline?, flightNumber?, departAt?, arriveAt? }) => string` |
| `toggleTask` | `(disruptionId: string, taskId: string) => void` |
| `addTask` | `(disruptionId: string, title: string, detail?: string) => string` (new task id) |
| `removeTask` | `(disruptionId: string, taskId: string) => void` |

`reportDisruption` snapshots `flight.original` on the first revision only, applies the
revised fields, sets the status, generates the checklist, and returns the new disruption
id (navigate to `/disruption/<id>`). It throws if the flight id is unknown.
Status it sets: `delay` gives `delayed`; `rebooked` gives `rebooked`; `cancellation` and
`missed_connection` give `cancelled`, or `rebooked` if revised times were supplied.

Example, a 45-minute delay:

```ts
const id = reportDisruption(flight.id, "delay", {
  departAt: addMinutes(flight.departAt, 45),
  arriveAt: addMinutes(flight.arriveAt, 45),
});
router.push(`/disruption/${id}`);
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

// summary.ts also: SummaryOptions.fundsRequest?: { amountUsdc: string } | null  (optional, off by default)

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
- `/share/[id]` is the screen where the traveler picks options, previews the summary and
  copies a link. `[id]` is a disruption id.
- `/s` is the read-only page the recipient opens. The link is `/s#<encodeShare output>`;
  read `window.location.hash` on the client and pass it to `decodeShare` (a leading `#`
  is fine). `ShareSnapshot` (see `ShareSnapshotSchema` in `shareLink.ts`) carries the
  trip name, traveler name, flights, stays, impact, open task titles and the summary text.
- The checklist is generated once, when the disruption is reported, and stored on the
  disruption. Render `disruption.tasks`; do not call `generateChecklist` from a screen.

## Optional add-on: request funds (Solana Pay, devnet)

The core flow never depends on this. With no `payoutAddress` or no `fundsRequest` option,
links and pages behave exactly as before, and a malformed `fundsRequest` in a link is
dropped rather than breaking `/s`.

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
| `/` | Trip status: flights, what changed, the checklist, share and listen |
| `/disruption/[id]` | Before/after, downstream risks, checklist |
| `/share/[id]` | Build and copy the update for people waiting |
| `/s` | Read-only shared update, data in the URL fragment |

## Ownership

| Area | Files |
| --- | --- |
| Foundation and logic | `src/lib/**` except `sampleTrip.ts` and `content/`, `src/app/disruption/[id]/**` |
| Screens | `src/app/page.tsx`, `src/components/trip/**` |

There is no "report a change" screen: changes arrive on their own. With no backend,
`src/components/trip/FlightWatcher.tsx` (mounted in the root layout) simulates the airline's
feed a few seconds after a trip with no disruptions loads: it calls `reportDisruption` and
shows a notification. "Restart the demo trip" in the home menu replays it.
| Design | `src/app/layout.tsx`, `src/app/globals.css`, `src/components/ui/**`, `src/app/share/**`, `src/app/s/**`, `public/**` |
| Content | `src/lib/sampleTrip.ts`, `src/lib/content/**`, `docs/**`, `README.md` |

In `sampleTrip.ts`, keep the 10:35 arrival and the 11:30 onward departure; tests depend
on that 55-minute connection.

## Git rules

- Work on a branch named after your area.
- Edit only files you own.
- Open small pull requests to main often.
- If you need a change in someone else's file, ask them instead of making it.
