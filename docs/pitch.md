# Pitch

For a judge standing at our table. Time limit: about 2 to 3 minutes, then the judge looks at
the code with whoever on the team knows that part.

Written to be said out loud. Short sentences. Read it aloud, not in your head, and mark
where you run out of breath.

**Judging criteria:** innovativeness, functionality, creativity, theme ("Into the Skies").
**Tracks entered:** Solana (see "Tracks" near the end before you say anything about it).
ElevenLabs was dropped.

---

## The pitch (about 2 minutes 40 seconds)

Speaking pace is about 140 words a minute. The demo taps take extra time on top of the
words, so the word count is lower than it looks. The full tap-by-tap demo is in
`docs/demo-script.md`; this is the short spoken version of it.

### 1. The problem (about 25 seconds)

> Picture Alex. Flying San Francisco to Rome, changing planes in London.
> Two airlines. Two confirmation emails. A hotel waiting in Rome.
>
> At the gate, the first flight slips forty-five minutes.
>
> Now Alex has to work it all out alone. The delay is in one app. The next flight is in
> another. The hotel is in an email. And somebody is waiting in Rome, checking their phone.

### 2. The idea (about 10 seconds)

> ConnectionKeeper. You tell it what changed about your flight.
> It tells you what is now at risk, what to do next, and writes the update for the people
> waiting on you.

### 3. The demo (about 70 seconds)

*Taps are in `docs/demo-script.md`. Say these lines while you do them.*

> This is Alex's trip. Two flights, a hotel, the phone numbers Alex needs.
>
> *(report the delay)* The airline says forty-five minutes late. That is all Alex tells us.
>
> *(connection card)* Here is what the app worked out by itself. The connection in London
> was fifty-five minutes. Now it is ten. And the hotel in Rome is at risk.
>
> *(checklist)* And here is what to do. Rebook AZ 201. Tell Hotel Aventino Garden. Those
> are not generic tips. They come from Alex's own trip.
>
> *(tick two)* Alex does two of them and ticks them off.
>
> *(share screen)* And here is the message for the person waiting in Rome. Plain words,
> ready to send. Notice the two things Alex just did are already gone from it.
>
> *(copy link, open it)* They tap the link. No app. No account.

### 4. Why it is more than a to-do list (about 30 seconds)

> A to-do app holds whatever you type. This one does not wait to be told.
>
> The trip drives the checklist. The checklist drives the message. Change the trip and
> the list changes. Tick something off and the message changes.
>
> And everything stays on the phone. No account. No server. Nothing to sign up for when
> you are already stressed.

### 5. What is next (about 15 seconds)

> Next, we would pull trips in from confirmation emails, and connect live flight status, so
> the app can warn you instead of waiting to be told.

### 6. Hand-off (about 10 seconds)

> We each built a different part. Namish led the code, Boris built the logic, and Will
> designed the screens. Ask us anything, or let's look at the code.

*Sebastian's part (Solana) goes in only once it works on a phone. See "Tracks" below.*

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
> booking, while someone waits for news. ConnectionKeeper puts it in one place. You tell it
> what changed. It shows you what is now at risk, gives you a checklist of what to do, and
> writes the update for the people waiting. The trip drives the checklist and both drive the
> message. Everything stays on your phone.

---

## Matching the judging criteria

Say these things in your own words if a judge asks "why you?". Do not recite them.

| Criterion | Our honest answer |
| --- | --- |
| **Innovativeness** | One change flows through three things: the risks, the checklist, then the message. Many travel apps stop at the alert. |
| **Functionality** | It runs on a phone, with no sign-up, and works from the first tap with the sample trip. It handles four kinds of change: delay, cancellation, missed connection, and rebooked. |
| **Creativity** | It is the opposite of a to-do app. Nothing is typed in by hand: the list writes itself from the trip. The shared update lives entirely in the link, so there is no server behind it. |
| **Theme: Into the Skies** | Flights are the whole subject. We built for the hours after the sky does not go to plan. |

## Tracks (read this before you say a word about them)

| Track | Where it stands | What must be true before you mention it | Who to ask |
| --- | --- | --- | --- |
| **Solana** | Built: a Solana address field on the trip screen, an "Ask for help" option on the share screen, and a "Send help" button on the shared link. Checked in a desktop browser only. | Someone has opened a shared link on a phone, tapped "Send help", and seen the request open in a wallet set to devnet. | Sebastian |
| **ElevenLabs** | Dropped. There is no "Listen" button and no voice code in the app. | Nothing. Do not mention it. | |

The Solana request uses devnet, Solana's test network, so no real money moves. Say that
if you show it.

If the phone test has not been done by tomorrow morning, say nothing about Solana at the
table. A judge who sees a broken promise scores the whole project down. Tell me when it is
confirmed and I will add one sentence to this pitch and one step to the demo script.

--- | --- | --- |
| **Solana** | The "Send help" button on the shared link works end to end on your phone. | Sebastian |
| **ElevenLabs** | The "Listen" button reads the next steps aloud, with the ElevenLabs voice, on your phone. | Sebastian |

If a track's feature is not working by tomorrow morning, say nothing about it at the table.
A judge who sees a broken promise scores the whole project down. Tell me when each one is
confirmed and I will add one sentence to this pitch and one step to the demo script.

---

## Questions judges are likely to ask

Short answers. Say the first sentence, then stop and let them ask more.

**Why no live flight data?**
Because we would rather be right than fast. Reliable live flight feeds cost money and need
accounts and keys, and a wrong guess about someone's connection is worse than none. Alex
usually hears about a change first, from the airline's own message. We start from what Alex
tells us and do the hard part: working out what it means for everything else. Live status is
the first thing we would add next.

**Where is the data stored?**
On your phone, in the browser. No server, no account. When you share an update, the
details travel inside the link itself, and the part of a link after the `#` is never sent to
a web server. The catch: anyone who has the link can read the update. So booking numbers
are off by default.

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
It handles four kinds of change: delay, cancellation, missed connection, and rebooked. For
a cancellation with no new time yet, it says the connection is "at risk" rather than
inventing a number.

**Why does it ignore time zones?**
Every comparison it makes happens in one place: old against new arrival at one airport,
arrival against the next departure at the same airport. So plain local times are enough, and
there is no time-zone maths to get wrong. *(A good question to hand to the teammate who
built the logic.)*

---

## Notes for the table

- Let a teammate take any "how does it work" question. Your job is the story and the
  hand-off.
- If you only remember three things: **55 to 10**, **the list names Alex's real flight and
  hotel**, **ticked items vanish from the message**.
- Do not say "AI" about the checklist or the message. They are built from rules, not a language model.
- Do not promise features. Say "next, we would..."

## Who to hand questions to

| Person | Role | Ask them about |
| --- | --- | --- |
| Namish | Head coder | How it is built, the store, the share link |
| Boris | Code and logic | How the connection time, checklist and message are worked out |
| Will | Frontend design | The screens, the look, phone layout |
| Sebastian | Presenter, Solana | The story, plus "Send help" once it works on a phone |

## Open items

1. Whether "Send help" works on a phone with a real wallet. Tell me and I will update this file.
2. Where the TripIt answer came from: public descriptions of TripIt, not the app itself.
   Sources: [TripIt Pro review](https://www.iphonejd.com/?p=1094),
   [TechCrunch on the launch of TripIt Pro](https://techcrunch.com/2009/06/23/tripit-goes-pro-launches-premium-flight-monitoring-and-alerts),
   [Cornell travel blog](https://blogs.cornell.edu/travel/2018/05/02/tripit-pro-powerful-features-minimize-travel-hassles).
   Some are old, so open tripit.com once and skim the features.
