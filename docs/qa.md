# QA report

Tested on Saturday 10 October, on the latest `main` (after the screens, share page and
Solana UI were merged).

**How I tested:** I built the app (`pnpm build`, `pnpm start`) and walked the whole demo
from `docs/demo-script.md` as a first-time user: load the sample trip, report a 45-minute
delay, read the result, tick two tasks, open the share screen, copy the link, open the link
as the recipient. I used a browser set to a phone size (390 x 844 pixels, touch screen).

**What I did not test:** a real phone, iPhone Safari, Android Chrome, dark mode, the
Solana "Send help" flow with a wallet, or the live internet (everything ran on my machine).
Those need a person with a phone.

**The demo path works from start to finish.** The numbers on screen are the right ones: arrival
11:20 (was 10:35), connection 10 minutes (was 55) with an amber **Tight** badge, 7 tasks, 2 of
7 done after two ticks, and a link that opens a read-only page. No errors showed up in the
browser.

Problems are listed most serious first. I have not changed anyone else's files. The owner is
the person who should fix each one.

---

## 1. The shared message and the recipient page list the traveler's own to-dos

**Seriousness:** high. A judge will see this on the recipient page.

- **What I did:** reported the 45-minute delay, ticked two tasks, tapped **Send an update**,
  then opened the copied link as the recipient.
- **What I expected:** a short list of things Alex still has to sort out that matter to the
  people waiting.
- **What happened:** the message ("Still to sort out") and the recipient page ("Still on
  Alex's list") include lines meant for Alex only: **"Send an update to someone waiting for
  you"** (which the person waiting reads, about themselves), **"Ask British Airways what
  you're entitled to"**, and **"Keep receipts for extra costs"**.
- **Owner:** Boris (`summary.ts`, `shareLink.ts`).
- **Fix ready:** `docs/patches/shared-message-skip-personal-tasks.patch`. It keeps those
  personal tasks out of the message and the link, and adds a test. I ran the full test suite
  on it (85 tests pass) and lint and type checks are clean. To apply it, run this from the
  project folder: `git apply docs/patches/shared-message-skip-personal-tasks.patch`

## 2. A second rehearsal without a reset gives the wrong result

**Seriousness:** medium. It is a trap when you rehearse, not a bug for a judge.

- **What I did:** ran the demo, tapped **Back to trip**, then tapped **Report a change** and
  **+45 min** again.
- **What I expected:** a fresh 45-minute delay, **Tight**.
- **What happened:** the form starts from the already delayed times (17:25 and 11:20), so
  **+45 min** makes it 18:10 and 12:05, and the badge says **Likely missed**.
- **Why it happens:** the app remembers the trip, and a new delay adds to the old one. That
  is probably right for real trips.
- **What to do:** before each run, scroll to the bottom of the home screen, tap **Delete trip
  from this device** twice, then **Load sample trip**. This is now step 3 of "Before you walk
  on" in the demo script.
- **Owner (optional):** Will or Namish could put a clearer **Start over** button near the top
  of the home screen, so there is less to scroll.

## 3. Tapping a Call button dials the made-up Rome numbers

**Seriousness:** medium, only if someone taps it on stage.

- **What I did:** looked at the home screen and the checklist.
- **What I expected:** call buttons for the hotel and airlines.
- **What happened:** they are real `tel:` links. The UK number is in a reserved fictional range
  and is safe. Italy has no such range, so the Rome numbers (`+39 06 5550 0142` and `0177`)
  could ring a real stranger.
- **What to do:** the demo script says to point at **Call** buttons, not tap them. Do the same
  if a judge reaches for your phone: tell them the numbers are made up.
- **Owner:** Sebastian, if you want the Rome numbers changed to something that cannot ring. I
  would rather not guess a number that is safe, so tell me if you want that done.

## 4. A 10-minute connection shows **Tight**, not **Likely missed**

**Seriousness:** low. This is a decision, not a bug.

- **What happened:** the connection card says **Tight** (amber) at 10 minutes. The app only
  says **Likely missed** when the arrival is after the onward departure.
- **What to do:** the pitch and demo script use "tight" and "at risk" and never "missed". A
  judge might ask why 10 minutes is not red. The honest answer: it is possible but very
  unlikely, and we do not want to claim more than we know.
- **Owner:** Boris, if the team wants red below a certain number of minutes.

## 5. Small look-and-feel details

**Seriousness:** low.

- **The dash glued to the text.** In the share preview the list lines look like `-BA 286` with
  no gap after the dash. (The text really has a space; the font's space is narrow.)
- **"AZ 201" splits across two lines** in the preview (`AZ` at the end of one line, `201` at
  the start of the next). A non-breaking space between the airline code and the number would
  stop that.
- **Owner:** Will (the look) or Boris (the text).

## 6. Things I could not check

- **Solana "Send help".** The toggle on the share screen reads **Add your Solana address on the
  trip screen first** and stays off until an address is saved. I did not test saving an
  address, sending, or opening a wallet. Until someone has done that on a phone, the pitch
  says nothing about it.
- **A real phone.** Please open the app on the phone you will present from, run the whole
  demo script once, and tell me anything that feels slow, cut off, or hard to tap.
- **Dark mode.** There are **Light**, **Dark** and **Auto** buttons at the bottom of the home
  screen. Make sure the phone you present on looks right, and stays in light mode if it does
  not.
