# Overnight report (Saturday night)

Written by Claude for Sebastian, from a full test of the merged Layover app and a read of the
code. **Short version: the demo works.** Tests (238), lint and the production build all pass,
and no screen showed an error. What is left is small, plus two keys only the team can add.

## Sebastian: do this when you wake up

1. Read **"For the team"** below out loud to the team, or send them the link to this page.
2. Ask whoever owns the Vercel project to add the two keys (item 1 below). Until they do,
   **do not mention Import or ElevenLabs** at the table.
3. Ask Namish to merge his `qa-final` branch (checked, it passes everything). Then ask the
   screens owner to look at `fix/screens` and the logic owner at `fix/logic`. Each is one
   small commit. They merge it or drop it.
4. Open `docs/demo-day.md` and work through it top to bottom. It has the one-hour-before
   list and how to record the backup video.
5. Rehearse the pitch twice against a 3-minute timer. `docs/pitch.md` now has answers for
   "Did it really tell the hotel?" and "Do you use AI?".

## For the team

### 1. Add the API keys in Vercel (needed before the demo)

On the live site, Import and ElevenLabs are both switched off: their keys are not set. I
checked with an empty request, which costs nothing.

- `ANTHROPIC_API_KEY`: Import (reads a pasted confirmation with Claude)
- `ELEVENLABS_API_KEY`: Listen to summary in the voice picked in the menu

Vercel > the project > Settings > Environment Variables, add both for Production, then
redeploy. Without them the app still works: Import says it is not available, and Listen uses
the phone's own voice.

### 2. Namish's `qa-final` branch (pushed late Saturday, not merged yet)

Fixes an endless loading screen when the saved trip is unreadable, a plain message for Listen
instead of "Failed to fetch", bigger airline link tap targets, and the "simulated" notes on
**Handled for you** and in Settings. I ran it: 241 tests pass, lint and the build are clean.
Merge it first.

### 2b. `fix/screens`: for the screens owner (not merged)

`src/app/page.tsx`, `src/app/login/page.tsx`. Two short changes, and it merges cleanly on top
of `qa-final` (the "simulated" notes were dropped from this branch since `qa-final` has them):

- The privacy line on the first screen also says Import sends what you add to Claude.
- Sign-in says "Welcome to Layover", not "Welcome back", to a first-time visitor.

### 3. `fix/logic`: for the logic owner (not merged)

`src/lib/domain/timeline.ts` plus one new test:

- "BA 286 lands 12:45, 1h 15m after **it** left at 11:30" now says "after **AZ 201** left".
- On a 45-minute delay the Rome arrival does not move, but Marco showed red "Still expects the
  old arrival". He now shows amber: "Pickup still on for 15:05 if you make the connection."

239 tests pass on the branch.

### 4. Worth knowing, not fixed

- Import has no limit on how often it can be called, and each call spends Anthropic credit.
  Fine for a demo; worth a note if a judge asks about cost.
- Several large PDFs at once can pass Vercel's 4.5 MB upload limit and show only "Reading
  failed". Screenshots are shrunk before upload, PDFs are not.
- A trip typed in by hand has no way to add people waiting (like Marco or Mum), so **Send to**
  on the share screen is empty for it. The read-only link still works.

## What changed on `main` overnight (Sebastian's files only)

- `docs/qa.md`: the Saturday night test, most serious first, with an owner for each item.
- `docs/pitch.md`: Import and ElevenLabs depend on the keys; what leaves the phone; Handled
  for you is simulated; where AI is used.
- `docs/demo-script.md`: the live address; Listen falls back to the phone's voice.
- `docs/demo-day.md`: new, the morning checklist.
- `README.md`: the live link and new screenshots showing Layover.
- `docs/overnight-report.md`: this page.
