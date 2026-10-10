# Demo script

Live demo, about 100 seconds (an estimate: time it in rehearsal). The numbers and wording
quoted below were produced by running the app's real logic on the sample trip, so they
are what you will see on screen.

**How to read this:** each step has **TAP** (what your finger does), **POINT** (what the
judges should look at) and **SAY** (spoken words, written to be said out loud, not read).

**Square brackets like `[confirm label]`** mean the screen did not exist yet when this was
written, so I do not know the exact button text. First time you run the app, fix these to
match the real buttons. The disruption screen (steps 3 and 4) is built on the team's
`foundation` branch, and its wording is exact.

---

## The story in one breath

Alex Morgan is flying San Francisco to Rome through London. Two airlines, two booking
confirmations, one hotel. The first flight gets delayed 45 minutes. That turns a relaxed
55-minute connection in London into a 10-minute sprint, and it puts the hotel check-in at
risk.

## Before you walk on (2 minutes, do this every time)

1. Charge the phone. Turn off notifications and Do Not Disturb on.
2. Open the app in the browser you will use on stage. **Use the HTTPS address** if the team
   has one (the Copy button can fail on a plain `http://192.168...` address).
3. Reset the trip so you start clean: `[confirm label: Reset / Start over]`. The app
   remembers things on the phone, so a second run will otherwise show the first run's delay.
4. Do **not** load the sample trip yet. Step 1 is the first thing the judges see.
5. Open your messaging app in another tab or on a second device, with a chat ready to
   paste into (use your own number or a teammate).
6. Have the backup video ready to play (see "If something goes wrong").
7. Do not tap any phone number during the demo. The numbers are made up, but the Rome ones
   might ring a stranger.

---

## Step 1. Load the trip (10 seconds)

**TAP** `[confirm label: Load sample trip]` on the home screen.

**POINT** at the flights, the hotel and the contacts, in that order.

**SAY**
> "This is Alex's trip to Rome. A flight from San Francisco to London, a flight on to
> Rome, a hotel, and the phone numbers Alex will need. Normally that is four different
> apps and emails. Here it is one screen."

**On screen:** two flights (BA 286 and AZ 201), Hotel Aventino Garden, three contacts.

---

## Step 2. Report what changed (20 seconds)

**TAP** `[confirm label: Report a change / Something changed]`.

**TAP** BA 286, San Francisco to London, as the flight.

**TAP** **Delay**.

**ENTER** 45 minutes. If the form asks for times instead of minutes, use
**departs Fri 16 Oct 17:25** and **arrives Sat 17 Oct 11:20**.

**TAP** `[confirm label: Save / Continue]`.

**SAY** (while you type)
> "The airline app just told Alex the first flight is 45 minutes late. That is all Alex
> has to tell us. Just what changed."

---

## Step 3. See what is now at risk (25 seconds)

You land on the **Flight delayed** screen.

**POINT** at the flight card: arrives **11:20**, was **10:35**.

**SAY**
> "Here is the before and after. Landing at 11:20 instead of 10:35."

**POINT** at the **Onward connection** card, the amber **Tight** badge, and the line
**"Was 55 min, now 10 min."**

**SAY**
> "And this is the part nobody told Alex. The connection in London was 55 minutes. Now it
> is 10. The app worked that out from the trip. It knows the next flight and when it leaves."

**POINT** at the hotel card under it: *"Your connection to AZ 201 is tight. If you miss it
you will reach Hotel Aventino Garden late."*

**SAY**
> "It also knows there is a hotel waiting in Rome, so that is at risk too."

Say **"tight"** and **"at risk"**. Do not say "missed". The app says the connection is
tight, not lost, and we should match it.

---

## Step 4. Work through the checklist (25 seconds)

**SCROLL** down to the checklist. It starts at **0 of 7 done**.

**POINT** at **Rebook the onward flight AZ 201** and **Tell the hotel you may arrive late:
Hotel Aventino Garden**.

**SAY**
> "This is not a generic list. It says rebook AZ 201, because that is Alex's actual
> flight. It says tell Hotel Aventino Garden, because that is Alex's actual hotel. The
> trip drives the list."

**POINT** at the **Call ITA Airways** and **Call Hotel Aventino Garden** buttons.
**Do not tap them.**

**SAY**
> "And the right phone number is one tap away."

**TAP** the checkbox on **Rebook the onward flight AZ 201**.

**TAP** the checkbox on **Tell the hotel you may arrive late**.

The counter now reads **2 of 7 done**.

**SAY**
> "Alex does those two, ticks them off."

---

## Step 5. Tell the people waiting (20 seconds)

**TAP** **Send an update** (the big blue button at the bottom).

You are on the share screen.

**POINT** at the preview message and the options. Read one line out loud:
*"BA 286 (San Francisco to London) is delayed by 45 min. It now arrives Sat 17 Oct at 11:20
instead of 10:35."*

**SAY**
> "Someone is waiting in Rome. Alex is not going to type all this with tired thumbs in a
> departure lounge. The app writes it, in plain words."

**POINT** at "Still to sort out". The two ticked items are **not** there.

**SAY**
> "And look. The two things Alex already did are gone from the message. The trip drives
> the checklist, and the checklist drives the message."

**POINT** at the booking-reference option, which is off.

**SAY**
> "Booking numbers stay off unless Alex chooses to share them."

**TAP** `[confirm label: Copy link]`.

**OPEN** your messaging app, **paste**, **send**.

**TAP** the link on the receiving end (second device, or a new tab) to show the read-only
page.

**SAY**
> "The person on the other end taps the link. No app, no account, nothing to install."

---

## Close (5 seconds)

**SAY**
> "Tell it what changed. It tells you what is at risk, what to do next, and writes the
> update for the people waiting."

**Stop talking. Smile. Hand back to your pitch.**

---

## If you are running out of time

Cut in this order, last cut first. The path from 1 to 5 never changes.

1. Skip reading the preview message aloud. Just point at it.
2. Skip the "Call ITA Airways" and "Call Hotel" line in step 4.
3. Skip the booking reference line in step 5.
4. Skip opening the link on a second device. Say what happens instead.

Never cut: the 55 to 10 moment, the two ticks, or the ticked items disappearing from the
message. That is the whole idea.

---

## If something goes wrong

### The venue wifi fails

The app keeps the trip on the phone. Once it has loaded, it does not need the internet to
work. So the best defence is to load it **before** you go up and not refresh the page.

Say this, calmly, and carry on:
> "Venue wifi has other plans. Which is a good moment to say: Alex's trip never leaves the
> phone. There is no server to go down."

Then, in this order:

1. **Page already open?** Carry on. Tapping around does not need the internet. Only the
   second device opening the shared link might fail. If it does, open the link in a new tab
   on the same phone instead.
2. **Page will not load?** Turn on your phone's hotspot and connect the laptop or second
   device to it. Reload.
3. **Still nothing?** Ask the teammate with the laptop to run the app from their own
   machine, which needs no internet. In a terminal, in the project folder:
   `pnpm build`, then `pnpm start`, then open `http://localhost:3000`.
4. **Still nothing?** Play the backup screen recording (see below) and talk over it with
   the same SAY lines. The judges will forgive wifi. They will not forgive silence.

### The app misbehaves

| What you see | What to do |
| --- | --- |
| Old delay already on screen from the last run | Reset the trip, load the sample trip again, restart from step 1. |
| Copy link does nothing | Long-press the message preview, select all, copy. Or read the first two lines aloud and move on. |
| A button does something you did not expect | Say "let me go back", tap Back to trip, and repeat the step. Do not apologise twice. |
| The numbers are not 55 and 10 | Stop. Something changed in the sample trip. Switch to the backup video. |

### Backup video

Record it once everything works (see the rehearsal plan). Keep the file on the phone you
present from **and** on a laptop. Play it full screen with the sound off and narrate live.

### Last resort

Four screenshots, in this order: trip, "Tight 55 to 10" screen, checklist with two ticked,
the shared message. Same words, no taps.
