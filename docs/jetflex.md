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
| Overview | Photo-backed hero with a natural-language box, quick-start form, empty-leg opportunities, stats computed from your saved trips |
| Plan a Trip | Reads a request (rules, or an AI model if configured), ranks charter / empty leg / first class / hybrid for the same party and dates, flexibility and priority controls, route map, price-vs-time chart, "Why this recommendation?", excluded options |
| My Trips | Save, reopen, compare two, remove; request history |
| My Cabin | Persistent preferences and a cabin service brief with unsupported-preference flags |
| TimeBack | Plan around a commitment: time needed there, arrive-by, home-by |
| JetShield | Five simulated disruptions, an animated recovery sequence (plan, detect, search, rank, approval), ranked replacements, explicit approval, before-and-after with what is still protected |
| Operator Intelligence | "For operators" pitch from the sample fleet, detected empty legs from schedule gaps, demand matching, a revenue view (expected to sell, unsold, withheld), price / publish / availability edits that change traveler search, operator CSV import, add-a-flight, fleet overview |

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
