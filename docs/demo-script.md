# Demo script

Live demo, about 100 seconds (an estimate: time it in rehearsal). The numbers and wording
quoted below were produced by running the app's real logic on the sample trip, so they
are what you will see on screen.

**How to read this:** each step has **TAP** (what your finger does), **POINT** (what the
judges should look at) and **SAY** (spoken words, written to be said out loud, not read).

**Button names are exact.** Every button and line quoted below was checked on the real app at
phone size (390 pixels wide) on Saturday 10 October. If a teammate renames a button, fix it
here.

---

## The story in one breath

Alex Morgan is flying San Francisco to Rome through London. Two airlines, two booking
confirmations, one hotel. The first flight gets delayed 45 minutes. That turns a relaxed
55-minute connection in London into a 10-minute sprint, and it puts the hotel check-in at
risk.

## Before you walk on (2 minutes, do this every time)

1. Charge the phone. Turn off notifications and Do Not Disturb on.
2. Open the app in the browser you will use on stage. Prefer the HTTPS address if the team
   has one. (The Copy buttons also work on plain `http://`, with a fallback, but HTTPS is
   safer.)
3. **Reset the trip so you start clean.** Scroll to the bottom of the home screen and tap
   **Delete trip from this device**. The button changes to **Tap again to delete this
   trip**: tap it again. You should now see **No trip yet** and a **Load sample trip** button.
   **This matters.** The app remembers the trip on the phone, and a second run without a
   reset stacks the new 45 minutes on top of the old ones. You will see **Likely missed**
   instead of **Tight**, and the demo falls apart.
4. Stop on the **Load sample trip** screen. Step 1 is the first thing the judges see.
5. Open your messaging app in another tab or on a second device, with a chat ready to
   paste into (use your own number or a teammate).
6. Have the backup video ready to play (see "If something goes wrong").
7. Do not tap any **Call** button during the demo. The numbers are made up, but the Rome
   ones might ring a stranger. The same goes for **Delete trip from this device**, at the
   bottom of the home screen.

---

## Step 1. Load the trip (10 seconds)

**TAP** **Load sample trip**.

**POINT** at the flights, the hotel and the contacts, in that order.

**SAY**
> "This is Alex's trip to Rome. A flight from San Francisco to London, a flight on to
> Rome, a hotel, and the phone numbers Alex will need. Normally that is four different
> apps and emails. Here it is one screen."

**On screen:** two flights (BA 286 and AZ 201), Hotel Aventino Garden, three contacts.

---

## Step 2. Report what changed (20 seconds)

**TAP** the green **Report a change** button at the top.

The form already has **BA 286 · San Francisco → London** and **Delayed** selected. Point at
them, but you do not need to tap them.

**TAP** **+45 min** under **How late?**. The two time boxes fill in by themselves:
departs **Fri 16 Oct, 17:25**, arrives **Sat 17 Oct, 11:20**.

**TAP** **Show what's affected**.

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

**TAP** **Send an update** (the big green button at the bottom).

You are on the share screen.

**POINT** at the preview message and the options. Read one line out loud:
*"BA 286 (San Francisco to London) is delayed by 45 min. It now arrives Sat 17 Oct at 11:20
instead of 10:35."*

**SAY**
> "Someone is waiting in Rome. Alex is not going to type all this with tired thumbs in a
> departure lounge. The app writes it, in plain words."

**POINT** at "Still to sort out". The two ticked items are **not** there.

*Do not read this list out line by line. Until the fix in
`docs/patches/shared-message-skip-personal-tasks.patch` is merged, it also includes personal
items such as "Send an update to someone waiting for you" and "Keep receipts for extra costs".
Only point at the two that are missing.*

**SAY**
> "And look. The two things Alex already did are gone from the message. The trip drives
> the checklist, and the checklist drives the message."

**POINT** at the **Booking references** switch under **Include**, which is off.

**SAY**
> "Booking numbers stay off unless Alex chooses to share them."

**TAP** **Copy link**. A small message says **Link copied. Paste it into any chat.**

**OPEN** your messaging app, **paste**, **send**.

**TAP** the link on the receiving end (second device, or a new tab) to show the read-only
page. It opens with **Alex's flight is delayed** and a **Tight connection** card: *"10 min to
make AZ 201 at 11:30."*

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
| Old delay already on screen from the last run | Reset the trip (**Delete trip from this device**, tap twice), tap **Load sample trip**, restart from step 1. |
| The badge says **Likely missed**, not **Tight** | You stacked a second delay on the first. Same fix: reset the trip and start from step 1. |
| Copy link says **Couldn't copy** | Press and hold the message preview, select all, copy. Or read the first two lines aloud and move on. |
| A button does something you did not expect | Say "let me go back", tap Back to trip, and repeat the step. Do not apologise twice. |
| The numbers are not 55 and 10 | Stop. Something changed in the sample trip. Switch to the backup video. |

### Backup video

Record it once everything works (see the rehearsal plan). Keep the file on the phone you
present from **and** on a laptop. Play it full screen with the sound off and narrate live.

### Last resort

Four screenshots, in this order: trip, "Tight 55 to 10" screen, checklist with two ticked,
the shared message. Same words, no taps.
