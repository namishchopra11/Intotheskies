# Demo script

Live demo, about 90 seconds (an estimate: time it in rehearsal). The numbers and wording
quoted below were produced by running the app's real logic on the sample trip, so they are
what you will see on screen.

**How to read this:** each step has **TAP** (what your finger does), **POINT** (what the
judges should look at) and **SAY** (spoken words, written to be said out loud, not read).

## Say this first, and say it plainly

**The flight change in this demo is simulated.** There is no live flight data. About 6
seconds after the trip loads, the app plays the part of the airline's feed and pushes one
scripted change. Everything after that moment is real: the risks, the checklist, the update
for the people waiting and the shared link are all worked out from the trip by the app's own
logic. If a judge asks, the answer is in `docs/pitch.md` ("Is the flight watching real?").

Say it in your own words, early. Suggested line for step 1:
> "The airline feed here is simulated, so we can show you the moment it changes. What the
> app does with the change is the real part."

---

## The story in one breath

Alex Morgan is flying San Francisco to Rome through London. Two airlines, two booking
confirmations, one hotel. The first flight (BA 286) runs 2 hours 10 minutes late. That is
longer than the 55-minute London connection, so Alex misses AZ 201 and is rebooked on AZ 207,
which now lands in Rome at 18:00 instead of 15:05.

## How the change arrives

There is no "report a change" screen. A change arrives on its own:

- **Automatically:** about 6 seconds after a trip with no changes is on screen (the app must
  be open, and not on the shared `/s` page).
- **Pick a scenario:** menu button (top right) > **Pick a scenario**: 45-minute delay, 3-hour
  delay, missed connection or cancelled flight. It restarts the trip and plays the change
  straight away. Let a judge choose.
- **On demand:** menu button (top right) > **Restart the demo trip** > **Restart**. It puts the
  trip back on time, and the same change arrives about 6 seconds later. Use this to replay the demo.

It plays once per trip. Once the trip has a change, nothing more fires until you restart it.

**Do not want to wait the 6 seconds?** Menu > **Trigger the change now** makes it arrive at
once. Handy when rehearsing, or if a judge is hovering and time is short.

## Before you walk on (2 minutes, do this every time)

1. Charge the phone. Turn off notifications and Do Not Disturb on, so nothing else buzzes.
2. Open the app in the browser you will use on stage. **Use the HTTPS address** if the team
   has one (the Copy button can fail on a plain `http://192.168...` address).
3. Start clean: menu button > **Clear this trip** > **Clear trip**. The app remembers things on the phone, so
   a second run will otherwise open on the first run's change.
4. You should now see "Flights change. Your plan keeps up." and **Try the sample trip**. Do
   **not** tap it yet. Step 1 is the first thing the judges see.
5. Optional: menu > **Allow phone notifications**, if you want the change to also arrive as a
   system notification when the app is in the background. Not needed for the demo.
6. Open your messaging app in another tab or on a second device, with a chat ready to paste
   into (use your own number or a teammate).
7. Have the backup video ready to play (see "If something goes wrong").
8. Do not tap any phone number during the demo. The numbers are made up, but the Rome ones
   might ring a stranger.
9. For the **Listen to summary** line, turn the phone volume up. The button only shows when
   the browser has speech support. Test it once before you go up.

---

## Step 1. Load the trip (15 seconds)

**TAP** **Try the sample trip** on the home screen.

You land on **Your trip is on track. Nothing to do right now.** with **All flights on time**
and a pulsing **Simulated feed** in the bar at the top. Say "simulated" when you point at it.

**POINT** at the two flights, and at the line between them: **55 min in London**, marked
tight.

**SAY**
> "This is Alex's trip to Rome. A flight from San Francisco to London, a flight on to Rome,
> a hotel, and the phone numbers Alex will need. Normally that is four different apps and
> emails. Here it is one screen. The app is watching the flights. The airline feed is
> simulated, so we can show you the moment it changes."

Keep talking. The change lands about 6 seconds after the trip appears. Do not tap anything.

---

## Step 2. The change arrives (15 seconds)

A card slides down from the top (the phone buzzes, if it can):

> **Simulated flight change · new plan ready**
> BA 286 is 2h 10m late, so you'll miss AZ 201 in London.
> You're rebooked on AZ 207, 14:25 → 18:00 to Rome.
> 6 things to sort out. Tap to see your plan.

**SAY**
> "Here is the airline telling Alex. The first flight is over two hours late. Alex has
> missed the connection and is already rebooked. Alex did not type a thing."

**TAP** the card. It disappears by itself after about 9 seconds, so be quick. If you miss
it, nothing is lost: the home screen has already changed. Just carry on to step 3.

---

## Step 3. The plan ripples (25 seconds)

The bar reads **New plan ready**. Under the headline, the yellow board flips to **18:00**
with **15:05** struck through and **2h 55m later**. Below it is the trip as a rail, each
step appearing a beat after the one above:

- **BA 286**, 2h 10m late, lands 12:45.
- **Missed AZ 201**, red, with a dashed rail: the link is broken.
- **AZ 207**, green, lands 18:00 (was 15:05).
- **Hotel Aventino Garden**, green: 4h to spare before the front desk closes.
- **Marco · pickup**, red: still expects the old arrival. **Mum · family**, amber.

**SAY**
> "One flight ran late and everything downstream lights up: the missed connection, the new
> flight, the hotel, and Marco, who is picking Alex up and doesn't know yet."

Say **"missed"** and **"rebooked"**. Those are the app's own words.

---

## Step 4. Do this now (15 seconds)

**POINT** at **Do this now**: one task, with one button. **Mark done** (or **Call**, or
**Send the message** for the tasks that tell people). The rest are behind **All tasks**.

**TAP** **Mark done**. The next task takes its place.

**SAY**
> "Alex never has to read a list. The app says what to do next."

---

## Step 5. Tell Marco (25 seconds)

**TAP** **Share the new plan**. Under **Send to** are ready-written messages for Marco, Mum
and the hotel, each with the new arrival time.

**POINT** at the hotel message (it has the booking confirmation) and Mum's (it has no
booking numbers).

**TAP** **WhatsApp** on Marco's message. WhatsApp opens with the text filled in (the sample
trip has no numbers for Marco or Mum, so pick the chat yourself). **Nothing is
sent from here.** Go back.

The **Marco · pickup** node on the home screen is now green: the loop is closed.

**SAY**
> "One tap opens the message. The app counts it as done, and Marco's step on the trip turns
> green."

Then, if time allows, **Copy link** and open it on a second device to show the read-only
page. No app, no account.

---

## Optional: Listen to summary (10 seconds)

Only if you have time and the room is quiet. Back on the home screen, **TAP** **Listen to
summary**. The phone reads a short briefing in its own built-in voice. Before you tick
anything, it reads:

> "You missed your flight to Rome. You are now on a new flight arriving at 6:00 PM. Nothing
> else on your trip is affected. First, check your new booking for AZ 207."

(The "first" thing is the first task not yet ticked, so after the two ticks in step 4 it names
the third task instead.) Tap again to stop it. The voice comes from the device, not a
service, so it works offline.

---

## Optional: Send help (20 seconds)

Only if you have a quiet moment. Tested on a real phone with Phantom: scanning works, completing the payment does not (see below).

**Set it up beforehand, once.** Menu > **Solana address (optional)**, paste a wallet address,
tap **Save address**. It is kept through **Restart the demo trip**, but **Clear this trip**
wipes it. So: load the sample trip, save the address, then use **Restart the demo trip** as
your step 1 instead of **Try the sample trip**.

**On the share screen (step 5):** switch on **Add a Send help button**, type an amount such as
**50** (the screen says it is USDC), then **Copy link** as usual.

**On the recipient page,** scroll to **Help Alex with costs**. It says **Alex is asking for 50
USDC** and, in a yellow box, **Demo on Solana's test network (devnet). No real money moves.**
Point at **Send help** (it opens the person's Solana wallet app to approve the payment), the
QR code (for a wallet on another device) and **Copy address**.

**Scan it (optional, 10 seconds).** Have Phantom open on a second phone, in **Testnet Mode**
(Solana Devnet), on the account playing the person helping. Tap the scan icon and scan the QR
code. Phantom opens a payment screen with the amount and Alex's address filled in. **Stop
there. Do not tap Send:** Phantom shows "Insufficient balance" for devnet USDC even when the
account has it, which is a limit of its test mode, not of our app.

**SAY**
> "And if Alex needs help with costs, the person waiting can send it from the same link. They
> scan this, and their own wallet opens with the amount and Alex's address already filled in.
> They just approve. Today it runs on Solana's test network, so no real money moves. We never
> hold keys or sign anything."

Do **not** tap **Send help** on stage unless a wallet app set to devnet is installed on that
phone. Otherwise the phone may show an "open with" prompt.

---

## Close (5 seconds)

**SAY**
> "The change arrives. The app tells you what it means, what to do next, and writes the
> update for the people waiting."

**Stop talking. Smile. Hand back to your pitch.**

---

## If you are running out of time

Cut in this order, last cut first. The path from 1 to 5 never changes.

1. Skip the optional **Listen to summary** step.
2. Skip reading the preview message aloud. Just point at it.
3. Skip the booking reference line in step 5.
4. Skip opening the link on a second device. Say what happens instead.

Never cut: the change arriving by itself, the two ticks, or the ticked items disappearing
from the message. That is the whole idea.

---

## If something goes wrong

### The venue wifi fails

The app keeps the trip on the phone. Once it has loaded, it does not need the internet to
work, and the simulated feed runs on the phone too. So the best defence is to load it
**before** you go up and not refresh the page.

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
| The trip already shows a change from the last run | Menu > **Restart the demo trip** > **Restart**. It goes back on time and the change arrives again in about 6 seconds. |
| You do not want to wait for the change | Menu > **Trigger the change now**. |
| You see no change after about 10 seconds | You are probably on the shared `/s` page, which never changes a trip, or the trip already has a change. Go to the home screen, then menu > **Restart the demo trip** > **Restart**. |
| You missed the notification card | It hides itself after about 9 seconds. The home screen already shows the change. Carry on from step 3. |
| Copy link does nothing | Use **Copy text** instead, or read the first two lines aloud and move on. |
| **Listen to summary** is missing | The browser has no speech support. Skip that step. |
| A button does something you did not expect | Say "let me go back", tap **Back to trip**, and repeat the step. Do not apologise twice. |
| The numbers are not 2h 10m, 14:25 and 18:00 | Stop. Something changed in the sample trip or the simulated feed. Switch to the backup video. |

### Backup video

Record it once everything works (see the rehearsal plan). Keep the file on the phone you
present from **and** on a laptop. Play it full screen with the sound off and narrate live.

### Last resort

Four screenshots, in this order: the on-track trip, the new plan ("London connection
missed"), the checklist with two ticked, the shared message. Same words, no taps.
