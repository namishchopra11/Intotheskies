# QA report

## Latest: Saturday night pass on the merged Layover app (`main` at `b577236`)

Ran the production build at phone size (375 to 390 pixels wide) as a first-time guest:
sign-in screen, **Continue as guest**, **Try the sample trip**, the automatic change, all
four **Pick a scenario** changes, **Share the new plan**, **Copy link** and the recipient
page, the trip menu, **Your trip** (added a flight by hand, including the empty-form errors),
**Settings**. Unit tests: 238 pass. Lint and build are clean. No errors in the browser
console on any screen.

**Result: the demo path works.** What is left is below, most serious first. Each has an
owner; nothing here was changed in their files.

### 1. The live site has no API keys (team, whoever owns Vercel)

- **What I did:** asked the live site's import and speech routes whether they are set up
  (an empty request, which costs nothing).
- **What happened:** both answer "isn't available right now". `ANTHROPIC_API_KEY` and
  `ELEVENLABS_API_KEY` are not set in Vercel.
- **What it means on stage:** **Import** shows "Import isn't available right now. You can add
  your trip by hand." **Listen to summary** still talks, but in the phone's own voice, while
  the screen says it uses ElevenLabs.
- **What to do:** add both keys in Vercel (Settings > Environment Variables) and redeploy.
  Until then, do not mention Import or ElevenLabs. The pitch and demo script now say this.

### 2. "Handled for you" and Settings do not say they are simulated (screens owner)

- **What I saw:** **Handled for you** lists "Told Hotel Aventino Garden your new arrival" and
  "Moved your Roma Airport Transfers pickup to 18:40", each marked **Done**. Settings says
  "Your flights are always tracked." and "Send your hotel the new arrival time".
- **Why it matters:** none of that really happens. `CLAUDE.md` says anything that says
  Layover told a hotel or moved a ride must say it is simulated. A judge who reads "Done" may
  think a hotel was really contacted.
- **What to do:** add a short "Simulated in this demo" line under **Handled for you** and in
  Settings. A fix is ready on the branch `fix/screens` for the owner to review.

### 3. The privacy line on the first screen is out of date (screens owner)

- **What I saw:** "Your trip is saved only on this phone. Listen sends the summary to
  ElevenLabs for audio. No account needed." It does not mention that **Import** sends what you
  paste to Claude. (Settings and the import sheet do say it.)
- **What to do:** mention both. Fix on `fix/screens`.

### 4. The missed-connection line reads as if the wrong flight left (logic owner)

- **What I saw:** "Missed AZ 201. BA 286 lands 12:45, 1h 15m after it left at 11:30."
- **Why it matters:** "it" sounds like BA 286. It means AZ 201.
- **What to do:** "BA 286 lands 12:45, 1h 15m after AZ 201 left at 11:30." Fix on `fix/logic`.

### 5. A 45-minute delay says the pickup "still expects the old arrival" (logic owner)

- **What I did:** menu > **Pick a scenario** > **45-minute delay**.
- **What happened:** the Rome arrival does not change (still 15:05), but **Marco · pickup**
  is red: "Still expects the old arrival."
- **Why it matters:** the old arrival is still right, so red and "old arrival" are confusing.
- **What to do:** when the arrival has not moved, say the pickup is fine as long as the
  connection is made. Fix on `fix/logic`.

### 6. The sign-in screen says "Welcome back" to a first-time visitor (screens owner)

- **What I saw:** a judge opening the link for the first time lands on **Log in** with
  "Welcome back". **Continue as guest** is below the form.
- **What to do:** in the demo, go through **Continue as guest** before you walk on (the demo
  script already says so). Small wording fix on `fix/screens`.

### 7. Small things

- **Import:** PDFs are not made smaller before upload. A few large ones together can pass
  Vercel's 4.5 MB upload limit and show only "Reading failed". The import route also has no
  limit on how often it can be called, and each call spends Anthropic credit. (screens owner)
- **Trips you type in yourself** have no way to add people waiting (like Marco or Mum), so
  **Send to** on the share screen is empty for them. (screens owner)

### Checked and fine

- The share preview shows booking references greyed out even when the switch is off. That is
  on purpose: switched-off lines are dimmed and left out of the copied text and link.
- Form labels are linked to their boxes for screen readers.
- **Add a flight** after the empty-form errors: the date and time boxes go back to normal once
  a valid value is typed (the red fades out over a moment).
- A trip typed in by hand (one flight, no hotel) plays a simulated change correctly: a
  1h 30m delay, the new arrival, and a checklist.
- Listen falls back to the phone's own voice when ElevenLabs is not available (fixed since
  the first pass).

---

## Earlier pass (before the Layover merge)

Tested on Saturday 10 October, on the latest `main` (the "automatic flow": the app watches a
simulated flight feed and the change arrives by itself).

**How I tested:** I built the app (`pnpm build`, `pnpm start`) and walked the whole demo from
`docs/demo-script.md` as a first-time user, in a browser set to a phone size (390 x 844
pixels, touch screen):

1. Tap **Try the sample trip**, wait for the change (it arrived about 7 seconds later).
2. Read the new plan, tick two tasks, check the counter.
3. Tap **Share the new plan**, check the preview, tap **Copy link**, open the link as the
   recipient.
4. Menu: **Add or edit reservations**, **Restart the demo trip**, **Clear this trip**.
5. The Solana path: save a wallet address, switch on **Add a Send help button**, enter an
   amount, copy the link, open the recipient page.
6. **Listen to summary**.

I also ran the unit tests: 119 pass.

**Result: the demo path works from start to finish.** The wording on screen matches the script.
No errors showed in the browser console.

**What I did not test:** a real phone, iPhone Safari, Android Chrome, dark mode, opening a real
wallet from **Send help**, or hearing **Listen to summary** out loud (I confirmed the app hands
the right sentences to the browser's speech, not the sound itself). Those need a person with a
phone. Sebastian tested Send help on a real phone afterwards; see problem 5.

---

## Problems, most serious first

None blocks the demo. All of these are small.

### 1. The notification card covers the top of the screen for about 9 seconds

- **What I did:** let the change arrive, then looked at the screen. Later, went straight to the
  share screen.
- **What I expected:** the headline readable as soon as the change lands.
- **What happened:** the card sits over the top of whatever screen you are on. It hides the
  start of the headline, **London connection missed. You're on the 14:25 instead.**, and, if
  you go to the share screen within about 9 seconds, part of the message preview.
- **What to do:** the script says to tap the card (or the small **X**) after you have said what
  it says. Do that, then read the headline. Owner (optional): Will could shorten how long it
  stays.

### 2. About 7 seconds of nothing at the start

- **What happened:** after **Try the sample trip** the screen shows the on-track trip for about 7
  seconds before the change arrives.
- **What to do:** the script has the opening lines to fill that gap. If a judge is waiting, use
  tap **Simulate a change** to skip it.

### 3. Call buttons still dial the made-up Rome numbers

- **What happened:** the phone buttons are real `tel:` links. The UK number is in a reserved
  fictional range and is safe. Italy has no such range, so the Rome numbers (`+39 06 5550
  0142` and `0177`) could ring a real stranger.
- **What to do:** point at the buttons, do not tap them. Tell me if you want the Rome numbers
  replaced with something that cannot ring.
- **Fixed since:** the Rome numbers now start `+39 06 0000`, which no Italian number does, so
  they cannot connect to anyone.

### 4. **Clear this trip** wipes the saved Solana address

- **What happened:** the wallet address stays through **Restart the demo trip** but is lost on
  **Clear this trip**.
- **What to do:** the demo script covers it. If you want to show Send help, save the address
  after clearing, then use **Restart the demo trip** as your first step.

### 5. Not verified by me

- **Send help on a phone (tested by Sebastian, Saturday evening).** On an iPhone with Phantom
  in Testnet Mode (Solana Devnet), on the live site:
  - Saving the wallet address, switching on **Add a Send help button**, entering **5** and
    copying the link all work.
  - The recipient page shows **Send help**, the QR code and the address.
  - Scanning the QR code with Phantom opens a payment screen with the right amount (**5**) and
    the right recipient. **This is the part that is ours, and it works.**
  - Phantom then shows **Insufficient balance** and **Failed to generate a valid transaction**,
    even though the sending account holds 20 devnet USDC and 1 devnet SOL (checked on the
    blockchain). Phantom's own **Send** screen does not list devnet USDC either. This is a
    limit of Phantom's test mode with devnet USDC, not a bug in the app.
  - **What to do:** on stage, scan the QR code and **stop on Phantom's filled-in screen**. Do
    not tap Send. The demo script says this.
- **Listen to summary.** The sentences are right ("You missed your flight to Rome. You are now
  on a new flight arriving at 6:00 PM. Nothing else on your trip is affected. First, check your
  new booking for AZ 207."). It uses the phone's own voice, so volume and voice vary by phone.
- **Dark mode.** There are **Light**, **Dark** and **Auto** options in the menu. Make sure the
  phone you present on looks right, and stay on Light if it does not.

---

## Will's Layover branch (`design-share`, merged; both problems below fixed)

Tested on Saturday evening by running the branch on a Mac at phone width. The AI import and
ElevenLabs need API keys that were not on that Mac, so their failures there are expected. These
two problems are not:

### A. Listen has no backup voice (Boris)

- **What I did:** tapped **Listen to summary** with no ElevenLabs key available.
- **What I expected:** the phone's built-in voice reads the summary, as it does on `main`.
- **What happened:** red text, "Listen isn't set up yet. The team needs to add the ElevenLabs
  API key." No sound. The built-in voice fallback (`speechSynthesis`) is gone from
  `useSpeech.ts`.
- **Why it matters:** if the key is missing, the venue wifi drops, or ElevenLabs credits run
  out on stage, Listen does nothing. The playbook says it should always fall back to the
  built-in voice.

### B. Error messages are written for developers (Will, Boris)

- **What happened:** Import shows "Import isn't set up yet: add ANTHROPIC_API_KEY to .env.local
  and restart." Listen shows "The team needs to add the ElevenLabs API key."
- **What to do:** say it the way a traveler would understand, for example "Import isn't
  available right now. You can add your trip by hand." Also check that both keys are set in
  Vercel before the demo.

### Still to test on this branch

Share and the link, Send help, Settings, log out and back in, and adding a trip by hand.

---

## Fixed since my first pass

- The shared message and the recipient page no longer include the traveler's own to-dos (for
  example "Keep receipts"). They show a short, third-person list instead.
- The Copy buttons work on plain `http://` addresses, with a fallback.
- The "second rehearsal stacks the delay" trap is gone: the change now plays from a fixed
  script, and **Restart the demo trip** puts the trip back cleanly.
