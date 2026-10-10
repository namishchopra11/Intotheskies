# JetFlex (prototype)

AI-powered private aviation intelligence, built as a second app inside this repo. ConnectionKeeper is untouched at `/`; JetFlex lives under `/jetflex`.

```
pnpm install
pnpm dev          # http://localhost:3000/jetflex
pnpm test         # includes the JetFlex acceptance tests in src/lib/jetflex/jetflex.test.ts
```

No keys, accounts or backend. State lives in localStorage (`jetflex-v1`). **All inventory is simulated**: airports and distances are real, every schedule, fare, aircraft, price and availability is illustrative and not bookable.

## What is in it

| Screen | What it does |
| --- | --- |
| Overview | Natural-language entry, quick-start form, empty-leg opportunities, stats computed from your saved trips |
| Plan a Trip | Parses a request, ranks charter / empty leg / first class / hybrid for the same party and dates, flexibility and priority controls, route map, price-vs-time chart, "Why this recommendation?", excluded options |
| My Trips | Save, reopen, compare two, remove; request history |
| My Cabin | Persistent preferences and a cabin service brief with unsupported-preference flags |
| TimeBack | Plan around a commitment: time needed there, arrive-by, home-by |
| JetShield | Five simulated disruptions, ranked recovery options, explicit approval before switching |
| Operator Intelligence | Detected empty legs from fleet schedule gaps, demand matching, revenue model, price / publish / availability edits that change traveler search |

## Code map (`src/lib/jetflex/`)

- `data.ts` seeded airports, aircraft, fleet, schedules, timetable, demand. `inventory.ts` ground and charter economics, empty-leg detection.
- `journeys.ts` journey generator and `validate()` (geography, chronology, minimum transfer times).
- `search.ts` itinerary assembly, normalised weighted scoring, explanations. `parser.ts` rule-based request parser.
- `shield.ts`, `timeback.ts`, `operator.ts`, `cabin.ts`, `store.ts`.

Times are absolute minutes with a fixed per-airport offset, so cross-timezone durations are correct (ConnectionKeeper's wall-clock rule does not apply here).

## Demo script

1. Overview: paste "Find the best way for four people to travel from the New York area to Miami this Friday, returning Sunday. I can move the departure by up to six hours if it saves money." and press Plan this trip.
2. Compare the four mode columns. Switch priority Lowest cost, then Fastest, and watch the order change.
3. Change flexibility Fixed → ±12h; the empty-leg counts under the slider and the list change.
4. Open the selected itinerary: segments, totals, map. Save it.
5. JetShield: Weather cancellation, review replacements, approve.
6. Operator Intelligence: inspect a leg, change its price or mark it unavailable, return to Plan a Trip and see it reflected. Publish a "Detected only" Skyline leg to add a new option.
7. My Cabin: save preferences, generate the service brief.

## Not built
Real inventory, payments, auth, live tracking, weather, booking. The parser is regex-based, so unusual phrasing falls back to editable form fields.
