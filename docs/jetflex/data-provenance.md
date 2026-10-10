# JetFlex: where does the data come from?

Short answer for a judge: the airports, coordinates and distances are real; the schedules,
fares, aircraft tails, availability, demand and disruptions are simulated; the logic that
turns an operator's schedule into priced, ranked, recoverable options is the real part and
does not care which schedule you feed it.

Nothing in JetFlex is bookable. Nothing in it is live.

## What is real

| Item | Status | Where in the code | Caveat |
| --- | --- | --- | --- |
| Airports: IATA codes, names, cities | Real | `AIRPORTS` in `src/lib/jetflex/data.ts` | 28 airports across 7 metros (New York, Miami, Aspen/Vail, Los Angeles, San Francisco Bay, Chicago, Denver). Whether an airport takes scheduled airline service or private traffic is encoded as flags and is a simplification. |
| Airport coordinates | Real | same | Latitude and longitude of the actual airports, entered by hand. Not audited to the metre. |
| Time zones | Real offsets, simplified | same (`tz`) | A fixed UTC offset per airport with daylight time assumed. Only differences matter in the app. |
| Distances | Derived from real coordinates | `distKm` in `inventory.ts` | Great-circle (haversine) between airport coordinates. Ground-transfer time is an estimate: great-circle times 1.3 at 55 km/h plus 12 minutes. |
| Aircraft types | Real model names, simplified performance | `AIRCRAFT_TYPES` in `data.ts` | Seven types, from the Phenom 300E to the Global 6000. Seat counts, block speeds, ranges and hourly rates are chosen to be plausible for each class (the code comment says "illustrative") and have not been checked against manufacturer data sheets or real quotes. |
| Block time | Our formula | `blockMin` in `inventory.ts` | Distance divided by type speed, plus 25 minutes. No wind, routing, climb or descent model. Scheduled airline block time uses its own simple formula in `data.ts`. |

## What is simulated

| Item | Where | What it actually is |
| --- | --- | --- |
| Operators | `OPERATORS` | Four fictional operators, "Aerolux Jets (sim)", "Skyline Charter (sim)", "Meridian Private Aviation (sim)", "Harborline Air (sim)", plus an "Imported operator feed (sim)" bucket for CSV imports. |
| Fleet and tail numbers | `FLEET` | Sixteen invented aircraft with fictional registrations (N101JX, N601MP, and so on) and a home base each. |
| Booked schedule | `SCHEDULE` | 45 invented booked flights per week for two weeks, anchored to the coming Friday. The gaps between them are what the detector finds. |
| Scheduled first class | `FC_SPEC`, `fcFlightInfo` | Four invented carriers ("Crestline Air (sim)" and others), plausible city pairs, invented departure times, formula-based fares, and flight numbers and seats-left generated from the route and date. |
| Charter pricing | `charterPrice`, `RULES` | Hourly rate per type, a 90-minute minimum, a flat fee, then a 7.5% federal excise tax assumption. All illustrative. |
| Empty-leg offers | `deriveLegs`, `suggestOffer` | A model's suggested discount to the charter estimate, deeper for wider timing windows. The operator can override it in the app. |
| Availability | `ops` overrides in the store | Available / limited / unavailable, set by the operator controls or a CSV. Nothing is polled. |
| Traveler demand | `DEMAND` | Sixteen invented searches per week, plus your own current search. |
| Disruptions | `SCENARIOS` in `shield.ts` | Five scripted events (a 150-minute delay, an aircraft pulled, a four-hour weather ground stop at the origin airport, a missed connection, a 90-minute late ground transfer). No weather or tracking data is read. |
| Risk percentages | per-segment `risk` | Fixed modeled values (ground 3%, charter 5%, first class 14%), and for an empty leg a value between 12% and 40% that falls as its timing window widens. Combined across segments by multiplication. Not an actuarial figure. |
| Revenue model | `operator.ts` | A 38% positioning-cost share of the charter estimate, $600 of handling if sold, and a 35% conversion factor on a matched search. Assumptions, not measured. |

Every screen that shows these carries a "simulated" or "illustrative" label, and the
sidebar says "Demo inventory is simulated. Nothing here is bookable or real-time."

## How a real deployment would source each input

| Input | Source in a real deployment | Prototype equivalent |
| --- | --- | --- |
| Operator schedule (booked flights per tail) | The operator's scheduling or flight-ops system, by export or API. For a pilot, a CSV file is enough: tail, aircraft, origin, destination, departure, arrival, optionally seats, price and status. | `SCHEDULE` in `data.ts`, and the operator CSV import on Operator Intelligence. |
| Fleet and aircraft capability (seats, range, base) | The operator's fleet list, or a public aircraft registry cross-checked against manufacturer data. | `FLEET`, `AIRCRAFT_TYPES`; unknown tails in a CSV become new aircraft. |
| Airline first-class schedules and fares | GDS or airline schedule and fare feeds, or a schedule data provider of the kind used for airline timetables (OAG-style). | `FC_SPEC` and `fcFlightInfo`. |
| Airport data | Public airport databases (codes, coordinates, time zones), reviewed for private-aviation fields (FBOs, hours, runway length). | `AIRPORTS`. |
| Weather and ground stops | Aviation weather services (METAR and TAF observations and forecasts) and FAA operational status, turned into a disruption event. | `SCENARIOS` (scripted). |
| Aircraft position and delay | ADS-B or other position feeds, or the operator's own flight-following. | None. |
| Traveler demand | The product's own search logs, aggregated. | `DEMAND` (invented). |
| Charter pricing | Operator rate cards and market quotes. | `RULES` and `AIRCRAFT_TYPES.rate`. |

Nothing in this table is integrated. It is the sourcing plan, not a claim of access.

## Why the CSV import and the detection logic are the real product

The inventory is replaceable; the pipeline is not.

- **Detection is a pure function of a schedule.** `deriveLegs(today, overrides, custom,
  imported)` in `src/lib/jetflex/inventory.ts` takes booked flights per aircraft and
  returns repositioning legs with a departure window, a charter estimate and a suggested
  offer. It does not know whether the schedule is seeded, typed in on the "Add flight"
  form, or imported from a file.
- **The operator CSV import is the intake.** `src/lib/jetflex/csvImport.ts` parses a file
  with these columns: `tail`, `aircraft`, `origin`, `destination`, `departure_local`,
  `arrival_local` (YYYY-MM-DD HH:mm, local to each airport), and optionally `seats`, `price`
  and `status` (booked, empty, limited, unavailable). Every row is validated with a
  line-numbered message (unknown airport, unknown aircraft, arrival not after departure,
  more seats than the cabin, duplicate row, bad price, bad status). Good rows are kept,
  booked flights fill the schedule so gaps become detected empty legs, rows marked empty
  carry the operator's own price, and tails the app has never seen become new aircraft.
  It runs entirely in the browser; the file is not uploaded.
- **Everything downstream consumes legs, not data sources.** Search, ranking, JetShield and
  the operator revenue view all read the same `EmptyLeg` objects. Swap the schedule and
  the rest of the app follows.
- **The explanations are generated from the same numbers.** The "why this recommendation"
  text, the score bars and the "why it was flagged" line are built from the values that
  produced the ranking, so a new data source does not need new copy.

## The optional LLM parser

By default a sentence is read by regular expressions and date arithmetic
(`src/lib/jetflex/parser.ts`), and the app reports what it understood and what it assumed.
If the server has an `ANTHROPIC_API_KEY`, the `/api/jetflex/parse` route asks an AI model
to read the sentence instead (`src/lib/jetflex/llmParser.ts`). The reply is validated
against a strict schema before use, with an 8 second timeout; if there is no key, the call
fails, or the reply does not validate, the route answers with the rule-based parser. The key
is read on the server only and is never sent to the browser. The interface says which
reader produced the result ("Read by plain rules on your device" or "Read by an AI model").
The model only turns a sentence into a trip request. It does not rank, price or plan.

## Short script for judges' follow-ups

**"Is this bookable?"**
No. Nothing here can be booked, paid for or confirmed. Every price and schedule is
simulated, and approving a JetShield replacement only updates the simulated plan in your
browser.

**"Is the data real?"**
Airports and distances are. Schedules, fares, tails, availability, demand and disruptions
are invented for the demo and labelled that way on screen. What is real is the logic:
detecting idle legs from a schedule, pricing them, ranking them against alternatives, and
re-planning from the same pool.

**"Where would the schedule come from?"**
From the operator. The first integration is a CSV export from their scheduling system,
because that needs no API agreement; the importer is built and you can try it on
Operator Intelligence. After that, an API into their flight-ops tool.

**"Why would an operator publish an empty leg?"**
In the prototype, the operator controls price, availability and whether a leg is published
at all, and the model shows what flying it empty costs against what selling it recovers.
We have not tested operator appetite for this with real operators and make no claim about it.

**"How do you know the empty leg will actually operate?"**
We don't. The app says so on the leg: timing is set by the operator and can change or be
withdrawn, and JetShield lists "operator can still change or withdraw it" against any
recovery option that uses one.

**"How accurate are the risk numbers?"**
They are model parameters (fixed per mode, and for empty legs a function of how wide the
timing window is), not predictions. They exist to make the trade-off legible and are not
calibrated.

**"What about regulation, who is the operating carrier?"**
Not addressed in the prototype. A real product would need an operator of record for every
flight and a review of how empty legs can be marketed and sold. We have not done that work.

**"Is the AI real?"**
The sentence reader is rules by default and reports what it understood and assumed. An
optional AI model can read the sentence when the server has a key; it falls back to the
rules otherwise and its output is validated before use. Ranking, detection and recovery are
deterministic.

**"What happens to my data?"**
Trips, preferences and imported files stay in your browser's local storage. There is no
account and no database. The one network call is the sentence parser: the browser posts the
sentence to this app's own `/api/jetflex/parse` route, which contacts an AI model only if
the server has a key, and otherwise reads it with the rules.
