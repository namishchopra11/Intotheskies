# JetFlex demo script (about 3 minutes)

The walk-through for the JetFlex prototype at `/jetflex`. It is separate from the
ConnectionKeeper demo in `docs/demo-script.md`. JetShield is the live highlight; Operator
Intelligence is the second beat.

Every price, schedule and availability value is simulated. Say so once, early, and the
rest of the demo can stay light.

## Before you start (off the clock)

1. `pnpm dev`, open `http://localhost:3000/jetflex`. Use a window at least 1100 px wide so
   the left navigation shows. On a phone the same links are behind the menu button.
2. **Do not set `ANTHROPIC_API_KEY`** for the rehearsed run. With no key the sentence is read
   by the rule-based parser and the numbers below hold. If a key is set, an AI model may read
   the sentence instead (the "What I understood" card says which); the trip is the same but
   the priority weights can differ, so the ranking can differ. Say what is on screen.
3. If you rehearsed: bottom of the left navigation, **Profile & settings**, then **Reset
   demo data**. It clears the last search, the selected itinerary, operator edits, added
   flights and any imported CSV. It keeps saved trips and the cabin profile.
4. Copy this sentence. It is exactly the app's first example prompt, so the "Try the Miami
   demo" tile and the first example chip produce the same trip if pasting fails.

```
Find the best way for four people to travel from the New York area to Miami this Friday, returning Sunday. I can move the departure by up to six hours if it saves money.
```

Dates on screen are the coming Friday and Sunday relative to the machine's clock. Prices,
durations and the empty-leg results below do not depend on the date. The first-class seat
counts do (they are generated from the date), so the option count reads 35 or 36 and the
"excluded" list can differ by an entry or two from week to week.

## The run, with clock

### 0:00 to 0:20. Overview: the problem

| Do | Say |
| --- | --- |
| Show the Overview hero. Point at the amber "Demo inventory is simulated" line in the left navigation. | "Private aviation inventory is opaque. Jets fly empty between bookings, travelers can't see those legs, and when a flight breaks, recovery is a phone call. Everything you'll see is simulated: airports and distances are real, schedules and prices are not." |
| Click the trip box under the headline, paste the sentence, click **Plan this trip**. | "I describe the trip once, in a sentence." |

Expect: the button reads "Reading…" for a moment, then the app moves to **Plan a Trip** and
shows a skeleton ("Searching simulated inventory and ranking every option…") for under a
second, then results.

### 0:20 to 1:00. Plan a Trip: the answer and the why

| Do | Say |
| --- | --- |
| In the left column, **Describe your trip**, click the first example chip (it starts "Find the best way for four people to travel from..."). | "It tells me what it understood, and what it assumed." |
| Point at the four columns: Private charter, Empty leg, First class, Hybrid. | "Same party, same dates, door to door, four ways." |
| Point at the **Recommended** badge on the Empty leg column and the **Saves vs charter** row. | "Recommended is an empty-leg round trip: about ten thousand dollars in this simulated demo, against about twenty-six and a half thousand to charter the same jet." |
| Point at **Why this recommendation?** and the amber line about empty legs. | "It says why, and it is plain that an empty leg is a request: the operator controls timing and can change it." |

Expect on screen for the sentence above:

- "What I understood" chips: Travelers 4; From New York area; To Miami; Depart Fri, Return
  Sun (the coming Friday and Sunday); Flexibility Up to 6 hours; Priorities lowest cost,
  flexible departure for savings. A badge "Read by plain rules on your device". One
  assumption: "No departure time given, centering the search on 9:00 AM."
- 35 options (36 on some weeks), 2 or 3 excluded.
- **Empty leg** column (Recommended): "Empty leg (Phenom 300E) out, empty leg (Phenom 300E)
  back", $10,110 total, $2,528 per person, 8h 24m door to door, saves $16,500 vs charter.
- **Private charter** column: "Private charter · Embraer Phenom 300E", $26,610 total,
  $6,653 per person, 8h 24m, "Baseline", tags Most certain / Most control.
- **First class** column: "First class · LGA→MIA · 10:30 AM", $6,060, 12h 30m.
- **Hybrid** column: "Empty leg (Phenom 300E) out, first class back", $7,885, 10h 42m.
- Why panel: "Ranks first with 78.2 points under "Custom mix"..." and "Saves $16,500
  compared with the private charter baseline."
- The first two rows of **Ranked options** look the same ($10,110 each). They are two
  different operators' idle Phenom aircraft on the same route at the same price (Meridian
  and Aerolux); the tail number in the selected itinerary tells them apart. Don't dwell on it.
- Empty-leg itineraries available by flexibility, in the strip under the Schedule
  flexibility control: 6 (Fixed), 8 (±2h), 9 (±6h), 10 (±12h and Whole day).

Optional (10 seconds): in **What matters most**, click **Fastest**. The charter takes over,
$26,610 (8h 24m). Click **Lowest cost**: first class JFK to MIA at $5,875 (12h 45m). "Same
inventory, different priorities, different answer." Then click the example chip again to
restore the original recommendation.

### 1:00 to 2:05. JetShield: the live highlight

| Do | Say |
| --- | --- |
| In the comparison, click the name in the first column, "Private charter · Embraer Phenom 300E". The Selected badge moves to it. | "Say this is the trip I want protected: the charter." |
| Scroll to **Selected itinerary** and click **JetShield** (or use **JetShield** in the left navigation; the selected itinerary carries over). | |
| On JetShield, under **Scenario**, click **Aircraft unavailable**. Click **Simulate disruption**. | "Now I break it. The aircraft is pulled from service." |
| Watch the **Recovery sequence** play (about two seconds), or click **Skip animation**. | "It finds what broke, searches, ranks, and then waits for me." |
| Point at **Replacement options**, the first one marked **Best match**. | "It searches the same pool the operators published. The best match is an empty leg, same aircraft type, same route, about an hour earlier than my original plan." |
| Click **Review & approve**. Point at the amber "Demo only" notice. Click **Approve in demo**. | "Nothing changes until I approve, and here approval only updates the simulated plan. No ticket or aircraft is touched." |
| Point at **Before and after** and **What is protected**. | "And it checks the rest of my trip: the return, the party, the risk." |

Expect on screen:

- The scenario list: Flight delayed, Aircraft unavailable, Weather cancellation (selected by
  default), Connection missed, Ground transfer delayed.
- **Recovery sequence** card with a "Simulated" badge and these steps in order:
  - Planned itinerary: "TEB→OPF · 4 travelers · arrives <Fri> 12:17 PM."
  - Disruption detected, with a simulated clock stamp "at home": "Your aircraft is
    unavailable (cause: aircraft unavailable)..."
  - Options searched: a count ticking up to about 30 options (29 or 30 depending on the date).
  - Replacements ranked: "6 feasible, about two dozen ruled out. Best match: Empty leg ·
    Embraer Phenom 300E · TEB→OPF, 1h 05m earlier than planned."
  - Awaiting your approval: "Nothing changes until you approve a replacement."
- Amber notice "Simulation. This disruption is invented by JetShield for the demo. No
  operator feed is connected."
- Headline "Your aircraft is unavailable", bullets "Private charter · Embraer Phenom 300E ·
  TEB → OPF will not operate (simulated: aircraft taken out of service)." and "You are still
  at home, so JetShield replans the whole journey." Planned arrival 12:17 PM.
- Replacement options: #1 (Best match) and #2 are both "Empty leg · Embraer Phenom 300E ·
  TEB→OPF", arriving 11:12 AM, "1h 05m earlier than plan", change −$8,250, "Moderate" risk,
  with the note "Empty leg: operator can still change or withdraw it". #3 First class
  LGA→MIA arriving 2:25 PM (+2h 08m); #4 First class JFK→MIA arriving 2:50 PM (+2h 33m).
- The earlier arrival is a property of the model, not a miracle: the replan starts from the
  earliest moment you can be ready rather than from the 9:00 AM preferred departure.
- After approval: green notice "Switched in the demo: your itinerary now uses ...".
  **Before and after**: Arrival 12:17 PM to 11:12 AM; Cost of the replaced part $13,305 to
  $5,055. **What is protected**: Return journey (Kept), Party of 4 (Kept), Modeled
  disruption risk 19% (Within limit; "empty legs can still be changed or withdrawn by the
  operator").

The cost changes are negative because the model credits back the unused part of the
original plan (the page labels this illustrative). Do not present them as refunds.

Optional second take (15 seconds, before approving): click **Weather cancellation** and
**Simulate disruption**. Headline "Weather closes TEB". #1 is First class LGA→MIA arriving
2:25 PM (+2h 08m), #2 JFK→MIA 2:50 PM. With every Teterboro departure grounded for four
hours, the best replacement goes through another airport and another mode. A "Considered
but not feasible" list appears with first-class flights that have fewer than four seats
left; the entries depend on the date.

### 2:05 to 2:55. Operator Intelligence: the second beat

| Do | Say |
| --- | --- |
| In the left navigation, under **JetFlex Intelligence**, click **Operator Intelligence**. Point at the stat strip, then **Revenue view**. | "That replacement was not made up. Here is the other side: operators' schedules, and what their idle legs are worth." |
| In **Detected empty legs**, find the **JX101 Phenom 300E** row for **TEB → OPF** and click **Inspect**. | "This aircraft lands at Teterboro, and its next booked flight leaves from Opa-locka, so it must reposition empty. JetFlex flagged the gap." |
| Point at **Revenue vs flying empty** and **Compatible demand**. | "Flying it empty costs about five thousand in this model. Sold at forty-eight fifty it recovers most of that, and five simulated searches fit it, including the search I just made." |
| Scroll to the **JX101 Phenom 300E** row for **OPF → TEB** and click **Mark unavailable**. | "Now the operator withdraws the return leg." |
| Click **Plan a Trip** in the navigation. | "Back in the traveler's view, the recommendation moves." |

Expect on screen:

- Stat strip: Detected legs 44, Published 38, Potential gross $280,300, Expected revenue
  $103,813, Legs with demand 32/38 ("329 seats of otherwise empty capacity").
- "For operators" pitch above the strip, and the **Revenue view**: Expected to sell $103,813,
  Unsold or at risk $176,487, Not on the market $35,500 (6 legs unpublished or unavailable).
  After your edit it says how the numbers moved against the seeded defaults.
- Inspect panel for JX101, TEB → OPF, $4,850 offer, charter estimate $13,100: "JX101 lands
  at TEB (after OPF→TEB <Thu> 11:30 AM) but its next booked flight is OPF→TEB <Fri> 4:00
  PM. 25h 53m idle, so a TEB→OPF repositioning flight is needed." Flies empty, net −$4,978;
  Sold at $4,850, net −$728; Uplift if sold $4,250; Model confidence 75%; Expected revenue
  $3,642. Compatible demand (5): Family of four, weekend away 1.00; Golf weekend, three
  friends 1.00; Your current JetFlex search (Live) 1.00; Couple, price-sensitive 0.92;
  Client delegation 0.91.
- The sold-net figure is still negative: selling the leg does not make the flight profitable
  in this model, it loses $4,250 less than flying it empty. Say it that way.
- After the edit, on Plan a Trip: the Empty leg column is still Recommended but now reads
  $10,340 (was $10,110): the return uses a Meridian Phenom from Palm Beach (PBI to TEB)
  instead of Opa-locka. Open "Options excluded by your constraints": it lists "Empty leg ·
  Embraer Phenom 300E · OPF → TEB (return)", reason "Marked unavailable by the operator".
- Your approved JetShield plan stays selected and marked "Recovered". The app does not
  re-validate an itinerary you already approved against later operator edits; don't edit
  the TEB → OPF legs in this demo for that reason.

Optional (15 seconds, a second operator): back on Operator Intelligence, on the **SK118**
(CJ3+) **OPF → TEB** row badged "Detected only", flip **Publish**. On Plan a Trip the
Empty leg recommendation becomes "Empty leg (Phenom 300E) out, empty leg (CJ3+) back" at
$9,760, cheaper than before the withdrawal. "A second operator publishes its idle leg and
the traveler's best option comes back, cheaper." Then **Reset demo data** if you will run
it again.

Optional (20 seconds, the real-product beat): scroll to **Import operator CSV**, click
**Load sample CSV**. Expect "14 of 14 rows accepted · 5 aircraft (3 new) · 9 booked · 5
listed as empty legs" and "If applied: 5 new empty legs (5 found in schedule gaps, 0 listed
directly), 1 existing leg updated, 5 priced or withdrawn by the operator." Click **Load
sample with errors** to show line-numbered rejections ("Unknown airport "KXYZ" in
origin.", "14 seats exceeds the Phenom 300E cabin (6).", and so on: 14 of 22 rows accepted,
8 rejected). "An operator gives us a file; we tell them exactly which rows we could not
read. The detection engine runs on whatever they give us." Click **Apply** only if you
mean to change the inventory.

### 2:55 to 3:00. Close

"One chain: schedule gaps, detected empty legs, priced and published by the operator,
ranked for the traveler, and JetShield re-plans from the same pool. The inventory is
simulated. The logic is the product."

## If something breaks

| Symptom | Do this |
| --- | --- |
| **Plan this trip** is greyed out | The text box is empty. Click the **Try the Miami demo** tile (or the first example chip) to fill the same sentence, then click the button. |
| "I couldn't find a trip in that" | The sentence got mangled when pasted. Click **Use the Miami example** in that notice. |
| The app asks a question ("Where are you flying from and to?") | Same cause. Use the first example chip on Plan a Trip. |
| You must use the quick-start form | On Overview, set From New York area, To Miami, Depart the coming Friday, Return the Sunday, Travelers 4, Flexible timing Up to 6 hours, click **Compare options**. This uses the "Balanced" priority, so the recommendation is the $26,610 charter, not the empty-leg pair. For the empty-leg answer, open **Fine-tune weights** on Plan a Trip and drag Cost to 9. |
| Numbers differ from this script | Almost always leftover state or a set API key. **Profile & settings**, **Reset demo data**, redo the paste. State lives in the browser (localStorage key `jetflex-v1`). |
| JetShield says "Choose an itinerary to protect" | Click **Use the demo itinerary** (the highest-ranked private charter in the current search). |
| Replacement list is not what you expected | Say what is on screen. The ranking uses your current priorities; a different priority reorders it. An empty leg or a first-class flight at the top is still the same story. |
| The "Recovery sequence" feels slow | Click **Skip animation**. |
| Operator edit does not change the traveler view | You edited a leg the current search does not use, or a leg in the following week (hidden unless **Include the following week** is on). Use the JX101 OPF → TEB row. |
| The page is blank for a second | The store reads localStorage first. Wait; do not click through. |
| Total failure | Fall back to `docs/jetflex/why-this-works.md` (one slide) and `docs/jetflex/pitch-60s.md`. |

## What not to claim

- Not bookable, no payments, no live flights, no live weather. Every disruption is
  scripted by JetShield.
- The sentence reader is rules by default; an AI model is used only if the server has a key
  and it validates. The ranking, detection and recovery are deterministic arithmetic, not
  machine learning.
- Dollar figures are simulated and illustrative. JetShield cost changes assume the unused
  part of the plan is credited back; that is an assumption, not a policy.
- The charter prices include a 7.5% federal excise tax assumption; do not present that
  as tax advice.

## How these numbers were checked

They were computed by running the repo's own functions (`deriveLegs`, `parseRequest`,
`search`, `simulate`, `analyze`, `totals`, `revenueProjection`, `parseOperatorCsv`) against
the seeded data in `src/lib/jetflex/data.ts` with the date set to 10 October 2026, then
re-run for other dates (17 October, 14 October, 7 November) to confirm the headline numbers
hold; only the first-class seat-dependent entries changed. If someone changes the seed
data, the scoring weights or the pricing constants, these numbers move; run the demo once
and update this page.
