# QA report

Tested on Saturday 10 October, on the latest `main` (the "automatic flow": the app watches a
simulated flight feed and the change arrives by itself).

**How I tested:** I built the app (`pnpm build`, `pnpm start`) and walked the whole demo from
`docs/demo-script.md` as a first-time user, in a browser set to a phone size (390 x 844
pixels, touch screen):

1. Tap **Try the sample trip**, wait for the change (it arrived about 7 seconds later).
2. Read the new plan, tick two tasks, check the counter.
3. Tap **Share the new plan**, check the preview, tap **Copy link**, open the link as the
   recipient.
4. Menu: **Trigger the change now**, **Restart the demo trip**, **Clear this trip**.
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
  menu > **Trigger the change now** to skip it.

### 3. Call buttons still dial the made-up Rome numbers

- **What happened:** the phone buttons are real `tel:` links. The UK number is in a reserved
  fictional range and is safe. Italy has no such range, so the Rome numbers (`+39 06 5550
  0142` and `0177`) could ring a real stranger.
- **What to do:** point at the buttons, do not tap them. Tell me if you want the Rome numbers
  replaced with something that cannot ring.

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

## Will's Layover branch (`design-share`, not merged yet)

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
