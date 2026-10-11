# Pitch

For a judge standing at our table. Time limit: about 2 to 3 minutes, then the judge looks at
the code with whoever on the team knows that part.

Written to be said out loud. Short sentences. Read it aloud, not in your head, and mark
where you run out of breath.

**Judging criteria:** innovativeness, functionality, creativity, theme ("Into the Skies").
**Tracks entered:** Solana (see "Tracks" near the end before you say anything about it).
ElevenLabs is built in, for **Listen to summary** only, but only works once its key is added
on the live site (see "Tracks").

---

## The pitch (about 2 minutes 40 seconds)

Speaking pace is about 140 words a minute. The demo taps take extra time on top of the
words, so the word count is lower than it looks. The full tap-by-tap demo is in
`docs/demo-script.md`; this is the short spoken version of it.

### 1. The problem (about 25 seconds)

> Picture Alex. Flying San Francisco to Rome, changing planes in London.
> Two airlines. Two confirmation emails. A hotel waiting in Rome.
>
> At the gate, the first flight slips by more than two hours.
>
> Now Alex has to work it all out alone. The delay is in one app. The next flight is in
> another. The hotel is in an email. And somebody is waiting in Rome, checking their phone.

### 2. The idea (about 10 seconds)

> Layover. It watches your flights. When one changes, it tells you what that means
> for everything else, what to do next, and writes the update for the people waiting on you.
> You do not enter anything.

**Be plain about this, early:** the flight feed in the demo is simulated. Section 3 has the
line to say.

### 3. The demo (about 70 seconds)

*Taps are in `docs/demo-script.md`. Say these lines while you do them. There is no "report
a change" screen: the change arrives on its own, about 6 seconds after the trip loads.*

> This is Alex's trip. Two flights, a hotel, the phone numbers Alex needs. The app is
> watching the flights. The airline feed is simulated, so we can show you the moment it
> changes. What it does with the change is the real part.
>
> *(the change card arrives)* The first flight is over two hours late. Alex has missed the
> connection in London and is already rebooked. Alex did not type a thing.
>
> *(new plan)* Here is what the app worked out by itself. The old flight is struck out. The
> new one leaves London at 14:25 and lands in Rome at 18:00, not 15:05.
>
> *(checklist)* And here is what to do. Check your booking for AZ 207. Ask ITA Airways. Those
> are not generic tips. They come from Alex's own trip.
>
> *(tick two)* Alex does two of them and ticks them off.
>
> *(share screen)* And here is the message for the person waiting in Rome. Plain words,
> ready to send. Notice the two things Alex just did are already gone from it.
>
> *(copy link, open it)* They tap the link. No app. No account.
>
> *(Solana, if it works on the day)* And if Alex needs help with costs, the person waiting can
> send it from the same link, on Solana's test network, so no real money moves.

### 4. Why it is more than a to-do list (about 30 seconds)

> A to-do app holds whatever you type. This one does not wait to be told.
>
> The trip drives the checklist. The checklist drives the message. Change the trip and
> the list changes. Tick something off and the message changes.
>
> And your trip stays on the phone. No sign-up: continue as a guest. Nothing to fill in when
> you are already stressed.

### 5. What is next (about 15 seconds)

> Next, we would replace the simulated feed with a real flight-status source, and pull
> trips in from confirmation emails. Everything after the change already works the same.

### 6. Hand-off (about 10 seconds)

> We each built a different part. Namish led the code, Boris built the logic, Will designed
> the screens, and I built the Solana help button. Ask us anything, or let's look at the code.

*Sebastian's part is the Solana "Send help" button. It has its own line in the demo, below.*

---

## The 2-minute cut

If a judge is in a hurry, or a table crowd is waiting. Keep 1, 2 and 3. Squeeze 4 into one
line. Drop 5.

> *(Sections 1, 2 and 3 as above.)*
>
> The trip drives the checklist, the checklist drives the message, and it all stays on your
> phone. No account, no server.
>
> We each built a part. Ask us anything, or let's look at the code.

## The 60-second cut (an elevator version)

> When a flight is delayed, you juggle an airline app, confirmation emails and a hotel
> booking, while someone waits for news. Layover puts it in one place. When a
> flight changes, it shows you what is now at risk, gives you a checklist of what to do, and
> writes the update for the people waiting. The trip drives the checklist and both drive the
> message. Everything stays on your phone. (The flight feed in our demo is simulated.)

---

## Matching the judging criteria

Say these things in your own words if a judge asks "why you?". Do not recite them.

| Criterion | Our honest answer |
| --- | --- |
| **Innovativeness** | One change flows through three things: the risks, the checklist, then the message. Many travel apps stop at the alert. |
| **Functionality** | It runs on a phone, with no sign-up, and works from the first tap with the sample trip. The logic handles four kinds of change: delay, cancellation, missed connection, and rebooked. The demo plays one of them (a missed connection) from a simulated feed. |
| **Creativity** | It is the opposite of a to-do app. Nothing is typed in by hand: the change arrives, and the list writes itself from the trip. The shared update lives entirely in the link, so there is no server behind it. |
| **Theme: Into the Skies** | Flights are the whole subject. We built for the hours after the sky does not go to plan. |

## Tracks (read this before you say a word about them)

| Track | Where it stands | What must be true before you mention it | Who to ask |
| --- | --- | --- | --- |
| **Solana** | Built and tested. The traveler adds a Solana address in the **Trip menu**; the share screen has an **Add a Send help button** option with an amount in USDC; the shared page shows **Send help**, a QR code and the address to copy. All on devnet, Solana's test network, with address validation and the transfer-request builder tested under `src/lib/solana/`. Sebastian tested it on an iPhone with Phantom on devnet: scanning the QR code fills in the right amount and address. Phantom will not complete a devnet USDC payment ("Insufficient balance"), a limit of its test mode. | Say the wallet opens with everything filled in. Do not say a payment went through. On stage, stop on Phantom's filled-in screen. | Sebastian |
| **ElevenLabs** | Built. **Listen to summary** sends only the short spoken briefing to ElevenLabs through the app's `/api/speak` route and plays the audio; the voice is picked in the trip menu. **On Saturday night the live site had no ElevenLabs key**, so Listen used the phone's own built-in voice instead (it no longer shows an error). | The team adds `ELEVENLABS_API_KEY` in Vercel and redeploys. Then test on the stage phone: the voice should be the one picked in the menu (George, Sarah, Alice or Roger), not the phone's usual voice. If it sounds like the phone's own voice, do not mention ElevenLabs. | Boris |

If the Solana step does not work on the day, on the phone you present from, say nothing about
Solana at the table. A judge who sees a broken promise scores the whole project down. If you
do show it, say it uses devnet, Solana's test network, so no real money moves.

---

## Questions judges are likely to ask

Short answers. Say the first sentence, then stop and let them ask more.

**Is the flight watching real?**
No, and we say so. The "airline feed" is simulated. A few seconds after the trip loads, the
app plays one scripted change (the first flight runs over two hours late, the connection is
missed, the traveler is rebooked) so you can see the moment it lands. There is no live
flight data and no server. What happens after the change is real: the risks, the checklist,
the message and the shared link are all worked out from the trip by the app's own logic. The
part we would swap out is one function that stands in for the feed.

**Why not use live flight data?**
Because we would rather be right than fast. Reliable live flight feeds cost money and need
accounts and keys, and a wrong guess about someone's connection is worse than none. We built
the hard part first: working out what a change means for everything else. Live status is the
first thing we would add next.

**Can I try it with my own flight?**
Partly. **Add your trip** lets you enter flights, hotels and rides by hand, or paste a
confirmation email to import them. The change it plays is still simulated: connecting a real
status source is what we would build next. *(Import only works once the Anthropic key is
added on the live site. On Saturday night it was not. Check before you offer it.)*

**Where is the data stored?**
On your phone, in the browser. No database, and no account needed (sign-in is a profile kept
on the phone, or continue as a guest). When you share an update, the
details travel inside the link itself, and the part of a link after the `#` is never sent to
a web server. The catch: anyone who has the link can read the update. So booking numbers
are off by default.

Two things do leave the phone, and only when you tap them: **Import** sends the confirmation
you paste to Claude (Anthropic's AI) to be read, and **Listen** sends the short spoken summary
to ElevenLabs to make the audio. Neither stores it. The screens say so next to the button.

**Did Layover really tell the hotel and move the pickup?**
No. Like the airline feed, **Handled for you** is simulated in this demo: no message reaches
a hotel or a driver. It shows what the app would do once it is connected to them. The
messages under **Share the new plan** are real: they open your own WhatsApp, Messages or email
with the text filled in.

**Do you use AI?**
In one place: **Import** uses Claude to read a confirmation email or screenshot and fill in
the flights and hotel. The checklist, the risks and the messages are built from fixed rules,
not a language model, so they are predictable and work offline.

**How is this different from an airline app or TripIt?**
An airline app knows one airline's flight. It does not know your hotel or the other
airline's flight. TripIt is a good app: it collects your bookings from your emails, and the
paid version sends delay alerts and suggests other flights. So we are not competing on
alerts or finding a new flight. We start after the alert: what the change means for
everything else you have booked, what to do first, and the message for the people waiting.
Their trip data could feed ours.

*Say only what is true: do not say TripIt "can't" do something. We checked its public
description (see sources below), not the app itself. If a judge pushes, say "as far as we
know, it does not write the update for the people waiting".*

**Why Solana? Is it real money?**
Not today: it runs on Solana's test network, so no real money moves. We chose Solana because
a small payment from someone in another country can arrive in seconds and cost almost nothing.
The app only builds a payment request. The person's own wallet approves it, so we never hold
keys or sign anything.

**Isn't this just a to-do list?**
A to-do list holds what you type. Here the list is written from your trip: it names your
real flight and your real hotel, and it changes when the trip changes. Then the message is
written from the list.

**Is the checklist AI-generated?**
No. It is built from fixed rules, on purpose, so it is predictable, works offline, and never
makes up advice.

**Do you tell people what compensation they are owed?**
No, deliberately. Rights differ by country and airline, and a wrong answer would mislead
someone who is already stressed. The app only says "ask the airline what you're entitled to".

**What if the flight is cancelled, not just late?**
The logic handles four kinds of change: delay, cancellation, missed connection, and
rebooked. For a cancellation with no new time yet, it says the connection is "at risk"
rather than inventing a number. The demo plays one scripted change, a missed connection, so
that is the one you will see on the phone.

**Why does it ignore time zones?**
Every comparison it makes happens in one place: old against new arrival at one airport,
arrival against the next departure at the same airport. So plain local times are enough, and
there is no time-zone maths to get wrong. *(A good question to hand to the teammate who
built the logic.)*

---

## Notes for the table

- Let a teammate take any "how does it work" question. Your job is the story and the
  hand-off.
- If you only remember three things: **the change arrives on its own (and it is simulated)**,
  **the list names Alex's real flight and airline**, **ticked items vanish from the message**.
- Do not say the flight data is live, or that the app "tracks real flights". Say "the feed is
  simulated" before a judge has to ask.
- Do not say "AI" about the checklist or the message. They are built from rules, not a language model.
  The only AI is **Import** (Claude reads a pasted confirmation).
- Do not say the app "told the hotel" as if it really did. Say "in the demo, it shows what it
  would handle for you".
- Do not promise features. Say "next, we would..."

## Who to hand questions to

| Person | Role | Ask them about |
| --- | --- | --- |
| Namish | Head coder | How it is built, the store, the share link |
| Boris | Code and logic | How the connection time, checklist and message are worked out |
| Will | Frontend design | The screens, the look, phone layout |
| Sebastian | Presenter, Solana | The story, plus the Solana help button |

## Open items

0. **Before demo day, the team must add two keys in Vercel** (Settings > Environment Variables,
   then redeploy): `ANTHROPIC_API_KEY` for Import and `ELEVENLABS_API_KEY` for Listen. On
   Saturday night neither was set, so Import said "isn't available right now" and Listen used
   the phone's own voice. If they are still missing on the day, do not mention Import or
   ElevenLabs.

1. Run the optional Send help step in `docs/demo-script.md` once on the phone you will present
   from, the morning of the demo.
2. Where the TripIt answer came from: public descriptions of TripIt, not the app itself.
   Sources: [TripIt Pro review](https://www.iphonejd.com/?p=1094),
   [TechCrunch on the launch of TripIt Pro](https://techcrunch.com/2009/06/23/tripit-goes-pro-launches-premium-flight-monitoring-and-alerts),
   [Cornell travel blog](https://blogs.cornell.edu/travel/2018/05/02/tripit-pro-powerful-features-minimize-travel-hassles).
   Some are old, so open tripit.com once and skim the features.
