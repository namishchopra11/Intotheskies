# Final QA pass before the demo

Tested on Saturday 10 October 2026, late evening, for the demo at 10:00 on Sunday 11 October.

## Verdict

**Ready with these workarounds:** the demo path in `docs/demo-script.md` works three times in
a row, but the live site has no API keys, so **Listen to summary** plays in the phone's
built-in voice (not ElevenLabs) and **Import from a confirmation** says it is unavailable,
until someone adds the keys and redeploys.

## What I tested, and where

- **Live site:** `https://layoverapp.vercel.app`, built from `main` at `b577236` (I
  checked the deployment's commit against `origin/main`). Used for the three demo runs and
  one Listen call.
- **Local production build** of this branch (`pnpm build`, `pnpm start`), with no API keys.
  Used for everything that needed empty storage, a test login, or a broken network, and to
  check the fixes.
- Browser at phone size, 375 x 812. No real phone.
- Unit tests: 241 pass. Lint and build pass.
- Paid calls made: **1 Listen call** on the live site (it returned "not available", so no
  ElevenLabs credits were used) and **0 Import calls**.

| Flow | Where | Viewport | Result |
| --- | --- | --- | --- |
| Demo run 1, fresh storage: guest sign-in, sample trip, change arrives by itself, tap card, rail, Mark done, Share, Mum's WhatsApp link, Mum turns green | Live | 375 x 812 | Pass |
| Demo run 2: Restart the demo trip, change replays once | Live | 375 x 812 | Pass |
| Demo run 3: reload after the change, and reload 3 seconds into the wait | Live | 375 x 812 | Pass |
| The change does not stack (Restart, Simulate a change plus the timer, four scenarios in a row) | Live and local | 375 x 812 | Pass, always one change |
| Numbers match the script: 2h 10m, 14:25, 18:00, pickup 18:40, 5 things to sort | Live | 375 x 812 | Pass |
| Share screen: three messages, preview, booking references hidden by default, Copy link | Live | 375 x 812 | Pass |
| Recipient page `/s` in a tab with empty storage: no sign-in, no change fires, read-only | Local | 375 x 812 | Pass |
| Send help: bad address refused, address saved, kept through Restart, amount check, link, recipient section, QR code, devnet wording | Local | 375 x 812 | Pass |
| Listen to summary on the live site | Live | 375 x 812 | Pass with a caveat: built-in voice, see bug 2 |
| Listen with the network down | Local | 375 x 812 | Pass, built-in voice reads the right sentences |
| Listen with the network down and no built-in voice | Local | 375 x 812 | Failed, fixed (bug 4) |
| Import with no key, and with the network down | Local | 375 x 812 | Pass, plain wording both times |
| Settings: Light, Dark, Auto; voice; the three switches | Local | 375 x 812 | Pass |
| The change with alerts and automatic updates switched off | Local | 375 x 812 | Pass (no card, hotel and pickup become tasks) |
| Create account, log out, log back in; trip is still there; password is not stored | Local | 375 x 812 | Pass |
| Add a trip by hand: required fields, impossible date refused, `0915`, `20/10/2026` and `20 oct` understood | Local | 375 x 812 | Pass |
| Change on the hand-entered trip (one flight, 1h 30m delay) | Local | 375 x 812 | Pass |
| Clear this trip | Local | 375 x 812 | Pass |
| Pick a scenario: 45-minute delay, 3-hour delay, missed connection, cancelled flight | Local | 375 x 812 | Pass, with one wording problem (bug 6) |
| Saved data that is not readable | Local | 375 x 812 | Failed, fixed (bug 1) |
| Saved data with the wrong shape, and storage that refuses to save | Local | 375 x 812 | Pass |
| No sideways scroll on login, home (all states), trip menu, share, `/s`, settings, `/trip` and its forms | Live and local | 375 x 812 | Pass |
| Tap targets at least 44px | Live and local | 375 x 812 | Failed for two links, fixed (bug 5); one 40px button left (bug 9) |
| Dark mode, home screen after the change | Local | 375 x 812 | Pass, no low-contrast text found |
| Wording: simulated feed, no claims about rights or compensation | Source and screens | n/a | Two lines fixed (bug 3); nothing about rights or amounts found |

## Bugs

### 1. The app could hang on "Loading your trip" forever (fixed, `1f00c99`)

- **Steps:** set the saved entry `connectionkeeper-trip` in the browser's storage to something
  that is not valid JSON (for example `{not json!!`), then open the app.
- **What happened:** "Loading your trip" stayed on screen. I waited 8 seconds and it never
  moved. Nothing in the console.
- **Expected:** the app starts as if nothing was saved.
- **Cause:** when the read throws, the store never reports that it has finished loading. A
  browser that blocks storage would hit the same path.
- **Fix:** unreadable or blocked storage now reads as "nothing saved", and a failed save no
  longer throws. New file `src/lib/safeStorage.ts` with three tests. Checked in the browser:
  the same broken entry now opens the sign-in screen.

### 2. The live site has no API keys (not fixed: needs you)

- **Steps:** `vercel env ls` for the project, and the project's env list through the API.
- **What happened:** no environment variables at all, in any environment.
  `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` are both missing.
- **Effect on stage:** **Listen to summary** asks the server, gets "not available", and reads
  the summary in the phone's built-in voice instead. It is not silent, but it is not the
  ElevenLabs voice the script promises. **Import from a confirmation** shows "Import isn't
  available right now. You can add your trip by hand."
- **Expected:** both keys set for Production.
- **Not fixed:** I was told not to change env vars or deploy. See "Before 10:00" below.

### 3. Two lines implied things are real when they are simulated (fixed, `91d33fa`)

- **Steps:** open Settings; and look at **Handled for you** after the change.
- **What happened:** Settings said "Your flights are always tracked." **Handled for you**
  listed "Told Hotel Aventino Garden your new arrival" and "Moved your pickup" as **Done**,
  with nothing on screen saying no message is sent.
- **Expected:** anything that implies live data or real messages says it is simulated.
- **Fix:** Settings now says the flights are watched through a simulated feed. One grey line
  under **Handled for you** reads "Simulated in this demo: no message is really sent to the
  airline, hotel or driver." This adds one line to the main demo screen; revert that commit
  if you would rather keep saying it out loud only.

### 4. Listen could show "Failed to fetch" (fixed, `e5f6a6b`)

- **Steps:** network down, on a device with no built-in voice, tap **Listen to summary**.
- **What happened:** the red text under the button was the browser's raw error, "Failed to
  fetch".
- **Expected:** plain words.
- **Fix:** it now says "Couldn't play the summary. Check your connection and try again."

### 5. Two links were smaller than a fingertip (fixed, `41bd81e`)

- **Steps:** home screen, **If you need them**.
- **What happened:** `britishairways.com` and `ita-airways.com` were 32px tall.
- **Fix:** 44px tall. Each of those two rows is 12px taller.

### 6. The 45-minute delay scenario contradicts itself (not fixed)

- **Steps:** menu, **Pick a scenario**, **45-minute delay**.
- **What happened:** the board says the Rome arrival is **Unchanged** (15:05), but Marco's
  step is red with "Still expects the old arrival", and the checklist includes "Rearrange
  your pickup or transfer" and "Tell the hotel you may arrive late".
- **Expected:** if the arrival has not moved, Marco is not a problem; at most a warning that
  the connection is tight.
- **Not fixed:** it means changing the checklist and timeline logic the night before, and I
  am not sure which wording the team wants. Recommendation: in `buildTimeline`, when the
  final arrival equals the booked one, show the pickup as a warning ("Connection is tight.
  Warn them it may slip.") instead of red.

### 7. Pick a scenario and Restart the demo trip throw away a hand-entered trip (not fixed)

- **Steps:** add your own trip by hand, then menu, **Pick a scenario**, any scenario.
- **What happened:** my trip was replaced by the sample trip. It was not saved to the saved
  trips list, and nothing warned me.
- **Expected:** a warning, or the two demo buttons only shown on the sample trip.
- **Not fixed:** more than a small change. It only matters if you add a trip by hand on
  stage and then use those buttons.

### 8. Only one address is public (note, nothing to fix)

`layoverapp.vercel.app` opens for anyone. The other addresses Vercel gives the project
(`connectionkeeper-claude-fd93.vercel.app` and the per-deployment ones) ask for a Vercel
login. Shared links use whatever address the app is open on, so open the app at
`layoverapp.vercel.app` on stage or the second device will hit a login page.

### 9. Small things, not fixed

- The calendar button next to each date field on `/trip` is 40 x 40, just under 44.
- An empty trip says "Add a flight and Layover starts watching it" with no "simulated".
- The amount field on the share screen has no label a screen reader can read.
- Logging in (not creating an account) takes the name from the email, so `qa@...` becomes "Qa".
- "BA 286 lands 12:45, 1h 15m after it left at 11:30": "it" means AZ 201, which is not clear.
- "in 6 days" on the on-time screen counts from today's date, so it will read "in 5 days"
  tomorrow.

## Cheat sheet for the presenter

**Say this**

- "The airline feed is simulated" when you point at **Watching · simulated feed**.
- "The app already sorted the hotel and the transfer. In this demo that part is simulated
  too." The screen now says so under **Handled for you**.
- If a judge picks a scenario, steer to **Missed connection** or **3-hour delay**.
- On Send help: "It runs on Solana's test network, so no real money moves. We never hold keys."

**Do this**

- Open the app at `https://layoverapp.vercel.app/login`, not any other address.
- Start with menu, **Clear this trip**, then **Try the sample trip**.
- Leave the three switches in Settings **on**. With them off there is no notification card
  and the hotel and pickup are not handled, so the screen will not match the script.
- If you miss the card, carry on. The home screen has already changed.

**Do not tap this**

- Any **Call** button or phone number.
- **Send help** on the recipient page, unless that phone has a wallet app set to devnet.
  Point at it. In Phantom, stop on the filled-in screen and do not tap Send.
- **45-minute delay** in Pick a scenario (bug 6).
- **Pick a scenario** or **Restart the demo trip** while a hand-entered trip is open (bug 7).
- **Import from a confirmation**, unless the keys are added and you have tested it.
- **Listen to summary**, unless you have heard it on the stage phone first (see below).
- **Delete account** in Settings.

## Before 10:00, by hand

1. **Add the two keys and redeploy** (only if you want the ElevenLabs voice and Import):
   in Vercel, project `connectionkeeper`, Settings, Environment Variables, add
   `ELEVENLABS_API_KEY` and `ANTHROPIC_API_KEY` for Production, then redeploy. Env vars only
   apply to new deployments.
2. **Then tap Listen once on the stage phone** and check you hear the ElevenLabs voice. If you
   skip step 1, still tap it once: I could not confirm that an iPhone lets the built-in voice
   start after the server says no. If it is silent, cut the Listen step.
3. **Decide on this pull request.** Merging it to `main` redeploys the live site. If you
   would rather not change the site the night before, leave it: the demo path works without
   these fixes.
4. Rehearse once on the real phone after any redeploy, starting from **Clear this trip**.

## What I could not test, and why

- **A real phone** (iPhone Safari, Android Chrome): I only had a desktop browser at phone
  size. Touch, the on-screen keyboard, the phone buzz and safe areas are unchecked.
- **Sound:** I confirmed the right sentences are handed to the built-in voice, not that
  anything is audible.
- **The ElevenLabs voice** and **a real Import**: the live site has no keys, and the local
  build has none either.
- **Real airplane mode:** I made the requests fail inside the page instead. The app code
  takes the same path, but the browser itself was online.
- **A browser that blocks storage completely:** covered by a unit test, not in a browser.
- **Opening WhatsApp, Messages or Mail:** I checked the links carry the right text and
  stopped them from opening, so nothing was sent to anyone.
- **Phone links:** not tapped, as instructed.
- **Phantom and signing:** not done and not allowed. For Send help I used the public test
  address already in the repo's tests, `9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`
  (`src/lib/solana/pay.test.ts`), on devnet only. No wallet, keys or transaction.
- **System notifications** and the phone's share sheet: both need permission prompts on a
  real device.
- **Hotel and ride forms on `/trip`:** I opened them and checked sizes, but only saved a
  flight by hand.
