# JetFlex (prototype)

AI-assisted private aviation intelligence, built as a second app inside this repo.
ConnectionKeeper is at `/`; JetFlex lives under `/jetflex`.

```
pnpm install
pnpm dev          # http://localhost:3000/jetflex
pnpm test         # includes the JetFlex tests under src/lib/jetflex/
```

No accounts and no database. State lives in localStorage (`jetflex-v1`). **All inventory is
simulated**: airports and distances are real, every schedule, fare, aircraft, price and
availability value is illustrative and not bookable.

Optional: set `ANTHROPIC_API_KEY` on the server to let an AI model read the trip sentence
(see "Optional AI parser" below). Without it everything works, using rules.

## What is in it

| Screen | What it does |
| --- | --- |
| Overview | Photo-backed hero with a trip box ("Plan this trip"), three example chips, the "Try the Miami demo" tile, a quick-start form ("Compare options"), empty-leg opportunities ("Plan around this leg"), and stats computed from your saved trips |
| Plan a Trip | Reads a request (rules, or an AI model if configured), ranks charter / empty leg / first class / hybrid for the same party and dates, flexibility and priority controls, route map, price-vs-time chart, "Why this recommendation?", options excluded by your constraints, "Save trip" |
| My Trips | Save, reopen, compare two ("Compare"), remove; request history with "Run again" |
| My Cabin | Persistent preferences, and "Generate brief": a cabin service brief for the operator, with unsupported-preference flags, copy and download |
| TimeBack | Plan around a commitment: time needed there, arrive-by, home-by, an arrival cushion, and a goal (Balanced, Lowest cost, Most time at destination, Safest to make it) |
| JetShield | Five simulated disruptions (Flight delayed, Aircraft unavailable, Weather cancellation, Connection missed, Ground transfer delayed), an animated recovery sequence (plan, detect, search, rank, approval) with "Skip animation" and "Replay", ranked replacements, "Review & approve" then "Approve in demo", before-and-after and what is still protected |
| Operator Intelligence | "For operators" pitch from the sample fleet, stat strip, a revenue view (expected to sell, unsold, withheld, and what your edits changed), detected empty legs from schedule gaps with "Inspect", a Publish toggle, Available / Limited / Mark unavailable, "Set price", "Use suggested" and "Use model-optimal", demand matching, "Import operator CSV", "Add flight" and a fleet overview |

Cross-cutting: phone-first layout (navigation behind the menu button, 44 px tap targets, a
sticky Save bar on Plan a Trip), a single dark theme, and a "simulated" marker on every
screen (left navigation on desktop, page footer on phones).

### How it fails

- No `ANTHROPIC_API_KEY`, a slow or failing model call, a non-JSON reply, or a reply that does
  not validate: the sentence is read by the rules and the interface says "Read by plain rules
  on your device". The parse route never returns a 5xx for model problems.
- A sentence with no recognisable trip: the screen says so and keeps the current trip.
- Damaged or hand-edited `localStorage`: unreadable entries are dropped field by field
  (`sanitizePersisted` in `store.ts`) and the app starts with defaults; it never sits on the
  loading skeleton. Blocked or full storage keeps working in memory.
- A CSV with bad rows: each is rejected with its line and field; good rows are applied only
  when you press the Apply button.

## Code map

`src/lib/jetflex/` (pure logic, no React except `store.ts`):

- `data.ts` seeded airports, aircraft types, operators, fleet, booked schedule, first-class
  timetable and carriers, simulated demand, cost-model constants (`RULES`).
- `inventory.ts` geography, ground and charter economics, and `deriveLegs`: empty-leg
  detection from schedule gaps, with operator overrides, custom flights and imported
  inventory.
- `csvImport.ts` operator CSV parsing and validation (line-numbered messages), and the merge
  of imported rows into the detection engine. See below.
- `journeys.ts` journey generator and `validate()` (geography, chronology, minimum transfer
  times). `search.ts` itinerary assembly, normalised weighted scoring, explanations.
- `parser.ts` rule-based request parser. `llmParser.ts` optional AI reader with validation
  and fallback; called from `src/app/api/jetflex/parse/route.ts`.
- `shield.ts` disruption simulation, recovery search, scoring, the recovery timeline and the
  before-and-after diff. `timeback.ts`, `operator.ts` (demand matching, revenue projection,
  operator pitch facts), `cabin.ts`, `store.ts`, `time.ts`, `types.ts`.

`src/components/jetflex/` (screens): `OverviewPage`, `PlanPage` (with `RequestPanel`,
`Results`, `RouteMap`, `charts`, `Itinerary`), `TripsPage`, `CabinPage`, `TimeBackPage`,
`ShieldPage` (with `ShieldTimeline`), `OperatorPage` (with `OperatorPitch`,
`OperatorRevenueChart`, `OperatorImport`), `Photo` (photo slots), `Shell`, `ui`.

`public/jetflex/photos/` photo slots with a `credits.json` manifest; see its `README.md`.
Until a photo is registered the app shows built-in illustrations, so nothing is broken
without photos.

Times are absolute minutes with a fixed per-airport offset, so cross-timezone durations are
correct (ConnectionKeeper's wall-clock rule does not apply here).

## Operator CSV import

On Operator Intelligence, **Import operator CSV**. Paste or choose a file with the header
`tail,aircraft,origin,destination,departure_local,arrival_local,seats,price,status`
(`seats`, `price`, `status` optional; status is booked, empty, limited or unavailable;
times are `YYYY-MM-DD HH:mm`, local to each airport). Each row is validated with a message
that names the line and field. Good rows are merged: booked flights extend the schedule, so
gaps between them are detected as empty legs; rows marked empty carry the operator's price;
new tails become new aircraft. **Load sample CSV** and **Load sample with errors** are built
in. Nothing is uploaded; the file is read in the browser and saved in localStorage.

## Optional AI parser

`POST /api/jetflex/parse` with `{ text, today?, base?, refine? }`. With `ANTHROPIC_API_KEY`
set, the route asks an AI model for a small JSON trip request, validates it against a
schema, and returns it with `source: "llm"`. With no key, a failed or slow call (8 second
timeout), or a reply that does not validate, it returns the rule-based parser's answer with
`source: "regex"`. The key is read on the server only. The interface shows which reader
produced the result. The model only turns a sentence into a trip request; ranking, pricing
and recovery stay deterministic.

## Two-minute demo

Rehearsed with no API key set. On a phone, the navigation is behind the menu button at the
top right. For the full timed three-minute version with expected numbers and a fallback list,
use `docs/jetflex/demo-script.md`. Before you start (off the clock): menu, **Profile & settings**,
**Reset demo data**.

| Time | Do | Say |
| --- | --- | --- |
| 0:00 | **Overview**. Point at the "simulated" line (left navigation, or the footer on a phone). Click the **Try the Miami demo** tile, then **Plan this trip**. | "Private aviation inventory is opaque, and everything here is simulated: real airports, invented schedules and prices. I describe the trip in one sentence." |
| 0:20 | **Plan a Trip**. Point at the four columns (Private charter, Empty leg, First class, Hybrid), the **Recommended** badge and **Saves vs charter**. Open **Why this recommendation?** | "Same party, same dates, four ways. The recommendation is an empty leg, and it says why and what you give up: the operator controls the timing." |
| 0:45 | Click the name in the **Private charter** column, then **JetShield** (under **Selected itinerary**). | "Say this charter is the trip I want protected." |
| 0:50 | **JetShield**. Pick **Aircraft unavailable**, click **Simulate disruption**, then **Skip animation**. | "I break it. It detects, searches the same pool, ranks, and waits for me." |
| 1:10 | Point at the first option (**Best match**). Click **Review & approve**, then **Approve in demo**. Point at **Before and after** and **What is protected**. | "Nothing changes until I approve, and here approval only updates the simulated plan. It also checks the return and the party." |
| 1:30 | **Operator Intelligence** (menu, or left navigation). Point at **Revenue view**. Under **Detected empty legs**, click **Inspect** on JX101 TEB to OPF. | "That replacement came from operators' schedules. This is their side: legs that must fly empty, what they cost and what they are worth." |
| 1:45 | On the JX101 OPF to TEB row click **Mark unavailable**. Point at the line under **Revenue view** that says how your edits moved the numbers. | "The operator withdraws a leg and the numbers move. The traveler's search changes the same way." |
| 1:55 | Optional: scroll to **Import operator CSV**, click **Load sample with errors**. | "An operator's file in; every unreadable row named by line." |
| 2:00 | Close. | "Schedule gaps, empty legs, operator price, traveler ranking, recovery from the same pool. The inventory is simulated. The logic is the product." |

If a step does not show what you expect, the usual cause is state left over from a rehearsal:
**Profile & settings**, **Reset demo data**, and run it again.

## Docs

- `docs/jetflex/pitch-60s.md` spoken pitch, 60 / 20 / 10 seconds.
- `docs/jetflex/why-this-works.md` one-slide mechanism spec with diagram.
- `docs/jetflex/demo-script.md` the timed three-minute demo, exact clicks and expected
  results, and a fallback list.
- `docs/jetflex/data-provenance.md` what is real, what is simulated, how a deployment would
  source it, and answers to judges' follow-ups.

## Not built

- Real inventory, payments, accounts, booking, live flight tracking, live weather. Every
  disruption is scripted.
- A real operator feed. The CSV import is the intake, but nothing is connected to an
  operator system, and imported data stays in one browser.
- Any regulatory or operator-of-record handling for selling empty legs.
- Re-validation of an itinerary you already approved against later operator edits.
- Selling a leg: a published empty leg is never marked sold when a traveler picks it, and
  there is no shared state between users; operator edits live in your browser.
- The CSV import only accepts airports and aircraft types the demo knows (28 airports,
  7 aircraft types).
- The sentence reader (rules or AI) covers the demo's metros and common phrasing; unusual
  phrasing falls back to the editable form fields.
