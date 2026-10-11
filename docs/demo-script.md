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
which now lands in Rome at 6:00 PM instead of 3:05 PM.

## How the change arrives

There is no "report a change" screen. How the change arrives depends on **Demo controls**
(Settings > Demo), which is **on** by default:

- **Demo controls on (default):** a **Next** button sits at the bottom right of every screen
  and walks through the whole demo in order: **Log in as a guest**, **Your trip**, **Load the
  sample trip**, **See your trip**, **Change the flight**, **Share the update**, **What they
  see**, **Settings**, **Start over**. The flight changes **only when you tap Next: Change the
  flight**, so you choose the moment. This is the safest way to present.
- **Demo controls off:** the change arrives by itself about 6 seconds after a trip with no
  changes is on the home screen (not on the shared `/s` page).
- **On demand:** menu button (top right) > **Restart the demo trip** > **Restart**. It puts the
  trip back on time, and the same change arrives about 6 seconds later. Use this to replay the demo.

It plays once per trip. Once the trip has a change, nothing more fires until you restart it.

**Do not want to wait the 6 seconds?** The **Simulate a change** button on the home screen makes it arrive at
once. Handy when rehearsing, or if a judge is hovering and time is short.

## Before you walk on (2 minutes, do this every time)

1. Charge the phone. Turn off notifications and Do Not Disturb on, so nothing else buzzes.
2. Open **https://layoverapp.vercel.app/login** in the browser you will use on stage. Use
   this HTTPS address, not a laptop's `http://192.168...` address (the Copy button can fail
   there).
3. Start clean: menu button > **Clear this trip** > **Clear trip**. The app remembers things on the phone, so
   a second run will otherwise open on the first run's change.
4. You should now see "Flights change. Your plan keeps up." and **Try the sample trip**. Do
   **not** tap it yet. Step 1 is the first thing the judges see. (On a phone that has never
   opened the app, the sign-in screen comes first: tap **Continue as guest**.)
5. Optional: menu > **Allow phone notifications**, if you want the change to also arrive as a
   system notification when the app is in the background. Not needed for the demo.
6. Open your messaging app in another tab or on a second device, with a chat ready to paste
   into (use your own number or a teammate).
7. Have the backup video ready to play (see "If something goes wrong").
8. Do not tap any phone number during the demo. The numbers are made up, but the Rome ones
   might ring a stranger.
9. For the **Listen** line, turn the phone volume up and test it once before you
   go up. With the ElevenLabs key on the server you hear the voice picked in the menu. Without
   it (or with no network) you hear the phone's own voice instead: still fine to play, but then
   do not say "ElevenLabs".

---

## Step 1. Load the trip (15 seconds)

Times show in the phone's own format: **2:25 PM** on most US phones, **14:25** on 24-hour
phones. This script uses 12-hour times, as on the live site. Same flights either way.

**TAP** **Next: See your trip** (bottom right), or **Try the sample trip** on the home screen.

You land on **On time. 55 min to connect in London.** The bar at the top reads **Tight
connection** next to **Simulated feed**. Say "simulated" when you point at it. Below it, the
day as a list of times: leave San Francisco 4:40 PM, land in London 10:35 AM (**Watch this**:
"Tight — 55 min until AZ 201"), fly to Rome 11:30 AM, land in Rome 3:05 PM, the pickup, and
the hotel front desk closing at 10:00 PM.

**POINT** at **Land in London** and its line, **Tight — 55 min until AZ 201**.

**SAY**
> "This is Alex's trip to Rome. A flight from San Francisco to London, a flight on to Rome,
> a hotel, and a pickup. Normally that is four different apps and emails. Here it is one
> screen. The app is watching the flights. The airline feed is simulated, so we can show
> you the moment it changes."

When you finish the line, **TAP** **Next: Change the flight**. (With Demo controls switched
off in Settings, the change lands by itself about 6 seconds after the trip appears instead;
then just keep talking.)

---

## Step 2. The change arrives (15 seconds)

A card slides down from the top (the phone buzzes, if it can):

> **Simulated flight change · new plan ready**
> Missed AZ 201. New flight AZ 207, 2:25 PM – 6:00 PM.
> Told the hotel you land at 6:00 PM and moved your pickup to 6:40 PM.
> 5 to do.

**SAY**
> "Here is the airline telling Alex. The first flight is over two hours late. Alex has
> missed the connection and is already rebooked. Alex did not type a thing."

**TAP** the card, or the small **X**. If it hides itself first, nothing is lost: the home
screen has already changed.

---

## Step 3. The plan ripples (25 seconds)

The headline reads **London connection missed. You're on the 2:25 PM instead.** The day
rebuilds itself, step by step:

- **Leave San Francisco · BA 286**, 6:50 PM: **2h 10m late**.
- **Land in London**, 12:45 PM: 1h 40m until your new flight.
- **AZ 201 to Rome**, was 11:30 AM: **Missed**, no longer happening.
- **New flight · AZ 207**, 2:25 PM, lands 6:00 PM: **Rebooked**.
- **Land in Rome**, 6:00 PM: Marco's picking you up, moved to match.
- **Your pickup**, 6:40 PM: moved from 3:45 PM for you.
- **Hotel front desk closes**, 10:00 PM: 4h to spare after landing.

Under it, **Handled for you**: **Rebooked on AZ 207**, **Told the hotel you land at 6:00
PM**, **Moved your pickup to 6:40 PM**, and the line **Simulated: nothing is really sent.**

**SAY**
> "One flight ran late and everything downstream rebuilt itself: the missed connection, the
> new flight, the pickup, the hotel. In the demo the app also handles the hotel and the
> transfer. That part is simulated too."

Say **"missed"** and **"rebooked"**. Those are the app's own words.

---

## Step 4. What to do (15 seconds)

**TAP** **To do (5)**. It opens on **Do this first**: one task with one button (**Mark
done**, or **Call** when there is someone to call).

**TAP** **Mark done**. The next task takes its place, and the count drops to **4**.

**SAY**
> "Alex never has to read a list. The app says what to do first."

---

## Step 5. Tell the people waiting (25 seconds)

**TAP** **Next: Share the update** (or **Share update** on the home screen). Under **Send
to** are ready-written messages: **Text Marco** (the driver), **Email Mum**, and **Text Hotel
Aventino Garden**, each with the new arrival time. Below them is the **Preview** of the
update.

**POINT** at the hotel message (it has the booking confirmation) and Mum's (no booking
numbers).

**TAP** **Email Mum**. The phone's mail app opens with the message filled in. **Nothing is
sent from here.** Go back. The matching task is ticked off for you.

The numbers and the address are made up (`+39 06 0000 ...` and `mum@example.com`): do not
actually send.

**SAY**
> "One tap opens the message, already written. Mum hears the new plan, and the app ticks it
> off."

Then, if time allows, **TAP** **Next: What they see**: the read-only page Mum would open,
**Alex now lands in Rome at 6:00 PM.** No app, no account.

---

## Optional: Listen (10 seconds)

Only if you have time and the room is quiet. Back on the home screen, **TAP** **Listen**. The phone plays a short briefing in the voice picked in the menu (made by
ElevenLabs; only this text is sent). Before you tick anything, it reads:

> "You missed your flight to Rome. You are now on a new flight arriving at 6:00 PM. Nothing
> else on your trip is affected. First, check your new booking for AZ 207."

(The "first" thing is the first task not yet done, so after **Mark done** in step 4 it names
the next task instead.) Tap again to stop it. Without the server's ElevenLabs key or a
connection it reads the same words in the phone's own voice; only say "ElevenLabs" if you
tested it and heard the picked voice.

---

## Optional: Send help (20 seconds)

Only if you have a quiet moment. Tested on a real phone with Phantom: scanning works, completing the payment does not (see below).

**Set it up beforehand, once.** With the trip open, go to **Settings** > **Send help** > **Solana address (optional)**, paste a wallet address,
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

1. Skip the optional **Listen** step.
2. Skip pointing at the hotel and Mum messages in step 5.
   (Times on screen may be 12-hour or 24-hour, depending on the phone.)
3. Skip opening the link on a second device. Say what happens instead.

Never cut: the change arriving, the day rebuilding itself, **Do this first**, or the message
to Mum. That is the whole idea.

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
| You do not want to wait for the change | Tap **Simulate a change** on the home screen. |
| You see no change after about 10 seconds | You are probably on the shared `/s` page, which never changes a trip, or the trip already has a change. Go to the home screen, then menu > **Restart the demo trip** > **Restart**. |
| You missed the notification card | It hides itself after about 9 seconds. The home screen already shows the change. Carry on from step 3. |
| Copy link does nothing | Use **Copy text** instead, or read the first two lines aloud and move on. |
| **Listen** sounds like the phone's own voice | The ElevenLabs key is missing or the network is down. It still works; just do not say "ElevenLabs". |
| **Listen** makes no sound | Check the phone is not on silent (the switch on the side of an iPhone). Otherwise skip that step. |
| A button does something you did not expect | Say "let me go back", tap **Back to trip**, and repeat the step. Do not apologise twice. |
| The numbers are not 2h 10m, 2:25 PM (14:25) and 6:00 PM (18:00) | Stop. Something changed in the sample trip or the simulated feed. Switch to the backup video. |

### Backup video

Record it once everything works (see the rehearsal plan). Keep the file on the phone you
present from **and** on a laptop. Play it full screen with the sound off and narrate live.

### Last resort

Four screenshots, in this order: the on-track trip, the new plan ("London connection
missed"), the checklist with two ticked, the shared message. Same words, no taps.
