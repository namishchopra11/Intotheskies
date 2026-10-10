# JetFlex pitch: 60 seconds, 20 seconds, 10 seconds

Speak it plainly. Every dollar figure below comes from the simulated demo inventory, so say
"in our simulated demo" the first time you use one. Nothing here is real market data and
nothing is bookable.

## 60-second version (about 150 words, 2.5 words per second)

| Time | Beat | Say |
| --- | --- | --- |
| 0:00 to 0:13 | Problem | "Private aviation inventory is opaque. When a jet finishes one booking and has to reach the next, it often flies a leg with nobody on board. A traveler can't see that capacity, and an operator has no easy way to sell it." |
| 0:13 to 0:25 | Product | "JetFlex reads an operator's schedule, finds those gaps, and lets the operator price and publish them. Then it compares charter, empty leg, first class and hybrid for your exact party and dates." |
| 0:25 to 0:43 | Why it works | "Describe your trip in one sentence. In our simulated demo, four people from New York to Miami, Friday to Sunday, comes out around ten thousand dollars on empty legs, against about twenty-six and a half thousand chartering the same jet. And it shows its working." |
| 0:43 to 0:53 | Disruption | "When the plan breaks, JetShield searches that same pool for a replacement, and nothing changes until you approve it." |
| 0:53 to 1:00 | Close | "Dead miles become options. The inventory is simulated. The detection logic is the product." |

Word count: about 150. If you run long, drop the sentence "And it shows its working."

### Delivery notes

- Hold a beat after "nobody on board". It is the whole problem in four words.
- Do not say "AI-powered" without the next sentence saying what it does. The natural-language
  box is a rule-based parser by default; an optional LLM parser exists (see
  `docs/jetflex.md`). The ranking, detection and recovery are deterministic arithmetic you
  can inspect.
- If a judge interrupts at "ten thousand", answer in one line: "Both figures are from our
  simulated inventory; the point is that the engine produces and explains the comparison."

## 20-second version (about 50 words)

"Jets often fly empty between bookings, and nobody outside the operator can see those
legs. JetFlex detects them from the operator's schedule, lets the operator price and
publish them, ranks them against charter and first class for your trip, and re-plans with
JetShield when a flight breaks. The inventory is simulated; the logic is real."

## 10-second version (about 25 words)

"JetFlex turns an operator's idle repositioning legs into options travelers can compare,
and re-plans from the same pool when a trip breaks. Simulated inventory, working logic."

## Numbers you may quote (all from the simulated demo, today's seed data)

| Claim | Where it comes from |
| --- | --- |
| About $10,110 for the recommended empty-leg round trip, four travelers, New York area to Miami, Fri to Sun | Plan a Trip, recommended option, after pasting the demo sentence |
| About $26,610 for the cheapest private charter on the same dates and party (includes a 7.5% federal excise tax assumption) | Same screen, "Private charter" column; the app calls this the charter baseline |
| 44 detected empty legs, 38 published, from a 16-aircraft sample fleet over two weeks | Operator Intelligence, top stat strip |

Re-check these on the day (see the verification note at the end of
`docs/jetflex/demo-script.md`). If a figure on screen differs, say the figure on screen.
